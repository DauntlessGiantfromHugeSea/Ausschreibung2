import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { WRITABLE_DATA_DIR as DATA_DIR } from "./paths";

const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
export const SESSION_COOKIE = "fluessigboden_session";

export type Role = "admin" | "user";

export interface SavedSearch {
  id: string;
  label: string;
  /** Serialized querystring, e.g. "q=anhängerkupplung&region=Bayern". */
  query: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // scrypt: salt:hash (hex)
  role: Role;
  createdAt: string;
  savedSearches: SavedSearch[];
}

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}

/** Richer view for the admin user list. */
export interface AdminUser extends PublicUser {
  createdAt: string;
  savedSearchCount: number;
}

// ---------- user store (JSON file) ----------

function readUsers(): User[] {
  let users: User[];
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) as User[];
  } catch {
    users = [];
  }
  // Back-compat: ensure every record has a role.
  let changed = false;
  for (const u of users) {
    if (!u.role) {
      u.role = "user";
      changed = true;
    }
  }
  if (changed) writeUsers(users);
  return users;
}

function writeUsers(users: User[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function toPublic(u: User): PublicUser {
  return { id: u.id, email: u.email, role: u.role };
}

// ---------- password hashing (scrypt) ----------

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

// ---------- session tokens (HMAC-signed) ----------

export function signSession(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, t: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { uid } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof uid === "string" ? uid : null;
  } catch {
    return null;
  }
}

// ---------- admin bootstrap from env ----------

let bootstrapped = false;

/**
 * Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD on first call, if
 * that user does not yet exist. Idempotent and safe to call on every request.
 * If the user already exists, ensures it has the admin role.
 */
export function bootstrapAdminFromEnv(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const users = readUsers();
  const existing = users.find((u) => u.email === email);
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      writeUsers(users);
    }
    return;
  }
  users.push({
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    role: "admin",
    createdAt: new Date().toISOString(),
    savedSearches: [],
  });
  writeUsers(users);
}

// ---------- public API ----------

export function registerUser(email: string, password: string): PublicUser {
  const norm = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(norm)) throw new Error("Ungültige E-Mail-Adresse.");
  if (password.length < 8) throw new Error("Passwort muss mindestens 8 Zeichen haben.");
  const users = readUsers();
  if (users.some((u) => u.email === norm)) throw new Error("E-Mail ist bereits registriert.");
  // The very first account becomes admin so a fresh install is manageable.
  const role: Role = users.length === 0 ? "admin" : "user";
  const user: User = {
    id: crypto.randomUUID(),
    email: norm,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
    savedSearches: [],
  };
  users.push(user);
  writeUsers(users);
  return toPublic(user);
}

export function authenticate(email: string, password: string): PublicUser | null {
  const norm = email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === norm);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return toPublic(user);
}

/** Self-service password change: verifies the current password first. */
export function changePassword(userId: string, currentPassword: string, newPassword: string): void {
  if (newPassword.length < 8) throw new Error("Neues Passwort muss mindestens 8 Zeichen haben.");
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("Benutzer nicht gefunden.");
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error("Aktuelles Passwort ist falsch.");
  }
  user.passwordHash = hashPassword(newPassword);
  writeUsers(users);
}

export function getUserById(id: string | null): PublicUser | null {
  if (!id) return null;
  const user = readUsers().find((u) => u.id === id);
  return user ? toPublic(user) : null;
}

export function getSavedSearches(userId: string): SavedSearch[] {
  return readUsers().find((u) => u.id === userId)?.savedSearches ?? [];
}

export function addSavedSearch(userId: string, label: string, query: string): SavedSearch {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("Benutzer nicht gefunden.");
  const entry: SavedSearch = {
    id: crypto.randomUUID(),
    label: label.trim() || "Gespeicherte Suche",
    query,
    createdAt: new Date().toISOString(),
  };
  user.savedSearches.unshift(entry);
  writeUsers(users);
  return entry;
}

export function deleteSavedSearch(userId: string, searchId: string): void {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;
  user.savedSearches = user.savedSearches.filter((s) => s.id !== searchId);
  writeUsers(users);
}

// ---------- admin: user management ----------

export function isAdmin(user: PublicUser | null): boolean {
  return user?.role === "admin";
}

export function listUsers(): AdminUser[] {
  return readUsers()
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      savedSearchCount: u.savedSearches.length,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function adminCreateUser(email: string, password: string, role: Role): PublicUser {
  const user = registerUser(email, password);
  if (role !== user.role) return setUserRole(user.id, role);
  return user;
}

export function setUserRole(userId: string, role: Role): PublicUser {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("Benutzer nicht gefunden.");
  if (user.role === "admin" && role !== "admin" && countAdmins(users) <= 1) {
    throw new Error("Der letzte Admin kann nicht herabgestuft werden.");
  }
  user.role = role;
  writeUsers(users);
  return toPublic(user);
}

export function adminResetPassword(userId: string, password: string): void {
  if (password.length < 8) throw new Error("Passwort muss mindestens 8 Zeichen haben.");
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error("Benutzer nicht gefunden.");
  user.passwordHash = hashPassword(password);
  writeUsers(users);
}

export function deleteUser(userId: string): void {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;
  if (user.role === "admin" && countAdmins(users) <= 1) {
    throw new Error("Der letzte Admin kann nicht gelöscht werden.");
  }
  writeUsers(users.filter((u) => u.id !== userId));
}

function countAdmins(users: User[]): number {
  return users.filter((u) => u.role === "admin").length;
}

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { WRITABLE_DATA_DIR as DATA_DIR } from "./paths";

const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
export const SESSION_COOKIE = "auftrag_session";

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
  createdAt: string;
  savedSearches: SavedSearch[];
}

export interface PublicUser {
  id: string;
  email: string;
}

// ---------- user store (JSON file) ----------

function readUsers(): User[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) as User[];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
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

// ---------- public API ----------

export function registerUser(email: string, password: string): PublicUser {
  const norm = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(norm)) throw new Error("Ungültige E-Mail-Adresse.");
  if (password.length < 8) throw new Error("Passwort muss mindestens 8 Zeichen haben.");
  const users = readUsers();
  if (users.some((u) => u.email === norm)) throw new Error("E-Mail ist bereits registriert.");
  const user: User = {
    id: crypto.randomUUID(),
    email: norm,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    savedSearches: [],
  };
  users.push(user);
  writeUsers(users);
  return { id: user.id, email: user.email };
}

export function authenticate(email: string, password: string): PublicUser | null {
  const norm = email.trim().toLowerCase();
  const user = readUsers().find((u) => u.email === norm);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email };
}

export function getUserById(id: string | null): PublicUser | null {
  if (!id) return null;
  const user = readUsers().find((u) => u.id === id);
  return user ? { id: user.id, email: user.email } : null;
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

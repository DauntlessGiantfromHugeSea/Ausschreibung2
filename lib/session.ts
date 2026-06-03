import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySession,
  getUserById,
  bootstrapAdminFromEnv,
  isAdmin,
  type PublicUser,
} from "./auth";

/** Reads the current authenticated user from the session cookie, or null. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  // Idempotent: provisions the env-configured admin on first request.
  bootstrapAdminFromEnv();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return getUserById(verifySession(token));
}

/** Returns the current user only if they are an admin, otherwise null. */
export async function getCurrentAdmin(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return isAdmin(user) ? user : null;
}

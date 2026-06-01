import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, getUserById, type PublicUser } from "./auth";

/** Reads the current authenticated user from the session cookie, or null. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return getUserById(verifySession(token));
}

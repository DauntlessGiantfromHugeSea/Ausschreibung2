import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, changePassword } from "@/lib/auth";

export async function POST(req: Request) {
  const store = await cookies();
  const uid = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!uid) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  try {
    const { currentPassword, newPassword } = await req.json();
    changePassword(uid, String(currentPassword ?? ""), String(newPassword ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { authenticate, signSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = authenticate(String(email ?? ""), String(password ?? ""));
  if (!user) {
    return NextResponse.json(
      { error: "E-Mail oder Passwort ist falsch." },
      { status: 401 },
    );
  }
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

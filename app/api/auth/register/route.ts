import { NextResponse } from "next/server";
import { registerUser, signSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const user = registerUser(String(email ?? ""), String(password ?? ""));
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, signSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

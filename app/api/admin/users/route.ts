import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/session";
import { listUsers, adminCreateUser, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 });
  }
  return NextResponse.json({ users: listUsers() });
}

export async function POST(req: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 });
  }
  try {
    const { email, password, role } = await req.json();
    const user = adminCreateUser(
      String(email ?? ""),
      String(password ?? ""),
      role === "admin" ? "admin" : ("user" as Role),
    );
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/session";
import { setUserRole, adminResetPassword, deleteUser, type Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    if (body.role) {
      const user = setUserRole(id, body.role === "admin" ? "admin" : ("user" as Role));
      return NextResponse.json({ user });
    }
    if (body.password) {
      adminResetPassword(id, String(body.password));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Nichts zu ändern." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 403 });
  }
  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "Du kannst dein eigenes Konto nicht löschen." },
      { status: 400 },
    );
  }
  try {
    deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

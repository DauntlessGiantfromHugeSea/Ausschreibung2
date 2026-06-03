import { NextResponse } from "next/server";
import { getTenderById } from "@/lib/store";
import { getCurrentUser } from "@/lib/session";
import { addNote, deleteNote } from "@/lib/tenderMeta";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await params;
  const tender = getTenderById(id);
  if (!tender) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  try {
    const { text } = await req.json();
    const note = addNote(tender.reference, user.email, String(text ?? ""));
    return NextResponse.json({ note });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await params;
  const tender = getTenderById(id);
  if (!tender) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const noteId = new URL(req.url).searchParams.get("noteId");
  if (noteId) deleteNote(tender.reference, noteId);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  verifySession,
  getSavedSearches,
  addSavedSearch,
  deleteSavedSearch,
} from "@/lib/auth";

async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  return NextResponse.json({ searches: getSavedSearches(uid) });
}

export async function POST(req: Request) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { label, query } = await req.json();
  const entry = addSavedSearch(uid, String(label ?? ""), String(query ?? ""));
  return NextResponse.json({ search: entry });
}

export async function DELETE(req: Request) {
  const uid = await currentUserId();
  if (!uid) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) deleteSavedSearch(uid, id);
  return NextResponse.json({ ok: true });
}

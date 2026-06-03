import { NextResponse } from "next/server";
import { getTenderById } from "@/lib/store";
import { getCurrentUser } from "@/lib/session";
import { setStatus, type TenderStatus } from "@/lib/tenderMeta";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { id } = await params;
  const tender = getTenderById(id);
  if (!tender) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  try {
    const { status } = await req.json();
    setStatus(tender.reference, status as TenderStatus);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

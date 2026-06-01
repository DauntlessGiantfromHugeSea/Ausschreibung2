import { NextResponse } from "next/server";
import { getTenderById } from "@/lib/store";
import { summarizeTender } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tender = getTenderById(id);
  if (!tender) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const profile = new URL(req.url).searchParams.get("profile") ?? undefined;
  const insight = await summarizeTender(tender, profile);
  return NextResponse.json(insight);
}

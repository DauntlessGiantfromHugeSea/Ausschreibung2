import { NextResponse } from "next/server";
import { runCrawl } from "@/lib/ingest";
import { mergeAndPersist } from "@/lib/ingest/persist";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Triggers a crawl of all configured platforms and persists the merged result.
 * Protected by the CRAWL_TOKEN env var (sent as `x-crawl-token` header or
 * `?token=`). Suitable for a cron job, e.g.:
 *   curl -X POST -H "x-crawl-token: $CRAWL_TOKEN" http://localhost:3000/api/admin/crawl
 */
export async function POST(req: Request) {
  const expected = process.env.CRAWL_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "CRAWL_TOKEN ist nicht gesetzt — Crawl-Endpoint deaktiviert." },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const token = req.headers.get("x-crawl-token") ?? url.searchParams.get("token");
  if (token !== expected) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const limit = Number(url.searchParams.get("limit") ?? "50");
  const query = url.searchParams.get("query") ?? undefined;
  const only = url.searchParams.get("source")?.split(",").map((s) => s.trim());

  const { tenders, report } = await runCrawl({ limit, query, only });

  let merge = { total: 0, added: 0 };
  if (tenders.length > 0) {
    merge = mergeAndPersist(tenders);
    report.written = true;
  }

  return NextResponse.json({ ...report, fetched: tenders.length, ...merge });
}

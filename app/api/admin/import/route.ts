import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/session";
import { parseImport } from "@/lib/ingest/importTenders";
import { mergeAndPersist } from "@/lib/ingest/persist";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Imports tenders exported from the legacy Python platform (CSV or JSON) and
 * merges them into the dataset. Auth: admin session OR x-crawl-token header
 * (so it can be scripted from the server).
 *
 *   # CSV upload (admin UI) or scripted:
 *   curl -X POST -H "x-crawl-token: $CRAWL_TOKEN" \
 *     --data-binary @ausschreibungen.csv \
 *     http://localhost:5000/api/admin/import
 */
export async function POST(req: Request) {
  const tokenOk =
    process.env.CRAWL_TOKEN && req.headers.get("x-crawl-token") === process.env.CRAWL_TOKEN;
  if (!tokenOk && !(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let text: string;
  const ctype = req.headers.get("content-type") ?? "";
  try {
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
      }
      text = await file.text();
    } else {
      text = await req.text();
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Leere Eingabe." }, { status: 400 });
  }

  let tenders;
  try {
    tenders = parseImport(text);
  } catch (err) {
    return NextResponse.json({ error: `Parse-Fehler: ${(err as Error).message}` }, { status: 400 });
  }

  if (tenders.length === 0) {
    return NextResponse.json({ error: "Keine gültigen Datensätze erkannt." }, { status: 400 });
  }

  const { total, added } = mergeAndPersist(tenders);
  return NextResponse.json({ parsed: tenders.length, added, total });
}

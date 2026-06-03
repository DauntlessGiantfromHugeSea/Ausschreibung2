import { search } from "@/lib/search";
import { getCurrentUser } from "@/lib/session";
import type { SearchQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: { key: string; label: string }[] = [
  { key: "title", label: "Titel" },
  { key: "source", label: "Portal" },
  { key: "buyer", label: "Vergabestelle" },
  { key: "city", label: "Ort" },
  { key: "region", label: "Region" },
  { key: "cpvCode", label: "CPV" },
  { key: "publishedDate", label: "Veröffentlicht" },
  { key: "deadline", label: "Frist" },
  { key: "estimatedValue", label: "Auftragswert" },
  { key: "fbeScore", label: "Relevanz" },
  { key: "fbeLevel", label: "Stufe" },
  { key: "status", label: "Status" },
  { key: "sourceUrl", label: "URL" },
];

export async function GET(req: Request) {
  if (!(await getCurrentUser())) {
    return new Response("Nicht angemeldet.", { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  const query: SearchQuery = {
    q: sp.get("q") ?? undefined,
    category: sp.get("category") ?? undefined,
    region: sp.get("region") ?? undefined,
    procedureType: sp.get("procedureType") ?? undefined,
    source: sp.get("source") ?? undefined,
    status: sp.get("status") ?? undefined,
    minLevel: sp.get("minLevel") ?? undefined,
    openOnly: sp.get("openOnly") === "1",
    minValue: num("minValue"),
    maxValue: num("maxValue"),
    sort: (sp.get("sort") as SearchQuery["sort"]) ?? undefined,
    page: 1,
    pageSize: 100000, // export all matches
  };

  const { items } = search(query);
  const sep = ";";
  const head = COLUMNS.map((c) => c.label).join(sep);
  const rows = items.map((t) =>
    COLUMNS.map((c) => csvCell((t as unknown as Record<string, unknown>)[c.key])).join(sep),
  );
  const csv = "﻿" + [head, ...rows].join("\r\n"); // BOM for Excel

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="ausschreibungen.csv"',
    },
  });
}

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

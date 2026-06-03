import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import type { SearchQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
    page: num("page"),
    pageSize: num("pageSize"),
  };

  return NextResponse.json(search(query));
}

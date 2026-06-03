import type { TenderSource, CrawlOptions } from "../source";
import type { Tender } from "../../types";
import { fetchJson } from "../http";
import { toTender, normalizeProcedure, isoDate, toNumber } from "../util";

/**
 * Official EU TED (Tenders Electronic Daily) search API.
 * Docs: https://docs.ted.europa.eu/api/  Endpoint: POST /v3/notices/search
 *
 * TED aggregates above-threshold notices for all EU member states, including
 * notices published via German portals (DTVP, cosinex, eVergabe). This is the
 * most reliable single source for broad German coverage.
 */
const ENDPOINT = process.env.TED_API_URL || "https://api.ted.europa.eu/v3/notices/search";

export const tedSource: TenderSource = {
  id: "ted",
  label: "TED",
  enabled: true,
  async fetch({ limit = 50, country = "DEU", query }: CrawlOptions): Promise<Tender[]> {
    const expert = [`(country=${country})`, query ? `FT="${query}"` : ""]
      .filter(Boolean)
      .join(" AND ");

    const data = await fetchJson<any>(ENDPOINT, {
      method: "POST",
      timeoutMs: 20000,
      retries: 3,
      body: JSON.stringify({
        query: expert,
        fields: [
          "publication-number",
          "notice-title",
          "buyer-name",
          "description-proc",
          "classification-cpv",
          "deadline-receipt-tender-date-lot",
          "publication-date",
          "estimated-value-cur-proc",
          "estimated-value-proc",
          "procedure-type",
          "place-performance",
          "links",
        ],
        page: 1,
        limit: Math.min(limit, 100),
        scope: "ALL",
      }),
    });

    const notices: any[] = data?.notices ?? data?.results ?? [];
    return notices
      .map((n) =>
        toTender({
          source: "TED",
          reference: pick(n["publication-number"]),
          title: pick(n["notice-title"]),
          description: pick(n["description-proc"]) ?? "",
          buyer: pick(n["buyer-name"]),
          cpvCode: String(pick(n["classification-cpv"]) ?? "").slice(0, 8),
          region: pick(n["place-performance"]),
          procedureType: normalizeProcedure(pick(n["procedure-type"])),
          publishedDate: isoDate(pick(n["publication-date"])),
          deadline: isoDate(pick(n["deadline-receipt-tender-date-lot"])),
          estimatedValue: toNumber(pick(n["estimated-value-proc"])),
          currency: pick(n["estimated-value-cur-proc"]) ?? "EUR",
          sourceUrl:
            pick(n.links?.html) ??
            `https://ted.europa.eu/de/notice/-/detail/${pick(n["publication-number"])}`,
        }),
      )
      .filter((t): t is Tender => t !== null);
  },
};

/** TED multilingual fields arrive as language-keyed objects or arrays. */
function pick(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return pick(v[0]);
  if (typeof v === "object") return (v.deu ?? v.eng ?? v.de ?? Object.values(v)[0]) as string;
  return String(v);
}

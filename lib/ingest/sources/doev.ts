import type { TenderSource, CrawlOptions } from "../source";
import type { Tender } from "../../types";
import { fetchJson } from "../http";
import { toTender, normalizeProcedure, isoDate } from "../util";

/**
 * Datenservice Öffentlicher Einkauf / Bekanntmachungsservice
 * (oeffentlichevergabe.de) — the official German national notice service.
 * Publishes notices in OCDS (Open Contracting Data Standard) JSON.
 *
 * The exact search endpoint can be overridden via DOEV_API_URL. Parsing is
 * defensive: any release that does not map cleanly is skipped, and the source
 * returns [] (never throws) if the service is unavailable.
 */
const ENDPOINT =
  process.env.DOEV_API_URL ||
  "https://www.oeffentlichevergabe.de/api/notice-exports/ocds/v1/releases";

export const doevSource: TenderSource = {
  id: "doev",
  label: "Bekanntmachungsservice",
  enabled: true,
  async fetch({ limit = 50 }: CrawlOptions): Promise<Tender[]> {
    const url = `${ENDPOINT}?pageSize=${Math.min(limit, 100)}`;
    const data = await fetchJson<any>(url, { timeoutMs: 20000, retries: 3 });
    const releases: any[] = data?.releases ?? data?.results ?? [];

    return releases
      .map((r) => {
        const t = r.tender ?? {};
        const item = t.items?.[0]?.classification ?? {};
        const addr = r.buyer?.address ?? t.procuringEntity?.address ?? {};
        return toTender({
          source: "Bekanntmachungsservice",
          reference: String(r.ocid ?? r.id ?? t.id ?? ""),
          title: t.title ?? r.title,
          description: t.description ?? "",
          buyer: r.buyer?.name ?? t.procuringEntity?.name,
          cpvCode: String(item.id ?? "").slice(0, 8),
          cpvLabel: item.description,
          region: addr.region ?? addr.locality,
          city: addr.locality,
          procedureType: normalizeProcedure(t.procurementMethodDetails ?? t.procurementMethod),
          publishedDate: isoDate(r.date),
          deadline: isoDate(t.tenderPeriod?.endDate),
          estimatedValue:
            typeof t.value?.amount === "number" ? t.value.amount : null,
          currency: t.value?.currency ?? "EUR",
          sourceUrl: r.tender?.documents?.[0]?.url ?? r.uri ?? "",
        });
      })
      .filter((t): t is Tender => t !== null);
  },
};

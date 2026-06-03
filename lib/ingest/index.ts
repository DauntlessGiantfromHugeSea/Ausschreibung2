import type { Tender } from "../types";
import type { CrawlOptions, CrawlReport, SourceReport, TenderSource } from "./source";
import { tedSource } from "./sources/ted";
import { bundSource } from "./sources/bund";
import { doevSource } from "./sources/doev";
import { cosinexSource } from "./sources/cosinex";
import { makeRssSource } from "./sources/cosinexRss";

/**
 * All registered procurement platforms.
 *
 * HTTP-only (run out of the box on any server with outbound access):
 *   - TED            — official EU Search API
 *   - service.bund.de — RSS feed (jobsrss)
 *   - Bekanntmachungsservice (oeffentlichevergabe.de) — OCDS API
 *   - cosinex        — HTML listing scrape (enable via COSINEX_BASE_URL/COSINEX_ENABLE)
 *
 * Browser-required portals (evergabe.de, DTVP) use bot detection and need a
 * headless-browser enricher; here they are optional RSS adapters that activate
 * only when a *_FEED_URL is provided. See README for the Playwright path.
 */
export const SOURCES: TenderSource[] = [
  tedSource,
  bundSource,
  doevSource,
  cosinexSource,
  makeRssSource({ id: "dtvp", label: "DTVP", feedEnv: "DTVP_FEED_URL" }),
  makeRssSource({ id: "evergabe", label: "eVergabe.de", feedEnv: "EVERGABE_FEED_URL" }),
];

/**
 * Runs the given sources concurrently and independently. A failing or slow
 * source is isolated (Promise.allSettled) and reported, never aborting the
 * others. Results are merged and de-duplicated.
 */
export async function runCrawl(
  opts: CrawlOptions & { only?: string[] } = {},
): Promise<{ tenders: Tender[]; report: CrawlReport }> {
  const active = SOURCES.filter(
    (s) => (opts.only ? opts.only.includes(s.id) : s.enabled),
  );

  const settled = await Promise.allSettled(
    active.map(async (s): Promise<SourceReport & { tenders: Tender[] }> => {
      const start = Date.now();
      try {
        const tenders = await s.fetch(opts);
        return { id: s.id, label: s.label, ok: true, count: tenders.length, ms: Date.now() - start, tenders };
      } catch (err) {
        return {
          id: s.id,
          label: s.label,
          ok: false,
          count: 0,
          error: (err as Error).message,
          ms: Date.now() - start,
          tenders: [],
        };
      }
    }),
  );

  const sources: SourceReport[] = [];
  let merged: Tender[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") {
      const { tenders, ...rep } = r.value;
      sources.push(rep);
      merged = merged.concat(tenders);
    }
  }

  const tenders = dedupe(merged);
  return { tenders, report: { total: tenders.length, written: false, sources } };
}

/** De-duplicate by reference (fallback to id), keeping the first occurrence. */
function dedupe(tenders: Tender[]): Tender[] {
  const seen = new Set<string>();
  const out: Tender[] = [];
  for (const t of tenders) {
    const key = (t.reference || t.id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

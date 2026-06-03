/**
 * Ingestion entrypoint. Crawls live notices from all configured procurement
 * platforms (TED, Bekanntmachungsservice, and any cosinex feeds that are
 * configured) and writes the merged, de-duplicated result to
 * <AUFTRAG_DATA_DIR>/tenders.json, which the app prefers over the seed data.
 *
 * Usage:
 *   npm run crawl                          # all enabled sources, 50 each
 *   npm run crawl -- --limit 100
 *   npm run crawl -- --source ted,doev     # only specific sources
 *   npm run crawl -- --query Anhängerkupplung
 *
 * Crawling is resilient: each source is isolated, so a blocked or failing
 * portal is reported but never aborts the run. If every source yields nothing,
 * existing data is kept and the app continues on seed data.
 */
import { runCrawl } from "../lib/ingest/index.ts";
import { mergeAndPersist } from "../lib/ingest/persist.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const limit = Number(arg("limit") ?? 50);
  const query = arg("query");
  const only = arg("source")?.split(",").map((s) => s.trim()).filter(Boolean);

  console.log(`Crawling tender platforms (limit=${limit}${only ? `, only=${only.join(",")}` : ""}) …`);
  const { tenders, report } = await runCrawl({ limit, query, only });

  for (const s of report.sources) {
    const status = s.ok ? `${s.count} notices` : `FAILED: ${s.error}`;
    console.log(`  • ${s.label.padEnd(22)} ${status} (${s.ms} ms)`);
  }

  if (tenders.length === 0) {
    console.warn("No notices fetched from any source — keeping existing data.");
    return;
  }
  const { total, added } = mergeAndPersist(tenders);
  console.log(`\nFetched ${tenders.length}, added ${added} new → ${total} tenders total.`);
}

main().catch((err) => {
  console.error("Crawl runner error:", err);
  process.exitCode = 0; // never fail the deploy; app keeps prior/seed data
});

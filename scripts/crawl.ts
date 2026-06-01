/**
 * Ingestion entrypoint. Crawls live tender notices from TED and writes them to
 * data/tenders.json (which the app prefers over the bundled seed dataset).
 *
 * Usage:
 *   npm run crawl                      # Germany, default 50 notices
 *   npm run crawl -- --limit 100
 *   npm run crawl -- --expert 'FT="Anhängerkupplung"'
 *
 * If the TED host is unreachable (e.g. a locked-down network), the script
 * leaves the existing data in place and exits non-fatally, so the app keeps
 * working with seed data.
 */
import fs from "node:fs";
import path from "node:path";
import { crawlTed } from "../lib/ingest/ted.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const limit = Number(arg("limit") ?? 50);
  const expert = arg("expert");
  const out = path.join(process.cwd(), "data", "tenders.json");

  console.log(`Crawling TED (DEU, limit=${limit}${expert ? `, expert=${expert}` : ""}) …`);
  try {
    const tenders = await crawlTed({ limit, expert });
    if (tenders.length === 0) {
      console.warn("No notices returned — keeping existing data.");
      return;
    }
    fs.writeFileSync(out, JSON.stringify(tenders, null, 2), "utf-8");
    console.log(`Wrote ${tenders.length} tenders to ${out}`);
  } catch (err) {
    console.error("Crawl failed (network blocked or API error):", (err as Error).message);
    console.error("App will continue to use seed data. No file written.");
    process.exitCode = 0;
  }
}

main();

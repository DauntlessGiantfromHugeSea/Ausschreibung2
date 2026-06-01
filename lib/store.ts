import fs from "node:fs";
import path from "node:path";
import type { Tender } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const CRAWLED = path.join(DATA_DIR, "tenders.json");
const SEED = path.join(DATA_DIR, "tenders.seed.json");

let cache: Tender[] | null = null;

/**
 * Loads tenders. Prefers freshly crawled data (data/tenders.json, written by
 * `npm run crawl`) and falls back to the bundled seed dataset so the app is
 * fully functional offline.
 */
export function getTenders(): Tender[] {
  if (cache) return cache;
  const file = fs.existsSync(CRAWLED) ? CRAWLED : SEED;
  const raw = fs.readFileSync(file, "utf-8");
  cache = JSON.parse(raw) as Tender[];
  return cache;
}

export function getTenderById(id: string): Tender | undefined {
  return getTenders().find((t) => t.id === id);
}

/** Test/ingestion helper to drop the in-memory cache. */
export function resetCache(): void {
  cache = null;
}

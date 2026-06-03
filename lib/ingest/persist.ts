import fs from "node:fs";
import path from "node:path";
import type { Tender } from "../types";
import { WRITABLE_DATA_DIR } from "../paths";
import { resetCache } from "../store";

const FILE = path.join(WRITABLE_DATA_DIR, "tenders.json");

function readExisting(): Tender[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Tender[];
  } catch {
    return [];
  }
}

/**
 * Merges freshly fetched/imported tenders into the persisted dataset instead of
 * overwriting it, so the database grows across crawl runs (like the Python
 * platform). De-duplicates by reference (fallback id); newer data wins on
 * conflict. Returns counts and drops the in-memory cache so the app serves the
 * updated set immediately.
 */
export function mergeAndPersist(incoming: Tender[]): { total: number; added: number } {
  const existing = readExisting();
  const byKey = new Map<string, Tender>();
  for (const t of existing) byKey.set(key(t), t);

  let added = 0;
  for (const t of incoming) {
    const k = key(t);
    if (!byKey.has(k)) added++;
    byKey.set(k, t); // newer wins (refreshes deadline/status etc.)
  }

  const merged = [...byKey.values()];
  fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 2), "utf-8");
  resetCache();
  return { total: merged.length, added };
}

function key(t: Tender): string {
  return (t.reference || t.id || t.sourceUrl).toLowerCase();
}

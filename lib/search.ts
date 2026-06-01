import type {
  ScoredTender,
  SearchFacets,
  SearchQuery,
  SearchResult,
  Tender,
} from "./types";
import { getTenders } from "./store";

/**
 * Normalises text for matching: lowercases and folds German umlauts/ß to ASCII
 * so "Anhängerkupplung" and "anhangerkupplung" both match. Applied identically
 * to documents and queries.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function haystack(t: Tender): string {
  return normalize(
    [
      t.title,
      t.description,
      t.buyer,
      t.cpvLabel,
      t.cpvCode,
      t.category,
      t.region,
      t.city,
      t.reference,
    ].join(" "),
  );
}

/**
 * Lightweight keyword relevance: weighted term-frequency over title (heavier)
 * and the full record. Normalised to 0–100. Returns 0 for an empty query.
 */
function score(t: Tender, terms: string[]): number {
  if (terms.length === 0) return 0;
  const title = normalize(t.title);
  const body = haystack(t);
  let s = 0;
  for (const term of terms) {
    const inTitle = (title.match(new RegExp(escapeRe(term), "g")) || []).length;
    const inBody = (body.match(new RegExp(escapeRe(term), "g")) || []).length;
    s += inTitle * 5 + inBody * 1;
  }
  // Squash to 0–100 with diminishing returns.
  return Math.round(Math.min(100, (1 - Math.exp(-s / 6)) * 100));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuery(t: Tender, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const body = haystack(t);
  // Require every term to appear somewhere (AND semantics).
  return terms.every((term) => body.includes(term));
}

function buildFacets(items: Tender[]): SearchFacets {
  const facets: SearchFacets = {
    category: {},
    region: {},
    procedureType: {},
    source: {},
  };
  for (const t of items) {
    bump(facets.category, t.category);
    bump(facets.region, t.region);
    bump(facets.procedureType, t.procedureType);
    bump(facets.source, t.source);
  }
  return facets;
}

function bump(rec: Record<string, number>, key: string) {
  rec[key] = (rec[key] ?? 0) + 1;
}

export function search(query: SearchQuery): SearchResult {
  const {
    q = "",
    category,
    region,
    procedureType,
    source,
    openOnly = false,
    minValue,
    maxValue,
    sort = q ? "relevance" : "deadline",
    page = 1,
    pageSize = 10,
  } = query;

  const terms = tokenize(q);
  const today = new Date().toISOString().slice(0, 10);

  // Apply free-text + structured filters.
  let filtered = getTenders().filter((t) => {
    if (!matchesQuery(t, terms)) return false;
    if (category && t.category !== category) return false;
    if (region && t.region !== region) return false;
    if (procedureType && t.procedureType !== procedureType) return false;
    if (source && t.source !== source) return false;
    if (openOnly && t.deadline < today) return false;
    if (minValue != null && (t.estimatedValue ?? 0) < minValue) return false;
    if (maxValue != null && (t.estimatedValue ?? Infinity) > maxValue)
      return false;
    return true;
  });

  // Facets are computed over the filtered set (excluding the free-text impact
  // would require per-facet recomputation; this keeps counts intuitive).
  const facets = buildFacets(filtered);

  const scored: ScoredTender[] = filtered.map((t) => ({
    ...t,
    relevance: score(t, terms),
  }));

  scored.sort((a, b) => {
    switch (sort) {
      case "relevance":
        return b.relevance - a.relevance || b.publishedDate.localeCompare(a.publishedDate);
      case "deadline":
        return a.deadline.localeCompare(b.deadline);
      case "published":
        return b.publishedDate.localeCompare(a.publishedDate);
      case "value":
        return (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0);
      default:
        return 0;
    }
  });

  const total = scored.length;
  const start = (page - 1) * pageSize;
  const items = scored.slice(start, start + pageSize);

  return { total, page, pageSize, items, facets };
}

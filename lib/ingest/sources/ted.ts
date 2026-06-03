import type { TenderSource, CrawlOptions } from "../source";
import type { Tender } from "../../types";
import { fetchJson } from "../http";
import { toTender, isoDate } from "../util";
import { allTerms, matchesAnyTerm } from "../searchTerms";

/**
 * Official EU TED (Tenders Electronic Daily) Search API v3 — no API key.
 *   POST https://api.ted.europa.eu/v3/notices/search
 *
 * Ported from the proven Python crawler: TED rejects complex Lucene-style
 * queries (HTTP 400), so we use a minimal stable query (country=DEU, active
 * scope), paginate, and optionally filter client-side by domain terms.
 */
const ENDPOINT = process.env.TED_API_URL || "https://api.ted.europa.eu/v3/notices/search";
const COUNTRY = "DEU";

const FIELDS = [
  "publication-number",
  "notice-title",
  "buyer-name",
  "buyer-country",
  "place-of-performance",
  "publication-date",
  "deadline-date-lot",
  "classification-cpv",
  "description-lot",
  "links",
];

export const tedSource: TenderSource = {
  id: "ted",
  label: "TED",
  enabled: true,
  async fetch({ limit = 250 }: CrawlOptions): Promise<Tender[]> {
    const maxPages = Number(process.env.TED_MAX_PAGES ?? 4);
    const perPage = Math.min(limit, 250);
    const byUrl = new Map<string, Tender>();

    for (let page = 1; page <= maxPages; page++) {
      let notices: any[];
      try {
        const data = await fetchJson<any>(ENDPOINT, {
          method: "POST",
          timeoutMs: 20000,
          retries: 3,
          body: JSON.stringify({
            query: `buyer-country="${COUNTRY}"`,
            fields: FIELDS,
            page,
            limit: perPage,
            scope: "ACTIVE",
          }),
        });
        notices = data?.notices ?? [];
      } catch {
        break; // network/HTTP error — keep whatever we already have
      }
      if (notices.length === 0) break;
      const before = byUrl.size;
      for (const n of notices) {
        const t = mapNotice(n);
        if (t) byUrl.set(t.sourceUrl, t);
      }
      if (byUrl.size === before) break; // no new items → stop paginating
    }

    let items = [...byUrl.values()];
    // Optional domain filter (F&B clusters) — enable with TED_FILTER_FBE=1.
    if (process.env.TED_FILTER_FBE === "1") {
      const terms = allTerms();
      items = items.filter((t) => matchesAnyTerm(`${t.title} ${t.description} ${t.buyer} ${t.city}`, terms));
    }
    return items;
  },
};

function mapNotice(n: any): Tender | null {
  const pubNo = first(n["publication-number"]);
  const title = first(n["notice-title"]) ?? "(ohne Titel)";
  const placeRaw = first(n["place-of-performance"]);
  const cpvCode = String(first(n["classification-cpv"]) ?? "").slice(0, 8);

  let link = pickLink(n["links"]);
  if (!link && pubNo) link = `https://ted.europa.eu/udl?uri=TED:NOTICE:${pubNo}`;
  if (!link) return null;

  const region = nutsToBundesland(placeRaw);
  const city = cityFromTitle(title) ?? readablePlace(placeRaw) ?? "";

  return toTender({
    source: "TED",
    reference: pubNo || link,
    title,
    description: first(n["description-lot"]) ?? "",
    buyer: first(n["buyer-name"]),
    cpvCode,
    region: region ?? undefined,
    city,
    publishedDate: isoDate(first(n["publication-date"])),
    deadline: isoDate(first(n["deadline-date-lot"])),
    sourceUrl: link,
  });
}

/** TED fields are often lists or language-keyed dicts (prefer German). */
function first(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return first(value[0]);
  if (typeof value === "object") {
    for (const k of ["deu", "DEU", "de", "DE", "eng", "ENG"]) {
      if (k in value) return first(value[k]);
    }
    return first(Object.values(value)[0]);
  }
  return String(value);
}

function pickLink(links: any): string | undefined {
  if (!links || typeof links !== "object") return undefined;
  let link = links.html ?? links.xml;
  if (link && typeof link === "object") link = link.DEU ?? Object.values(link)[0];
  if (Array.isArray(link)) link = link[0];
  return typeof link === "string" ? link : undefined;
}

// NUTS prefix → Bundesland (https://ec.europa.eu/eurostat/web/nuts).
const NUTS: Record<string, string> = {
  DE1: "Baden-Württemberg", DE2: "Bayern", DE3: "Berlin", DE4: "Brandenburg",
  DE5: "Bremen", DE6: "Hamburg", DE7: "Hessen", DE8: "Mecklenburg-Vorpommern",
  DE9: "Niedersachsen", DEA: "Nordrhein-Westfalen", DEB: "Rheinland-Pfalz",
  DEC: "Saarland", DED: "Sachsen", DEE: "Sachsen-Anhalt", DEF: "Schleswig-Holstein",
  DEG: "Thüringen",
};

function nutsToBundesland(code?: string): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c === "DEU" || c === "DE" || c === "") return null;
  return NUTS[c.slice(0, 3)] ?? null;
}

function readablePlace(value?: string): string | null {
  if (!value) return null;
  const v = value.trim();
  return /^DE[0-9A-Z]{0,4}$/.test(v) ? null : v; // bare NUTS code → drop
}

/** TED titles look like "Deutschland-Stadt: …" — extract the city. */
function cityFromTitle(title?: string): string | null {
  if (!title) return null;
  const m = title.match(/\s*Deutschland\s*-\s*([^:]+?):/);
  return m ? m[1].trim() : null;
}

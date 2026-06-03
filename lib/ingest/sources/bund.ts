import type { TenderSource, CrawlOptions } from "../source";
import type { Tender } from "../../types";
import { fetchText } from "../http";
import { toTender, isoDate } from "../util";

/**
 * service.bund.de — Bekanntmachungsservice des Bundes. Ported from the Python
 * crawler: requesting the search listing with `jobsrss=true` returns a clean
 * RSS feed (far more stable than HTML scraping). A browser User-Agent is
 * required (the server resets the connection for bot UAs).
 *
 * The default URL filters to construction tenders (Bauleistungen), matching
 * F&B's domain; override the whole URL via BUND_RSS_URL if needed.
 */
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

function defaultUrl(): string {
  const params = new URLSearchParams({
    nn: "4641482",
    type: "0",
    resultsPerPage: "100",
    sortOrder: "dateOfIssue_dt desc",
    cl2Categories_LeistungenErzeugnisse: "leistung-bauleistungen",
    jobsrss: "true",
  });
  return `https://www.service.bund.de/Content/DE/Ausschreibungen/Suche/Formular.html?${params}`;
}

export const bundSource: TenderSource = {
  id: "bund",
  label: "service.bund.de",
  enabled: true,
  async fetch({ limit = 100 }: CrawlOptions): Promise<Tender[]> {
    const url = process.env.BUND_RSS_URL || defaultUrl();
    const xml = await fetchText(url, {
      timeoutMs: 20000,
      retries: 3,
      headers: { "user-agent": BROWSER_UA },
    });
    return parseRss(xml).slice(0, limit);
  },
};

function parseRss(xml: string): Tender[] {
  const out: Tender[] = [];
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of items) {
    const title = tag(block, "title");
    const link = tag(block, "link") ?? tag(block, "guid");
    if (!title || !link) continue;

    // RSS description is HTML in CDATA with labelled fields, e.g.
    //   Erfüllungsort: <strong>92224 Amberg</strong>
    //   Vergabestelle: <strong>Staatl. Bauamt …</strong>
    //   Angebotsfrist: <strong>22.05.2026 08:30</strong>
    const description = stripTags(tag(block, "description") ?? "");
    const pub = tag(block, "pubDate");

    const buyer = extractLabel(description, ["Vergabestelle", "Auftraggeber"]);
    const place = extractLabel(description, ["Erfüllungsort", "Erfuellungsort", "Ausführungsort", "Ort"]);
    const deadlineRaw = extractLabel(description, ["Angebotsfrist", "Abgabefrist", "Frist"]);

    const t = toTender({
      source: "service.bund.de",
      reference: link,
      title,
      description,
      buyer: buyer ?? undefined,
      city: place ?? undefined,
      region: guessRegion(place ?? "") ?? undefined,
      publishedDate: pub ? isoDate(new Date(pub).toISOString()) : undefined,
      deadline: deadlineRaw ? parseDeDate(deadlineRaw) : undefined,
      sourceUrl: link,
    });
    if (t) out.push(t);
  }
  return out;
}

function tag(block: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : undefined;
}

function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

// Labels that terminate a value, longest first (ported from Python _extract_label).
const STOPS = [
  "Veröffentlichungsende", "Veroeffentlichungsende", "Submission deadline",
  "Place of performance", "Erfüllungsort", "Erfuellungsort", "Ausführungsort",
  "Ausfuehrungsort", "Veröffentlichung", "Veroeffentlichung", "Vergabestelle",
  "Auftraggeber", "Angebotsfrist", "Abgabefrist", "Auftragsart", "Vergabeart",
  "Frist", "Ort",
];

function extractLabel(text: string, labels: string[]): string | null {
  if (!text) return null;
  for (const label of labels) {
    const stop = STOPS.filter((s) => s !== label).map(esc).join("|");
    const re = new RegExp(`${esc(label)}\\s*[:\\-]?\\s*(.+?)(?=\\s*(?:${stop})\\s*[:\\-]|\\s*$)`, "i");
    const m = text.match(re);
    if (m) {
      const v = m[1].replace(/^[\s.,;|·:>]+|[\s.,;|·:>]+$/g, "");
      if (v && v.length < 250) return v;
    }
  }
  return null;
}

const STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg",
  "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen",
  "Rheinland-Pfalz", "Saarland", "Sachsen-Anhalt", "Sachsen", "Schleswig-Holstein",
  "Thüringen",
];

function guessRegion(text: string): string | null {
  const l = text.toLowerCase();
  return STATES.find((s) => l.includes(s.toLowerCase())) ?? null;
}

function parseDeDate(text: string): string | undefined {
  const m = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß").replace(/&nbsp;/g, " ");
}

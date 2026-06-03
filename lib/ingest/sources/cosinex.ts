import { parse, type HTMLElement } from "node-html-parser";
import type { TenderSource, CrawlOptions } from "../source";
import type { Tender } from "../../types";
import { fetchText } from "../http";
import { toTender } from "../util";
import { allTerms, matchesAnyTerm } from "../searchTerms";

/**
 * Cosinex Vergabemarktplatz (VMP Satellite/Center) HTML listing scraper.
 * Ported from the Python crawler. Cosinex search endpoints require an
 * authenticated bidder, so we crawl the public listing — in particular the
 * "welcome.do?method=showTable" page whose table holds current notices:
 *   Veröffentlicht | Frist | Kurzbezeichnung | Typ | Plattform
 * — then filter client-side by domain terms.
 *
 * Browser User-Agent required. Configure per portal via env:
 *   COSINEX_BASE_URL, COSINEX_LISTING_PATHS (comma-separated).
 */
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

const DEFAULT_BASE = "https://www.vergabeportal-bw.de";
const DEFAULT_PATHS = [
  "/Satellite/company/welcome.do?method=showTable&fromSearch=1&tableSortPROJECT_RESULT=1&tableSortAttributePROJECT_RESULT=publicationDate",
  "/Satellite/company/welcome.do",
  "/VMPSatellite/notice",
  "/VMPCenter/notice",
];

const NOTICE_RE = /\/(notice|public).*?(CXP|[0-9]{4,})/i;

export const cosinexSource: TenderSource = {
  id: "cosinex",
  label: "Vergabemarktplatz (cosinex)",
  enabled: Boolean(process.env.COSINEX_BASE_URL) || process.env.COSINEX_ENABLE === "1",
  async fetch({ limit = 100 }: CrawlOptions): Promise<Tender[]> {
    const base = (process.env.COSINEX_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
    const paths = process.env.COSINEX_LISTING_PATHS?.split(",").map((s) => s.trim()) || DEFAULT_PATHS;
    const byUrl = new Map<string, Tender>();

    for (const path of paths) {
      const url = path.startsWith("http") ? path : base + (path.startsWith("/") ? path : `/${path}`);
      let html: string;
      try {
        html = await fetchText(url, { timeoutMs: 20000, retries: 2, headers: { "user-agent": BROWSER_UA } });
      } catch {
        continue; // try next listing path
      }
      for (const t of parseListing(html, base)) byUrl.set(t.sourceUrl, t);
      if (byUrl.size > 0) break; // first working path wins
    }

    const terms = allTerms();
    return [...byUrl.values()]
      .filter((t) => matchesAnyTerm(`${t.title} ${t.description} ${t.buyer} ${t.city}`, terms))
      .slice(0, limit);
  },
};

function parseListing(html: string, base: string): Tender[] {
  const root = parse(html);
  const out: Tender[] = [];

  // Strategy 0: the welcome.do table with a "Kurzbezeichnung" header.
  for (const tbl of root.querySelectorAll("table")) {
    const headerText = tbl.querySelector("tr")?.text.toLowerCase() ?? "";
    if (!headerText.includes("kurzbezeichnung")) continue;
    for (const tr of tbl.querySelectorAll("tr").slice(1)) {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 3) continue;
      const titleCell = tds[2] ?? tds[tds.length - 1];
      const link =
        titleCell.querySelectorAll("a").find((a) => /\/(notice|public)/.test(a.getAttribute("href") ?? "")) ??
        titleCell.querySelector("a");
      const href = link?.getAttribute("href")?.trim();
      const title = link?.text.trim();
      if (!href || !title || title.length < 4) continue;
      out.push(
        toTender({
          source: "Vergabemarktplatz (cosinex)",
          reference: abs(base, href),
          title,
          buyer: tds[4]?.text.trim() || undefined,
          publishedDate: parseDeDate(tds[0]?.text),
          deadline: parseDeDate(tds[1]?.text),
          description: tds[3]?.text.trim() ? `Typ: ${tds[3].text.trim()}` : undefined,
          sourceUrl: abs(base, href),
        })!,
      );
    }
    if (out.length) return out.filter(Boolean);
  }

  // Fallback: any anchor that looks like a notice link.
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href")?.trim();
    const title = a.text.trim();
    if (!href || NOTICE_RE.test(href) === false) continue;
    if (!title || title.length < 6 || inNav(a)) continue;
    const t = toTender({
      source: "Vergabemarktplatz (cosinex)",
      reference: abs(base, href),
      title,
      sourceUrl: abs(base, href),
    });
    if (t) out.push(t);
  }
  return out;
}

function abs(base: string, href: string): string {
  if (href.startsWith("http")) return href;
  return base + (href.startsWith("/") ? href : `/${href}`);
}

function parseDeDate(text?: string): string | undefined {
  if (!text) return undefined;
  const m = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

const NAV_RE = /\b(nav|navigation|menu|footer|header|sidebar|aside|breadcrumb)\b/i;

function inNav(el: HTMLElement): boolean {
  let cur: HTMLElement | null = el;
  for (let i = 0; i < 6 && cur; i++) {
    const tag = cur.tagName?.toLowerCase();
    if (tag && ["nav", "footer", "header", "aside"].includes(tag)) return true;
    const cls = cur.getAttribute("class") ?? "";
    const id = cur.getAttribute("id") ?? "";
    if (NAV_RE.test(cls) || NAV_RE.test(id)) return true;
    cur = cur.parentNode as HTMLElement | null;
  }
  return false;
}

import type { TenderSource, CrawlOptions } from "../source";
import type { Tender } from "../../types";
import { fetchText } from "../http";
import { toTender, isoDate, toNumber } from "../util";

/**
 * Generic adapter for cosinex-based German procurement portals (DTVP,
 * Vergabemarktplatz, eVergabe.de). These expose public notice listings as
 * RSS/Atom feeds. Because each deployment uses its own feed URL, the URL is
 * supplied via an environment variable; without it the source disables itself.
 *
 * This keeps the crawl stable: an unconfigured or unreachable portal simply
 * contributes nothing instead of breaking the run.
 */
export function makeRssSource(cfg: {
  id: string;
  label: string;
  /** Env var holding the feed URL, e.g. "DTVP_FEED_URL". */
  feedEnv: string;
}): TenderSource {
  const feedUrl = process.env[cfg.feedEnv];
  return {
    id: cfg.id,
    label: cfg.label,
    enabled: Boolean(feedUrl),
    async fetch({ limit = 50 }: CrawlOptions): Promise<Tender[]> {
      if (!feedUrl) return [];
      const xml = await fetchText(feedUrl, { timeoutMs: 15000, retries: 3 });
      return parseRss(xml, cfg.label).slice(0, limit);
    },
  };
}

/** Minimal RSS/Atom <item>/<entry> parser — no XML dependency required. */
function parseRss(xml: string, source: string): Tender[] {
  const blocks = matchAll(xml, /<(item|entry)\b[\s\S]*?<\/\1>/gi);
  const out: Tender[] = [];
  for (const block of blocks) {
    const title = field(block, "title");
    const link = attr(block, "link", "href") ?? field(block, "link") ?? field(block, "guid");
    const description = stripTags(field(block, "description") ?? field(block, "summary") ?? "");
    const date = field(block, "pubDate") ?? field(block, "published") ?? field(block, "updated");
    if (!title) continue;

    const tender = toTender({
      source,
      reference: field(block, "guid") ?? link ?? title,
      title,
      description,
      buyer: extract(description, /(?:Vergabestelle|Auftraggeber)[:\s]+([^\n.;]+)/i),
      region: extract(description, /(?:Ort|Region|Land)[:\s]+([^\n.;]+)/i),
      estimatedValue: toNumber(extract(description, /([\d.,]+)\s*(?:EUR|€)/i)),
      publishedDate: isoDate(date),
      sourceUrl: link ?? "",
    });
    if (tender) out.push(tender);
  }
  return out;
}

function matchAll(s: string, re: RegExp): string[] {
  return [...s.matchAll(re)].map((m) => m[0]);
}

function field(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : undefined;
}

function attr(block: string, tag: string, name: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]+)"`, "i"));
  return m ? decode(m[1]) : undefined;
}

function extract(s: string, re: RegExp): string | undefined {
  const m = s.match(re);
  return m ? m[1].trim() : undefined;
}

function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&szlig;/g, "ß");
}

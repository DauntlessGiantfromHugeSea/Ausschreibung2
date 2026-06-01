import type { ProcedureType, Tender } from "../types";
import { categoryForCpv } from "./cpv";

/**
 * Crawler for the official EU TED (Tenders Electronic Daily) search API.
 * Docs: https://docs.ted.europa.eu/api/  Endpoint: POST /v3/notices/search
 *
 * TED aggregates above-threshold notices for all EU member states, including
 * German contracting authorities. This runs unmodified in any environment with
 * outbound access to api.ted.europa.eu; where that host is blocked, the caller
 * keeps the bundled seed dataset instead.
 */

const ENDPOINT = "https://api.ted.europa.eu/v3/notices/search";

interface TedOptions {
  /** ISO country code filter, default Germany. */
  country?: string;
  /** Max notices to fetch. */
  limit?: number;
  /** Free-text expert query fragment, e.g. 'FT="Anhängerkupplung"'. */
  expert?: string;
}

export async function crawlTed(opts: TedOptions = {}): Promise<Tender[]> {
  const { country = "DEU", limit = 50, expert } = opts;
  const query = [`(country=${country})`, expert].filter(Boolean).join(" AND ");

  const body = {
    query,
    fields: [
      "publication-number",
      "notice-title",
      "buyer-name",
      "description-proc",
      "classification-cpv",
      "deadline-receipt-tender-date-lot",
      "publication-date",
      "estimated-value-cur-proc",
      "estimated-value-proc",
      "procedure-type",
      "place-performance",
      "links",
    ],
    page: 1,
    limit: Math.min(limit, 100),
    scope: "ALL",
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TED API ${res.status} ${res.statusText}`);

  const data = await res.json();
  const notices: any[] = data.notices ?? data.results ?? [];
  return notices.map(mapNotice).filter((t): t is Tender => t !== null);
}

function mapNotice(n: any): Tender | null {
  const ref = pick(n["publication-number"]) ?? pick(n.publicationNumber);
  const title = pick(n["notice-title"]) ?? pick(n.title);
  if (!ref || !title) return null;

  const cpvCode = String(pick(n["classification-cpv"]) ?? "").slice(0, 8) || "00000000";
  const cpvLabel = pick(n["cpv-label"]) ?? "Nicht klassifiziert";

  return {
    id: slugify(`${title}-${ref}`),
    reference: String(ref),
    title: String(title),
    description: pick(n["description-proc"]) ?? "",
    buyer: pick(n["buyer-name"]) ?? "Unbekannte Vergabestelle",
    buyerType: "Öffentlicher Auftraggeber",
    cpvCode,
    cpvLabel: String(cpvLabel),
    category: categoryForCpv(cpvCode),
    region: pick(n["place-performance"]) ?? "Bundesweit",
    city: pick(n["place-performance-city"]) ?? "",
    country: "DE",
    procedureType: normalizeProcedure(pick(n["procedure-type"])),
    publishedDate: isoDate(pick(n["publication-date"])),
    deadline: isoDate(pick(n["deadline-receipt-tender-date-lot"])),
    estimatedValue: toNumber(pick(n["estimated-value-proc"])),
    currency: pick(n["estimated-value-cur-proc"]) ?? "EUR",
    contactEmail: pick(n["buyer-email"]) ?? "",
    sourceUrl: pick(n.links?.html) ?? `https://ted.europa.eu/de/notice/-/detail/${ref}`,
    source: "TED",
  };
}

/** TED multilingual fields arrive as objects keyed by language or arrays. */
function pick(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return pick(v[0]);
  if (typeof v === "object") return v.deu ?? v.eng ?? v.de ?? Object.values(v)[0] as string;
  return String(v);
}

function normalizeProcedure(v?: string): ProcedureType {
  const s = (v ?? "").toLowerCase();
  if (s.includes("open") || s.includes("offen")) return "Offenes Verfahren";
  if (s.includes("restricted") || s.includes("nicht offen")) return "Nicht offenes Verfahren";
  if (s.includes("negoti") || s.includes("verhandl")) return "Verhandlungsverfahren";
  if (s.includes("dialog")) return "Wettbewerblicher Dialog";
  return "Offenes Verfahren";
}

function isoDate(v?: string): string {
  if (!v) return new Date().toISOString().slice(0, 10);
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

function toNumber(v?: string | number): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
  return isNaN(n) ? null : n;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[äöü]/g, (m) => ({ ä: "ae", ö: "oe", ü: "ue" }[m] ?? m))
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

import type { Tender } from "../types";
import { toTender, isoDate } from "./util";

/**
 * Maps records exported from the Python platform (ausschreibungsplattform-fbe)
 * into our Tender model. Accepts either the JSON shape (Tender.to_dict) or the
 * semicolon-delimited CSV export (/export/csv).
 */

type Row = Record<string, string | null | undefined>;

export function parseImport(text: string): Tender[] {
  const trimmed = text.trimStart();
  const rows: Row[] = trimmed.startsWith("[") || trimmed.startsWith("{")
    ? parseJsonRows(trimmed)
    : parseCsv(text);
  return rows.map(mapRow).filter((t): t is Tender => t !== null);
}

function parseJsonRows(text: string): Row[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.tenders ?? data.results ?? [];
  return arr as Row[];
}

function mapRow(r: Row): Tender | null {
  const title = (r.title ?? "").toString().trim();
  const url = (r.url ?? r.sourceUrl ?? "").toString().trim();
  if (!title || !url) return null;

  const cpvRaw = (r.cpv_codes ?? r.cpvCode ?? "").toString();
  const cpvCode = (cpvRaw.match(/\d{6,8}/)?.[0] ?? "").slice(0, 8);
  const description =
    (r.description ?? "").toString().trim() ||
    (r.matched_terms ? `Treffer: ${r.matched_terms}` : "");

  return toTender({
    source: (r.portal ?? r.source ?? "Import").toString(),
    reference: url, // url is unique → stable dedup key
    title,
    description,
    buyer: (r.contracting_authority ?? r.buyer ?? "").toString() || undefined,
    city: (r.location ?? r.city ?? "").toString() || undefined,
    region: (r.region ?? "").toString() || undefined,
    cpvCode,
    publishedDate: r.publication_date ? isoDate(r.publication_date.toString()) : undefined,
    deadline: r.deadline ? isoDate(r.deadline.toString()) : undefined,
    sourceUrl: url,
  });
}

/**
 * Minimal CSV parser supporting the export format: configurable delimiter
 * (auto-detects ';' vs ','), quoted fields, escaped quotes ("") and newlines
 * inside quotes. First row is the header.
 */
export function parseCsv(text: string): Row[] {
  const delim = detectDelimiter(text);
  const records = tokenizeCsv(text, delim);
  if (records.length === 0) return [];
  const header = records[0].map((h) => h.trim());
  return records.slice(1).map((cells) => {
    const row: Row = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") >= 0 ? text.indexOf("\n") : text.length);
  return (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

function tokenizeCsv(text: string, delim: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") out.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); out.push(row); }
  return out;
}

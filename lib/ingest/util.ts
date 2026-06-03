import type { ProcedureType, Tender } from "../types";
import { categoryForCpv } from "./cpv";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[äöü]/g, (m) => ({ ä: "ae", ö: "oe", ü: "ue" })[m] ?? m)
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function normalizeProcedure(v?: string): ProcedureType {
  const s = (v ?? "").toLowerCase();
  if (s.includes("open") || s.includes("offen")) return "Offenes Verfahren";
  if (s.includes("restricted") || s.includes("nicht offen")) return "Nicht offenes Verfahren";
  if (s.includes("negoti") || s.includes("verhandl")) return "Verhandlungsverfahren";
  if (s.includes("dialog")) return "Wettbewerblicher Dialog";
  if (s.includes("freihänd") || s.includes("freihaend")) return "Freihändige Vergabe";
  return "Offenes Verfahren";
}

export function isoDate(v?: string | number | null): string {
  if (v == null || v === "") return new Date().toISOString().slice(0, 10);
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

export function toNumber(v?: string | number | null): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/**
 * Build a Tender from loosely-typed source fields, filling sensible defaults.
 * Returns null when the mandatory title/reference are missing.
 */
export function toTender(input: Partial<Tender> & { title?: string; reference?: string; source: string }): Tender | null {
  const title = (input.title ?? "").trim();
  const reference = (input.reference ?? "").trim();
  if (!title || !reference) return null;

  const cpvCode = (input.cpvCode ?? "00000000").toString().slice(0, 8);
  return {
    id: input.id || slugify(`${title}-${reference}`),
    reference,
    title,
    description: input.description ?? "",
    buyer: input.buyer ?? "Unbekannte Vergabestelle",
    buyerType: input.buyerType ?? "Öffentlicher Auftraggeber",
    cpvCode,
    cpvLabel: input.cpvLabel ?? "Nicht klassifiziert",
    category: input.category ?? categoryForCpv(cpvCode),
    region: input.region ?? "Bundesweit",
    city: input.city ?? "",
    country: input.country ?? "DE",
    procedureType: input.procedureType ?? "Offenes Verfahren",
    publishedDate: input.publishedDate ?? new Date().toISOString().slice(0, 10),
    deadline: input.deadline ?? new Date().toISOString().slice(0, 10),
    estimatedValue: input.estimatedValue ?? null,
    currency: input.currency ?? "EUR",
    contactEmail: input.contactEmail ?? "",
    sourceUrl: input.sourceUrl ?? "",
    source: input.source,
  };
}

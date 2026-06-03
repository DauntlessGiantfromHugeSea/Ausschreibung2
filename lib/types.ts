// Domain model for a public procurement notice (Ausschreibung).
// Field names follow the structure of German/EU tender notices (TED, service.bund.de).

export type ProcedureType =
  | "Offenes Verfahren"
  | "Nicht offenes Verfahren"
  | "Verhandlungsverfahren"
  | "Wettbewerblicher Dialog"
  | "Freihändige Vergabe";

export interface Tender {
  /** Stable internal id (slug). */
  id: string;
  /** Official tender reference / Vergabenummer. */
  reference: string;
  title: string;
  description: string;
  /** Contracting authority / Vergabestelle. */
  buyer: string;
  buyerType: string;
  /** Common Procurement Vocabulary code, e.g. "34913000". */
  cpvCode: string;
  cpvLabel: string;
  /** Coarse category derived from the CPV division. */
  category: string;
  /** German federal state, e.g. "Bayern", or "Bundesweit". */
  region: string;
  city: string;
  country: string;
  procedureType: ProcedureType;
  /** ISO date (yyyy-mm-dd). */
  publishedDate: string;
  /** ISO date — Angebotsfrist. */
  deadline: string;
  /** Estimated contract value in EUR (net), or null if not disclosed. */
  estimatedValue: number | null;
  currency: string;
  contactEmail: string;
  sourceUrl: string;
  /** Origin portal, e.g. "TED", "DTVP", "Vergabemarktplatz", "eVergabe.de". */
  source: string;
}

export interface SearchFacets {
  category: Record<string, number>;
  region: Record<string, number>;
  procedureType: Record<string, number>;
  source: Record<string, number>;
}

export interface SearchQuery {
  q?: string;
  category?: string;
  region?: string;
  procedureType?: string;
  source?: string;
  /** Only tenders whose deadline is on/after today. */
  openOnly?: boolean;
  minValue?: number;
  maxValue?: number;
  sort?: "relevance" | "deadline" | "published" | "value";
  page?: number;
  pageSize?: number;
}

export interface ScoredTender extends Tender {
  /** 0–100 keyword relevance score for the current query (0 when no query). */
  relevance: number;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: ScoredTender[];
  facets: SearchFacets;
}

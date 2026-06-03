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
  status: Record<string, number>;
}

export interface SearchQuery {
  q?: string;
  category?: string;
  region?: string;
  procedureType?: string;
  source?: string;
  /** Filter by workflow status (neu/geprüft/…). */
  status?: string;
  /** Minimum F&B relevance level: "high" | "medium" | "low". */
  minLevel?: string;
  /** Only tenders whose deadline is on/after today. */
  openOnly?: boolean;
  minValue?: number;
  maxValue?: number;
  sort?: "relevance" | "deadline" | "published" | "value" | "fbe";
  page?: number;
  pageSize?: number;
}

export interface ScoredTender extends Tender {
  /** 0–100 keyword relevance score for the current query (0 when no query). */
  relevance: number;
  /** 0–100 F&B domain-cluster relevance (Flüssigboden/ZFSV/thermolith …). */
  fbeScore: number;
  /** Level derived from fbeScore: high/medium/low/none. */
  fbeLevel: string;
  /** Workflow status (neu/geprüft/interessant/…). */
  status: string;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: ScoredTender[];
  facets: SearchFacets;
}

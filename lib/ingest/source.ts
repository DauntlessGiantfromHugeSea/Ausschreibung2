import type { Tender } from "../types";

export interface CrawlOptions {
  /** Max notices to request per source. */
  limit?: number;
  /** Optional free-text filter (source-specific interpretation). */
  query?: string;
  /** ISO country filter where supported (default DEU/DE). */
  country?: string;
}

/**
 * A tender data source (one procurement platform). Each source is fully
 * self-contained: it must never throw for "no data" — it returns an array
 * (possibly empty) and lets the runner isolate hard failures.
 */
export interface TenderSource {
  /** Stable id, e.g. "ted". */
  id: string;
  /** Human label used as Tender.source and in the UI facet, e.g. "TED". */
  label: string;
  /** Whether this source participates in a default crawl run. */
  enabled: boolean;
  /** Fetch and normalize notices into the common Tender shape. */
  fetch(opts: CrawlOptions): Promise<Tender[]>;
}

export interface SourceReport {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  ms: number;
}

export interface CrawlReport {
  total: number;
  written: boolean;
  sources: SourceReport[];
}

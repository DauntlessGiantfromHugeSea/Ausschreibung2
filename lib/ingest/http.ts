/**
 * Resilient HTTP helpers for crawlers: per-request timeout, retries with
 * exponential backoff, and a realistic User-Agent. Designed so a slow or
 * flaky portal never hangs or crashes the whole crawl.
 */

export interface FetchOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  /** Per-attempt timeout in ms (default 15000). */
  timeoutMs?: number;
  /** Number of retries on failure (default 3). */
  retries?: number;
}

const DEFAULT_UA =
  "auftrag-ai-crawler/1.0 (+https://fb-eng.de; tender aggregation)";

export async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {},
): Promise<Response> {
  const { method = "GET", headers = {}, body, timeoutMs = 15000, retries = 3 } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        headers: { "user-agent": DEFAULT_UA, ...headers },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      // Retry transient server errors; return everything else to the caller.
      if (res.status >= 500 && attempt < retries) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
    // Exponential backoff: 0.5s, 1s, 2s, …
    if (attempt < retries) {
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchJson<T = unknown>(url: string, opts?: FetchOptions): Promise<T> {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { accept: "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchText(url: string, opts?: FetchOptions): Promise<string> {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return await res.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

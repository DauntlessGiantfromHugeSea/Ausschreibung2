import path from "node:path";

/**
 * Bundled, read-only data shipped with the app (the seed dataset). Lives
 * inside the image/repo.
 */
export const BUNDLED_DATA_DIR = path.join(process.cwd(), "data");

/**
 * Writable data directory for runtime state (user store, crawled tenders).
 * In Docker, point AUFTRAG_DATA_DIR at a mounted volume so accounts and
 * crawled notices survive container restarts. Defaults to ./data for local dev.
 */
export const WRITABLE_DATA_DIR =
  process.env.AUFTRAG_DATA_DIR || BUNDLED_DATA_DIR;

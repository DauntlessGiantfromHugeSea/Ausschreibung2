import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { WRITABLE_DATA_DIR } from "./paths";

const FILE = path.join(WRITABLE_DATA_DIR, "tender-meta.json");

export const STATUSES = [
  "neu",
  "geprüft",
  "interessant",
  "uninteressant",
  "beworben",
  "archiviert",
] as const;
export type TenderStatus = (typeof STATUSES)[number];

export interface Note {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface TenderMeta {
  status: TenderStatus;
  notes: Note[];
  updatedAt: string;
}

type MetaStore = Record<string, TenderMeta>;

let cache: MetaStore | null = null;

function read(): MetaStore {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, "utf-8")) as MetaStore;
  } catch {
    cache = {};
  }
  return cache;
}

function write(store: MetaStore): void {
  fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf-8");
  cache = store;
}

export function getMeta(ref: string): TenderMeta {
  return read()[ref] ?? { status: "neu", notes: [], updatedAt: "" };
}

/** Status for many tenders at once (for list rendering / filtering). */
export function getStatuses(refs: string[]): Record<string, TenderStatus> {
  const store = read();
  const out: Record<string, TenderStatus> = {};
  for (const r of refs) out[r] = store[r]?.status ?? "neu";
  return out;
}

export function setStatus(ref: string, status: TenderStatus): void {
  if (!STATUSES.includes(status)) throw new Error("Ungültiger Status.");
  const store = read();
  const meta = store[ref] ?? { status: "neu", notes: [], updatedAt: "" };
  meta.status = status;
  meta.updatedAt = new Date().toISOString();
  store[ref] = meta;
  write(store);
}

export function addNote(ref: string, author: string, text: string): Note {
  const t = text.trim();
  if (!t) throw new Error("Notiz darf nicht leer sein.");
  const store = read();
  const meta = store[ref] ?? { status: "neu" as TenderStatus, notes: [], updatedAt: "" };
  const note: Note = {
    id: crypto.randomUUID(),
    author,
    text: t,
    createdAt: new Date().toISOString(),
  };
  meta.notes.unshift(note);
  meta.updatedAt = note.createdAt;
  store[ref] = meta;
  write(store);
  return note;
}

export function deleteNote(ref: string, noteId: string): void {
  const store = read();
  const meta = store[ref];
  if (!meta) return;
  meta.notes = meta.notes.filter((n) => n.id !== noteId);
  write(store);
}

export function resetMetaCache(): void {
  cache = null;
}

import type { Tender } from "./types";
import { fbeRelevance } from "./ingest/searchTerms";

export interface TenderInsight {
  /** Plain-language summary (Klartext) of the notice. */
  summary: string;
  /** Bullet-point key facts. */
  highlights: string[];
  /** 0–100 fit for the given profile/query (heuristic or model-derived). */
  fitScore: number;
  /** Whether a real LLM produced this (vs. the offline heuristic). */
  model: string;
}

const MODEL = "claude-sonnet-4-6";

/**
 * Produces a Klartext insight for a tender. Uses the Anthropic API when
 * ANTHROPIC_API_KEY is set and reachable; otherwise falls back to a
 * deterministic, offline heuristic so the feature always works.
 */
export async function summarizeTender(
  tender: Tender,
  profile?: string,
): Promise<TenderInsight> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      return await summarizeWithLLM(tender, profile, key);
    } catch (err) {
      console.warn("LLM summary failed, falling back to heuristic:", err);
    }
  }
  return heuristicInsight(tender, profile);
}

async function summarizeWithLLM(
  tender: Tender,
  profile: string | undefined,
  key: string,
): Promise<TenderInsight> {
  const prompt = `Du bist ein Assistent für öffentliche Ausschreibungen. Fasse die folgende Ausschreibung in einfachem Deutsch zusammen und bewerte die Eignung für das Profil.

PROFIL: ${profile || "Allgemeines Unternehmen"}

AUSSCHREIBUNG:
Titel: ${tender.title}
Auftraggeber: ${tender.buyer}
Beschreibung: ${tender.description}
CPV: ${tender.cpvCode} (${tender.cpvLabel})
Auftragswert: ${tender.estimatedValue ?? "n/a"} ${tender.currency}
Frist: ${tender.deadline}

Antworte als JSON mit den Feldern: summary (string, 2-3 Sätze), highlights (string[], 3-5 Stichpunkte), fitScore (0-100).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "{}";
  const json = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  return {
    summary: String(json.summary ?? ""),
    highlights: Array.isArray(json.highlights) ? json.highlights.map(String) : [],
    fitScore: clamp(Number(json.fitScore) || 0),
    model: MODEL,
  };
}

/** Offline, deterministic insight — no network required. */
function heuristicInsight(tender: Tender, profile?: string): TenderInsight {
  const value =
    tender.estimatedValue != null
      ? new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: tender.currency,
          maximumFractionDigits: 0,
        }).format(tender.estimatedValue)
      : "nicht angegeben";

  const days = daysUntil(tender.deadline);
  const deadlineNote =
    days >= 0 ? `Noch ${days} Tage bis zur Frist.` : "Frist abgelaufen.";

  const summary =
    `${tender.buyer} sucht im Rahmen eines ${tender.procedureType} Leistungen im Bereich „${tender.cpvLabel}". ` +
    `Geschätzter Auftragswert: ${value}. ${deadlineNote}`;

  const highlights = [
    `Kategorie: ${tender.category} (CPV ${tender.cpvCode})`,
    `Region: ${tender.region}, ${tender.city}`,
    `Verfahren: ${tender.procedureType}`,
    `Angebotsfrist: ${formatDate(tender.deadline)}`,
    `Auftragswert: ${value}`,
  ];

  return {
    summary,
    highlights,
    fitScore: heuristicFit(tender, profile),
    model: "heuristik-offline",
  };
}

function heuristicFit(tender: Tender, profile?: string): number {
  const text = `${tender.title} ${tender.description} ${tender.category} ${tender.cpvLabel}`;
  // Without a profile, fall back to the F&B domain-cluster relevance.
  if (!profile) return fbeRelevance(text);
  const p = profile.toLowerCase();
  const words = p.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return fbeRelevance(text);
  const haystack = text.toLowerCase();
  const hits = words.filter((w) => haystack.includes(w)).length;
  return clamp(Math.round((hits / words.length) * 100));
}

function daysUntil(iso: string): number {
  const d = new Date(iso + "T00:00:00Z").getTime();
  return Math.ceil((d - Date.now()) / 86_400_000);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(
    new Date(iso + "T00:00:00Z"),
  );
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Domain search terms for F&B Engineering, ported from the Python crawler's
 * config/search_terms.yaml. F&B's core business is Flüssigboden / ZFSV and
 * thermally stabilising soils (pro thermolith) for cable-trench backfilling,
 * plus adjacent civil-engineering fields (Tiefbau, Erdkabel, Verfüllung …).
 *
 * Used to (a) filter crawled notices down to relevant tenders and (b) score
 * relevance by weighted cluster hits.
 */

export type ClusterWeight = "very_high" | "high" | "medium" | "low";

export const WEIGHT_POINTS: Record<ClusterWeight, number> = {
  very_high: 30,
  high: 20,
  medium: 10,
  low: 4,
};

export interface Cluster {
  name: string;
  weight: ClusterWeight;
  terms: string[];
}

export const CLUSTERS: Cluster[] = [
  {
    name: "Flüssigboden / ZFSV / RSS-Flüssigboden",
    weight: "very_high",
    terms: [
      "Flüssigboden", "Fluessigboden", "RSS-Flüssigboden", "RSS Flüssigboden",
      "RSS-Verfahren", "ZFSV", "zeitweise fließfähiger selbstverdichtender Verfüllbaustoff",
      "fließfähiger selbstverdichtender Verfüllbaustoff", "selbstverdichtender Verfüllbaustoff",
      "zeitweise fließfähig", "Flüssigbodenverfahren", "Flüssigverfüllung",
      "Verfüllung mit Flüssigboden", "Leitungsgrabenverfüllung mit Flüssigboden",
      "RAL GZ 507", "ZTV-A StB", "Güteüberwachter Flüssigboden", "Flüssigbodenrezeptur",
    ],
  },
  {
    name: "Thermisch stabilisierende Böden / thermische Bettung",
    weight: "very_high",
    terms: [
      "thermisch stabilisierender Boden", "thermisch stabilisierende Böden",
      "thermisch optimierter Boden", "thermisch leitfähiger Boden",
      "thermisch leitfähiger Verfüllbaustoff", "wärmeleitfähiger Verfüllbaustoff",
      "wärmeleitfähiger Boden", "thermische Stabilisierung", "thermische Bodenstabilisierung",
      "thermische Verfüllung", "thermische Leitfähigkeit Boden", "Wärmeleitfähigkeit Boden",
      "λ-Wert Boden", "Lambda-Wert Boden", "spezifischer Erdwärmewiderstand",
      "Erdwärmewiderstand", "thermische Kabelbettung", "thermisch optimierte Kabelbettung",
      "thermische Einbettung Erdkabel", "wärmeableitende Bettung",
    ],
  },
  {
    name: "pro thermolith / pro thermolith TS B4",
    weight: "very_high",
    terms: [
      "pro thermolith", "pro thermolith TS", "pro thermolith TS B4", "Thermolith",
      "Thermolith TS", "Thermolith TS B4", "thermolithischer Boden",
      "thermolithischer Verfüllbaustoff", "thermolithische Kabelbettung", "TS B4", "TS-B4",
    ],
  },
  {
    name: "Verfüllung / Hohlräume",
    weight: "high",
    terms: [
      "Verfüllung", "Rückverfüllung", "Hohlraumverfüllung", "Bodenaustausch",
      "Verfüllbaustoff", "Bodenverfüllung", "Schachtverfüllung", "Grabenverfüllung",
    ],
  },
  {
    name: "Erdkabel / Stromtrassen / Kabelgraben",
    weight: "high",
    terms: [
      "Erdkabel", "Erdkabeltrasse", "Kabeltrasse", "Stromtrasse", "Energietrasse",
      "Kabelgraben", "Kabelgrabenverfüllung", "Kabelbettung", "Kabelschutzrohr",
      "Leerrohrtrasse", "Hochspannungskabel", "Höchstspannungskabel", "Mittelspannungskabel",
      "110-kV-Kabel", "220-kV-Kabel", "380-kV-Kabel", "HGÜ", "Netzausbau",
      "Stromnetzausbau", "Kabeltiefbau", "Tiefbau für Erdkabel", "Bettung von Erdkabeln",
    ],
  },
  {
    name: "Spundwand / Verbau / Baugrubensicherung",
    weight: "high",
    terms: [
      "Spundwand", "Spundwände", "Spundwandarbeiten", "Verbau", "Verbauarbeiten",
      "Trägerbohlwand", "Bohrpfahl", "Bohrpfahlwand", "Pfahlgründung", "Pfahlwand",
      "Mixed-in-Place", "MIP-Wand", "DSV", "Düsenstrahlverfahren", "Schmalwand",
      "Dichtwand", "Schlitzwand",
    ],
  },
  {
    name: "Leitungsbau / Rohrleitungen",
    weight: "high",
    terms: [
      "Leitungsgraben", "Rohrgraben", "Kanalgraben", "Leitungsbau", "Kanalbau",
      "Kanalsanierung", "Rohrleitung", "Rohrleitungsbau", "Gasleitung", "Wasserleitung",
      "Trinkwasserleitung", "Abwasserleitung", "Wasserstoffleitung", "Fernwärme",
      "Fernwärmeleitung", "Wärmenetz", "Düker",
    ],
  },
  {
    name: "Tiefbau / Baugruben / Erdarbeiten",
    weight: "high",
    terms: [
      "Tiefbau", "Tiefbauarbeiten", "Baugrube", "Baugrubenverfüllung", "Baugrubensicherung",
      "Erdarbeiten", "Erdaushub", "Schachtbau", "Schachtarbeiten", "Kanalbauarbeiten",
      "Asphaltdecke", "Asphaltbau",
    ],
  },
  {
    name: "DIN-Normen Bauausführung",
    weight: "medium",
    terms: [
      "DIN 18300", "DIN 18301", "DIN 18303", "DIN 18306", "DIN 18307", "DIN 18308",
      "DIN 18315", "DIN 18316", "DIN 18317", "DIN 18318", "DIN 18459",
    ],
  },
  {
    name: "Sonderthemen / Schwierige Standorte",
    weight: "medium",
    terms: [
      "Deichbau", "Hafenbau", "Bahnbau", "kontaminierte Böden", "Altlasten",
      "Ersatzbaustoffverordnung", "Baugrundverbesserung", "Bodenverbesserung",
      "Grundwasserabsenkung", "Wasserhaltung", "Bodensanierung", "Rückbau", "Abbrucharbeiten",
    ],
  },
  {
    name: "Allgemein",
    weight: "low",
    terms: [
      "Straßenbau", "Strassenbau", "Erdbau", "Baugrund", "Hochbau", "Ingenieurbau",
      "Brückenbau", "Bauleistung", "Bauleistungen",
    ],
  },
];

/** Reduced term set for portals that allow server-side free-text search. */
export const QUERY_TERMS: string[] = [
  "Flüssigboden", "ZFSV", "RSS-Flüssigboden", "fließfähiger Verfüllbaustoff",
  "Verfüllbaustoff", "Hohlraumverfüllung", "thermisch stabilisierende Böden",
  "thermisch optimierter Verfüllbaustoff", "wärmeleitfähiger Verfüllbaustoff",
  "thermische Kabelbettung", "Erdkabel thermische Verfüllung", "pro thermolith",
  "pro thermolith TS B4", "Spundwand", "Tiefbau", "Fernwärme Verfüllung",
];

/** EU CPV codes relevant to F&B's fields (civil engineering / cable / backfill). */
export const CPV_CODES: string[] = [
  "45112000", "45111240", "45111200", "45111250", "45112100", "45112500",
  "45232100", "45231220", "45231300", "45232140", "45232150", "45232400",
  "45233000", "45221250", "45262210", "45262212", "45262213", "45262220",
  "45231400", "45231600",
];

export type RelevanceLevel = "high" | "medium" | "low" | "none";

/** Maps a 0–100 score to a level (thresholds mirror the Python platform). */
export function relevanceLevel(score: number): RelevanceLevel {
  if (score >= 60) return "high";
  if (score >= 20) return "medium";
  if (score > 0) return "low";
  return "none";
}

/** Cluster terms found in the text (for "matched terms" display). */
export function matchedClusters(text: string): string[] {
  if (!text) return [];
  const hay = text.toLowerCase();
  return CLUSTERS.filter((c) => c.terms.some((t) => hay.includes(t.toLowerCase()))).map((c) => c.name);
}

let _allTerms: string[] | null = null;

/** Flat, de-duplicated list of every cluster term. */
export function allTerms(): string[] {
  if (_allTerms) return _allTerms;
  const set = new Set<string>();
  for (const c of CLUSTERS) for (const t of c.terms) set.add(t);
  _allTerms = [...set];
  return _allTerms;
}

/** True if the text contains at least one cluster term (case-insensitive). */
export function matchesAnyTerm(text: string, terms: string[] = allTerms()): boolean {
  if (!text) return false;
  const hay = text.toLowerCase();
  return terms.some((t) => t && hay.includes(t.toLowerCase()));
}

/**
 * Weighted relevance score (0–100) by cluster hits, mirroring the Python
 * scoring: each matched cluster contributes its weight points (counted once),
 * plus a bonus when a core (very_high) cluster matches.
 */
export function fbeRelevance(text: string): number {
  if (!text) return 0;
  const hay = text.toLowerCase();
  let points = 0;
  let coreHit = false;
  for (const c of CLUSTERS) {
    const hit = c.terms.some((t) => hay.includes(t.toLowerCase()));
    if (!hit) continue;
    points += WEIGHT_POINTS[c.weight];
    if (c.weight === "very_high") coreHit = true;
  }
  if (coreHit) points += 30; // Kernthema-Bonus
  return Math.max(0, Math.min(100, points));
}

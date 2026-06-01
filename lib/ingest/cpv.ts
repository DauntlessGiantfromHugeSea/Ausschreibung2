/**
 * Maps a CPV code (Common Procurement Vocabulary) to a coarse, German-language
 * category used for facets. Based on the leading CPV division (first 2 digits).
 */
const DIVISIONS: Record<string, string> = {
  "03": "Landwirtschaft & Lebensmittel",
  "09": "Energie & Umwelt",
  "14": "Bergbau & Rohstoffe",
  "15": "Landwirtschaft & Lebensmittel",
  "18": "Bekleidung & Textil",
  "22": "Druck & Medien",
  "30": "IT & Software",
  "31": "Elektrotechnik",
  "32": "IT & Software",
  "33": "Medizin & Gesundheit",
  "34": "Fahrzeuge & Transport",
  "35": "Sicherheit & Verteidigung",
  "37": "Möbel & Ausstattung",
  "38": "Labor & Messtechnik",
  "39": "Möbel & Ausstattung",
  "42": "Maschinen & Anlagen",
  "44": "Bau & Hochbau",
  "45": "Bau & Hochbau",
  "48": "IT & Software",
  "50": "Dienstleistungen",
  "51": "Dienstleistungen",
  "55": "Dienstleistungen",
  "60": "Fahrzeuge & Transport",
  "63": "Fahrzeuge & Transport",
  "64": "Telekommunikation",
  "66": "Finanzen & Versicherung",
  "71": "Planung & Ingenieurwesen",
  "72": "IT & Software",
  "73": "Forschung & Entwicklung",
  "79": "Dienstleistungen",
  "80": "Bildung",
  "85": "Medizin & Gesundheit",
  "90": "Energie & Umwelt",
  "92": "Kultur & Freizeit",
};

export function categoryForCpv(cpv: string): string {
  const div = String(cpv).slice(0, 2);
  return DIVISIONS[div] ?? "Sonstiges";
}

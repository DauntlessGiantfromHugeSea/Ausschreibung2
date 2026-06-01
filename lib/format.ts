export function formatCurrency(value: number | null, currency = "EUR"): string {
  if (value == null) return "k. A.";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
    new Date(iso + "T00:00:00Z"),
  );
}

export function daysUntil(iso: string): number {
  const d = new Date(iso + "T00:00:00Z").getTime();
  return Math.ceil((d - Date.now()) / 86_400_000);
}

export function deadlineLabel(iso: string): { text: string; tone: "open" | "soon" | "closed" } {
  const days = daysUntil(iso);
  if (days < 0) return { text: "Frist abgelaufen", tone: "closed" };
  if (days === 0) return { text: "Frist heute", tone: "soon" };
  if (days <= 7) return { text: `noch ${days} Tage`, tone: "soon" };
  return { text: `noch ${days} Tage`, tone: "open" };
}

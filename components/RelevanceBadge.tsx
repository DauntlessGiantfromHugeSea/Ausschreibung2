export function LevelBadge({ level, score }: { level: string; score: number }) {
  const tone =
    level === "high"
      ? "bg-emerald-100 text-emerald-700"
      : level === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-500";
  const label = level === "high" ? "hohe Relevanz" : level === "medium" ? "mittlere Relevanz" : "Relevanz";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{label} {score}</span>;
}

export function RelevanceBadge({ value }: { value: number }) {
  const tone =
    value >= 70 ? "bg-emerald-100 text-emerald-700" : value >= 40 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {value}% Relevanz
    </span>
  );
}

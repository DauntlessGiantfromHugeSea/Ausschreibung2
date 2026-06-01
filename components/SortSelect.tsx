"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "relevance", label: "Relevanz" },
  { value: "deadline", label: "Frist (früheste zuerst)" },
  { value: "published", label: "Veröffentlichung (neueste)" },
  { value: "value", label: "Auftragswert (höchster)" },
];

export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(sp.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={change}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500"
      aria-label="Sortierung"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

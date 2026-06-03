"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  initial = "",
  size = "lg",
}: {
  initial?: string;
  size?: "lg" | "md";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/search?${params.toString()}`);
  }

  const pad = size === "lg" ? "py-4 text-lg" : "py-2.5 text-base";

  return (
    <form onSubmit={submit} className="flex w-full gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="z. B. Flüssigboden, Erdkabel, Kabelgraben, Tiefbau …"
        className={`flex-1 rounded-xl border border-slate-300 bg-white px-4 ${pad} shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200`}
        aria-label="Ausschreibungen durchsuchen"
      />
      <button
        type="submit"
        className={`rounded-xl bg-brand-600 px-6 ${pad} font-medium text-white hover:bg-brand-700`}
      >
        Suchen
      </button>
    </form>
  );
}

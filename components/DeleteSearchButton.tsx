"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteSearchButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-sm text-slate-400 hover:text-red-600 disabled:opacity-50"
      aria-label="Suche löschen"
    >
      Löschen
    </button>
  );
}

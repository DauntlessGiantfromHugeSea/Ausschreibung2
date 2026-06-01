"use client";

import { useState } from "react";

export function SaveSearchButton({
  query,
  defaultLabel,
  loggedIn,
}: {
  query: string;
  defaultLabel: string;
  loggedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: defaultLabel || "Gespeicherte Suche", query }),
    });
    setState(res.ok ? "saved" : "error");
  }

  if (!loggedIn) {
    return (
      <a
        href="/login"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
      >
        ☆ Suche speichern (Anmelden)
      </a>
    );
  }

  return (
    <button
      onClick={save}
      disabled={state === "saving" || state === "saved"}
      className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-100 disabled:opacity-60"
    >
      {state === "saved" ? "✓ Gespeichert" : state === "saving" ? "Speichern …" : "☆ Suche speichern"}
    </button>
  );
}

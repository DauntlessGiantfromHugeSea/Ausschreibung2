"use client";

import Link from "next/link";
import { useState } from "react";

interface Insight {
  summary: string;
  highlights: string[];
  fitScore: number;
  model: string;
}

export function TenderInsight({ id, loggedIn }: { id: string; loggedIn: boolean }) {
  const [profile, setProfile] = useState("");
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const params = new URLSearchParams();
    if (profile.trim()) params.set("profile", profile.trim());
    const res = await fetch(`/api/tender/${id}/insight?${params}`);
    setData(res.ok ? await res.json() : null);
    setLoading(false);
  }

  if (!loggedIn) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs text-white">
            KI
          </span>
          <h2 className="font-semibold">Klartext-Analyse</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Die KI-gestützte Zusammenfassung und Eignungsbewertung steht
          angemeldeten Nutzern zur Verfügung.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Registrieren
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-600 text-xs text-white">
          KI
        </span>
        <h2 className="font-semibold">Klartext-Analyse</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Lass dir diese Ausschreibung in einfacher Sprache zusammenfassen und auf dein
        Profil bewerten.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          placeholder="Dein Profil, z. B. „KFZ-Werkstatt, Anhängerkupplungen, Bayern“"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Analysiere …" : "Analysieren"}
        </button>
      </div>

      {data && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-brand-700">{data.fitScore}%</div>
            <div className="text-sm text-slate-600">Eignung für dein Profil</div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {data.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">Modell: {data.model}</p>
        </div>
      )}
    </div>
  );
}

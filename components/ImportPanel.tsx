"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImportPanel() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/import", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setResult({
        ok: true,
        text: `${data.parsed} Datensätze gelesen · ${data.added} neu · ${data.total} insgesamt.`,
      });
      router.refresh();
    } else {
      setResult({ ok: false, text: data.error ?? "Import fehlgeschlagen." });
    }
  }

  return (
    <form onSubmit={upload} className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        Export aus der alten Plattform (CSV oder JSON) hochladen. Datensätze werden
        per URL dedupliziert und zum Bestand <strong>hinzugefügt</strong> (kein Überschreiben).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,.json,text/csv,application/json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="submit"
          disabled={!file || busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Importiere …" : "Importieren"}
        </button>
      </div>
      {result && (
        <p className={`mt-3 text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
          {result.text}
        </p>
      )}
    </form>
  );
}

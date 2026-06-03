"use client";

import { useState } from "react";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ ok: false, text: "Die neuen Passwörter stimmen nicht überein." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Passwort erfolgreich geändert." });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: d.error ?? "Änderung fehlgeschlagen." });
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Aktuelles Passwort</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Neues Passwort</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <p className="mt-1 text-xs text-slate-400">Mindestens 8 Zeichen.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Neues Passwort wiederholen</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>
      )}
      <button type="submit" disabled={busy}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
        {busy ? "Speichern …" : "Passwort ändern"}
      </button>
    </form>
  );
}

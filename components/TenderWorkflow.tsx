"use client";

import Link from "next/link";
import { useState } from "react";

const STATUSES = ["neu", "geprüft", "interessant", "uninteressant", "beworben", "archiviert"];

interface Note {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export function TenderWorkflow({
  id,
  loggedIn,
  initialStatus,
  initialNotes,
}: {
  id: string;
  loggedIn: boolean;
  initialStatus: string;
  initialNotes: Note[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loggedIn) return null;

  async function changeStatus(next: string) {
    setStatus(next);
    await fetch(`/api/tender/${id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/tender/${id}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setBusy(false);
    if (res.ok) {
      const { note } = await res.json();
      setNotes([note, ...notes]);
      setText("");
    }
  }

  async function removeNote(noteId: string) {
    await fetch(`/api/tender/${id}/notes?noteId=${noteId}`, { method: "DELETE" });
    setNotes(notes.filter((n) => n.id !== noteId));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Status</span>
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-slate-700">Notizen ({notes.length})</h3>
      <form onSubmit={addNote} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Notiz hinzufügen …"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Speichern
        </button>
      </form>

      <ul className="mt-3 space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-slate-700">{n.text}</p>
              <button
                onClick={() => removeNote(n.id)}
                className="shrink-0 text-xs text-slate-400 hover:text-red-600"
              >
                löschen
              </button>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {n.author} · {new Date(n.createdAt).toLocaleString("de-DE")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    {
      interessant: "bg-emerald-100 text-emerald-700",
      beworben: "bg-blue-100 text-blue-700",
      geprüft: "bg-amber-100 text-amber-700",
      uninteressant: "bg-slate-100 text-slate-500",
      archiviert: "bg-slate-100 text-slate-400",
      neu: "bg-brand-50 text-brand-700",
    }[status] ?? "bg-slate-100 text-slate-600";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}

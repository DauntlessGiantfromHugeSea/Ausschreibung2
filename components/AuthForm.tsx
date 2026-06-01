"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/account");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Etwas ist schiefgelaufen.");
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">
        {isRegister ? "Konto erstellen" : "Anmelden"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isRegister
          ? "Speichere Suchen und erhalte passende Ausschreibungen."
          : "Willkommen zurück bei auftrag.ai."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500"
          />
          {isRegister && (
            <p className="mt-1 text-xs text-slate-400">Mindestens 8 Zeichen.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Bitte warten …" : isRegister ? "Registrieren" : "Anmelden"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        {isRegister ? (
          <>
            Schon registriert?{" "}
            <Link href="/login" className="text-brand-700 hover:underline">
              Anmelden
            </Link>
          </>
        ) : (
          <>
            Noch kein Konto?{" "}
            <Link href="/register" className="text-brand-700 hover:underline">
              Registrieren
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

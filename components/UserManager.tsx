"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  savedSearchCount: number;
}

export function UserManager({
  users,
  currentAdminId,
}: {
  users: AdminUser[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(input: RequestInfo, init: RequestInit, key: string) {
    setError(null);
    setBusy(key);
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Aktion fehlgeschlagen.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(id: string, role: string) {
    await call(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    }, `role-${id}`);
  }

  async function resetPassword(id: string) {
    const password = prompt("Neues Passwort (mind. 8 Zeichen):");
    if (!password) return;
    const ok = await call(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }, `pw-${id}`);
    if (ok) alert("Passwort wurde geändert.");
  }

  async function remove(id: string, email: string) {
    if (!confirm(`Nutzer „${email}" wirklich löschen?`)) return;
    await call(`/api/admin/users/${id}`, { method: "DELETE" }, `del-${id}`);
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <CreateUserForm onCreate={call} />

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">E-Mail</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Suchen</th>
              <th className="px-4 py-3">Erstellt</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  {u.email}
                  {u.id === currentAdminId && (
                    <span className="ml-2 text-xs text-slate-400">(du)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={busy === `role-${u.id}`}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="user">Nutzer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.savedSearchCount}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString("de-DE")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => resetPassword(u.id)}
                      className="text-brand-700 hover:underline"
                    >
                      Passwort
                    </button>
                    <button
                      onClick={() => remove(u.id, u.email)}
                      disabled={u.id === currentAdminId}
                      className="text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateUserForm({
  onCreate,
}: {
  onCreate: (input: RequestInfo, init: RequestInit, key: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onCreate(
      "/api/admin/users",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      },
      "create",
    );
    if (ok) {
      setEmail("");
      setPassword("");
      setRole("user");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs font-medium text-slate-500">E-Mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-medium text-slate-500">Passwort</label>
        <input
          type="text"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Rolle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="user">Nutzer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Nutzer anlegen
      </button>
    </form>
  );
}

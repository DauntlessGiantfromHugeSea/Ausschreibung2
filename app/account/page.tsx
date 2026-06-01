import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSavedSearches } from "@/lib/auth";
import { DeleteSearchButton } from "@/components/DeleteSearchButton";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const searches = getSavedSearches(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Mein Konto</h1>
      <p className="mt-1 text-slate-500">{user.email}</p>

      <section className="mt-8">
        <h2 className="font-semibold">Gespeicherte Suchen</h2>
        {searches.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Noch keine gespeicherten Suchen. Führe eine{" "}
            <Link href="/search" className="text-brand-700 hover:underline">
              Suche
            </Link>{" "}
            durch und klicke auf „Suche speichern".
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {searches.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/search?${s.query}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {s.label}
                  </Link>
                  <p className="truncate text-xs text-slate-400">
                    {s.query || "alle Ausschreibungen"} · gespeichert am{" "}
                    {formatDate(s.createdAt.slice(0, 10))}
                  </p>
                </div>
                <DeleteSearchButton id={s.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

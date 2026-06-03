import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";
import { getTenders } from "@/lib/store";
import { ImportPanel } from "@/components/ImportPanel";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin(user)) redirect("/");

  const count = getTenders().length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-brand-700 hover:underline">
        ← Zur Nutzerverwaltung
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Daten-Import</h1>
      <p className="mt-1 text-slate-500">
        Aktuell <strong>{count.toLocaleString("de-DE")}</strong> Ausschreibungen im Bestand.
      </p>

      <div className="mt-6">
        <ImportPanel />
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-800">So holst du die Daten aus der alten Plattform</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>In der alten Plattform (ausschreibungsplattform-fbe) einloggen.</li>
          <li>
            CSV-Export aufrufen: <code className="rounded bg-white px-1">/export/csv</code> (lädt
            alle Ausschreibungen als <code className="rounded bg-white px-1">ausschreibungen.csv</code>).
          </li>
          <li>Die CSV-Datei hier hochladen.</li>
        </ol>
        <p className="mt-2">
          Alternativ per Server-Konsole ohne UI:
        </p>
        <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{`curl -X POST -H "x-crawl-token: $CRAWL_TOKEN" \\
  --data-binary @ausschreibungen.csv \\
  http://localhost:5000/api/admin/import`}</pre>
      </div>
    </div>
  );
}

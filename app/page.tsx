import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { search } from "@/lib/search";
import { getTenders } from "@/lib/store";
import { formatCurrency, formatDate, deadlineLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const POPULAR = [
  "Flüssigboden",
  "ZFSV",
  "Erdkabel",
  "Kabelgraben",
  "Tiefbau",
  "Spundwand",
  "Verfüllung",
  "Fernwärme",
];

export default function HomePage() {
  const all = getTenders();
  const categories = search({ pageSize: 0 }).facets.category;
  const latest = search({ sort: "published", pageSize: 4 }).items;
  const totalValue = all.reduce((s, t) => s + (t.estimatedValue ?? 0), 0);

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Die richtigen Ausschreibungen für{" "}
            <span className="text-brand-600">Flüssigboden & Tiefbau.</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            fluessigboden.ai bündelt deutsche und europäische Vergaben für
            Flüssigboden/ZFSV, thermische Kabelbettung, Erdkabel, Verfüllung und
            Tiefbau – mit fachlicher Relevanzbewertung und KI-Klartext-Analyse.
          </p>
          <div className="mt-8">
            <SearchBar />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {POPULAR.map((p) => (
              <Link
                key={p}
                href={`/search?q=${encodeURIComponent(p)}`}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-600 hover:border-brand-400 hover:text-brand-700"
              >
                {p}
              </Link>
            ))}
          </div>
          <div className="mt-10 flex justify-center gap-10 text-center">
            <Stat value={all.length.toLocaleString("de-DE")} label="Ausschreibungen" />
            <Stat value={Object.keys(categories).length.toString()} label="Branchen" />
            <Stat value={formatCurrency(totalValue)} label="Auftragsvolumen" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Neueste Ausschreibungen</h2>
          <Link href="/search" className="text-sm text-brand-700 hover:underline">
            Alle ansehen →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {latest.map((t) => {
            const dl = deadlineLabel(t.deadline);
            return (
              <Link
                key={t.id}
                href={`/tender/${t.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-400 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                    {t.category}
                  </span>
                  <span>{t.region}</span>
                </div>
                <h3 className="mt-2 font-medium leading-snug">{t.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{t.buyer}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium">{formatCurrency(t.estimatedValue)}</span>
                  <span
                    className={
                      dl.tone === "closed"
                        ? "text-slate-400"
                        : dl.tone === "soon"
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }
                  >
                    {dl.text} · {formatDate(t.deadline)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

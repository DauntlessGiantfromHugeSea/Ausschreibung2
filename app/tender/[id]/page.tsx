import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenderById } from "@/lib/store";
import { TenderInsight } from "@/components/TenderInsight";
import { TenderWorkflow } from "@/components/TenderWorkflow";
import { getCurrentUser } from "@/lib/session";
import { getMeta } from "@/lib/tenderMeta";
import { fbeRelevance, relevanceLevel, matchedClusters } from "@/lib/ingest/searchTerms";
import { formatCurrency, formatDate, deadlineLabel } from "@/lib/format";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = getTenderById(id);
  return { title: t ? `${t.title} – fluessigboden.ai` : "Ausschreibung – fluessigboden.ai" };
}

export default async function TenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = getTenderById(id);
  if (!t) notFound();
  const user = await getCurrentUser();
  const dl = deadlineLabel(t.deadline);
  const meta = getMeta(t.reference);
  const fbeScore = fbeRelevance(`${t.title} ${t.description} ${t.buyer} ${t.city} ${t.cpvLabel}`);
  const level = relevanceLevel(fbeScore);
  const clusters = matchedClusters(`${t.title} ${t.description} ${t.cpvLabel}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/search" className="text-sm text-brand-700 hover:underline">
        ← Zurück zur Suche
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{t.category}</span>
        <span>{t.region}</span>
        <span>· {t.procedureType}</span>
        <span>· Quelle: {t.source}</span>
      </div>

      <h1 className="mt-2 text-2xl font-bold leading-tight">{t.title}</h1>
      <p className="mt-1 text-slate-600">{t.buyer}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Fact label="Auftragswert (netto)" value={formatCurrency(t.estimatedValue)} />
        <Fact
          label="Angebotsfrist"
          value={formatDate(t.deadline)}
          accent={dl.tone === "soon" ? "amber" : dl.tone === "closed" ? "slate" : "emerald"}
          hint={dl.text}
        />
        <Fact label="Veröffentlicht" value={formatDate(t.publishedDate)} />
      </div>

      {clusters.length > 0 && (
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Fachrelevanz</span>
            <span
              className={
                "rounded px-2 py-0.5 text-xs font-semibold " +
                (level === "high"
                  ? "bg-emerald-100 text-emerald-700"
                  : level === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500")
              }
            >
              {fbeScore} · {level}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Passende Themen: {clusters.join(" · ")}
          </p>
        </div>
      )}

      {user && (
        <div className="mt-6">
          <TenderWorkflow
            id={t.id}
            loggedIn={!!user}
            initialStatus={meta.status}
            initialNotes={meta.notes}
          />
        </div>
      )}

      <div className="mt-8">
        <TenderInsight id={t.id} loggedIn={!!user} />
      </div>

      <section className="mt-8">
        <h2 className="font-semibold">Leistungsbeschreibung</h2>
        <p className="mt-2 leading-relaxed text-slate-700">{t.description}</p>
      </section>

      <section className="mt-8 grid gap-x-8 gap-y-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Detail label="Vergabenummer" value={t.reference} />
        <Detail label="CPV-Code" value={`${t.cpvCode} – ${t.cpvLabel}`} />
        <Detail label="Auftraggeber" value={t.buyer} />
        <Detail label="Art des Auftraggebers" value={t.buyerType} />
        <Detail label="Ort der Ausführung" value={`${t.city}, ${t.region}`} />
        <Detail label="Verfahrensart" value={t.procedureType} />
        <Detail label="Kontakt" value={t.contactEmail || "—"} />
        <Detail label="Land" value={t.country} />
      </section>

      <div className="mt-6">
        <a
          href={t.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
        >
          Zur Originalbekanntmachung ↗
        </a>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "amber" | "slate";
}) {
  const tone =
    accent === "amber"
      ? "text-amber-600"
      : accent === "slate"
        ? "text-slate-400"
        : accent === "emerald"
          ? "text-emerald-600"
          : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
      {hint && <div className={`text-sm ${tone}`}>{hint}</div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}

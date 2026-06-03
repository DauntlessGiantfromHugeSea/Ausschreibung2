import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SortSelect } from "@/components/SortSelect";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { search } from "@/lib/search";
import { getCurrentUser } from "@/lib/session";
import { formatCurrency, formatDate, deadlineLabel } from "@/lib/format";
import type { SearchQuery } from "@/lib/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 8;

function str(sp: SP, k: string): string | undefined {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

/** Build a /search href from the current params plus overrides (null clears). */
function href(sp: SP, overrides: Record<string, string | number | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) params.delete(k);
    else params.set(k, String(v));
  }
  params.delete("page");
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  const q = str(sp, "q") ?? "";
  const page = Number(str(sp, "page") ?? "1") || 1;
  const sort = (str(sp, "sort") as SearchQuery["sort"]) ?? (q ? "relevance" : "deadline");

  const query: SearchQuery = {
    q,
    category: str(sp, "category"),
    region: str(sp, "region"),
    procedureType: str(sp, "procedureType"),
    source: str(sp, "source"),
    openOnly: str(sp, "openOnly") === "1",
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const result = search(query);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const currentQs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(sp).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>,
  ).toString();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SearchBar initial={q} size="md" />

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters / facets */}
        <aside className="space-y-6">
          <FacetGroup
            title="Status"
            items={[{ key: "1", label: "Nur laufende (Frist offen)", count: undefined }]}
            activeKey={query.openOnly ? "1" : undefined}
            hrefFor={(k) => href(sp, { openOnly: query.openOnly ? null : k })}
          />
          <FacetGroup
            title="Plattform"
            items={toItems(result.facets.source)}
            activeKey={query.source}
            hrefFor={(k) => href(sp, { source: query.source === k ? null : k })}
          />
          <FacetGroup
            title="Branche"
            items={toItems(result.facets.category)}
            activeKey={query.category}
            hrefFor={(k) => href(sp, { category: query.category === k ? null : k })}
          />
          <FacetGroup
            title="Region"
            items={toItems(result.facets.region)}
            activeKey={query.region}
            hrefFor={(k) => href(sp, { region: query.region === k ? null : k })}
          />
          <FacetGroup
            title="Verfahren"
            items={toItems(result.facets.procedureType)}
            activeKey={query.procedureType}
            hrefFor={(k) => href(sp, { procedureType: query.procedureType === k ? null : k })}
          />
        </aside>

        {/* Results */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <p className="text-sm text-slate-600">
              <strong>{result.total}</strong> Ausschreibungen
              {q && (
                <>
                  {" "}für „<strong>{q}</strong>"
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <SaveSearchButton
                query={currentQs}
                defaultLabel={q ? `Suche: ${q}` : "Alle Ausschreibungen"}
                loggedIn={!!user}
              />
              <SortSelect current={sort ?? "relevance"} />
            </div>
          </div>

          {result.items.length === 0 ? (
            <p className="py-16 text-center text-slate-500">
              Keine Treffer. Versuche einen anderen Suchbegriff oder entferne Filter.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {result.items.map((t) => {
                const dl = deadlineLabel(t.deadline);
                return (
                  <li key={t.id} className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                            {t.category}
                          </span>
                          <span>{t.region}</span>
                          <span>· CPV {t.cpvCode}</span>
                          {q && <RelevanceBadge value={t.relevance} />}
                        </div>
                        <Link
                          href={`/tender/${t.id}`}
                          className="mt-1 block font-medium text-slate-900 hover:text-brand-700"
                        >
                          {t.title}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500">{t.buyer}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {t.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <div className="font-semibold">{formatCurrency(t.estimatedValue)}</div>
                        <div
                          className={
                            dl.tone === "closed"
                              ? "text-slate-400"
                              : dl.tone === "soon"
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }
                        >
                          {dl.text}
                        </div>
                        <div className="text-slate-400">{formatDate(t.deadline)}</div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={href(sp, { page: p })}
                  className={
                    p === page
                      ? "rounded-md bg-brand-600 px-3 py-1.5 text-white"
                      : "rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                  }
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

function toItems(rec: Record<string, number>) {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, label: key, count }));
}

function FacetGroup({
  title,
  items,
  activeKey,
  hrefFor,
}: {
  title: string;
  items: { key: string; label: string; count?: number }[];
  activeKey?: string;
  hrefFor: (key: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={hrefFor(it.key)}
              className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${
                activeKey === it.key
                  ? "bg-brand-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{it.label}</span>
              {it.count != null && (
                <span className={activeKey === it.key ? "text-brand-100" : "text-slate-400"}>
                  {it.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

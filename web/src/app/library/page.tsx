import Link from "next/link";
import { Eyebrow, PageHeader, Panel, RecBadge } from "@/components/ui";
import { fetchCommentary, fetchCompanies, fetchNews } from "@/lib/data";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "news", label: "News Worth Reading" },
  { id: "commentary", label: "Investor Commentary" },
  { id: "watchlist", label: "Watchlist" },
  { id: "stale", label: "Stale (90d+)" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const sp = (await searchParams) || {};
  const tab = (TABS.some((t) => t.id === sp.tab) ? sp.tab : "news") as TabId;

  const [news, commentary, companies] = await Promise.all([
    fetchNews(),
    fetchCommentary(),
    fetchCompanies(),
  ]);

  const watchlist = companies.filter((c) => c.recommendation === "Watch");
  const stale = companies.filter((c) => c.is_stale || c.review_status === "Pending Partner Review");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partner library"
        title="News · Commentary · Watch · Stale"
        description="Excel tabs as a first-class surface — curated reading, qualitative signal, monitoring queue, and 90-day stale review (never auto-deleted)."
      />

      <nav className="flex flex-wrap gap-2" aria-label="Library sections">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Link
              key={t.id}
              href={`/library?tab=${t.id}`}
              className={
                active
                  ? "rounded-[10px] bg-[var(--signal-dim)] px-3.5 py-2 text-sm font-medium text-[var(--signal)]"
                  : "rounded-[10px] border border-[var(--line)] px-3.5 py-2 text-[0.9375rem] text-[var(--muted)] hover:text-[var(--text)]"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === "news" && (
        <div className="space-y-4 stagger">
          {news.map((n) => (
            <article key={n.id} className="panel p-5">
              <Eyebrow>
                {n.source}
                {n.published_at ? ` · ${n.published_at}` : ""}
              </Eyebrow>
              <h2 className="mt-2 text-lg font-semibold">
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noreferrer" className="hover:text-[var(--signal)]">
                    {n.title}
                  </a>
                ) : (
                  n.title
                )}
              </h2>
              <p className="mt-2 text-[0.975rem] leading-relaxed text-[var(--muted)]">{n.why_it_matters}</p>
              {(n.related_themes || []).length > 0 && (
                <div className="mt-3 text-[0.8125rem] text-[var(--faint)]">
                  {(n.related_themes || []).join(" · ")}
                </div>
              )}
            </article>
          ))}
          {!news.length && (
            <Panel>
              <p className="text-[0.9375rem] text-[var(--muted)]">No curated news yet — run Refresh pipeline.</p>
            </Panel>
          )}
        </div>
      )}

      {tab === "commentary" && (
        <div className="space-y-4 stagger">
          {commentary.map((c) => (
            <article key={c.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>
                  {c.source} · {c.sentiment || "mixed"} · {c.credibility_tier || "—"}
                </Eyebrow>
                {c.company_name ? (
                  <Link
                    href={`/company/${c.company_id}`}
                    className="text-[0.8125rem] font-medium text-[var(--signal)] hover:underline"
                  >
                    {c.company_name}
                  </Link>
                ) : null}
              </div>
              <p className="mt-3 text-[0.975rem] leading-relaxed text-[var(--text)]/90">{c.quote_or_summary}</p>
              {c.captured_at ? (
                <div className="mt-3 mono text-[0.75rem] text-[var(--faint)]">{c.captured_at}</div>
              ) : null}
            </article>
          ))}
          {!commentary.length && (
            <Panel>
              <p className="text-[0.9375rem] text-[var(--muted)]">No commentary rows yet.</p>
            </Panel>
          )}
        </div>
      )}

      {tab === "watchlist" && (
        <div className="panel overflow-hidden !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] label-caps">
              <tr>
                <th className="px-5 py-3.5 font-medium">Company</th>
                <th className="px-4 py-3.5 font-medium">Score</th>
                <th className="px-4 py-3.5 font-medium">Theme</th>
                <th className="px-4 py-3.5 font-medium">Last signal</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)] last:border-0 hover:bg-white/[0.025]">
                  <td className="px-5 py-3.5">
                    <Link href={`/company/${c.id}`} className="font-semibold hover:text-[var(--signal)]">
                      {c.name}
                    </Link>
                    <div className="mt-0.5 max-w-[320px] truncate text-[0.8125rem] text-[var(--muted)]">
                      {c.one_liner}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 mono">{c.thesis_score ?? "—"}</td>
                  <td className="px-4 py-3.5 text-[var(--muted)]">{c.sector_theme}</td>
                  <td className="px-4 py-3.5 mono text-xs">{c.last_signal_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!watchlist.length && (
            <p className="p-5 text-[0.9375rem] text-[var(--muted)]">No Watch companies in the pipeline.</p>
          )}
        </div>
      )}

      {tab === "stale" && (
        <div className="space-y-4">
          <p className="text-[0.9375rem] text-[var(--muted)]">
            Flagged for partner review after 90+ days without signal. Signal never auto-removes —
            partners decide what comes off the list.
          </p>
          <div className="panel overflow-hidden !p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] label-caps">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Company</th>
                  <th className="px-4 py-3.5 font-medium">Rec</th>
                  <th className="px-4 py-3.5 font-medium">Last signal</th>
                  <th className="px-4 py-3.5 font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {stale.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--line)] last:border-0 hover:bg-white/[0.025]">
                    <td className="px-5 py-3.5">
                      <Link href={`/company/${c.id}`} className="font-semibold hover:text-[var(--signal)]">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <RecBadge rec={c.recommendation} />
                    </td>
                    <td className="px-4 py-3.5 mono text-xs">{c.last_signal_date || "—"}</td>
                    <td className="px-4 py-3.5 text-[var(--warn)]">
                      {c.review_status || "Pending Partner Review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!stale.length && (
              <p className="p-5 text-[0.9375rem] text-[var(--muted)]">No stale companies — pipeline signals are fresh.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

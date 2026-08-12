import Link from "next/link";
import { CommentaryDesk } from "@/components/CommentaryDesk";
import { NewsWorthReadingDesk } from "@/components/NewsWorthReading";
import { StaleQueueTable } from "@/components/StaleQueueTable";
import { VoicesDesk } from "@/components/VoicesDesk";
import { Eyebrow, Page, PageHeader, SegItem, Segmented } from "@/components/ui";
import { fetchAlerts, fetchCommentary, fetchCompanies, fetchNews } from "@/lib/data";
import { getPlaybook, PLAYBOOKS, playbooksByCategory } from "@/lib/playbooks";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "voices", label: "People & Pages" },
  { id: "news", label: "News Worth Reading" },
  { id: "commentary", label: "Investor Commentary" },
  { id: "playbooks", label: "Playbooks" },
  { id: "watchlist", label: "Watchlist" },
  { id: "stale", label: "Stale (90d+)" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; pb?: string }>;
}) {
  const sp = (await searchParams) || {};
  const tab = (TABS.some((t) => t.id === sp.tab) ? sp.tab : "voices") as TabId;
  const activePb = sp.pb ? getPlaybook(sp.pb) : undefined;
  const byCat = playbooksByCategory();

  const [news, commentary, companies, alerts] = await Promise.all([
    fetchNews(),
    fetchCommentary(),
    fetchCompanies(),
    fetchAlerts(),
  ]);

  const watchlist = companies.filter((c) => c.recommendation === "Watch");
  const stale = companies.filter(
    (c) =>
      (c.is_stale ||
        c.review_status === "Pending Partner Review" ||
        c.review_status === "Refresh requested") &&
      !(c.review_status || "").toLowerCase().includes("archived") &&
      c.review_status !== "Reviewed — keep",
  );

  return (
    <Page>
      <PageHeader eyebrow="Library" title="Partner library" />

      <Segmented aria-label="Library sections">
        {TABS.map((t) => (
          <SegItem key={t.id} href={`/library?tab=${t.id}`} active={tab === t.id}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "voices" && <VoicesDesk commentary={commentary} news={news} alerts={alerts} />}

      {tab === "news" && <NewsWorthReadingDesk news={news} companies={companies} />}

      {tab === "commentary" && (
        <CommentaryDesk commentary={commentary} mode="library" />
      )}

      {tab === "playbooks" && (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            {Object.entries(byCat).map(([cat, rows]) => (
              <div key={cat}>
                <div className="label-caps mb-2">{cat}</div>
                <ul className="space-y-1">
                  {rows.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/library?tab=playbooks&pb=${p.id}`}
                        className={
                          activePb?.id === p.id
                            ? "block rounded-[var(--radius)] bg-[var(--signal-dim)] px-2.5 py-2 text-[0.875rem] font-semibold text-[var(--signal)]"
                            : "block rounded-[var(--radius)] px-2.5 py-2 text-[0.875rem] text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                        }
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>
          <article className="panel p-5 md:p-7">
            {activePb ? (
              <>
                <Eyebrow>{activePb.category}</Eyebrow>
                <h2 className="title mt-2 text-[1.45rem]">{activePb.title}</h2>
                <p className="mt-2 text-[0.95rem] text-[var(--muted)]">{activePb.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[0.75rem] text-[var(--faint)]">
                  {activePb.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-[var(--radius-sm)] border border-[var(--line)] px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-6 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
                  {activePb.body}
                </div>
              </>
            ) : (
              <>
                <Eyebrow>Startup Library pattern</Eyebrow>
                <h2 className="title mt-2 text-[1.35rem]">Partner playbooks</h2>
                <p className="mt-2 text-[0.95rem] text-[var(--muted)]">
                  Curated operating guides — partner ritual, IC packets, Demo Day interest workflow,
                  kind-no, reference calls. Pick one from the list.
                </p>
                <ul className="mt-5 space-y-2">
                  {PLAYBOOKS.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/library?tab=playbooks&pb=${p.id}`}
                        className="font-semibold text-[var(--signal)] hover:underline"
                      >
                        {p.title}
                      </Link>
                      <div className="text-[0.8125rem] text-[var(--muted)]">{p.summary}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        </div>
      )}

      {tab === "watchlist" && (
        <div className="panel overflow-hidden !p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Score</th>
                  <th>Theme</th>
                  <th>Last signal</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/company/${c.id}`} className="font-semibold hover:text-[var(--signal)]">
                        {c.name}
                      </Link>
                      <div className="mt-0.5 max-w-[320px] truncate text-[0.8125rem] text-[var(--muted)]">
                        {c.one_liner}
                      </div>
                    </td>
                    <td className="mono">{c.thesis_score ?? "—"}</td>
                    <td className="text-[var(--muted)]">{c.sector_theme}</td>
                    <td className="mono text-[0.8125rem]">{c.last_signal_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!watchlist.length && (
            <p className="body-muted p-5">No Watch companies in the pipeline.</p>
          )}
        </div>
      )}

      {tab === "stale" && (
        <div className="space-y-4">
          <p className="body-muted">
            90+ days quiet — partner review required before removal. Never auto-deleted.
          </p>
          <StaleQueueTable companies={stale} />
        </div>
      )}
    </Page>
  );
}

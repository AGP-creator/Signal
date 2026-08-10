import Link from "next/link";
import { BackLink, EmptyState, Eyebrow, Meta, Panel, PanelHead, RecBadge } from "@/components/ui";
import { fetchCompanies, fetchPeers } from "@/lib/data";
import { buildGoldenPack } from "@/lib/goldenInsights";
import { buildPeerIntelligence, findFirm } from "@/lib/peerIntel";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FirmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [companies, peers] = await Promise.all([fetchCompanies(), fetchPeers()]);
  const intel = buildPeerIntelligence(companies, peers);
  const firm = findFirm(intel, slug);

  if (!firm) {
    return (
      <div className="animate-in">
        <h1 className="display text-[1.85rem]">Firm not found</h1>
        <Link href="/peers" className="link-quiet mt-4 inline-block text-sm">
          Back to peer set
        </Link>
      </div>
    );
  }

  const partners = firm.top_coinvestors.slice(0, 6);
  const pack = buildGoldenPack(intel, companies);
  const battle = pack.battle_cards.find((b) => b.slug === firm.slug);
  const deepOverlap = firm.deals.filter((d) => d.recommendation === "Deep Dive");
  const relatedInsights = pack.insights.filter(
    (i) =>
      i.title.toLowerCase().includes(firm.name.toLowerCase()) ||
      i.hrefs?.some((h) => h.href.includes(firm.slug)),
  );

  return (
    <div className="space-y-8 animate-in">
      <div>
        <BackLink href="/peers">Peer set</BackLink>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <h1 className="display text-[2.5rem] md:text-[3.25rem]">{firm.name}</h1>
            <p className="body-muted mt-2.5 text-[1.05rem]">
              Stated focus: {firm.stated_focus || "Not catalogued in watchlists.yaml"}
            </p>
            {!!firm.aliases.length && (
              <div className="mt-2 text-[0.8125rem] text-[var(--faint)]">Also: {firm.aliases.join(", ")}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Metric label="Watch" value={firm.watch_priority.toFixed(0)} accent />
            <Metric label="Conviction" value={firm.conviction_score.toFixed(0)} />
            <Metric label="Drift" value={firm.drift_score.toFixed(0)} warn={firm.drift_score >= 30} />
            <Metric label="Alignment" value={firm.focus_alignment.toFixed(0)} />
          </div>
        </div>
      </div>

      <Panel>
        <h2 className="title text-[1.35rem]">Intelligence summary</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-[var(--text)]/90">{firm.intel_summary}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Meta label="Pipeline deals" value={String(firm.deal_count)} />
          <Meta label="As lead" value={String(firm.lead_count)} />
          <Meta label="Deep Dive overlap" value={String(firm.deep_dive_count)} />
          <Meta label="Last activity" value={firm.last_activity_date || "—"} />
        </div>
      </Panel>

      {battle && (
        <Panel className="border-[rgba(62,199,255,0.28)] bg-[rgba(62,199,255,0.05)]">
          <Eyebrow className="!text-[var(--deep)]">Battle card</Eyebrow>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <BattleBlock label="How they win" body={battle.how_they_win} />
            <BattleBlock label="Where they're weak" body={battle.where_they_are_weak} />
            <BattleBlock label="Partner or compete" body={battle.partner_or_compete} />
            <BattleBlock label="Call when" body={battle.call_when} />
          </div>
          {!!deepOverlap.length && (
            <p className="mt-4 text-[0.9375rem] text-[var(--muted)]">
              Shared Deep Dives: {deepOverlap.map((d) => d.company_name).join(", ")} — pick one to
              partner on, one to win with proprietary access.
            </p>
          )}
        </Panel>
      )}

      {!!relatedInsights.length && (
        <Panel>
          <Eyebrow className="!text-[var(--signal)]">Golden insights involving {firm.name}</Eyebrow>
          <div className="mt-4 space-y-3">
            {relatedInsights.slice(0, 4).map((i) => (
              <div key={i.id} className="border-b border-[var(--line)] pb-3 last:border-0">
                <div className="font-semibold">{i.title}</div>
                <p className="mt-1 text-[0.9375rem] text-[var(--muted)]">{i.action}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="panel overflow-hidden !p-0">
          <PanelHead title="Portfolio in Signal" />
          <div className="divide-y divide-[var(--line)]">
            {firm.deals.map((d) => (
              <Link
                key={d.company_id}
                href={`/company/${d.slug || d.company_id}`}
                className="flex items-start justify-between gap-3 px-5 py-3.5 transition hover:bg-white/[0.03]"
              >
                <div>
                  <div className="font-semibold">{d.company_name}</div>
                  <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
                    {d.theme} · {d.round} · {d.date || "—"}
                    {d.is_lead ? " · LEAD" : ""}
                    {!d.on_thesis_flag ? " · OFF-THESIS" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <RecBadge rec={d.recommendation} />
                  <div className="mono mt-1.5 text-sm text-[var(--signal)]">
                    {d.thesis_score != null ? d.thesis_score.toFixed(0) : "—"}
                  </div>
                </div>
              </Link>
            ))}
            {!firm.deals.length && (
              <div className="px-5 py-6">
                <EmptyState>No overlapping pipeline companies yet.</EmptyState>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <Panel>
            <h2 className="title text-[1.2rem]">Theme concentration</h2>
            <div className="mt-4 space-y-3">
              {firm.top_themes.map((t) => (
                <div key={t.theme} className="flex justify-between gap-2 text-sm">
                  <span className="text-[var(--muted)]">{t.theme}</span>
                  <span className="mono text-[var(--signal)]">{t.count}</span>
                </div>
              ))}
              {!firm.top_themes.length && <EmptyState>No theme data.</EmptyState>}
            </div>
          </Panel>

          <Panel>
            <h2 className="title text-[1.2rem]">Frequent co-investors</h2>
            <div className="mt-4 space-y-2.5">
              {partners.map((p) => (
                <div key={p.firm} className="flex justify-between text-sm">
                  <span>{p.firm}</span>
                  <span className="mono text-[var(--deep)]">{p.count}×</span>
                </div>
              ))}
              {!partners.length && <EmptyState>No co-investor overlap yet.</EmptyState>}
            </div>
          </Panel>

          {!!firm.thesis_shifts.length && (
            <Panel className="border-[rgba(255,176,32,0.32)] bg-[var(--warn-dim)]">
              <Eyebrow className="!text-[var(--warn)]">Thesis shifts</Eyebrow>
              <div className="mt-3 space-y-3">
                {firm.thesis_shifts.map((s) => (
                  <div key={s.id} className="text-sm">
                    <div className="font-medium">{s.company_name}</div>
                    <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{s.notes}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--panel)] px-3 py-3">
      <div
        className={cn(
          "mono text-2xl",
          warn ? "text-[var(--warn)]" : accent ? "text-[var(--signal)]" : "text-[var(--text)]",
        )}
      >
        {value}
      </div>
      <div className="mt-1 label-caps text-[var(--faint)]">{label}</div>
    </div>
  );
}

function BattleBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="label-caps text-[var(--faint)]">{label}</div>
      <p className="mt-1.5 text-[0.975rem] leading-relaxed text-[var(--text)]/90">{body}</p>
    </div>
  );
}

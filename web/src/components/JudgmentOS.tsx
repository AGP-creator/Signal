"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompanyLink } from "@/components/EntityLink";
import { EmptyState, Eyebrow, Panel, SegItem, Segmented } from "@/components/ui";
import {
  buildJudgmentPack,
  type DigestVariant,
  type JudgmentPack,
  type PartnerOverride,
} from "@/lib/judgment";
import { loadOverrides } from "@/lib/overrideStore";
import type { AlertItem, Commentary, Company, NewsItem, PeerActivity } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab =
  | "brief"
  | "overrides"
  | "misses"
  | "founders"
  | "freshness"
  | "mix"
  | "digest";

const TABS: { id: Tab; label: string }[] = [
  { id: "misses", label: "Misses" },
  { id: "founders", label: "Founders" },
  { id: "overrides", label: "Overrides" },
  { id: "freshness", label: "Evidence" },
  { id: "mix", label: "Mix" },
  { id: "brief", label: "Brief" },
  { id: "digest", label: "Digest A/B" },
];

function urgencyClass(u: string) {
  if (u === "now" || u === "high") return "text-[var(--danger)]";
  if (u === "this_week" || u === "medium" || u === "soft_drift" || u === "aging")
    return "text-[var(--warn)]";
  if (u === "hard_drift" || u === "stale") return "text-[var(--danger)]";
  return "text-[var(--muted)]";
}

export function JudgmentOS({
  companies,
  peers,
  commentary,
  news,
  alerts,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
}) {
  const [tab, setTab] = useState<Tab>("misses");
  const [stored, setStored] = useState<PartnerOverride[]>([]);

  useEffect(() => {
    const sync = () => setStored(loadOverrides());
    sync();
    window.addEventListener("signal:overrides-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("signal:overrides-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const pack: JudgmentPack = useMemo(
    () => buildJudgmentPack(companies, peers, commentary, news, alerts, stored),
    [companies, peers, commentary, news, alerts, stored],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-[var(--line)] pb-4">
        {[
          ["Overrides", pack.overrides.length],
          ["Misses", pack.misses.length],
          ["Founders", pack.founder_radar.length],
          ["Stale", pack.freshness.filter((f) => f.overall === "stale" || f.overall === "aging").length],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex items-baseline gap-1.5">
            <span className="mono text-[1.05rem] font-semibold text-[var(--text)]">{value}</span>
            <span className="label-caps text-[var(--faint)]">{label}</span>
          </div>
        ))}
      </div>

      <Segmented aria-label="Judgment sections">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "brief" && <BriefTab pack={pack} />}
      {tab === "overrides" && <OverridesTab pack={pack} />}
      {tab === "misses" && <MissesTab pack={pack} />}
      {tab === "founders" && <FoundersTab pack={pack} />}
      {tab === "freshness" && <FreshnessTab pack={pack} />}
      {tab === "mix" && <MixTab pack={pack} />}
      {tab === "digest" && <DigestTab pack={pack} />}
    </div>
  );
}

function BriefTab({ pack }: { pack: JudgmentPack }) {
  const topMisses = pack.misses.slice(0, 6);
  const topFounders = pack.founder_radar.slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <Eyebrow>Miss radar</Eyebrow>
        <div className="mt-4 space-y-3">
          {topMisses.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
              <div className="min-w-0">
                <Link
                  href={`/company/${m.slug || m.company_id}`}
                  className="font-semibold hover:text-[var(--signal)]"
                >
                  {m.company_name}
                </Link>
                <p className="mt-1 text-[0.8125rem] text-[var(--muted)] line-clamp-2">{m.lesson}</p>
              </div>
              <span className={cn("label-caps shrink-0", urgencyClass(m.severity))}>{m.severity}</span>
            </div>
          ))}
          {!topMisses.length && <EmptyState>No miss candidates yet.</EmptyState>}
        </div>
      </Panel>
      <Panel>
        <Eyebrow>Founder radar</Eyebrow>
        <div className="mt-4 space-y-3">
          {topFounders.map((f) => (
            <div key={f.id} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">{f.founder}</div>
                <span className={cn("label-caps", urgencyClass(f.urgency))}>{f.urgency}</span>
              </div>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)] line-clamp-2">{f.signal}</p>
            </div>
          ))}
          {!topFounders.length && <EmptyState>No founder signals yet.</EmptyState>}
        </div>
      </Panel>
    </div>
  );
}

function OverridesTab({ pack }: { pack: JudgmentPack }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {pack.overrides.map((o) => (
          <Panel key={o.id} className="!p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/company/${o.slug || o.company_id}`}
                  className="font-semibold hover:text-[var(--signal)]"
                >
                  {o.company_name}
                </Link>
                <div className="mt-1 text-[0.8125rem] text-[var(--muted)]">
                  {o.partner} · {o.created_at.slice(0, 10)}
                  {o.dimension_hint ? ` · dim: ${o.dimension_hint}` : ""}
                </div>
              </div>
              <div className="mono text-sm">
                <span className="text-[var(--faint)]">{o.signal_rec}</span>
                <span className="mx-2 text-[var(--signal)]">→</span>
                <span className="text-[var(--text)]">{o.partner_rec}</span>
              </div>
            </div>
            <p className="mt-3 text-[0.975rem] leading-relaxed">{o.reason}</p>
          </Panel>
        ))}
        {!pack.overrides.length && <EmptyState>Log an override on a company brief.</EmptyState>}
      </div>
    </div>
  );
}

function MissesTab({ pack }: { pack: JudgmentPack }) {
  return (
    <div className="space-y-4">
      {!pack.misses.length && <EmptyState>No miss candidates in current pipeline.</EmptyState>}
      {pack.misses.map((m) => (
        <Panel key={m.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/company/${m.slug || m.company_id}`}
              className="title text-[1.2rem] hover:text-[var(--signal)]"
            >
              {m.company_name}
            </Link>
            <span className={cn("label-caps", urgencyClass(m.severity))}>
              {m.severity}
            </span>
          </div>
          <div className="mt-2 text-[0.8125rem] text-[var(--muted)]">
            Then: {m.then_rec} ({m.then_score?.toFixed(0) ?? "—"}) · Now: {m.now_signal}
          </div>
          <p className="mt-3 text-sm">
            <span className="text-[var(--faint)]">Gap — </span>
            {m.gap}
          </p>
          <p className="mt-2 text-sm text-[var(--signal)]">Lesson: {m.lesson}</p>
          <p className="mt-2 text-[0.9375rem] text-[var(--muted)]">Action: {m.action}</p>
        </Panel>
      ))}
    </div>
  );
}

function FoundersTab({ pack }: { pack: JudgmentPack }) {
  return (
    <div className="space-y-4">
      {!pack.founder_radar.length && <EmptyState>No founder-radar hits right now.</EmptyState>}
      <div className="grid gap-3 md:grid-cols-2">
        {pack.founder_radar.map((f) => (
          <Panel key={f.id} className="!p-4">
            <div className={cn("label-caps", urgencyClass(f.urgency))}>
              {f.urgency}
              {f.gp_flagged_by ? ` · ${f.gp_flagged_by}` : ""}
            </div>
            <div className="mt-1 font-semibold">
              {f.company_slug ? (
                <CompanyLink slug={f.company_slug} name={f.founder} />
              ) : (
                f.founder
              )}
            </div>
            <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">
              Prior: {f.prior}
              {f.theme ? ` · ${f.theme}` : ""}
            </div>
            <p className="mt-3 text-[0.975rem] leading-relaxed">{f.signal}</p>
            <p className="mt-2 text-[0.8125rem] text-[var(--deep)]">{f.action}</p>
            {f.company_slug && (
              <Link
                href={`/company/${f.company_slug}`}
                className="link-quiet mt-3 inline-block text-xs"
              >
                Open related company →
              </Link>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function FreshnessTab({ pack }: { pack: JudgmentPack }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {pack.freshness.map((f) => (
          <Panel key={f.company_id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/company/${f.slug || f.company_id}`}
                className="font-semibold hover:text-[var(--signal)]"
              >
                {f.company_name}
              </Link>
              <div className="mono text-sm">
                <span className={urgencyClass(f.overall)}>{f.overall}</span>
                <span className="mx-2 text-[var(--faint)]">·</span>
                <span className="text-[var(--signal)]">{f.score_confidence}%</span>
              </div>
            </div>
            <p className="mt-2 text-[0.8125rem] text-[var(--muted)]">{f.note}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {f.fields
                .filter((x) => x.status !== "fresh")
                .slice(0, 4)
                .map((x) => (
                  <span key={x.field} className="chip">
                    {x.label}: {x.status}
                    {x.age_days != null ? ` (${x.age_days}d)` : ""}
                  </span>
                ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function MixTab({ pack }: { pack: JudgmentPack }) {
  const m = pack.mix_drift;
  return (
    <Panel>
      <Eyebrow>Portfolio mix constraint</Eyebrow>
      <div className="display mt-3 text-[2.75rem]">
        {m.dominantPct}
        <span className="text-[var(--faint)]"> / </span>
        {m.tacticalPct}
      </div>
      <div className="mt-1 text-[0.9375rem] text-[var(--muted)]">
        Dominant / Tactical · target {m.targetDominant}/{m.targetTactical} · {m.band}
      </div>
      <div
        className={cn(
          "mt-5 rounded-[12px] border px-4 py-3 text-sm",
          m.status === "hard_drift"
            ? "border-[var(--danger)] bg-[var(--danger-dim)] text-[var(--danger)]"
            : m.status === "soft_drift"
              ? "border-[var(--warn)] bg-[var(--warn-dim)] text-[var(--warn)]"
              : "border-[var(--ok)] bg-[var(--ok-dim)] text-[var(--ok)]",
        )}
      >
        {m.alarm || "On target — mix within soft band."}
      </div>
      <p className="mt-4 text-[0.975rem] leading-relaxed text-[var(--muted)]">{m.counsel}</p>
    </Panel>
  );
}

function DigestTab({ pack }: { pack: JudgmentPack }) {
  const d = pack.digest_selectivity;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {d.variants.map((v: DigestVariant) => (
          <Panel
            key={v.id}
            className={cn(
              "!p-4",
              d.winner === v.id && "border-[var(--signal)] bg-[var(--signal-dim)]",
            )}
          >
            <div className="flex items-baseline justify-between">
              <div className="font-semibold capitalize">{v.id}</div>
              {d.winner === v.id && (
                <span className="label-caps text-[var(--signal)]">
                  prefer
                </span>
              )}
            </div>
            <div className="mono mt-3 text-3xl text-[var(--signal)]">{v.precision_proxy}</div>
            <div className="text-[0.8125rem] text-[var(--muted)]">
              {d.metric_label || "Selectivity preview"} · ~{v.partner_minutes} min · {v.deal_cap} deals
            </div>
            <ul className="mt-3 space-y-1">
              {v.deals.map((deal) => (
                <li key={deal.name} className="text-xs">
                  {deal.slug ? (
                    <Link href={`/company/${deal.slug}`} className="hover:text-[var(--signal)]">
                      {deal.name}
                    </Link>
                  ) : (
                    deal.name
                  )}{" "}
                  <span className="text-[var(--faint)]">{deal.score?.toFixed(0)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      {d.counsel ? (
        <Panel>
          <p className="text-sm">{d.counsel}</p>
        </Panel>
      ) : null}
    </div>
  );
}

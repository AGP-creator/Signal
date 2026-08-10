"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eyebrow, EmptyState, Panel } from "@/components/ui";
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
  { id: "brief", label: "Monday brief" },
  { id: "overrides", label: "Override ledger" },
  { id: "misses", label: "Miss retro" },
  { id: "founders", label: "Founder radar" },
  { id: "freshness", label: "Evidence SLA" },
  { id: "mix", label: "Mix drift" },
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
  const [tab, setTab] = useState<Tab>("brief");
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
    <div className="space-y-6">
      <Panel className="border-[rgba(214,255,60,0.22)] bg-[rgba(214,255,60,0.04)]">
        <Eyebrow live className="!text-[var(--signal)]">
          Judgment OS
        </Eyebrow>
        <h2 className="display mt-2 text-[1.75rem] md:text-[2.15rem]">{pack.summary.headline}</h2>
        <p className="mt-2 max-w-2xl text-[0.975rem] leading-relaxed text-[var(--muted)]">
          {pack.summary.edge_note}
        </p>
        <ul className="mt-4 space-y-2">
          {pack.summary.must_do.map((m) => (
            <li key={m} className="flex gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)]" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition",
              tab === t.id
                ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                : "text-[var(--muted)] hover:bg-white/[0.03] hover:text-[var(--text)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

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
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <Eyebrow>Policy fuel</Eyebrow>
        <div className="mt-4 space-y-4">
          {pack.policy_fuel.map((p) => (
            <div key={p.dimension} className="border-b border-[var(--line)] pb-3 last:border-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold">{p.dimension}</div>
                <div className="label-caps text-[var(--deep)]">
                  {p.direction.replace("_", " ")} · {p.override_count}
                </div>
              </div>
              <p className="mt-1.5 text-[0.9375rem] text-[var(--muted)]">{p.counsel}</p>
            </div>
          ))}
          {!pack.policy_fuel.length && <EmptyState>Log an override on a company brief.</EmptyState>}
        </div>
      </Panel>
      <Panel>
        <Eyebrow>Asymmetric radar</Eyebrow>
        <div className="mt-4 space-y-3">
          {pack.founder_radar.slice(0, 3).map((f) => (
            <div key={f.id}>
              <div className={cn("label-caps", urgencyClass(f.urgency))}>
                {f.urgency}
              </div>
              <div className="mt-0.5 font-semibold">{f.founder}</div>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)] line-clamp-2">{f.signal}</p>
            </div>
          ))}
          {pack.misses.slice(0, 2).map((m) => (
            <div key={m.id} className="border-t border-[var(--line)] pt-3">
              <div className={cn("label-caps", urgencyClass(m.severity))}>
                miss · {m.severity}
              </div>
              <Link
                href={`/company/${m.slug || m.company_id}`}
                className="mt-0.5 block font-semibold hover:text-[var(--signal)]"
              >
                {m.company_name}
              </Link>
              <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">{m.lesson}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function OverridesTab({ pack }: { pack: JudgmentPack }) {
  return (
    <div className="space-y-4">
      <p className="text-[0.9375rem] text-[var(--muted)]">
        Every partner disagreement is preference data — the real firm asset. Disagree on a company
        page; Signal turns it into policy fuel (not silent fine-tuning).
      </p>
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
      </div>
    </div>
  );
}

function MissesTab({ pack }: { pack: JudgmentPack }) {
  return (
    <div className="space-y-4">
      <p className="text-[0.9375rem] text-[var(--muted)]">
        Blameless postmortems when breakout physics or peer FOMO arrives after Signal stayed cool.
        False negatives in white-space themes hurt more than missing the 40th AI wrapper.
      </p>
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
      <p className="text-[0.9375rem] text-[var(--muted)]">
        Watched operators leaving labs / spinning stealth newcos — asymmetric urgency that should
        never wait for Wednesday&apos;s digest.
      </p>
      {!pack.founder_radar.length && <EmptyState>No founder-radar hits right now.</EmptyState>}
      <div className="grid gap-3 md:grid-cols-2">
        {pack.founder_radar.map((f) => (
          <Panel key={f.id} className="!p-4">
            <div className={cn("label-caps", urgencyClass(f.urgency))}>
              {f.urgency}
              {f.gp_flagged_by ? ` · ${f.gp_flagged_by}` : ""}
            </div>
            <div className="mt-1 font-semibold">{f.founder}</div>
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
      <p className="text-[0.9375rem] text-[var(--muted)]">
        Fields older than SLA automatically lose confidence. A beautiful stale brief is worse than a
        plain fresh one.
      </p>
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
            ? "border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] text-[var(--danger)]"
            : m.status === "soft_drift"
              ? "border-[rgba(255,176,32,0.35)] bg-[rgba(255,176,32,0.08)] text-[var(--warn)]"
              : "border-[rgba(61,214,140,0.25)] bg-[rgba(61,214,140,0.06)] text-[var(--ok)]",
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
      <p className="text-[0.9375rem] text-[var(--muted)]">
        Selectivity is the product. We simulate 3 vs 5 vs 8 deal digests — if they won&apos;t forward
        it, we failed.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {d.variants.map((v: DigestVariant) => (
          <Panel
            key={v.id}
            className={cn(
              "!p-4",
              d.winner === v.id && "border-[rgba(214,255,60,0.35)] bg-[rgba(214,255,60,0.05)]",
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
              precision proxy · ~{v.partner_minutes} partner min · {v.deal_cap} deals
            </div>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--muted)]">{v.note}</p>
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
      <Panel>
        <p className="text-sm">{d.counsel}</p>
      </Panel>
    </div>
  );
}

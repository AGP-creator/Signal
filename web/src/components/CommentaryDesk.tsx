"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart, DonutChart } from "@/components/charts";
import { EmptyState, Eyebrow, MiniStat, Panel } from "@/components/ui";
import {
  buildCommentaryIntel,
  buildLibraryCommentaryPack,
  postureTone,
  themeTone,
  type AnnotatedCommentary,
  type CommentaryChannel,
  type CommentaryIntel,
  type QualitativePosture,
  type VoiceRole,
} from "@/lib/commentaryIntel";
import type { Commentary, Company } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "company" | "library";

const CHANNELS: CommentaryChannel[] = [
  "Twitter/X",
  "Hacker News",
  "Reddit",
  "Blind",
  "Podcast",
  "Substack",
  "Other",
];

function postureClass(p: QualitativePosture) {
  if (p === "beloved" || p === "validated") return "text-[var(--ok)]";
  if (p === "contested") return "text-[var(--warn)]";
  if (p === "skeptical") return "text-[var(--danger)]";
  return "text-[var(--muted)]";
}

function sentimentClass(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (v === "positive") return "text-[var(--ok)]";
  if (v === "negative") return "text-[var(--danger)]";
  if (v === "mixed") return "text-[var(--warn)]";
  return "text-[var(--muted)]";
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "Copied" : "Copy brief"}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-sm)] border px-2.5 py-1 text-[0.75rem] transition",
        active
          ? "border-[color-mix(in_srgb,var(--signal)_45%,var(--line))] bg-[var(--signal-dim)] text-[var(--signal)]"
          : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--text)]/20 hover:text-[var(--text)]",
      )}
    >
      {children}
    </button>
  );
}

function ThemeCard({
  question,
  label,
  strength,
  polarity,
  summary,
  count,
}: {
  question: string;
  label: string;
  strength: string;
  polarity: "bull" | "bear" | "mixed";
  summary: string;
  count: number;
}) {
  const tone = themeTone(polarity);
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "danger"
        ? "var(--danger)"
        : tone === "warn"
          ? "var(--warn)"
          : "var(--signal)";
  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/40 px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="label-caps" style={{ color }}>
          {question}
        </div>
        <span className="mono shrink-0 text-[0.7rem] text-[var(--faint)]">
          {strength} · {count}
        </span>
      </div>
      <div className="mt-1.5 text-[0.875rem] font-semibold text-[var(--text)]">{label}</div>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--muted)]">{summary}</p>
    </div>
  );
}

function QuoteRow({
  item,
  showCompany,
}: {
  item: AnnotatedCommentary;
  showCompany?: boolean;
}) {
  return (
    <article className="border-b border-[var(--line)] py-4 last:border-0 last:pb-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Eyebrow>
          {item.channel}
          {item.captured_at ? ` · ${item.captured_at}` : ""}
        </Eyebrow>
        <span className={cn("text-[0.75rem] font-medium", sentimentClass(item.sentiment))}>
          {item.sentiment || "mixed"}
        </span>
        <span className="text-[0.75rem] text-[var(--faint)]">
          {item.credibility_tier || "—"} credibility
        </span>
        {item.watchlist_voice ? (
          <span className="rounded-[var(--radius-sm)] border border-[var(--line)] px-1.5 py-0.5 text-[0.7rem] text-[var(--signal)]">
            {item.watchlist_voice}
          </span>
        ) : null}
        {showCompany && item.company_name && item.company_id ? (
          <Link
            href={`/company/${item.company_id}`}
            className="text-[0.75rem] font-medium text-[var(--signal)] hover:underline"
          >
            {item.company_name}
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-[0.975rem] leading-relaxed text-[var(--text)]/92">
        {item.quote_or_summary}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className="rounded-[var(--radius-sm)] border border-[var(--line)] px-2 py-0.5 text-[0.7rem] text-[var(--faint)]">
          {item.voice_role}
        </span>
        {item.themes.map((t) => (
          <span
            key={t}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] px-2 py-0.5 text-[0.7rem] text-[var(--faint)]"
          >
            {t.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </article>
  );
}

function IntelHeader({
  intel,
  title,
  subtitle,
}: {
  intel: CommentaryIntel;
  title: string;
  subtitle?: string;
}) {
  const tone = postureTone(intel.posture);
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <div className="label-caps">Investor & operator commentary</div>
        <h2 className="title mt-1.5 text-[1.35rem] md:text-[1.5rem]">{title}</h2>
        {subtitle ? <p className="mt-2 text-[0.9rem] text-[var(--muted)]">{subtitle}</p> : null}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={cn("text-[1.05rem] font-semibold", postureClass(intel.posture))}>
            {intel.posture_label}
          </span>
          <span className="text-[0.8125rem] text-[var(--faint)]">·</span>
          <span className="text-[0.8125rem] text-[var(--muted)]">{intel.lean_label}</span>
        </div>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--text)]/85">{intel.counsel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <MiniStat label="Voices" value={intel.count} tone={tone} />
        <MiniStat label="High cred" value={intel.high_cred_count} tone="signal" />
        <MiniStat
          label="Lean"
          value={`${intel.lean > 0 ? "+" : ""}${intel.lean}`}
          tone={intel.lean >= 20 ? "ok" : intel.lean <= -20 ? "danger" : "warn"}
        />
        <CopyBtn text={intel.markdown} />
      </div>
    </div>
  );
}

function VizRow({ intel }: { intel: CommentaryIntel }) {
  if (!intel.count) return null;
  const sentimentSlices = [
    {
      label: "Positive",
      pct: Math.round((100 * intel.sentiment.positive) / intel.count),
      color: "var(--ok)",
      n: intel.sentiment.positive,
    },
    {
      label: "Mixed",
      pct: Math.round((100 * intel.sentiment.mixed) / intel.count),
      color: "var(--warn)",
      n: intel.sentiment.mixed,
    },
    {
      label: "Negative",
      pct: Math.round((100 * intel.sentiment.negative) / intel.count),
      color: "var(--danger)",
      n: intel.sentiment.negative,
    },
    {
      label: "Neutral",
      pct: Math.round((100 * intel.sentiment.neutral) / intel.count),
      color: "var(--faint)",
      n: intel.sentiment.neutral,
    },
  ].filter((s) => s.n > 0);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div>
        <div className="label-caps mb-3">Source mix</div>
        <BarChart
          height={150}
          series={intel.channels.map((c) => ({
            label:
              c.channel === "Twitter/X"
                ? "X"
                : c.channel === "Hacker News"
                  ? "HN"
                  : c.channel.slice(0, 8),
            value: c.count,
          }))}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {intel.channels.map((c) => (
            <span key={c.channel} className="text-[0.7rem] text-[var(--faint)]">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />{" "}
              {c.channel} {c.pct}%
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="label-caps mb-3">Credibility-weighted lean</div>
        <DonutChart
          size={148}
          centerLabel="lean"
          centerValue={`${intel.lean > 0 ? "+" : ""}${intel.lean}`}
          slices={sentimentSlices}
        />
        <div className="mt-3 flex flex-wrap gap-3 text-[0.75rem] text-[var(--muted)]">
          {intel.roles.map((r) => (
            <span key={r.role}>
              {r.label} <span className="mono text-[var(--text)]">{r.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Feed({
  items,
  showCompany,
}: {
  items: AnnotatedCommentary[];
  showCompany?: boolean;
}) {
  const [channel, setChannel] = useState<CommentaryChannel | "all">("all");
  const [role, setRole] = useState<VoiceRole | "all">("all");
  const [sentiment, setSentiment] = useState<"all" | "positive" | "mixed" | "negative">("all");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (channel !== "all" && i.channel !== channel) return false;
      if (role !== "all" && i.voice_role !== role) return false;
      if (sentiment !== "all" && (i.sentiment || "").toLowerCase() !== sentiment) return false;
      return true;
    });
  }, [items, channel, role, sentiment]);

  const rolesPresent = useMemo(() => {
    const s = new Set(items.map((i) => i.voice_role));
    return [...s];
  }, [items]);

  const channelsPresent = useMemo(() => {
    const s = new Set(items.map((i) => i.channel));
    return CHANNELS.filter((c) => s.has(c));
  }, [items]);

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-caps">Captured voices</div>
          <p className="mt-1 text-[0.8125rem] text-[var(--muted)]">
            Filter by channel, voice type, or sentiment — qualitative tape, not a vanity dashboard.
          </p>
        </div>
        <div className="mono text-[0.75rem] text-[var(--faint)]">
          {filtered.length}/{items.length}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <FilterChip active={channel === "all"} onClick={() => setChannel("all")}>
          All channels
        </FilterChip>
        {channelsPresent.map((c) => (
          <FilterChip key={c} active={channel === c} onClick={() => setChannel(c)}>
            {c}
          </FilterChip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <FilterChip active={role === "all"} onClick={() => setRole("all")}>
          All voices
        </FilterChip>
        {rolesPresent.map((r) => (
          <FilterChip key={r} active={role === r} onClick={() => setRole(r)}>
            {r}
          </FilterChip>
        ))}
        {(["positive", "mixed", "negative"] as const).map((s) => (
          <FilterChip key={s} active={sentiment === s} onClick={() => setSentiment(s)}>
            {s}
          </FilterChip>
        ))}
        {sentiment !== "all" ? (
          <FilterChip active={false} onClick={() => setSentiment("all")}>
            Clear sentiment
          </FilterChip>
        ) : null}
      </div>

      <div className="mt-4">
        {filtered.map((item) => (
          <QuoteRow key={item.id} item={item} showCompany={showCompany} />
        ))}
        {!filtered.length && <EmptyState>No voices match these filters.</EmptyState>}
      </div>
    </div>
  );
}

function CompanyRadar({ pack }: { pack: ReturnType<typeof buildLibraryCommentaryPack> }) {
  if (!pack.by_company.length) return null;
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div>
        <div className="label-caps mb-3">Constructive tape</div>
        <ul className="space-y-2.5">
          {pack.hot.map((c) => (
            <li key={c.company_id || c.company_name}>
              <Link
                href={c.company_id ? `/company/${c.company_id}` : "/library?tab=commentary"}
                className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--ok)_35%,var(--line))]"
              >
                <div>
                  <div className="font-semibold hover:text-[var(--signal)]">
                    {c.company_name || c.company_id}
                  </div>
                  <div className={cn("mt-0.5 text-[0.75rem]", postureClass(c.posture))}>
                    {c.posture_label}
                  </div>
                </div>
                <div className="mono text-[0.8125rem] text-[var(--ok)]">
                  {c.lean > 0 ? "+" : ""}
                  {c.lean}
                </div>
              </Link>
            </li>
          ))}
          {!pack.hot.length && <EmptyState>No strongly constructive names yet.</EmptyState>}
        </ul>
      </div>
      <div>
        <div className="label-caps mb-3">Skepticism / friction</div>
        <ul className="space-y-2.5">
          {pack.red_flags.map((c) => (
            <li key={`rf-${c.company_id || c.company_name}`}>
              <Link
                href={c.company_id ? `/company/${c.company_id}` : "/library?tab=commentary"}
                className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--danger)_35%,var(--line))]"
              >
                <div>
                  <div className="font-semibold hover:text-[var(--signal)]">
                    {c.company_name || c.company_id}
                  </div>
                  <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">
                    {c.themes
                      .filter((t) => t.polarity === "bear")
                      .map((t) => t.label)
                      .slice(0, 2)
                      .join(" · ") || c.posture_label}
                  </div>
                </div>
                <div className="mono text-[0.8125rem] text-[var(--danger)]">{c.lean}</div>
              </Link>
            </li>
          ))}
          {!pack.red_flags.length && <EmptyState>No red-flag themes flagged.</EmptyState>}
        </ul>
      </div>
    </div>
  );
}

export function CommentaryDesk({
  commentary,
  company,
  summary,
  mode = "company",
  embedded,
}: {
  commentary: Commentary[];
  company?: Pick<Company, "id" | "name"> & {
    commentary_summary?: string | null;
  } | null;
  summary?: string | null;
  mode?: Mode;
  /** When true, omit outer Panel (parent already wraps). */
  embedded?: boolean;
}) {
  const companyId = company?.id;
  const companyName = company?.name;
  const rollup = summary ?? company?.commentary_summary ?? null;

  const intel = useMemo(() => {
    const companyArg = companyId
      ? ({
          id: companyId,
          name: companyName || companyId,
          commentary_summary: rollup,
        } as Company)
      : null;
    return buildCommentaryIntel(commentary, {
      company: companyArg,
      companyId,
      summary: rollup,
    });
  }, [commentary, companyId, companyName, rollup]);

  const library = useMemo(
    () => (mode === "library" ? buildLibraryCommentaryPack(commentary) : null),
    [mode, commentary],
  );

  const body = (
    <>
      <IntelHeader
        intel={mode === "library" && library ? library.aggregate : intel}
        title={
          mode === "library"
            ? "Pipeline qualitative signal"
            : companyName
              ? `What people are saying about ${companyName}`
              : "What people are saying"
        }
        subtitle={
          mode === "library"
            ? "X, HN, Reddit, Blind, podcasts, Substack — engineer love, customer churn, and GP skepticism often beat the funding headline."
            : "Qualitative leading indicator: engineer love, customer churn, and GP skepticism vs the funding headline."
        }
      />

      {mode === "company" && rollup ? (
        <p className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)]/50 px-3.5 py-3 text-[0.9rem] leading-relaxed text-[var(--text)]/88">
          {rollup}
        </p>
      ) : null}

      <VizRow intel={mode === "library" && library ? library.aggregate : intel} />

      {(mode === "library" && library ? library.aggregate.themes : intel.themes).length > 0 && (
        <div className="mt-7">
          <div className="label-caps mb-3">Questions the tape answers</div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(mode === "library" && library ? library.aggregate.themes : intel.themes).map((t) => (
              <ThemeCard
                key={t.id}
                question={t.question}
                label={t.label}
                strength={t.strength}
                polarity={t.polarity}
                summary={t.summary}
                count={t.count}
              />
            ))}
          </div>
        </div>
      )}

      {mode === "library" && library ? <CompanyRadar pack={library} /> : null}

      {!(mode === "library" && library ? library.aggregate.count : intel.count) ? (
        <div className="mt-6">
          <EmptyState>
            {rollup ||
              "No discrete commentary rows yet. Refresh pipeline to pull HN/RSS; live X/Reddit/Blind is Phase 2."}
          </EmptyState>
        </div>
      ) : (
        <Feed
          items={mode === "library" && library ? library.aggregate.items : intel.items}
          showCompany={mode === "library"}
        />
      )}

      <p className="mt-6 text-[0.75rem] text-[var(--faint)]">
        Sources: Twitter/X · Reddit · Hacker News · Blind · podcasts · Substack. Live vendor firehose
        for X/Reddit/Blind is Phase 2 — this desk ranks and visualizes what Signal already captured.
      </p>
    </>
  );

  if (embedded) return <div>{body}</div>;
  return <Panel className="stagger">{body}</Panel>;
}

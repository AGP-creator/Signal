/**
 * Partner Meeting OS — the weekly partner ritual object.
 *
 * GPs don't need another dashboard. They need a 90-minute agenda:
 * decide / diligence / watch / firm / LP-ready narrative.
 */

import { buildGoldenPack } from "@/lib/goldenInsights";
import { buildJudgmentPack, type JudgmentPack, type PartnerOverride } from "@/lib/judgment";
import {
  diligenceProgress,
  STAGE_LABEL,
  trailsNeedingMeeting,
  type DealTrail,
} from "@/lib/icTrail";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { portfolioMix } from "@/lib/utils";

export type AgendaItem = {
  id: string;
  block: "decide" | "diligence" | "intel" | "firm" | "read";
  minutes: number;
  title: string;
  subtitle: string;
  urgency: "now" | "this_week" | "monitor";
  href?: string;
  company_id?: string;
  evidence: string[];
  ask: string;
};

export type MeetingPack = {
  generated_at: string;
  meeting_label: string;
  total_minutes: number;
  headline: string;
  counsel: string;
  agenda: AgendaItem[];
  decide: AgendaItem[];
  diligence: AgendaItem[];
  intel: AgendaItem[];
  firm: AgendaItem[];
  read: AgendaItem[];
  stats: {
    deep_dives: number;
    high_alerts: number;
    thesis_shifts: number;
    stale_reviews: number;
    mix_status: string;
    active_ic: number;
  };
  markdown: string;
};

function urgencyRank(u: AgendaItem["urgency"]) {
  return u === "now" ? 0 : u === "this_week" ? 1 : 2;
}

export function buildMeetingPack(
  companies: Company[],
  peers: PeerActivity[],
  commentary: Commentary[],
  news: NewsItem[],
  alerts: AlertItem[],
  sectors: SectorCall[],
  trails: DealTrail[],
  overrides: PartnerOverride[] = [],
): MeetingPack {
  const judgment: JudgmentPack = buildJudgmentPack(
    companies,
    peers,
    commentary,
    news,
    alerts,
    overrides,
  );
  const intel = buildPeerIntelligence(companies, peers);
  const golden = buildGoldenPack(intel, companies);
  const mix = portfolioMix(companies);
  const active = trailsNeedingMeeting(trails);
  const agenda: AgendaItem[] = [];

  // 1) Decide — partner meeting / IC vote trails + top Deep Dives
  for (const t of active.filter((x) =>
    ["partner_meeting", "ic_vote", "term_sheet"].includes(x.stage),
  )) {
    const prog = diligenceProgress(t.diligence);
    const tally = t.votes.reduce(
      (acc, v) => {
        acc[v.choice] = (acc[v.choice] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    agenda.push({
      id: `decide_${t.company_id}`,
      block: "decide",
      minutes: 15,
      title: t.company_name,
      subtitle: `${STAGE_LABEL[t.stage]} · sponsor ${t.sponsor}${t.check_size_m ? ` · $${t.check_size_m}M check` : ""}`,
      urgency: t.stage === "ic_vote" || t.stage === "term_sheet" ? "now" : "this_week",
      href: t.slug ? `/company/${t.slug}` : `/ic`,
      company_id: t.company_id,
      evidence: [
        t.thesis_hook,
        `DD ${prog.done}/${prog.total}${prog.blocked ? ` · ${prog.blocked} blocked` : ""}`,
        t.votes.length
          ? `Votes: yes ${tally.yes || 0} · no ${tally.no || 0} · more DD ${tally.more_diligence || 0}`
          : "No votes yet",
        ...(t.risks.slice(0, 2) || []),
      ],
      ask:
        t.stage === "ic_vote"
          ? "Close the vote or request more diligence."
          : "Proceed to IC, Watch, or Pass — record the reason.",
    });
  }

  const decideIds = new Set(agenda.map((a) => a.company_id).filter(Boolean));
  for (const c of companies.filter((x) => x.recommendation === "Deep Dive").slice(0, 4)) {
    if (decideIds.has(c.id)) continue;
    agenda.push({
      id: `dd_${c.id}`,
      block: "decide",
      minutes: 10,
      title: c.name,
      subtitle: `Deep Dive · score ${c.thesis_score?.toFixed(0) ?? "—"} · ${c.relative_rank || ""}`,
      urgency: (c.thesis_score || 0) >= 82 ? "now" : "this_week",
      href: `/company/${c.slug || c.id}`,
      company_id: c.id,
      evidence: [c.why_now || c.one_liner || "", `Tier-1: ${c.tier1_count ?? 0}`].filter(Boolean),
      ask: "Assign sponsor + advance to Diligence, or Pass with spine.",
    });
  }

  // 2) Diligence updates
  for (const t of active.filter((x) => x.stage === "diligence" || x.stage === "deep_dive")) {
    if (agenda.some((a) => a.company_id === t.company_id)) continue;
    const prog = diligenceProgress(t.diligence);
    agenda.push({
      id: `dil_${t.company_id}`,
      block: "diligence",
      minutes: 8,
      title: t.company_name,
      subtitle: `${STAGE_LABEL[t.stage]} · ${prog.pct}% DD complete`,
      urgency: prog.blocked ? "now" : "this_week",
      href: `/company/${t.slug || t.company_id}`,
      company_id: t.company_id,
      evidence: [
        ...t.open_questions.slice(0, 2),
        ...t.diligence
          .filter((d) => d.status === "blocked" || d.status === "in_progress")
          .slice(0, 2)
          .map((d) => `${d.label}: ${d.status}`),
      ],
      ask: "Unblock DD items or schedule partner intro.",
    });
  }

  // 3) Intel — alerts, thesis shifts, founder radar, crowding
  for (const a of alerts.filter((x) => x.severity === "high").slice(0, 4)) {
    agenda.push({
      id: `alert_${a.id}`,
      block: "intel",
      minutes: 5,
      title: a.title || "Alert",
      subtitle: a.alert_type || "Immediate routing",
      urgency: "now",
      href: a.company_id ? `/company/${a.company_id}` : "/judgment",
      company_id: a.company_id || undefined,
      evidence: [a.body || ""].filter(Boolean),
      ask: "Route: Deep Dive, Watch, or ignore with note.",
    });
  }

  for (const p of peers.filter((x) => x.thesis_shift).slice(0, 3)) {
    agenda.push({
      id: `shift_${p.id}`,
      block: "intel",
      minutes: 4,
      title: `${p.firm} thesis shift`,
      subtitle: `${p.company_name || "Unknown"} · ${p.theme || ""}`,
      urgency: "this_week",
      href: "/peers",
      evidence: [p.notes || "Off stated focus — flag for human read"].filter(Boolean),
      ask: "Do we know something, or are they lost?",
    });
  }

  for (const f of judgment.founder_radar.filter((x) => x.urgency === "now").slice(0, 2)) {
    agenda.push({
      id: `founder_${f.id}`,
      block: "intel",
      minutes: 5,
      title: `Founder radar: ${f.founder}`,
      subtitle: f.prior,
      urgency: "now",
      href: "/judgment",
      evidence: [f.signal, f.action],
      ask: "Warm intro path — who owns the relationship?",
    });
  }

  for (const g of golden.insights
    .filter((i) => i.kind === "crowding" || i.kind === "syndicate" || i.kind === "alpha")
    .slice(0, 3)) {
    agenda.push({
      id: `gold_${g.id}`,
      block: "intel",
      minutes: 4,
      title: g.title,
      subtitle: g.kind,
      urgency: g.urgency,
      href: g.hrefs?.[0]?.href || "/peers",
      evidence: [g.insight, ...g.evidence.slice(0, 2)],
      ask: g.action,
    });
  }

  // 4) Firm — mix, stale, overrides, sectors
  if (judgment.mix_drift.status !== "on_target") {
    agenda.push({
      id: "mix_drift",
      block: "firm",
      minutes: 6,
      title: "Portfolio mix drift",
      subtitle: `${mix.dominantPct}/${mix.tacticalPct} vs 60/40 · ${judgment.mix_drift.status}`,
      urgency: judgment.mix_drift.status === "hard_drift" ? "now" : "this_week",
      href: "/judgment",
      evidence: [judgment.mix_drift.alarm || "", judgment.mix_drift.counsel].filter(Boolean),
      ask: "Bias next Deep Dives to rebalance — or document intentional override.",
    });
  }

  const stale = companies.filter((c) => c.is_stale || c.review_status === "Pending Partner Review");
  if (stale.length) {
    agenda.push({
      id: "stale_review",
      block: "firm",
      minutes: 8,
      title: `Stale review (${stale.length})`,
      subtitle: "≥90 days · partner review",
      urgency: stale.length >= 3 ? "this_week" : "monitor",
      href: "/library?tab=stale",
      evidence: stale.slice(0, 4).map((c) => `${c.name} · ${c.recommendation}`),
      ask: "Keep / Watch / Pass — human decision required.",
    });
  }

  if (judgment.overrides.length) {
    agenda.push({
      id: "overrides",
      block: "firm",
      minutes: 5,
      title: "Override ledger",
      subtitle: `${judgment.overrides.length} partner disagreements → policy fuel`,
      urgency: "monitor",
      href: "/judgment",
      evidence: judgment.overrides.slice(0, 3).map(
        (o) => `${o.company_name}: Signal ${o.signal_rec} → Partner ${o.partner_rec}`,
      ),
      ask: "Any dimension that should update thesis_policy.yaml?",
    });
  }

  for (const s of sectors.slice(0, 2)) {
    agenda.push({
      id: `sector_${s.id}`,
      block: "firm",
      minutes: 4,
      title: s.subsector,
      subtitle: `Sector of Tomorrow · heat ${s.heat_score} · ${s.consensus_level}`,
      urgency: "monitor",
      href: "/sectors",
      evidence: [s.why_thirdbase_cares || "", ...(s.evidence || []).slice(0, 2)].filter(Boolean),
      ask: "Add to scan list or wait for company evidence.",
    });
  }

  // 5) Read — news worth 2 minutes
  for (const n of news.slice(0, 3)) {
    agenda.push({
      id: `news_${n.id}`,
      block: "read",
      minutes: 2,
      title: n.title,
      subtitle: n.source || "News",
      urgency: "monitor",
      href: "/library?tab=news",
      evidence: [n.why_it_matters || ""].filter(Boolean),
      ask: "Forward to digest or skip.",
    });
  }

  const sorted = [...agenda].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  const decide = sorted.filter((a) => a.block === "decide");
  const diligence = sorted.filter((a) => a.block === "diligence");
  const intelItems = sorted.filter((a) => a.block === "intel");
  const firm = sorted.filter((a) => a.block === "firm");
  const read = sorted.filter((a) => a.block === "read");

  // Cap meeting to ~90 minutes by trimming monitor reads first
  let budget = 90;
  const capped: AgendaItem[] = [];
  for (const item of sorted) {
    if (budget < item.minutes && item.urgency === "monitor") continue;
    if (budget <= 0) break;
    capped.push(item);
    budget -= item.minutes;
  }

  const deepDives = companies.filter((c) => c.recommendation === "Deep Dive").length;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const thesisShifts = peers.filter((p) => p.thesis_shift).length;

  const headline =
    decide.filter((d) => d.urgency === "now").length > 0
      ? `${decide.filter((d) => d.urgency === "now").length} decision${decide.filter((d) => d.urgency === "now").length === 1 ? "" : "s"} before lunch`
      : "Protect partner attention — selective agenda";

  const counsel = [
    judgment.mix_drift.alarm || null,
    highAlerts ? `${highAlerts} high alert${highAlerts === 1 ? "" : "s"}` : null,
    stale.length ? `${stale.length} stale for review` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const total_minutes = capped.reduce((s, i) => s + i.minutes, 0);
  const meeting_label = "Partner Meeting · Week of Aug 10, 2026";

  const markdown = [
    `# ${meeting_label}`,
    "",
    `**${headline}**`,
    "",
    counsel,
    "",
    `Budget: ~${total_minutes} minutes`,
    "",
    ...(["decide", "diligence", "intel", "firm", "read"] as const).flatMap((block) => {
      const items = capped.filter((a) => a.block === block);
      if (!items.length) return [];
      const label =
        block === "decide"
          ? "Decide"
          : block === "diligence"
            ? "Diligence"
            : block === "intel"
              ? "Market intel"
              : block === "firm"
                ? "Firm"
                : "Read";
      return [
        `## ${label}`,
        "",
        ...items.flatMap((item) => [
          `### ${item.title} (${item.minutes}m · ${item.urgency})`,
          item.subtitle,
          "",
          ...item.evidence.map((e) => `- ${e}`),
          "",
          `**Ask:** ${item.ask}`,
          "",
        ]),
      ];
    }),
  ].join("\n");

  return {
    generated_at: new Date().toISOString(),
    meeting_label,
    total_minutes,
    headline,
    counsel,
    agenda: capped,
    decide: decide.filter((d) => capped.includes(d)),
    diligence: diligence.filter((d) => capped.includes(d)),
    intel: intelItems.filter((d) => capped.includes(d)),
    firm: firm.filter((d) => capped.includes(d)),
    read: read.filter((d) => capped.includes(d)),
    stats: {
      deep_dives: deepDives,
      high_alerts: highAlerts,
      thesis_shifts: thesisShifts,
      stale_reviews: stale.length,
      mix_status: judgment.mix_drift.status,
      active_ic: active.length,
    },
    markdown,
  };
}

import type { AlertItem, Commentary, Company, NewsItem, PeerActivity, SectorCall } from "@/lib/types";
import {
  buildDiligencePack,
  companyToSubject,
  formatBearCaseMarkdown,
  formatDiligencePlanMarkdown,
  formatMeetingPrepMarkdown,
} from "@/lib/diligence";
import {
  buildGoldenPack,
  formatGoldenBriefMarkdown,
} from "@/lib/goldenInsights";
import {
  buildJudgmentPack,
  formatJudgmentBriefMarkdown,
} from "@/lib/judgment";
import { buildDemoTrails, mergeTrailsWithCompanies, STAGE_LABEL } from "@/lib/icTrail";
import { buildLpDeskPack } from "@/lib/lpDesk";
import { buildMeetingPack } from "@/lib/meeting";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import {
  briefToMarkdown,
  looksLikeCompanyQuery,
  researchCompany,
} from "@/lib/research";

function findCompanyByQuestion(question: string, companies: Company[]): Company | null {
  const q = question.toLowerCase();
  const ranked = [...companies].sort((a, b) => b.name.length - a.name.length);
  for (const c of ranked) {
    if (c.name.length >= 3 && q.includes(c.name.toLowerCase())) return c;
  }
  return null;
}

function filterSectorsForQuestion(question: string, sectors: SectorCall[]): SectorCall[] {
  const q = question.toLowerCase();
  const ranked = [...sectors].sort((a, b) => (b.heat_score || 0) - (a.heat_score || 0));
  const wantsAiInfra =
    q.includes("ai infra") ||
    q.includes("ai infrastructure") ||
    q.includes("compute stack") ||
    q.includes("nobody is talking") ||
    q.includes("nobody talking") ||
    (q.includes("ai") && (q.includes("infra") || q.includes("sub-sector") || q.includes("subsector")));

  if (wantsAiInfra) {
    const ai = ranked.filter(
      (s) =>
        (s.parent_theme || "").toLowerCase().includes("ai infrastructure") ||
        (s.parent_theme || "").toLowerCase().includes("ai-native"),
    );
    if (ai.length >= 3) return ai.slice(0, 3);
    if (ai.length) return [...ai, ...ranked.filter((s) => !ai.includes(s))].slice(0, 3);
  }
  if (q.includes("contrarian") || q.includes("nobody")) {
    const contra = ranked.filter((s) => (s.consensus_level || "").toLowerCase() === "contrarian");
    if (contra.length) return [...contra, ...ranked.filter((s) => !contra.includes(s))].slice(0, 3);
  }
  return ranked.slice(0, 3);
}

export function answerPartnerQuestion(
  question: string,
  ctx: {
    companies: Company[];
    sectors: SectorCall[];
    peers: PeerActivity[];
    commentary?: Commentary[];
    news?: NewsItem[];
    alerts?: AlertItem[];
  },
): string {
  const q = question.toLowerCase();
  const { companies, sectors, peers } = ctx;
  const commentary = ctx.commentary || [];
  const news = ctx.news || [];
  const alerts = ctx.alerts || [];
  const intel = buildPeerIntelligence(companies, peers);
  const pack = buildGoldenPack(intel, companies);
  const judgment = buildJudgmentPack(companies, peers, commentary, news, alerts);

  // Diligence Stress Pack intents
  const wantsBear =
    /\b(bear case|argue against|counterfactual|kill (the )?deal|why (not|pass)|stress test)\b/i.test(
      question,
    );
  const wantsDiligence =
    /\b(diligence plan|work orders?|founder[- ]only|diligence (checklist|questions?)|what (should|do) i ask)\b/i.test(
      question,
    );
  const wantsMeetingPrep =
    /\b(meeting prep|prep me|pre[- ]call|prepare (me )?for (a |the )?call|call sheet)\b/i.test(
      question,
    );
  const wantsDiligencePack =
    /\b(diligence stress|stress pack|full diligence)\b/i.test(question);

  if (wantsBear || wantsDiligence || wantsMeetingPrep || wantsDiligencePack) {
    const hit = findCompanyByQuestion(question, companies);
    if (!hit) {
      return "Name a pipeline company — e.g. “bear case for AgentGate” or “prep me for a call with SwarmGuard”.";
    }
    const pack = buildDiligencePack(companyToSubject(hit), {
      commentary: commentary.filter((c) => c.company_id === hit.id),
      peers,
    });
    if (wantsDiligencePack) {
      return [
        formatBearCaseMarkdown(pack.bear),
        "",
        "---",
        "",
        formatDiligencePlanMarkdown(pack.plan),
        "",
        "---",
        "",
        formatMeetingPrepMarkdown(pack.meeting),
      ].join("\n");
    }
    if (wantsMeetingPrep) return formatMeetingPrepMarkdown(pack.meeting);
    if (wantsDiligence) return formatDiligencePlanMarkdown(pack.plan);
    return formatBearCaseMarkdown(pack.bear);
  }

  // Partner Meeting OS / IC / LP desk
  const wantsMeetingAgenda =
    /\b(monday (partner )?meeting|partner meeting agenda|meeting agenda|build monday|what('s| is) on (the )?agenda)\b/i.test(
      question,
    ) ||
    (q.includes("monday") && (q.includes("agenda") || q.includes("meeting") || q.includes("partner")));
  const wantsLp =
    /\b(lp (process|desk|one[- ]pager|brief|transparency)|limited partner|how (does |do )?ai (show|shows|fit)|process for lps)\b/i.test(
      question,
    );
  const wantsIc =
    /\b(ic (trail|vote|governance|this week)|decision trail|what's on ic|what is on ic|investment committee)\b/i.test(
      question,
    );

  if (wantsMeetingAgenda || wantsLp || wantsIc) {
    const trails = mergeTrailsWithCompanies(companies, buildDemoTrails(companies));
    if (wantsLp) {
      const lp = buildLpDeskPack(companies, peers, commentary, news, alerts, trails);
      return lp.one_pager_md;
    }
    if (wantsIc) {
      const active = trails.filter((t) =>
        ["deep_dive", "diligence", "partner_meeting", "ic_vote", "term_sheet"].includes(t.stage),
      );
      return [
        "# IC Decision Trail — active",
        "",
        ...active.slice(0, 8).map(
          (t) =>
            `- **${t.company_name}** — ${STAGE_LABEL[t.stage]} · sponsor ${t.sponsor}${t.votes.length ? ` · ${t.votes.length} vote(s)` : ""}`,
        ),
        "",
        "Open /ic for diligence checklists, votes, and the full event log.",
      ].join("\n");
    }
    const meeting = buildMeetingPack(
      companies,
      peers,
      commentary,
      news,
      alerts,
      sectors,
      trails,
    );
    return meeting.markdown;
  }

  if (
    q.includes("judgment") ||
    q.includes("override") ||
    q.includes("miss retrospect") ||
    q.includes("founder radar") ||
    q.includes("freshness") ||
    q.includes("evidence sla") ||
    q.includes("digest select") ||
    q.includes("mix drift") ||
    (q.includes("policy fuel") || q.includes("what did we miss"))
  ) {
    if (q.includes("founder")) {
      if (!judgment.founder_radar.length) return "Founder radar is quiet right now.";
      return [
        "Founder radar (watched operators / stealth newcos):",
        "",
        ...judgment.founder_radar.slice(0, 5).map(
          (f) =>
            `- **${f.founder}** (${f.urgency}${f.gp_flagged_by ? `, ${f.gp_flagged_by}` : ""}) — ${f.signal.slice(0, 140)}`,
        ),
      ].join("\n");
    }
    if (q.includes("miss")) {
      if (!judgment.misses.length) return "No miss-retrospective candidates flagged.";
      return [
        "Miss retrospectives:",
        "",
        ...judgment.misses.map(
          (m) =>
            `- **${m.company_name}** (${m.severity}): was ${m.then_rec} @ ${m.then_score?.toFixed(0)} — ${m.lesson}`,
        ),
      ].join("\n");
    }
    if (q.includes("fresh") || q.includes("sla")) {
      const stale = judgment.freshness.filter((f) => f.overall !== "fresh").slice(0, 6);
      return [
        "Evidence freshness SLA:",
        "",
        ...stale.map(
          (f) => `- **${f.company_name}** — ${f.overall} · confidence ${f.score_confidence}% — ${f.note}`,
        ),
      ].join("\n");
    }
    if (q.includes("digest")) {
      return [
        `Digest selectivity — prefer **${judgment.digest_selectivity.winner}**:`,
        "",
        ...judgment.digest_selectivity.variants.map(
          (v) =>
            `- **${v.id}** (${v.deal_cap} deals): precision ${v.precision_proxy} · ~${v.partner_minutes} min — ${v.note}`,
        ),
        "",
        judgment.digest_selectivity.counsel,
      ].join("\n");
    }
    return formatJudgmentBriefMarkdown(judgment);
  }

  if (
    q.includes("golden") ||
    q.includes("what should i do") ||
    (q.includes("monday") && !q.includes("meeting") && !q.includes("agenda")) ||
    q.includes("competitor brief") ||
    q.includes("weekly brief") ||
    (q.includes("most important") && (q.includes("peer") || q.includes("competitor") || q.includes("insight")))
  ) {
    return formatGoldenBriefMarkdown(pack);
  }

  if (q.includes("proprietary") || q.includes("quiet tape") || q.includes("exclusive access")) {
    if (!pack.proprietary_deals.length) {
      return "No ultra-quiet Deep Dives right now — compete with judgment on contested names.";
    }
    return [
      "Proprietary windows (quiet tape + high conviction):",
      "",
      ...pack.proprietary_deals.map(
        (d) => `- **${d.name}** (score ${d.thesis_score?.toFixed(0)}) — ${d.note}`,
      ),
      "",
      "Action: take the call this week before peer FOMO arrives.",
    ].join("\n");
  }

  if (q.includes("white space") || q.includes("whitespace") || q.includes("undercovered")) {
    const ws = pack.theme_flows.filter((t) => t.posture === "whitespace");
    if (!ws.length) return "No clear white-space themes vs peer set right now — coverage is contested.";
    return [
      "White-space themes (Thirdbase early vs peers):",
      "",
      ...ws.map(
        (t) =>
          `- **${t.theme}** — ${t.counsel} (peer tags ${t.peer_deals}, our names ${t.thirdbase_deals})`,
      ),
    ].join("\n");
  }

  if (
    q.includes("who should i call") ||
    q.includes("who to call") ||
    q.includes("syndicate unlock") ||
    q.includes("syndicate play")
  ) {
    const plays = pack.syndicate_plays.filter((p) => p.call_list.length).slice(0, 5);
    return [
      "Syndicate unlocks:",
      "",
      ...plays.flatMap((p) => [
        `**${p.company_name}** (${p.crowding}) — ${p.edge_note}`,
        ...p.call_list.slice(0, 2).map((c) => `  → Call ${c.firm} (fit ${c.fit_score}): ${c.reason}`),
        "",
      ]),
    ].join("\n");
  }

  if (q.includes("battle card") || q.includes("how do we beat") || q.includes("partner or compete")) {
    return [
      "Peer battle cards:",
      "",
      ...pack.battle_cards.slice(0, 5).flatMap((b) => [
        `### ${b.name}`,
        `Win pattern: ${b.how_they_win}`,
        `Weakness: ${b.where_they_are_weak}`,
        `Pose: ${b.partner_or_compete}`,
        `Call when: ${b.call_when}`,
        "",
      ]),
    ].join("\n");
  }

  if (q.includes("60/40") || q.includes("rebalance") || q.includes("overweight") || q.includes("mix drift")) {
    const mix = judgment.mix_drift;
    return [
      `Observed mix: **${mix.dominantPct}%** dominant / **${mix.tacticalPct}%** tactical (target 60/40).`,
      `Status: **${mix.status}** · band ${mix.band}`,
      mix.alarm || "Within soft band.",
      "",
      mix.counsel,
    ].join("\n");
  }

  if (
    q.includes("sector") &&
    (q.includes("tomorrow") ||
      q.includes("nobody") ||
      q.includes("emerging") ||
      q.includes("sub-sector") ||
      q.includes("subsector"))
  ) {
    const picked = filterSectorsForQuestion(question, sectors);
    return [
      "Sector of Tomorrow (from Signal heat map):",
      "",
      ...picked.flatMap((s) => [
        `**${s.subsector}** — ${s.consensus_level} (heat ${s.heat_score})`,
        `Parent theme: ${s.parent_theme || "—"}`,
        s.why_thirdbase_cares || "",
        `Evidence: ${(s.evidence || []).join("; ")}`,
        `Companies: ${(s.top_companies || []).join(", ")}`,
        "",
      ]),
    ].join("\n");
  }

  if (
    q.includes("co-invest") ||
    q.includes("coinvest") ||
    q.includes("heatmap") ||
    (q.includes("syndicate") && !q.includes("unlock") && !q.includes("play") && !q.includes("call"))
  ) {
    const top = intel.heatmap.slice(0, 8);
    return [
      "Co-investor heatmap (syndicate utility):",
      "",
      ...top.map(
        (h) =>
          `- **${h.firm_a} × ${h.firm_b}** — ${h.coinvest_count} shared deals (syn ${h.syndicate_score}); themes: ${h.shared_themes.slice(0, 2).join(", ") || "—"}; last: ${h.last_shared_deal || "—"}`,
      ),
    ].join("\n");
  }

  if (q.includes("off-thesis") || q.includes("thesis shift") || q.includes("drifting")) {
    let shifts = intel.thesis_shifts;
    const firmKeys = ["a16z", "andreessen", "sequoia", "lux", "ribbit", "tiger"] as const;
    const firmFilter = firmKeys.find((f) => q.includes(f));
    if (firmFilter) {
      shifts = shifts.filter((p) => (p.firm || "").toLowerCase().includes(firmFilter));
    }
    const drifting = intel.firms.filter((f) => f.drift_score >= 30).slice(0, 5);
    if (!shifts.length && !drifting.length) {
      return `No thesis-shift flags currently in peer activity${firmFilter ? ` for ${firmFilter}` : ""}.`;
    }
    return [
      "Thesis shifts & elevated drift:",
      "",
      ...shifts.map((p) => `- ${p.firm} → ${p.company_name}: ${p.notes}`),
      "",
      ...(!firmFilter
        ? drifting.map((f) => `- **${f.name}** drift ${f.drift_score} — ${f.intel_summary}`)
        : []),
    ].join("\n");
  }

  if (
    q.includes("quietly investing") ||
    q.includes("who's investing") ||
    q.includes("who is investing") ||
    q.includes("peer set") ||
    q.includes("competitors") ||
    q.includes("what are peers")
  ) {
    const themeKw = ["robot", "defense", "defence", "cyber", "fintech", "energy", "bio", "ai"].find((k) =>
      q.includes(k),
    );
    const hits = peers.filter((p) => {
      const blob = `${p.theme || ""} ${p.company_name || ""}`.toLowerCase();
      return !themeKw || blob.includes(themeKw);
    });
    const watch = intel.firms.slice(0, 5);
    return [
      "Peer-set competitor intelligence:",
      "",
      ...watch.map((f) => `- **${f.name}** (watch ${f.watch_priority.toFixed(0)}): ${f.intel_summary}`),
      "",
      "Recent activity:",
      ...hits.slice(0, 10).map((p) => `- ${p.firm} → ${p.company_name} (${p.round}, ${p.date})`),
    ].join("\n");
  }

  if (q.includes("saying about") || (q.includes("commentary") && q.includes("about"))) {
    for (const c of companies) {
      if (!q.includes(c.name.toLowerCase())) continue;
      const cms = commentary.filter((x) => x.company_id === c.id);
      return [
        `## What people are saying about ${c.name}`,
        `Pipeline stance: **${c.recommendation}** · score ${c.thesis_score} · ${c.relative_rank}`,
        "",
        ...(cms.length
          ? cms.map(
              (cm) =>
                `- (${cm.source}, ${cm.sentiment}, ${cm.credibility_tier}): ${cm.quote_or_summary}`,
            )
          : [c.commentary_summary || "No discrete commentary captured yet."]),
        "",
        `Full IC brief: research ${c.name} or open /search.`,
      ].join("\n");
    }
  }

  for (const f of intel.firms) {
    const names = [f.name, ...f.aliases].map((n) => n.toLowerCase());
    if (names.some((n) => n.length > 2 && q.includes(n))) {
      return [
        `# ${f.name} — peer dossier`,
        `Stated focus: ${f.stated_focus || "—"}`,
        `Watch ${f.watch_priority.toFixed(0)} · Conviction ${f.conviction_score.toFixed(0)} · Drift ${f.drift_score.toFixed(0)} · Alignment ${f.focus_alignment.toFixed(0)}`,
        "",
        f.intel_summary,
        "",
        "Pipeline overlap:",
        ...f.deals.slice(0, 8).map(
          (d) =>
            `- ${d.company_name} (${d.round}, ${d.recommendation || "—"}${d.is_lead ? ", lead" : ""}${!d.on_thesis_flag ? ", OFF-THESIS" : ""})`,
        ),
        "",
        "Top co-investors:",
        ...f.top_coinvestors.slice(0, 5).map((c) => `- ${c.firm} (${c.count}×)`),
      ].join("\n");
    }
  }

  for (const c of companies) {
    if (q.includes(c.name.toLowerCase()) && (q.includes("comp") || q.includes("peer") || q.includes("similar"))) {
      const comps = intel.comparables[c.id] || [];
      return [
        `Comparables for **${c.name}**:`,
        "",
        ...comps.map((x) => `- **${x.name}** · ${x.recommendation} · ${x.thesis_score} — ${x.why}`),
        !comps.length ? "No close comps in the current pipeline." : "",
      ].join("\n");
    }
  }

  const themeMap: Record<string, string> = {
    defense: "Defence",
    defence: "Defence",
    cyber: "Cyber",
    robot: "Robot",
    fintech: "Fintech",
    energy: "Energy",
    bio: "Bio",
    voice: "Voice",
    infra: "Infrastructure",
  };
  for (const [kw, label] of Object.entries(themeMap)) {
    if (q.includes(kw)) {
      const hits = companies
        .filter(
          (c) =>
            (c.sector_theme || "").toLowerCase().includes(label.toLowerCase()) ||
            (c.subsector || "").toLowerCase().includes(kw),
        )
        .slice(0, 5);
      if (!hits.length) return `No ${label} companies in pipeline.`;
      return [
        `Best ${label}-related deals in Signal right now:`,
        "",
        ...hits.flatMap((c) => [
          `**${c.name}** · ${c.recommendation} · ${c.thesis_score} · ${c.relative_rank}`,
          c.why_now || c.one_liner || "",
          "",
        ]),
      ].join("\n");
    }
  }

  for (const c of companies) {
    if (q.includes(c.name.toLowerCase()) && (q.includes("saying") || q.includes("brief") || q.includes("summar"))) {
      const comps = intel.comparables[c.id] || [];
      const cms = commentary.filter((x) => x.company_id === c.id);
      return [
        `# ${c.name}`,
        `**${c.recommendation}** · score ${c.thesis_score} · ${c.relative_rank}`,
        "",
        "## Commentary",
        ...(cms.length
          ? cms.map((cm) => `- (${cm.source}): ${cm.quote_or_summary}`)
          : [c.commentary_summary || "None captured yet."]),
        "",
        c.why_now || "",
        `Cap table: ${c.tier1_count} Tier-1 (${(c.tier1_names || []).join(", ")})`,
        "",
        "Comps:",
        ...comps.slice(0, 3).map((x) => `- ${x.name} (${x.thesis_score}) — ${x.why}`),
      ].join("\n");
    }
  }

  const top = companies.filter((c) => c.recommendation === "Deep Dive").slice(0, 5);
  const watch = intel.firms.slice(0, 3);
  return [
    "Top Deep Dive deals in the current pipeline:",
    "",
    ...top.flatMap((c) => [`**${c.name}** (${c.sector_theme}) — score ${c.thesis_score}`, c.why_now || "", ""]),
    "Peer watch:",
    ...watch.map((f) => `- ${f.name}: ${f.intel_summary}`),
    "",
    "Ask about Monday agendas, LP process, IC trails, golden insights, judgment OS, bear cases, diligence, founder radar, proprietary windows, syndicate unlocks, or research a company.",
  ].join("\n");
}

function isPeerIntelligenceQuestion(question: string, firms: { name: string; aliases: string[] }[]) {
  const q = question.toLowerCase();
  if (
    /(co-?invest|heatmap|syndicate|thesis shift|off-thesis|peer set|competitors|quietly investing|drifting|60\/40|rebalance|mix drift|sector of tomorrow|golden|proprietary|white ?space|battle card|who should i call|competitor brief|weekly brief|judgment|override|miss retrospect|founder radar|freshness|evidence sla|digest select|policy fuel|what did we miss|bear case|argue against|counterfactual|diligence plan|work orders?|meeting prep|prep me|pre[- ]call|diligence stress|stress pack|founder[- ]only|monday|partner meeting|meeting agenda|lp process|limited partner|decision trail|investment committee|what's on ic|what is on ic)/i.test(
      question,
    )
  ) {
    return true;
  }
  return firms.some((f) => {
    const names = [f.name, ...f.aliases].map((n) => n.toLowerCase()).filter((n) => n.length > 2);
    return names.some((n) => q.includes(n));
  });
}

export async function answerPartnerQuestionAsync(
  question: string,
  ctx: {
    companies: Company[];
    sectors: SectorCall[];
    peers: PeerActivity[];
    commentary?: Commentary[];
    news?: NewsItem[];
    alerts?: AlertItem[];
  },
): Promise<string> {
  const intel = buildPeerIntelligence(ctx.companies, ctx.peers);

  if (isPeerIntelligenceQuestion(question, intel.firms)) {
    return answerPartnerQuestion(question, ctx);
  }

  if (looksLikeCompanyQuery(question)) {
    try {
      const brief = await researchCompany(question, {
        companies: ctx.companies,
        commentary: ctx.commentary || [],
        peers: ctx.peers,
      });
      if (brief.company_id && intel.comparables[brief.company_id]?.length) {
        brief.comparables = intel.comparables[brief.company_id].map((c) => c.name);
      }
      return briefToMarkdown(brief);
    } catch {
      // fall through
    }
  }

  return answerPartnerQuestion(question, ctx);
}

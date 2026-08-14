import type { AlertItem, Commentary, Company, NewsItem, PeerActivity, SectorCall } from "@/lib/types";
import {
  buildDiligencePack,
  companyToSubject,
  formatBearCaseMarkdown,
  formatDiligencePlanMarkdown,
  formatMeetingPrepMarkdown,
} from "@/lib/diligence";
import {
  buildComparePack,
  formatCompareMarkdown,
  suggestCompareCandidates,
} from "@/lib/compare";
import { buildContradictionMap } from "@/lib/contradiction";
import { buildIcMemo } from "@/lib/icMemo";
import { buildKindNoDraft, buildKindNoPack } from "@/lib/kindNo";
import { buildWorkQueue } from "@/lib/workQueue";
import {
  buildAiOsPack,
  buildConvictionSim,
  buildLookalikes,
  buildWarRoom,
  formatAiOsMarkdown,
  formatConvictionMarkdown,
  formatWarRoomMarkdown,
} from "@/lib/aiOs";
import {
  buildVentureAgentPack,
  formatVentureAgentMarkdown,
} from "@/lib/ventureAgent";
import {
  buildGoldenPack,
  formatGoldenBriefMarkdown,
} from "@/lib/goldenInsights";
import {
  buildJudgmentPack,
  formatJudgmentBriefMarkdown,
} from "@/lib/judgment";
import {
  buildAtlasPack,
  buildMarketMap,
  buildWarmPaths,
  buildRaiseWindows,
  buildBandPlacements,
  buildTalentGraph,
  buildPortfolioPulse,
  formatAtlasBriefMarkdown,
  PRESET_MAP_QUERIES,
} from "@/lib/atlas";
import {
  buildEdgePack,
  formatEdgeBriefMarkdown,
  buildReferenceCalls,
  buildConvictionClocks,
  buildAntiConsensus,
  buildPassAutopsies,
  buildPreMortems,
  buildPartnerTwin,
  buildVelocityBoard,
} from "@/lib/partnerEdge";
import {
  buildForgePack,
  moveKindLabel,
} from "@/lib/forge";
import { buildDemoTrails, mergeTrailsWithCompanies, STAGE_LABEL } from "@/lib/icTrail";
import { buildGpDeskPack } from "@/lib/gpDesk";
import { buildLpDeskPack } from "@/lib/lpDesk";
import { buildMeetingPack } from "@/lib/meeting";
import { buildPeerIntelligence } from "@/lib/peerIntel";
import {
  briefToMarkdown,
  looksLikeCompanyQuery,
  researchCompany,
} from "@/lib/research";
import {
  buildGreatDealPack,
  formatGreatDealMarkdown,
  inspectGreatDeal,
} from "@/lib/greatDeal";

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

  // YC-pattern surfaces — Directory / Interest / Launch / Find / Playbooks
  const wantsDirectory =
    /\b(directory|startup directory|facet(ed)? browse|browse (the )?book|by cycle|by batch)\b/i.test(
      question,
    );
  const wantsInterest =
    /\b(interest desk|demo day|stack[- ]?rank|meeting match|investor day|like (companies|deals))\b/i.test(
      question,
    );
  const wantsLaunchFeed =
    /\b(launch feed|launch yc|newco(s)?|founder radar|just launched|product hunt)\b/i.test(question);
  const wantsDealSourcing =
    /\b(deal sourc(er|ing)?|deal sourcing\s*&\s*discovery|continuous sourc(e|ing)|early signal|founder moves?|customer wins?|hiring signals?)\b/i.test(
      question,
    ) || /\b(scan(s|ning)? (the )?market|not (yet )?on (the )?book)\b/i.test(question);
  const wantsFind =
    /\b(omnisearch|typed search|find (everything|across)|bookface search|export csv)\b/i.test(
      question,
    ) || /\b(search (commentary|playbooks|peers|news))\b/i.test(question);
  const wantsPlaybooks =
    /\b(playbooks?|startup library|knowledge base|operating guide)\b/i.test(question);
  const wantsGreatDeal =
    /\b(great deal|outstanding (deal|opportunit)|noisy (funding|raise|announcement)|relative rank|best deals?( available)?|knows what a great deal|deal (quality|judgment)|pillar(s)? (score|radar))\b/i.test(
      question,
    ) ||
    (/\bwhy (is|this) (a )?(great|outstanding|best) (deal|company)\b/i.test(question));

  if (wantsGreatDeal) {
    const hit = findCompanyByQuestion(question, companies);
    const pack = buildGreatDealPack(companies);
    if (hit) {
      const card = inspectGreatDeal(hit, companies);
      const lines = [
        `# Knows what a great deal looks like — ${card.name}`,
        "",
        `**${card.grade_label}** · ${card.recommendation} · thesis ${card.thesis_score.toFixed(0)} · outstanding ${card.outstanding_score}`,
        card.relative_rank ||
          `#${card.cohort_rank} of ${card.cohort_size} ${card.sector_theme || ""} ${card.stage || ""}`,
        "",
        "## Why this is (or isn't) one of the best right now",
        ...card.why_best.map((w) => `- ${w}`),
        "",
        "## Pillars",
        ...card.pillars.map((p) => `- **${p.label}** (${p.score}): ${p.evidence}`),
      ];
      if (card.weak_spots.length) {
        lines.push("", "## Pressure points", ...card.weak_spots.map((w) => `- ${w}`));
      }
      lines.push("", "Open **/deals** for cohort ranks and the full noise filter.");
      return lines.join("\n");
    }
    return formatGreatDealMarkdown(pack);
  }

  if (wantsDirectory) {
    const themes = Array.from(
      new Set(companies.map((c) => c.sector_theme).filter(Boolean)),
    ).slice(0, 8);
    return [
      "# Directory Desk",
      "",
      "YC Startup Directory pattern over the thesis-scored book — facet by cycle (H1/H2 from round date), theme, stage, status, hiring, and 60/40 bucket. Like → Interest Desk.",
      "",
      `Book size: **${companies.length}** companies.`,
      themes.length ? `Themes: ${themes.join(" · ")}` : "",
      "",
      "Open **/directory** to browse. Export CSV from the filtered set.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (wantsInterest) {
    const dd = companies.filter((c) => c.recommendation === "Deep Dive").slice(0, 5);
    return [
      "# Interest Desk — Demo Day / Investor Day",
      "",
      "1. Like companies from Directory, Launch, Pipeline, Discovery, or company brief.",
      "2. Stack-rank your likes with ↑↓ (investor preference list — best first).",
      "3. Run meeting match — thesis_score proxies company-side preference (YC mutual matching).",
      "4. Push schedule into Partner Meeting OS (`/meeting?from=interest`) — never auto-send.",
      "5. Optionally compare the stack from Interest Desk or `/compare`.",
      "",
      dd.length
        ? `Deep Dive seeds: ${dd.map((c) => c.name).join(", ")}`
        : "No Deep Dives yet — Refresh pipeline.",
      "",
      "Open **/interest**.",
    ].join("\n");
  }
  if (wantsDealSourcing) {
    return [
      "# Deal Sourcing & Discovery — One tool / Claude agent",
      "",
      "Single intelligent loop that automates venture deal & information sourcing:",
      "funding · hiring · product launches · founder moves · customer wins.",
      "Multi-source hits consolidate onto one company card. Early / not-on-book names rise first.",
      "",
      "Default mode is **prefill** (seed corpus — no Gemini tokens). Flip `SIGNAL_SOURCING_MODE=live` for EDGAR/HN/RSS adapters.",
      "",
      "Open **/source** — Discovery brief, signal feed, early & off-book, Claude agent prompts, adapters.",
    ].join("\n");
  }
  if (wantsLaunchFeed) {
    return [
      "# Launch Feed",
      "",
      "Launch YC pattern: newly surfaced companies, founder-radar alerts, and launch/traction spikes from the live store.",
      "",
      "Open **/launch** — like anything interesting into Interest Desk before the partner meeting.",
      "For full Deal Sourcing & Discovery (all signal kinds + dedupe + agent), open **/source**.",
    ].join("\n");
  }
  if (wantsFind) {
    return [
      "# Find (omnisearch)",
      "",
      "Bookface-style typed search across companies, commentary, news, peers, sectors, alerts, and playbooks — with type filters and CSV export.",
      "",
      "Open **/find**. Company IC briefs still live at **/search**.",
    ].join("\n");
  }
  if (wantsPlaybooks) {
    return [
      "# Partner playbooks",
      "",
      "Startup Library / Knowledge Base analog — partner ritual, IC packet, Demo Day interest workflow, kind-no, reference calls, override ledger, ask grounding.",
      "",
      "Open **/library?tab=playbooks**.",
    ].join("\n");
  }

  // Signal Atlas — market maps, warm paths, bands, pulse, talent, raise windows
  const wantsAtlas =
    /\b(signal atlas|atlas|market map|warm path|warm intro|growth bands?|bessemer bands?|portfolio pulse|talent graph|raise window|ownership desk|ownership sim)\b/i.test(
      question,
    ) ||
    /\bmap (the )?(ai|cyber|defence|defense|fintech|robot|market)\b/i.test(question) ||
    (q.includes("map") && (q.includes("market") || q.includes("infra") || q.includes("sector")));
  const wantsMarketMap =
    /\b(market map|map (the )?market|map ai|map cyber|map defence|map defense|map fintech)\b/i.test(
      question,
    ) || (q.includes("map") && (q.includes("infra") || q.includes("hiring")));
  const wantsWarmPath =
    /\b(warm path|warm intro|who can intro|introduction path)\b/i.test(question);
  const wantsRaiseWindow =
    /\b(raise window|fundraising (window|timing)|when (will|do) they raise)\b/i.test(question);
  const wantsBands =
    /\b(growth bands?|bessemer|vs median|stage band)\b/i.test(question);
  const wantsTalentGraph =
    /\b(talent graph|operator radar|alumni graph|talent (flow|map))\b/i.test(question);
  const wantsPulse =
    /\b(portfolio pulse|board prep|portco (pulse|signals?))\b/i.test(question);

  if (
    wantsAtlas ||
    wantsMarketMap ||
    wantsWarmPath ||
    wantsRaiseWindow ||
    wantsBands ||
    wantsTalentGraph ||
    wantsPulse
  ) {
    const atlas = buildAtlasPack({
      companies,
      peers,
      commentary,
      news,
      alerts,
      sectors,
    });
    if (wantsMarketMap) {
      const map = buildMarketMap(
        question.length > 12 ? question : PRESET_MAP_QUERIES[0],
        companies,
        peers,
        sectors,
      );
      return [
        `# Market map — ${map.interpreted_as}`,
        "",
        map.counsel,
        "",
        `Filters: ${map.filters.join(" · ")}`,
        "",
        ...map.shortlist.slice(0, 8).map(
          (n, i) =>
            `${i + 1}. **${n.name}** (${n.tag}, ${n.thesis_score}) — ${n.stage} · ${n.why.slice(0, 120)}`,
        ),
        "",
        map.white_space.length
          ? `White space: ${map.white_space.slice(0, 4).join(", ")}`
          : "",
        "",
        "Open /atlas → Market map for the visual landscape.",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (wantsWarmPath) {
      const paths = buildWarmPaths(companies, peers);
      const hit = findCompanyByQuestion(question, companies);
      const row = hit
        ? paths.find((p) => p.company_id === hit.id) || paths[0]
        : paths[0];
      if (!row) return "No warm paths yet — need Deep Dive / high-score names.";
      return [
        `# Warm path — ${row.company_name} (grade ${row.grade})`,
        "",
        row.hops.map((h) => `**${h.person}** (${h.role}, ${h.firm}) — ${h.why}`).join(" → "),
        "",
        "### Draft ask (never auto-send)",
        "",
        "```",
        row.draft_ask,
        "```",
        "",
        `_${row.provenance}_`,
        "Open /atlas → Warm paths.",
      ].join("\n");
    }
    if (wantsRaiseWindow) {
      const rows = buildRaiseWindows(companies, peers).slice(0, 8);
      return [
        "# Raise windows",
        "",
        ...rows.map(
          (r) =>
            `- **${r.company_name}** \`${r.window}\` (${r.score}) — ${r.counsel}`,
        ),
        "",
        "Open /atlas → Raise windows.",
      ].join("\n");
    }
    if (wantsBands) {
      const rows = buildBandPlacements(companies).slice(0, 8);
      return [
        "# Growth bands (Bessemer-style)",
        "",
        ...rows.map(
          (r) =>
            `- **${r.company_name}** ${r.stage} · YoY ${r.yoy ?? "—"} · **${r.posture.replace(/_/g, " ")}** — ${r.counsel}`,
        ),
        "",
        "Open /atlas → Growth bands.",
      ].join("\n");
    }
    if (wantsTalentGraph) {
      const rows = buildTalentGraph(companies, commentary).slice(0, 8);
      return [
        "# Talent graph",
        "",
        ...rows.map(
          (t) =>
            `- **${t.name}** via ${t.prior} (heat ${t.heat}) → ${t.company_name || "newco"} — ${t.action}`,
        ),
        "",
        "Open /atlas → Talent graph.",
      ].join("\n");
    }
    if (wantsPulse) {
      const rows = buildPortfolioPulse(companies, commentary, alerts, peers).slice(0, 8);
      if (!rows.length) return "Portfolio pulse is clear on the demo book.";
      return [
        "# Portfolio pulse",
        "",
        ...rows.map(
          (p) =>
            `- **[${p.severity} · ${p.kind}]** ${p.title} — ${p.board_ask}`,
        ),
        "",
        "Open /atlas → Portfolio pulse.",
      ].join("\n");
    }
    return formatAtlasBriefMarkdown(atlas);
  }

  // Signal Forge — Monday decision physics (attention · win · moves)
  const wantsForge =
    /\b(signal forge|forge|monday moves?|win reality|attention capital|raise clocks?|blind spots?|where should (partner )?attention|partner attention|scarce (partner )?(hours|attention)|can (we|thirdbase) win|win probability)\b/i.test(
      question,
    ) ||
    (q.includes("attention") &&
      (q.includes("week") ||
        q.includes("go") ||
        q.includes("spend") ||
        q.includes("allocate") ||
        q.includes("hours")));

  if (wantsForge) {
    const forge = buildForgePack({ companies, peers, commentary, sectors, alerts });
    if (q.includes("monday move") || (q.includes("monday") && q.includes("move"))) {
      return [
        "# Monday Moves",
        "",
        forge.headline,
        forge.punchline,
        "",
        ...forge.monday_moves.map(
          (m) =>
            `${m.rank}. **${m.title}** (${moveKindLabel(m.kind)} · ${m.hours}h)${m.win_prob != null ? ` · win ${m.win_prob}%` : ""}\n   ${m.why}\n   _${m.irreversible}_`,
        ),
        "",
        "Open /forge → Monday Moves.",
      ].join("\n");
    }
    if (q.includes("win reality") || (q.includes("win") && (q.includes("prob") || q.includes("can we")))) {
      const wins = forge.win_realities.slice(0, 8);
      return [
        "# Win Reality",
        "",
        ...wins.map(
          (w) =>
            `- **${w.company_name}** — win ${w.win_prob}% · ${w.headline}\n  ${w.counsel}`,
        ),
        "",
        "Open /forge → Win Reality.",
      ].join("\n");
    }
    if (q.includes("attention capital") || (q.includes("attention") && q.includes("hour"))) {
      const a = forge.attention;
      return [
        "# Attention Capital",
        "",
        `Budget **${a.week_budget_hours}h** · allocated **${a.allocated_hours}h** · free **${a.free_hours}h** (${a.utilization_pct}% util)`,
        "",
        a.counsel,
        "",
        ...a.buckets.map((b) => `- **${b.label}** — ${b.hours}h (${b.pct}%) · ${b.note}`),
        ...(a.misallocations.length
          ? ["", "## Misallocations", ...a.misallocations.map((m) => `- **${m.title}** — ${m.fix} → ${m.fix}`)]
          : []),
        "",
        "Open /forge → Attention Capital.",
      ].join("\n");
    }
    if (q.includes("raise clock") || q.includes("raise window") || q.includes("imminent raise")) {
      return [
        "# Raise Clocks",
        "",
        ...forge.raise_clocks.slice(0, 8).map(
          (r) => `- **${r.company_name}** — ${r.clock_label} (${r.urgency}) · ${r.counsel}`,
        ),
        "",
        "Open /forge → Raise Clock.",
      ].join("\n");
    }
    if (q.includes("blind spot")) {
      if (!forge.blind_spots.length) {
        return "No blind spots — peer activity is aligned with Hot Deals, or peers are quiet.\n\nOpen /forge → Blind Spots.";
      }
      return [
        "# Blind Spots",
        "",
        ...forge.blind_spots.slice(0, 8).map(
          (b) =>
            `- **${b.company_name}** [${b.severity}] — ${b.peer_firms.join(", ")} · ${b.action}`,
        ),
        "",
        "Open /forge → Blind Spots.",
      ].join("\n");
    }
    return forge.markdown + "\n\nOpen /forge for the full decision desk.";
  }

  // Venture agent — Core Intelligence Expectations (brief headings)
  const wantsVentureAgent =
    /\b(venture agent|core intelligence|intelligent (venture )?agent|knows what a great deal|sector of tomorrow|news worth reading|holds? its own with a partner|investor and operator commentary)\b/i.test(
      question,
    ) ||
    /\bwhy (does|do) .+ matter (for|to) (thirdbase|us|the (fund|partnership))\b/i.test(question);

  if (wantsVentureAgent) {
    const pack = buildVentureAgentPack({ companies, sectors, news, commentary, peers });
    const hit = findCompanyByQuestion(question, companies);
    if (hit) {
      const why = pack.partner_whys.find((w) => w.company.id === hit.id);
      if (why) {
        return [
          `# Why ${why.company.name} matters`,
          "",
          why.opening,
          "",
          ...why.bullets.map((b) => `- ${b}`),
          "",
          `**Kill risk:** ${why.kill_risk}`,
          "",
          `**Next question:** ${why.next_question}`,
          "",
          "Open /os → Holds its own with a partner for the full desk.",
        ].join("\n");
      }
    }
    if (/\bgreat deal\b/i.test(question)) {
      return [
        "# Knows what a great deal looks like",
        "",
        ...pack.great_deals.slice(0, 6).map(
          (d) =>
            `- **${d.company.name}** · ${d.company.recommendation} · ${Math.round(d.company.thesis_score || 0)} · ${d.outstanding ? "outstanding" : "not yet"}\n  ${d.partner_line}`,
        ),
        "",
        "Open /os or /deals for the full Great Deal desk.",
      ].join("\n");
    }
    if (
      /\bsector of tomorrow|12.?36|sub-?sectors?|sectors? will matter|(12|24|36)[- ]?(months?|mo)\b/i.test(
        question,
      )
    ) {
      return [
        "# Knows the sector of tomorrow",
        "",
        ...pack.sector_tomorrow.slice(0, 6).map(
          (s) =>
            `- **${s.subsector}** · ${s.horizon} · ${s.posture} · heat ${s.heat_score}\n  ${s.why_matters}`,
        ),
        "",
        "Open /os → Sector of tomorrow or /sectors for the scanner.",
      ].join("\n");
    }
    return formatVentureAgentMarkdown(pack) + "\n\nOpen **/os** for the interactive Venture agent.";
  }

  // Signal AI OS — war room, conviction, alpha feed, autopilot, lookalikes
  const wantsAiOs =
    /\b(ai os|agent fleet|operating system|aios|venture agent fleet)\b/i.test(question) ||
    (q.includes("ai") && q.includes("os") && (q.includes("status") || q.includes("brief")));
  const wantsWarRoom =
    /\b(war room|contested score|multi[- ]agent|agent vote|committee debate)\b/i.test(question);
  const wantsConviction =
    /\b(pwmoic|pw[- ]?moic|conviction sim|exit bucket|probability[- ]weighted)\b/i.test(question);
  const wantsAlphaFeed =
    /\b(alpha (feed|signals?)|signal feed|critical signals?|route signals?)\b/i.test(question);
  const wantsAutopilot =
    /\b(thesis autopilot|autopilot|kind[- ]no|auto[- ]screen)\b/i.test(question);
  const wantsLookalike =
    /\b(lookalike|look[- ]alike|twins?|deals? (i |we )wish|outbound from)\b/i.test(question);

  if (
    wantsAiOs ||
    wantsWarRoom ||
    wantsConviction ||
    wantsAlphaFeed ||
    wantsAutopilot ||
    wantsLookalike
  ) {
    const os = buildAiOsPack({ companies, peers, commentary, news, alerts, sectors });
    if (wantsWarRoom) {
      const hit = findCompanyByQuestion(question, companies);
      const room = hit
        ? buildWarRoom(hit, sectors, peers)
        : os.war_rooms[0];
      if (!room) return "No Deep Dive deals ready for a war room — run Refresh or name a company.";
      return formatWarRoomMarkdown(room);
    }
    if (wantsConviction) {
      const hit = findCompanyByQuestion(question, companies);
      const sim = hit ? buildConvictionSim(hit) : os.conviction[0];
      if (!sim) return "Name a pipeline company for conviction / pwMOIC.";
      return formatConvictionMarkdown(sim);
    }
    if (wantsAlphaFeed) {
      const hot = os.feed.filter((f) => f.severity === "critical" || f.severity === "high");
      return [
        "# Alpha signal feed",
        "",
        ...hot.slice(0, 10).map(
          (f) =>
            `- **[${f.category} · ${f.severity}]** ${f.title} → _${f.route_to}_\n  ${f.body.slice(0, 160)}`,
        ),
        "",
        "Open /os → Alpha feed for the full routed stream.",
      ].join("\n");
    }
    if (wantsAutopilot) {
      const dd = os.autopilot.filter((a) => a.action === "Deep Dive" || a.action === "Kind no");
      return [
        "# Thesis autopilot",
        "",
        ...dd.slice(0, 10).map(
          (a) =>
            `- **${a.company.name}** auto ${a.auto_score} → **${a.action}**${a.blockers.length ? ` · blockers: ${a.blockers.join(", ")}` : ""}`,
        ),
        "",
        "Open /os → Autopilot for lookalikes and full screen.",
      ].join("\n");
    }
    if (wantsLookalike) {
      const hit = findCompanyByQuestion(question, companies) || os.lookalikes[0]?.seed;
      if (!hit) return "Name a seed company for lookalikes.";
      const lk = buildLookalikes(hit, companies);
      return [
        `# Lookalikes — ${lk.seed.name}`,
        "",
        lk.outbound_angle,
        "",
        ...lk.twins.map(
          (t) => `- **${t.company.name}** (${t.similarity}%) — ${t.why}`,
        ),
        !lk.twins.length ? "_No twins above similarity floor._" : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    return formatAiOsMarkdown(os);
  }

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

  // Partner-path ops: compare, work queue, kind-no, contradiction, IC memo
  const wantsCompare =
    /\b(deal compare|compare deals|side[- ]by[- ]side|versus)\b/i.test(question) ||
    (/\bcompare\b/i.test(question) &&
      (/\b(deals?|companies|names|deep dive)\b/i.test(question) ||
        companies.filter((c) => question.toLowerCase().includes(c.name.toLowerCase()))
          .length >= 2)) ||
    (/\bvs\.?\b/i.test(question) &&
      companies.filter((c) => question.toLowerCase().includes(c.name.toLowerCase())).length >=
        2);
  const wantsWorkQueue =
    /\b(work queue|associate (queue|handoff|tasks?)|open diligence|dd handoff)\b/i.test(
      question,
    );
  const wantsKindNo =
    /\b(kind[- ]no|polite (pass|decline)|pass letter|decline (email|draft)|pass email)\b/i.test(
      question,
    );
  const wantsContradiction =
    /\b(contradiction|inconsistenc|tension map|evidence (conflict|tension)|cross[- ]check)\b/i.test(
      question,
    );
  const wantsIcMemo =
    /\b(ic memo|investment memo|9[- ]section memo|formal memo)\b/i.test(question);

  if (wantsCompare) {
    const named = companies.filter((c) =>
      question.toLowerCase().includes(c.name.toLowerCase()),
    );
    const picks =
      named.length >= 2
        ? named.slice(0, 4)
        : [
            ...(named[0] ? [named[0]] : []),
            ...suggestCompareCandidates(companies, 4).filter(
              (c) => !named[0] || c.id !== named[0].id,
            ),
          ].slice(0, 3);
    if (picks.length < 2) {
      return "Name at least two pipeline companies to compare — or open /compare.";
    }
    const pack = buildComparePack(picks, peers);
    return formatCompareMarkdown(pack) + "\n\nOpen /compare to adjust the board.";
  }

  if (wantsWorkQueue) {
    const trails = mergeTrailsWithCompanies(companies, buildDemoTrails(companies));
    const wq = buildWorkQueue(companies, trails, { commentary, peers });
    return wq.markdown;
  }

  if (wantsKindNo) {
    const hit = findCompanyByQuestion(question, companies);
    if (hit) {
      const draft = buildKindNoDraft(hit, "warm");
      return [
        `# Kind-no — ${draft.company_name}`,
        "",
        `Subject: ${draft.subject}`,
        "",
        "```",
        draft.body,
        "```",
        "",
        draft.provenance,
        "",
        "Open /work → Kind-no for tone variants.",
      ].join("\n");
    }
    return buildKindNoPack(companies, { limit: 5 }).markdown;
  }

  if (wantsContradiction || wantsIcMemo) {
    const hit = findCompanyByQuestion(question, companies);
    if (!hit) {
      return wantsIcMemo
        ? "Name a pipeline company for an IC memo — e.g. “IC memo for AgentGate”."
        : "Name a pipeline company for a contradiction map.";
    }
    if (wantsIcMemo) {
      return buildIcMemo(hit, {
        commentary: commentary.filter((c) => c.company_id === hit.id),
        peers,
      }).markdown;
    }
    return buildContradictionMap(hit, {
      commentary: commentary.filter((c) => c.company_id === hit.id),
      peers,
      news,
    }).markdown;
  }

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
    /\b(lp (process|desk|dashboard|one[- ]pager|brief|transparency)|limited partner|how (does |do )?ai (show|shows|fit)|process for lps)\b/i.test(
      question,
    );
  const wantsGp =
    /\b(gp (desk|dashboard|brief|cockpit)|partner desk|partner dashboard|general partner (desk|dashboard))\b/i.test(
      question,
    );
  const wantsIc =
    /\b(ic (trail|vote|governance|this week)|decision trail|what's on ic|what is on ic|investment committee)\b/i.test(
      question,
    );

  if (wantsMeetingAgenda || wantsLp || wantsGp || wantsIc) {
    const trails = mergeTrailsWithCompanies(companies, buildDemoTrails(companies));
    if (wantsGp) {
      const gp = buildGpDeskPack(
        companies,
        peers,
        commentary,
        news,
        alerts,
        sectors,
        trails,
        null,
        "",
        "",
      );
      return gp.brief_md + "\n\nOpen /gp for the full GP Desk.";
    }
    if (wantsLp) {
      const lp = buildLpDeskPack(companies, peers, commentary, news, alerts, trails, [], sectors);
      return lp.one_pager_md + "\n\nOpen /lp for the full LP Dashboard.";
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

  // Living Excel workbook — debate surface + M/W/F digest
  const wantsWorkbook =
    /\b(excel|workbook|deal pipeline|living (excel|workbook|pipeline)|download (the )?workbook|thirdbase_deal_pipeline)\b/i.test(
      question,
    ) ||
    (q.includes("pipeline") && (q.includes("excel") || q.includes("workbook") || q.includes("maintain")));
  if (wantsWorkbook) {
    const hot = companies
      .filter((c) => c.recommendation === "Deep Dive" || (c.thesis_score ?? 0) >= 75)
      .slice(0, 5);
    const staleN = companies.filter((c) => c.is_stale).length;
    return [
      "# Deal Pipeline — living workbook",
      "",
      "Self-maintaining Excel (`Thirdbase_Deal_Pipeline.xlsx`) regenerated on every refresh:",
      "ingest → dedupe → thesis re-score → add/update → **Stale** partner review (never silent-delete) → Excel rewrite.",
      "",
      "**Tabs:** Pipeline · Hot Deals · Watchlist · Sector of Tomorrow · Peer Set Activity · Co-investor Heatmap · Golden Insights · Peer Firm Dossiers · Judgment OS · News Worth Reading · Investor Commentary · Stale",
      "",
      `**Book:** ${companies.length} companies · **Hot / high conviction:** ${hot.length} · **Stale queue:** ${staleN}`,
      "",
      "Highest-priority deals email **Mon / Wed / Fri** (hard-capped). Instant alerts still fire between digests.",
      "",
      ...(hot.length
        ? [
            "Current Hot Deals spine:",
            "",
            ...hot.map(
              (c) =>
                `- **${c.name}** (${c.recommendation}, ${c.thesis_score?.toFixed(0) ?? "—"}) — ${c.one_liner || c.why_now || ""}`,
            ),
            "",
          ]
        : []),
      "Open **/workbook** to browse the same tabs with charts, or **Download Excel** from the page / Desk.",
      "Preview the M/W/F mail at **/digest**.",
    ].join("\n");
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
            `- **${v.id}** (${v.deal_cap} deals): selectivity ${v.precision_proxy} · ~${v.partner_minutes} min — ${v.note}`,
        ),
        "",
        `_${judgment.digest_selectivity.metric_label}_`,
        judgment.digest_selectivity.counsel,
      ].join("\n");
    }
    return formatJudgmentBriefMarkdown(judgment);
  }

  // Partner Edge OS
  const wantsEdge =
    /\b(partner edge|edge os|anti[- ]consensus|conviction clock|partner twin|reference call|pass autopsy|pre[- ]?mortem|thesis what[- ]?if|velocity board)\b/i.test(
      question,
    ) ||
    q.includes("patience is alpha") ||
    q.includes("consensus trap") ||
    (q.includes("fomo") && (q.includes("clock") || q.includes("patience") || q.includes("act")));

  if (wantsEdge) {
    const edge = buildEdgePack(companies, peers, commentary, sectors);
    if (q.includes("reference") || q.includes("ref call") || q.includes("who should i call for diligence")) {
      const hit = findCompanyByQuestion(question, companies);
      const refs = buildReferenceCalls(companies, peers);
      const pack = hit ? refs.find((r) => r.company_id === hit.id) || refs[0] : refs[0];
      if (!pack) return "No reference-call scripts yet — need Deep Dive names.";
      return pack.markdown;
    }
    if (q.includes("clock") || q.includes("patience") || q.includes("fomo") || q.includes("act this week")) {
      const clocks = buildConvictionClocks(companies, peers).slice(0, 6);
      return [
        "Conviction clocks:",
        "",
        ...clocks.map(
          (c) =>
            `- **${c.headline}** ${c.company_name} (${c.clock_label}) — FOMO ${c.fomo_index} / patience α ${c.patience_alpha}`,
        ),
        "",
        "Open /edge → Conviction clocks.",
      ].join("\n");
    }
    if (q.includes("twin")) {
      const twin = buildPartnerTwin(companies, []);
      return [
        `# Partner twin`,
        "",
        twin.dna_summary,
        "",
        ...twin.predictions.slice(0, 6).map(
          (p) =>
            `- **${p.company_name}**: Signal ${p.signal_rec} → Twin **${p.predicted}** (${p.twin_score}) — ${p.rationale}`,
        ),
      ].join("\n");
    }
    if (q.includes("autopsy")) {
      const rows = buildPassAutopsies(companies, peers);
      if (!rows.length) return "Pass autopsy book is clean.";
      return [
        "Pass autopsies (regret risk):",
        "",
        ...rows.slice(0, 6).map(
          (a) =>
            `- **${a.company_name}** (${a.regret_risk}${a.reopen ? ", reopen" : ""}) — ${a.lesson}`,
        ),
      ].join("\n");
    }
    if (q.includes("pre-mortem") || q.includes("premortem") || q.includes("assume we lost")) {
      const hit = findCompanyByQuestion(question, companies);
      const rows = buildPreMortems(companies);
      const pm = hit ? rows.find((r) => r.company_id === hit.id) || rows[0] : rows[0];
      if (!pm) return "No Deep Dive pre mortems ready.";
      return [
        `# Pre mortem: ${pm.company_name}`,
        "",
        pm.premise,
        "",
        pm.ic_line,
        "",
        ...pm.failure_modes.map(
          (f, i) => `${i + 1}. **(${f.probability})** ${f.mode}\n   - Warning: ${f.early_warning}\n   - Hedge: ${f.hedge}`,
        ),
      ].join("\n");
    }
    if (q.includes("velocity")) {
      const vel = buildVelocityBoard(companies, commentary);
      return [
        "Velocity board:",
        "",
        ...vel.slice(0, 8).map(
          (v) =>
            `- **${v.company_name}** velocity ${v.velocity} (${v.recommendation}) — ${v.drivers.join("; ")}`,
        ),
      ].join("\n");
    }
    if (q.includes("anti") || q.includes("consensus") || q.includes("trap") || q.includes("proprietary")) {
      const anti = buildAntiConsensus(companies, peers, sectors).slice(0, 6);
      return [
        "Anti consensus radar:",
        "",
        ...anti.map((a) => `- **${a.posture}** ${a.company_name} — ${a.insight}`),
        "",
        "Open /edge for Anti consensus.",
      ].join("\n");
    }
    return formatEdgeBriefMarkdown(edge);
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
      q.includes("subsector") ||
      q.includes("will matter") ||
      q.includes("24 month") ||
      q.includes("12 month") ||
      q.includes("36 month") ||
      /\b(12|24|36)[- ]?mo\b/.test(q))
  ) {
    const picked = filterSectorsForQuestion(question, sectors);
    return [
      "Knows the sector of tomorrow — pre-consensus calls from Signal.",
      "",
      "Evidence channels: GP commentary · frontier lab hiring · founder migration · fund formation · academic / open-source research velocity.",
      "",
      ...picked.flatMap((s, i) => [
        `### ${i + 1}. ${s.subsector}`,
        "",
        `Consensus: ${s.consensus_level} · Heat ${s.heat_score}`,
        `Parent theme: ${s.parent_theme || "—"}`,
        s.why_thirdbase_cares ? `Why: ${s.why_thirdbase_cares}` : "",
        `Evidence: ${(s.evidence || []).join("; ") || "—"}`,
        `Best companies: ${(s.top_companies || []).join(", ") || "—"}`,
        "",
      ]),
      "Open `/sectors` for capital / talent / founder attention flows and the full foresight board.",
    ]
      .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
      .join("\n");
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
    q.includes("vc firms") ||
    q.includes("firm watchlist") ||
    q.includes("firms to track") ||
    (q.includes("watchlist") && (q.includes("firm") || q.includes("vc") || q.includes("peer")))
  ) {
    return [
      "VC firm watchlist lives at **/firms** — track status, notes, activity, and drift for the peer set.",
      "",
      "Firm dossiers: **/competitors/[slug]**. Syndicate heat: **/peers**. Watchlist ops: **/firms**.",
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
  const meta = [
    "",
    "---",
    `_Sources: ${companies.length} pipeline companies · ${(ctx.commentary || []).length} commentary · ${(ctx.peers || []).length} peer rows_`,
    "",
    "I don't have grounded evidence for that exact question. Try:",
    "- **Partner meeting agenda**",
    "- **Top Deep Dive deals** / name a company",
    "- **Rebalance vs 60/40?**",
    "- **What did we miss?** / **founder radar**",
  ].join("\n");

  // Only dump Hot Deals when the question is clearly about "top / best / deals"
  if (/\b(top|best|hot|deep dive|deals?|pipeline)\b/i.test(question)) {
    return [
      "Top Deep Dive deals in the current pipeline:",
      "",
      ...top.flatMap((c) => [
        `**${c.name}** (${c.sector_theme}) — score ${c.thesis_score}`,
        c.why_now || "",
        "",
      ]),
      "---",
      `_Sources: ${top.length} Deep Dive companies · refreshed from store_`,
    ].join("\n");
  }

  return meta;
}

function isPeerIntelligenceQuestion(question: string, firms: { name: string; aliases: string[] }[]) {
  const q = question.toLowerCase();
  if (
    /(co-?invest|heatmap|syndicate|thesis shift|off-thesis|peer set|competitors|quietly investing|drifting|60\/40|rebalance|mix drift|sector of tomorrow|sectors? will matter|(12|24|36)[- ]?(months?|mo)|golden|proprietary|white ?space|battle card|who should i call|competitor brief|weekly brief|judgment|override|miss retrospect|founder radar|freshness|evidence sla|digest select|policy fuel|what did we miss|bear case|argue against|counterfactual|diligence plan|work orders?|meeting prep|prep me|pre[- ]call|diligence stress|stress pack|founder[- ]only|monday|partner meeting|meeting agenda|lp process|limited partner|decision trail|investment committee|what's on ic|what is on ic|gp desk|partner desk|partner dashboard|general partner|partner edge|edge os|anti[- ]consensus|conviction clock|partner twin|reference call|pass autopsy|pre[- ]?mortem|consensus trap|patience is alpha|velocity board|signal atlas|atlas|market map|warm path|warm intro|growth bands?|bessemer|portfolio pulse|talent graph|raise window|ownership desk|map (ai|cyber|defence|defense|fintech|market|infra)|directory|interest desk|demo day|launch feed|omnisearch|playbooks?|startup library|great deal|noisy (funding|raise)|relative rank|excel|workbook|deal pipeline|signal forge|forge|monday moves?|win reality|attention capital|raise clocks?|blind spots?|partner attention|where should (partner )?attention)/i.test(
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

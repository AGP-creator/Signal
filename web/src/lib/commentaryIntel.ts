/**
 * Qualitative commentary intel — turns captured investor/operator/engineer/customer
 * chatter into partner-useful posture, themes, and source mix.
 * Does not invent quotes; only classifies what is already in the store.
 */

import { findVoiceInText } from "@/lib/gpWatchlist";
import type { Commentary, Company } from "@/lib/types";

export type VoiceRole =
  | "investor"
  | "operator"
  | "engineer"
  | "customer"
  | "analyst"
  | "unknown";

export type CommentaryChannel =
  | "Twitter/X"
  | "Hacker News"
  | "Reddit"
  | "Blind"
  | "Podcast"
  | "Substack"
  | "Other";

export type QualitativeThemeId =
  | "engineer_love"
  | "customer_friction"
  | "investor_skepticism"
  | "operator_validation"
  | "retention_risk"
  | "category_heat"
  | "technical_edge";

export type QualitativePosture =
  | "beloved"
  | "validated"
  | "contested"
  | "skeptical"
  | "quiet";

export type AnnotatedCommentary = Commentary & {
  channel: CommentaryChannel;
  voice_role: VoiceRole;
  themes: QualitativeThemeId[];
  watchlist_voice: string | null;
  weight: number;
};

export type QualitativeTheme = {
  id: QualitativeThemeId;
  label: string;
  question: string;
  polarity: "bull" | "bear" | "mixed";
  strength: "strong" | "moderate" | "weak";
  count: number;
  evidence: AnnotatedCommentary[];
  summary: string;
};

export type ChannelSlice = {
  channel: CommentaryChannel;
  count: number;
  pct: number;
  color: string;
};

export type CommentaryIntel = {
  company_id?: string;
  company_name?: string;
  summary: string;
  posture: QualitativePosture;
  posture_label: string;
  counsel: string;
  count: number;
  high_cred_count: number;
  lean: number;
  lean_label: string;
  sentiment: { positive: number; mixed: number; negative: number; neutral: number };
  channels: ChannelSlice[];
  roles: { role: VoiceRole; label: string; count: number }[];
  themes: QualitativeTheme[];
  items: AnnotatedCommentary[];
  watchlist_hits: number;
  latest_at?: string;
  markdown: string;
};

export type LibraryCommentaryPack = {
  aggregate: CommentaryIntel;
  by_company: CommentaryIntel[];
  hot: CommentaryIntel[];
  red_flags: CommentaryIntel[];
  channel_coverage: ChannelSlice[];
};

const CHANNEL_COLORS: Record<CommentaryChannel, string> = {
  "Twitter/X": "var(--signal)",
  "Hacker News": "var(--warn)",
  Reddit: "var(--deep)",
  Blind: "var(--ok)",
  Podcast: "#8b6b4a",
  Substack: "#6b7f5a",
  Other: "var(--faint)",
};

const THEME_META: Record<
  QualitativeThemeId,
  { label: string; question: string; polarity: "bull" | "bear" | "mixed"; patterns: RegExp[] }
> = {
  engineer_love: {
    label: "Engineer love",
    question: "Beloved by engineers?",
    polarity: "bull",
    patterns: [
      /engineer/i,
      /show hn/i,
      /builders? prefer/i,
      /praised in thread/i,
      /default harness/i,
      /how .+ should feel/i,
      /okta moment/i,
      /researchers say/i,
    ],
  },
  customer_friction: {
    label: "Customer friction",
    question: "Are customers pushing back?",
    polarity: "bear",
    patterns: [
      /hate /i,
      /forced .+ pricing/i,
      /switching cost/i,
      /mixed —/i,
      /r\/sales/i,
      /churn/i,
      /complain/i,
    ],
  },
  investor_skepticism: {
    label: "Investor skepticism",
    question: "Are top investors skeptical?",
    polarity: "bear",
    patterns: [
      /privately skeptical/i,
      /skepticism/i,
      /dismissed/i,
      /crowded/i,
      /still quiet/i,
      /execution risk/i,
      /little technical differentiation/i,
    ],
  },
  operator_validation: {
    label: "Operator validation",
    question: "Do operators vouch for it?",
    polarity: "bull",
    patterns: [
      /operator/i,
      /live (base|deployment)/i,
      /procurement/i,
      /rfp/i,
      /factory pull/i,
      /usable on real/i,
      /budgeting for/i,
    ],
  },
  retention_risk: {
    label: "Retention risk",
    question: "Retention / churn concern?",
    polarity: "bear",
    patterns: [/retention/i, /incentive fade/i, /churn/i, /slower growth/i],
  },
  category_heat: {
    label: "Category heat",
    question: "Is the category heating?",
    polarity: "mixed",
    patterns: [
      /category still early/i,
      /narrative heating/i,
      /windows? are opening/i,
      /constraint trade/i,
      /shortlist/i,
      /becoming (the )?default/i,
      /table stakes/i,
    ],
  },
  technical_edge: {
    label: "Technical edge",
    question: "Is there a technical edge?",
    polarity: "bull",
    patterns: [
      /moat/i,
      /utilization/i,
      /latency/i,
      /sim-to-real/i,
      /eval suite/i,
      /orchestration/i,
      /authz/i,
      /wet-lab/i,
    ],
  },
};

const ROLE_PATTERNS: { role: VoiceRole; patterns: RegExp[] }[] = [
  {
    role: "investor",
    patterns: [
      /\bgp\b/i,
      /investor/i,
      /elad gil/i,
      /sarah guo/i,
      /gavin baker/i,
      /trae stephens/i,
      /brad gerstner/i,
      /keith rabois/i,
      /josh wolfe/i,
      /delian/i,
      /molly o'?shea/i,
      /packy/i,
      /deedy/i,
      /underwriting/i,
    ],
  },
  {
    role: "engineer",
    patterns: [
      /engineer/i,
      /hacker news/i,
      /show hn/i,
      /builder/i,
      /researcher/i,
      /r\/machinelearning/i,
      /r\/robotics/i,
    ],
  },
  {
    role: "operator",
    patterns: [/operator/i, /procurement/i, /defense operator/i, /manufacturing eng/i],
  },
  {
    role: "customer",
    patterns: [/r\/sales/i, /buyer/i, /customer/i, /churn/i, /pricing/i],
  },
  {
    role: "analyst",
    patterns: [/substack/i, /essay/i, /stratechery/i, /generalist/i, /tbpn/i, /podcast/i],
  },
];

const ROLE_LABELS: Record<VoiceRole, string> = {
  investor: "Investors",
  operator: "Operators",
  engineer: "Engineers",
  customer: "Customers",
  analyst: "Analysts / writers",
  unknown: "Unclassified",
};

const POSTURE_LABELS: Record<QualitativePosture, string> = {
  beloved: "Beloved",
  validated: "Operator-validated",
  contested: "Contested",
  skeptical: "Skeptical tape",
  quiet: "Quiet tape",
};

function normalizeChannel(source?: string | null): CommentaryChannel {
  const s = (source || "").toLowerCase();
  if (/twitter|\bx\b|twitter\/x/.test(s)) return "Twitter/X";
  if (/hacker\s*news|\bhn\b/.test(s)) return "Hacker News";
  if (/reddit/.test(s)) return "Reddit";
  if (/blind/.test(s)) return "Blind";
  if (/podcast/.test(s)) return "Podcast";
  if (/substack/.test(s)) return "Substack";
  return "Other";
}

function credibilityWeight(tier?: string | null): number {
  const t = (tier || "").toLowerCase();
  if (t === "high") return 1.25;
  if (t === "medium") return 1;
  if (t === "live_signal") return 0.7;
  if (t === "low") return 0.5;
  return 0.85;
}

function sentimentScore(sentiment?: string | null): number {
  const s = (sentiment || "").toLowerCase();
  if (s === "positive") return 1;
  if (s === "negative") return -1;
  if (s === "mixed") return 0;
  return 0;
}

function detectThemes(text: string, channel: CommentaryChannel): QualitativeThemeId[] {
  const hits = new Set<QualitativeThemeId>();
  for (const [id, meta] of Object.entries(THEME_META) as [
    QualitativeThemeId,
    (typeof THEME_META)[QualitativeThemeId],
  ][]) {
    if (meta.patterns.some((p) => p.test(text))) hits.add(id);
  }
  if (channel === "Hacker News" && /love|praised|default|okta|how .+ should/i.test(text)) {
    hits.add("engineer_love");
  }
  if (channel === "Blind" && /usable|finally|compounding/i.test(text)) {
    hits.add("operator_validation");
  }
  return [...hits];
}

function detectRole(text: string, channel: CommentaryChannel): VoiceRole {
  for (const row of ROLE_PATTERNS) {
    if (row.patterns.some((p) => p.test(text))) return row.role;
  }
  if (channel === "Hacker News") return "engineer";
  if (channel === "Blind") return "operator";
  if (channel === "Reddit") return "customer";
  if (channel === "Podcast" || channel === "Substack") return "analyst";
  if (channel === "Twitter/X") return "investor";
  return "unknown";
}

function annotate(cm: Commentary): AnnotatedCommentary {
  const text = cm.quote_or_summary || "";
  const channel = normalizeChannel(cm.source);
  const voice = findVoiceInText(text);
  return {
    ...cm,
    channel,
    voice_role: detectRole(`${text} ${cm.source || ""}`, channel),
    themes: detectThemes(text, channel),
    watchlist_voice: voice?.name || null,
    weight: credibilityWeight(cm.credibility_tier),
  };
}

function strengthFromCount(n: number): QualitativeTheme["strength"] {
  if (n >= 3) return "strong";
  if (n === 2) return "moderate";
  return "weak";
}

function buildThemes(items: AnnotatedCommentary[]): QualitativeTheme[] {
  const themes: QualitativeTheme[] = [];
  for (const [id, meta] of Object.entries(THEME_META) as [
    QualitativeThemeId,
    (typeof THEME_META)[QualitativeThemeId],
  ][]) {
    const evidence = items.filter((i) => i.themes.includes(id));
    if (!evidence.length) continue;
    const snippet = evidence[0].quote_or_summary || "";
    themes.push({
      id,
      label: meta.label,
      question: meta.question,
      polarity: meta.polarity,
      strength: strengthFromCount(evidence.length),
      count: evidence.length,
      evidence: evidence.slice(0, 4),
      summary: snippet.length > 140 ? `${snippet.slice(0, 137)}…` : snippet,
    });
  }
  const order = { strong: 0, moderate: 1, weak: 2 };
  return themes.sort((a, b) => order[a.strength] - order[b.strength] || b.count - a.count);
}

function channelSlices(items: AnnotatedCommentary[]): ChannelSlice[] {
  const counts = new Map<CommentaryChannel, number>();
  for (const i of items) counts.set(i.channel, (counts.get(i.channel) || 0) + 1);
  const total = items.length || 1;
  return [...counts.entries()]
    .map(([channel, count]) => ({
      channel,
      count,
      pct: Math.round((100 * count) / total),
      color: CHANNEL_COLORS[channel],
    }))
    .sort((a, b) => b.count - a.count);
}

function roleSlices(items: AnnotatedCommentary[]) {
  const counts = new Map<VoiceRole, number>();
  for (const i of items) counts.set(i.voice_role, (counts.get(i.voice_role) || 0) + 1);
  return [...counts.entries()]
    .map(([role, count]) => ({ role, label: ROLE_LABELS[role], count }))
    .sort((a, b) => b.count - a.count);
}

function computeLean(items: AnnotatedCommentary[]): number {
  if (!items.length) return 0;
  let num = 0;
  let den = 0;
  for (const i of items) {
    num += sentimentScore(i.sentiment) * i.weight;
    den += i.weight;
  }
  return Math.round((100 * num) / (den || 1));
}

function leanLabel(lean: number): string {
  if (lean >= 55) return "Strongly constructive";
  if (lean >= 20) return "Constructive lean";
  if (lean > -20) return "Mixed / inconclusive";
  if (lean > -55) return "Cautious lean";
  return "Bearish lean";
}

function decidePosture(
  items: AnnotatedCommentary[],
  themes: QualitativeTheme[],
  lean: number,
): { posture: QualitativePosture; counsel: string } {
  if (!items.length) {
    return {
      posture: "quiet",
      counsel: "No discrete commentary captured yet — qualitative tape is thin vs funding headlines.",
    };
  }

  const has = (id: QualitativeThemeId) => themes.some((t) => t.id === id);
  const strong = (id: QualitativeThemeId) =>
    themes.some((t) => t.id === id && (t.strength === "strong" || t.strength === "moderate"));

  const bull = themes.filter((t) => t.polarity === "bull").length;
  const bear = themes.filter((t) => t.polarity === "bear").length;

  if (strong("investor_skepticism") || strong("retention_risk") || lean <= -40) {
    return {
      posture: "skeptical",
      counsel:
        "Credible skepticism shows up in the qualitative tape — treat round size as lagging, not leading.",
    };
  }
  if ((bull > 0 && bear > 0) || has("customer_friction") || (lean > -40 && lean < 25 && bear > 0)) {
    return {
      posture: "contested",
      counsel:
        "Bull and bear voices coexist — dig the friction before underwriting the narrative.",
    };
  }
  if ((strong("engineer_love") || (has("engineer_love") && lean >= 40)) && lean >= 25) {
    return {
      posture: "beloved",
      counsel:
        "Engineers and builders are pulling for this — often a better leading indicator than the last round.",
    };
  }
  if (strong("operator_validation") || (lean >= 25 && items.length >= 2)) {
    return {
      posture: "validated",
      counsel:
        "Operators / buyers are corroborating the story — use as IC color, still verify retention.",
    };
  }
  if (lean >= 20) {
    return {
      posture: "validated",
      counsel: "Constructive chatter without a sharp bear case — keep monitoring for churn or GP skepticism.",
    };
  }
  return {
    posture: "contested",
    counsel: "Signal is thin or mixed — do not let funding headlines substitute for voice quality.",
  };
}

function sortItems(items: AnnotatedCommentary[]): AnnotatedCommentary[] {
  return [...items].sort((a, b) => {
    const tw = b.weight - a.weight;
    if (Math.abs(tw) > 0.01) return tw;
    return String(b.captured_at || "").localeCompare(String(a.captured_at || ""));
  });
}

function toMarkdown(intel: CommentaryIntel): string {
  const lines = [
    `# Qualitative commentary — ${intel.company_name || "Library"}`,
    "",
    `**Posture:** ${intel.posture_label} (${intel.lean_label}, lean ${intel.lean})`,
    intel.counsel,
    "",
    intel.summary || "",
    "",
    "## Themes",
  ];
  if (!intel.themes.length) lines.push("- None detected yet");
  for (const t of intel.themes) {
    lines.push(`- **${t.label}** (${t.strength}): ${t.summary}`);
  }
  lines.push("", "## Captured quotes");
  for (const i of intel.items.slice(0, 12)) {
    lines.push(
      `- [${i.source || "—"} · ${i.sentiment || "mixed"} · ${i.credibility_tier || "—"}] ${i.quote_or_summary || ""}`,
    );
  }
  return lines.join("\n");
}

export function buildCommentaryIntel(
  commentary: Commentary[],
  opts?: {
    company?: Company | null;
    companyId?: string | null;
    summary?: string | null;
  },
): CommentaryIntel {
  const companyId = opts?.company?.id || opts?.companyId || undefined;
  const filtered = companyId
    ? commentary.filter((c) => c.company_id === companyId)
    : commentary;
  const items = sortItems(filtered.map(annotate));
  const themes = buildThemes(items);
  const lean = computeLean(items);
  const { posture, counsel } = decidePosture(items, themes, lean);
  const sentiment = { positive: 0, mixed: 0, negative: 0, neutral: 0 };
  for (const i of items) {
    const s = (i.sentiment || "neutral").toLowerCase();
    if (s === "positive") sentiment.positive += 1;
    else if (s === "negative") sentiment.negative += 1;
    else if (s === "mixed") sentiment.mixed += 1;
    else sentiment.neutral += 1;
  }

  const companyName =
    opts?.company?.name ||
    items.find((i) => i.company_name)?.company_name ||
    undefined;
  const summary =
    opts?.summary ||
    opts?.company?.commentary_summary ||
    (items[0]?.quote_or_summary
      ? `Latest: ${items[0].quote_or_summary}`
      : "No commentary summary yet.");

  const intel: CommentaryIntel = {
    company_id: companyId,
    company_name: companyName,
    summary,
    posture,
    posture_label: POSTURE_LABELS[posture],
    counsel,
    count: items.length,
    high_cred_count: items.filter((i) => (i.credibility_tier || "").toLowerCase() === "high")
      .length,
    lean,
    lean_label: leanLabel(lean),
    sentiment,
    channels: channelSlices(items),
    roles: roleSlices(items),
    themes,
    items,
    watchlist_hits: items.filter((i) => i.watchlist_voice).length,
    latest_at: items.map((i) => i.captured_at).filter(Boolean).sort().reverse()[0],
    markdown: "",
  };
  intel.markdown = toMarkdown(intel);
  return intel;
}

export function buildLibraryCommentaryPack(commentary: Commentary[]): LibraryCommentaryPack {
  const aggregate = buildCommentaryIntel(commentary, {
    summary: `${commentary.length} captured voice(s) across the pipeline — qualitative signal before round size.`,
  });
  aggregate.company_name = "Pipeline";

  const byId = new Map<string, Commentary[]>();
  for (const c of commentary) {
    const id = c.company_id || "unknown";
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(c);
  }

  const by_company = [...byId.entries()]
    .map(([id, rows]) =>
      buildCommentaryIntel(rows, {
        companyId: id,
        summary: rows[0]?.company_name
          ? `Commentary on ${rows[0].company_name}`
          : undefined,
      }),
    )
    .sort((a, b) => b.count - a.count || Math.abs(b.lean) - Math.abs(a.lean));

  const hot = by_company
    .filter((c) => c.posture === "beloved" || c.posture === "validated")
    .slice(0, 8);
  const red_flags = by_company
    .filter((c) => c.posture === "skeptical" || c.themes.some((t) => t.polarity === "bear"))
    .slice(0, 8);

  return {
    aggregate,
    by_company,
    hot,
    red_flags,
    channel_coverage: aggregate.channels,
  };
}

export function postureTone(
  posture: QualitativePosture,
): "ok" | "signal" | "warn" | "danger" | "text" {
  if (posture === "beloved" || posture === "validated") return "ok";
  if (posture === "contested") return "warn";
  if (posture === "skeptical") return "danger";
  return "text";
}

export function themeTone(polarity: QualitativeTheme["polarity"]): "ok" | "warn" | "danger" | "signal" {
  if (polarity === "bull") return "ok";
  if (polarity === "bear") return "danger";
  return "warn";
}

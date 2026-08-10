/** Thirdbase thesis helpers — mirrors config/thesis_policy.yaml for research scoring. */

export const TIER1_FIRMS = [
  "Andreessen Horowitz",
  "a16z",
  "Sequoia Capital",
  "Sequoia",
  "Lux Capital",
  "Founders Fund",
  "Lightspeed Venture Partners",
  "Lightspeed",
  "Index Ventures",
  "Bessemer Venture Partners",
  "Bessemer",
  "Insight Partners",
  "IVP",
  "Coatue",
  "Altimeter",
  "Tiger Global",
  "Thrive Capital",
  "Conviction",
  "Khosla Ventures",
  "Shield Capital",
  "8VC",
  "Ribbit Capital",
  "Spark Capital",
  "Benchmark",
  "Greylock",
  "Accel",
  "General Catalyst",
  "Kleiner Perkins",
  "NEA",
  "GV",
  "Redpoint",
  "Felicis",
  "Initialized Capital",
];

export const TIER2_FIRMS = [
  "Gradient Ventures",
  "Silver Lake",
  "Haystack",
  "Y Combinator",
  "USV",
  "Union Square Ventures",
  "137 Ventures",
  "Peak XV Partners",
  "NFX",
  "Primary Venture Partners",
  "Obvious Ventures",
  "Dragonfly",
  "Picus Capital",
  "Basis Set Ventures",
  "Kindred Ventures",
  "Antler",
  "Entrepreneurs First",
];

export const THEME_HINTS: { id: string; name: string; keywords: string[] }[] = [
  { id: "ai_infra", name: "AI Infrastructure & Compute Stack", keywords: ["ai infra", "inference", "gpu", "llm", "vector", "eval", "model", "synthetic data"] },
  { id: "cybersecurity", name: "Cybersecurity", keywords: ["cyber", "security", "identity", "soc", "zero trust", "supply chain"] },
  { id: "defence", name: "Defence Tech", keywords: ["defense", "defence", "drone", "military", "autonomous", "space", "c4isr", "uas"] },
  { id: "robotics", name: "Robotics & Physical AI", keywords: ["robot", "humanoid", "automation", "warehouse", "simulation"] },
  { id: "energy", name: "Energy-as-a-service", keywords: ["energy", "nuclear", "grid", "power", "demand response"] },
  { id: "ai_native_stack", name: "AI-native stack", keywords: ["gpu cloud", "orchestration", "fine-tun", "agent", "devtools", "edge ai"] },
  { id: "ai_manufacturing", name: "AI in manufacturing", keywords: ["manufacturing", "industrial", "factory", "process optimization"] },
  { id: "ai_copilots", name: "AI copilots replacing SaaS", keywords: ["copilot", "saas", "sales ai", "legal ai", "finance ai"] },
  { id: "voice_multimodal", name: "Voice, Audio & Multimodal AI", keywords: ["voice", "audio", "speech", "multimodal", "ambient"] },
  { id: "fintech", name: "Fintech & Financial Infrastructure", keywords: ["fintech", "payments", "banking", "crypto", "trading", "regtech", "baas"] },
  { id: "materials", name: "Materials Science & Advanced Manufacturing", keywords: ["materials", "chemicals", "semiconductor materials", "advanced manufacturing"] },
  { id: "biotech", name: "BioTech & Health AI", keywords: ["bio", "health", "drug", "genomics", "clinical", "imaging"] },
];

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function classifyInvestors(investors: string[]) {
  const t1 = TIER1_FIRMS.map(norm);
  const t2 = TIER2_FIRMS.map(norm);
  const tier1_names: string[] = [];
  const tier2_names: string[] = [];
  const tier3_names: string[] = [];
  for (const inv of investors) {
    const n = norm(inv);
    if (t1.some((t) => n === t || n.includes(t) || t.includes(n))) {
      if (!tier1_names.includes(inv)) tier1_names.push(inv);
    } else if (t2.some((t) => n === t || n.includes(t) || t.includes(n))) {
      if (!tier2_names.includes(inv)) tier2_names.push(inv);
    } else if (!tier3_names.includes(inv)) {
      tier3_names.push(inv);
    }
  }
  return {
    tier1_names,
    tier2_names,
    tier3_names,
    tier1_count: tier1_names.length,
    tier2_count: tier2_names.length,
    tier3_count: tier3_names.length,
  };
}

export function inferTheme(blob: string) {
  const lower = blob.toLowerCase();
  for (const t of THEME_HINTS) {
    if (t.keywords.some((k) => lower.includes(k))) return t;
  }
  return THEME_HINTS[0];
}

export function scoreResearchDraft(input: {
  themeFit: boolean;
  tier1Count: number;
  hasLead: boolean;
  teamStrength: number; // 0-100
  tractionStrength: number;
  moatStrength: number;
  yoyGrowth?: number | null;
  runwayMonths?: number | null;
  tamUsdB?: number | null;
}): {
  thesis_score: number;
  score_breakdown: Record<string, number>;
  recommendation: "Deep Dive" | "Watch" | "Pass";
} {
  const clamp = (x: number) => Math.max(0, Math.min(100, x));
  const thesis_fit = clamp(input.themeFit ? 80 : 48);
  const team_quality = clamp(input.teamStrength);
  const cap_table = clamp(
    input.tier1Count >= 3 && input.tier1Count <= 5
      ? 90
      : input.tier1Count >= 2
        ? 75
        : input.tier1Count === 1
          ? 60
          : 35 + (input.hasLead ? 5 : 0),
  );
  const traction = clamp(
    input.tractionStrength +
      (input.yoyGrowth != null && input.yoyGrowth >= 40 ? 12 : 0),
  );
  const moat = clamp(input.moatStrength);
  const valuation = 55;
  const runway = clamp(
    input.runwayMonths == null
      ? 50
      : input.runwayMonths >= 36
        ? 90
        : input.runwayMonths >= 18
          ? 70
          : 40,
  );
  const tam_exit = clamp(
    input.tamUsdB == null ? 50 : input.tamUsdB >= 1 ? 85 : 40,
  );
  const timing = 60;

  const weights: Record<string, number> = {
    thesis_fit: 0.2,
    team_quality: 0.15,
    cap_table: 0.15,
    traction: 0.15,
    moat: 0.1,
    valuation: 0.1,
    runway: 0.05,
    tam_exit: 0.05,
    timing: 0.05,
  };
  const score_breakdown = {
    thesis_fit,
    team_quality,
    cap_table,
    traction,
    moat,
    valuation,
    runway,
    tam_exit,
    timing,
  };
  const thesis_score = Math.round(
    Object.entries(weights).reduce(
      (sum, [k, w]) => sum + (score_breakdown[k as keyof typeof score_breakdown] || 0) * w,
      0,
    ),
  );
  const recommendation =
    thesis_score >= 78 ? "Deep Dive" : thesis_score >= 58 ? "Watch" : "Pass";
  return { thesis_score, score_breakdown, recommendation };
}

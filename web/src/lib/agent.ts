import type { Company, PeerActivity, SectorCall } from "@/lib/types";
import { portfolioMix } from "@/lib/utils";

export function answerPartnerQuestion(
  question: string,
  ctx: {
    companies: Company[];
    sectors: SectorCall[];
    peers: PeerActivity[];
  },
): string {
  const q = question.toLowerCase();
  const { companies, sectors, peers } = ctx;

  if (q.includes("60/40") || q.includes("rebalance") || q.includes("overweight")) {
    const mix = portfolioMix(companies);
    const note =
      mix.tacticalPct > 45
        ? "Slightly overweight tactical — bias next Hot Deals toward dominant tech/growth."
        : mix.dominantPct >= 55
          ? "Close to target; maintain discipline on the tactical bar."
          : "Underweight dominant — prioritize AI infra / cyber / defense / robotics Deep Dives.";
    return `Observed mix: ${mix.dominantPct}% dominant / ${mix.tacticalPct}% tactical (target 60/40). ${note}`;
  }

  if (
    q.includes("sector") &&
    (q.includes("tomorrow") || q.includes("nobody") || q.includes("emerging") || q.includes("sub-sector"))
  ) {
    return [
      "Sector of Tomorrow (from Signal heat map):",
      "",
      ...sectors.slice(0, 3).flatMap((s) => [
        `**${s.subsector}** — ${s.consensus_level} (heat ${s.heat_score})`,
        s.why_thirdbase_cares || "",
        `Evidence: ${(s.evidence || []).join("; ")}`,
        `Companies: ${(s.top_companies || []).join(", ")}`,
        "",
      ]),
    ].join("\n");
  }

  if (q.includes("off-thesis") || q.includes("thesis shift")) {
    const shifts = peers.filter((p) => p.thesis_shift);
    if (!shifts.length) return "No thesis-shift flags currently in peer activity.";
    return shifts.map((p) => `- ${p.firm} → ${p.company_name}: ${p.notes}`).join("\n");
  }

  if (q.includes("quietly investing") || q.includes("who's") || q.includes("who is")) {
    const themeKw = ["robot", "defense", "defence", "cyber", "fintech", "energy", "bio"].find((k) =>
      q.includes(k),
    );
    const hits = peers.filter((p) => {
      const blob = `${p.theme || ""} ${p.company_name || ""}`.toLowerCase();
      return !themeKw || blob.includes(themeKw);
    });
    return ["Peer activity (pipeline-grounded):", ...hits.slice(0, 12).map((p) => `- ${p.firm} → ${p.company_name} (${p.round}, ${p.date})`)].join(
      "\n",
    );
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
      return [
        `# ${c.name}`,
        `**${c.recommendation}** · score ${c.thesis_score} · ${c.relative_rank}`,
        "",
        c.why_now || "",
        "",
        `Commentary: ${c.commentary_summary || "None captured yet."}`,
        `Cap table: ${c.tier1_count} Tier-1 (${(c.tier1_names || []).join(", ")})`,
      ].join("\n");
    }
  }

  const top = companies.filter((c) => c.recommendation === "Deep Dive").slice(0, 5);
  return [
    "Top Deep Dive deals in the current pipeline:",
    "",
    ...top.flatMap((c) => [`**${c.name}** (${c.sector_theme}) — score ${c.thesis_score}`, c.why_now || "", ""]),
  ].join("\n");
}

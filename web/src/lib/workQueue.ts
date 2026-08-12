/**
 * Associate Work Queue — diligence handoffs + IC checklist items that need action.
 * Aggregates Diligence Stress Pack work orders and IC trail DD items into one board.
 */

import {
  buildDiligencePack,
  companyToSubject,
  type DiligenceArea,
  type DiligenceTask,
} from "@/lib/diligence";
import {
  diligenceProgress,
  STAGE_LABEL,
  type DealTrail,
  type DiligenceItem,
} from "@/lib/icTrail";
import type { Commentary, Company, PeerActivity } from "@/lib/types";

export type WorkItem = {
  id: string;
  company_id: string;
  company_name: string;
  slug?: string | null;
  source: "diligence_plan" | "ic_checklist";
  area: string;
  title: string;
  detail: string;
  risk: "high" | "medium" | "low";
  required: boolean;
  stage?: string;
  sponsor?: string;
  href: string;
};

export type WorkQueuePack = {
  generated_at: string;
  headline: string;
  counsel: string;
  items: WorkItem[];
  by_area: { area: string; count: number; high: number }[];
  by_company: { company_id: string; company_name: string; open: number; high: number; href: string }[];
  stats: {
    open: number;
    high: number;
    required: number;
    companies: number;
  };
  markdown: string;
};

function riskRank(r: "high" | "medium" | "low") {
  return r === "high" ? 0 : r === "medium" ? 1 : 2;
}

function taskToWork(
  company: Company,
  task: DiligenceTask,
): WorkItem {
  return {
    id: `plan:${company.id}:${task.id}`,
    company_id: company.id,
    company_name: company.name,
    slug: company.slug,
    source: "diligence_plan",
    area: task.area,
    title: task.title,
    detail: `${task.procedure} · Closes when: ${task.closes_when}`,
    risk: task.risk_if_open,
    required: task.required_before_close,
    href: `/company/${company.slug || company.id}`,
  };
}

const CATEGORY_LABEL: Record<DiligenceItem["category"], string> = {
  team: "Team",
  market: "Market",
  product: "Product",
  traction: "Traction",
  legal: "Legal",
  refs: "Refs",
  terms: "Terms",
};

function checklistToWork(trail: DealTrail, item: DiligenceItem): WorkItem {
  const blocking = item.status === "blocked" || item.category === "legal" || item.category === "refs";
  return {
    id: `ic:${trail.company_id}:${item.id}`,
    company_id: trail.company_id,
    company_name: trail.company_name,
    slug: trail.slug,
    source: "ic_checklist",
    area: CATEGORY_LABEL[item.category] || item.category,
    title: item.label,
    detail:
      item.note ||
      `${item.status === "blocked" ? "Blocked · " : ""}${STAGE_LABEL[trail.stage] || trail.stage}${item.owner ? ` · ${item.owner}` : ""}`,
    risk: item.status === "blocked" ? "high" : blocking ? "high" : "medium",
    required: blocking || item.status === "in_progress",
    stage: STAGE_LABEL[trail.stage] || trail.stage,
    sponsor: trail.sponsor,
    href: `/company/${trail.slug || trail.company_id}`,
  };
}

export function buildWorkQueue(
  companies: Company[],
  trails: DealTrail[],
  opts?: {
    commentary?: Commentary[];
    peers?: PeerActivity[];
    /** Cap how many Deep Dives get full diligence plan expansion */
    plan_limit?: number;
  },
): WorkQueuePack {
  const commentary = opts?.commentary || [];
  const peers = opts?.peers || [];
  const planLimit = opts?.plan_limit ?? 6;
  const items: WorkItem[] = [];

  // IC checklist opens on active trails
  const activeStages = new Set([
    "deep_dive",
    "diligence",
    "partner_meeting",
    "ic_vote",
    "term_sheet",
  ]);
  for (const trail of trails) {
    if (!activeStages.has(trail.stage)) continue;
    for (const item of trail.diligence || []) {
      if (item.status === "done" || item.status === "na") continue;
      items.push(checklistToWork(trail, item));
    }
  }

  // Diligence plan work orders for top Deep Dives (and IC-active names)
  const deep = [...companies]
    .filter((c) => c.recommendation === "Deep Dive")
    .sort((a, b) => (b.thesis_score || 0) - (a.thesis_score || 0));
  const icIds = new Set(
    trails.filter((t) => activeStages.has(t.stage)).map((t) => t.company_id),
  );
  const planTargets = [
    ...deep.filter((c) => icIds.has(c.id)),
    ...deep.filter((c) => !icIds.has(c.id)),
  ].slice(0, planLimit);

  for (const c of planTargets) {
    const pack = buildDiligencePack(companyToSubject(c), {
      commentary: commentary.filter((x) => x.company_id === c.id),
      peers,
    });
    // Surface high/required tasks only — associates shouldn't drown
    const tasks = pack.plan.tasks.filter(
      (t) => t.risk_if_open === "high" || t.required_before_close,
    );
    for (const t of tasks.slice(0, 4)) {
      items.push(taskToWork(c, t));
    }
  }

  items.sort((a, b) => {
    const r = riskRank(a.risk) - riskRank(b.risk);
    if (r !== 0) return r;
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.company_name.localeCompare(b.company_name);
  });

  const byAreaMap = new Map<string, { count: number; high: number }>();
  for (const it of items) {
    const cur = byAreaMap.get(it.area) || { count: 0, high: 0 };
    cur.count += 1;
    if (it.risk === "high") cur.high += 1;
    byAreaMap.set(it.area, cur);
  }
  const by_area = [...byAreaMap.entries()]
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.high - a.high || b.count - a.count);

  const byCoMap = new Map<
    string,
    { company_name: string; open: number; high: number; href: string }
  >();
  for (const it of items) {
    const cur = byCoMap.get(it.company_id) || {
      company_name: it.company_name,
      open: 0,
      high: 0,
      href: it.href,
    };
    cur.open += 1;
    if (it.risk === "high") cur.high += 1;
    byCoMap.set(it.company_id, cur);
  }
  const by_company = [...byCoMap.entries()]
    .map(([company_id, v]) => ({ company_id, ...v }))
    .sort((a, b) => b.high - a.high || b.open - a.open);

  const stats = {
    open: items.length,
    high: items.filter((i) => i.risk === "high").length,
    required: items.filter((i) => i.required).length,
    companies: by_company.length,
  };

  const headline =
    stats.open === 0
      ? "Work queue clear"
      : `${stats.high} high-risk · ${stats.open} open across ${stats.companies} names`;

  const counsel =
    stats.open === 0
      ? "No open diligence handoffs. Pull a Deep Dive into IC if partners want associate hours deployed."
      : stats.high > 0
        ? `Clear high-risk items first — they block IC close. ${stats.required} are required-before-close.`
        : "Medium/low items only — batch founder asks and close the easy checklist gaps.";

  const markdown = [
    `# Associate work queue`,
    "",
    `**${headline}**`,
    counsel,
    "",
    ...items.slice(0, 20).map(
      (i) =>
        `- **[${i.risk}] ${i.company_name}** · ${i.area} — ${i.title}${i.required ? " _(required)_" : ""}`,
    ),
    "",
    "Open /work for the full board.",
  ].join("\n");

  return {
    generated_at: new Date().toISOString(),
    headline,
    counsel,
    items,
    by_area,
    by_company,
    stats,
    markdown,
  };
}

/** Progress helper re-export for UI chips */
export function trailProgressLabel(trail: DealTrail): string {
  const p = diligenceProgress(trail.diligence || []);
  return `${p.done}/${p.total} DD`;
}

export type { DiligenceArea };

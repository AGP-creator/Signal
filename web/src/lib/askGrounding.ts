/**
 * Ask grounding trails — YC Agent–style “what we searched” under each answer.
 */

export type GroundingStep = {
  name: string;
  query: string;
  display: string;
};

export function buildGroundingTrails(
  question: string,
  mode?: string,
): GroundingStep[] {
  const q = question.toLowerCase();
  const steps: GroundingStep[] = [];
  const add = (name: string, query: string, display: string) => {
    steps.push({ name, query, display });
  };

  if (mode === "pipeline_brief" || mode === "agentic_scout") {
    add("companies", question, `Search companies for “${question.slice(0, 64)}”`);
    add("commentary", question, "Pull linked investor commentary");
    add("peers", question, "Load peer / co-investor activity");
    if (mode === "agentic_scout") {
      add("web_scout", question, "Agentic web scout (public sources)");
    }
    return steps;
  }

  add("pipeline", "thesis_score desc", "Load scored pipeline store");

  if (/\b(monday|agenda|partner meeting|meeting)\b/i.test(q)) {
    add("meeting_os", "agenda blocks", "Build Partner Meeting OS blocks");
    add("ic_trails", "partner_meeting|ic_vote", "Scan IC trails needing decisions");
  }
  if (/\b(deep dive|hot deals?|top|best|pipeline)\b/i.test(q)) {
    add("companies", "recommendation=Deep Dive", "Filter Deep Dive recommendations");
  }
  if (/\b(peer|competitor|heatmap|syndicate|a16z|sequoia|tiger|ribbit)\b/i.test(q)) {
    add("peer_activity", question, "Search peer firm activity");
  }
  if (/\b(bear|counterfactual|diligence|meeting prep|deck|red flag)\b/i.test(q)) {
    add("diligence_pack", question, "Run Diligence Stress Pack agents");
  }
  if (/\b(judgment|override|miss|founder radar|freshness)\b/i.test(q)) {
    add("judgment_os", question, "Load Judgment OS pack");
  }
  if (/\b(atlas|market map|warm path|growth band|raise window|talent)\b/i.test(q)) {
    add("atlas", question, "Query Signal Atlas modules");
  }
  if (/\b(forge|monday moves?|win reality|attention capital|raise clock|blind spots?|partner attention)\b/i.test(q)) {
    add("forge", question, "Query Signal Forge decision physics");
  }
  if (/\b(edge|conviction|pre-?mortem|reference call|anti-?consensus)\b/i.test(q)) {
    add("partner_edge", question, "Query Partner Edge modules");
  }
  if (/\b(directory|batch|cycle|facet)\b/i.test(q)) {
    add("directory", question, "Facet Directory Desk");
  }
  if (/\b(interest|demo day|stack.?rank|meeting match)\b/i.test(q)) {
    add("interest", question, "Load Interest Desk likes + matcher");
  }
  if (/\b(launch|newco|founder radar|product hunt)\b/i.test(q)) {
    add("launch_feed", question, "Scan Launch Feed surfaces");
  }
  if (/\b(playbook|library|startup library|knowledge)\b/i.test(q)) {
    add("playbooks", question, "Search partner playbooks");
  }
  if (/\b(news|commentary|worth reading)\b/i.test(q)) {
    add("library", question, "Search news + commentary library");
  }
  if (/\b(sector|white.?space|tomorrow)\b/i.test(q)) {
    add("sectors", question, "Load sector-of-tomorrow calls");
  }
  if (/\b(lp|limited partner)\b/i.test(q)) {
    add("lp_desk", question, "Build LP Desk narrative");
  }
  if (/\b(work queue|kind.?no)\b/i.test(q)) {
    add("work_queue", question, "Build partner work queue");
  }

  if (steps.length === 1) {
    add("intent_router", question, "Match partner intent over grounded store");
  }
  return steps;
}

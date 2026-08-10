from __future__ import annotations

import json
import os
from typing import Any

from src.db.supabase_store import find_company_by_name, load_all_companies, load_table
from src.scoring import load_thesis_policy


SYSTEM_PROMPT = """You are Signal, the deal intelligence partner for Thirdbase Partners.

You think like a sharp growth/venture partner: selective, thesis-driven, allergic to noisy funding theater.
Thirdbase portfolio mix target: 60% dominant tech + growth stage, 40% tactical sector-agnostic.
Criteria: attractive entry vs sector/stage, ~40%+ YoY at growth, ~3 years runway, 3–4 Tier-1 preferred,
high moat/technical edge, TAM >$1B, 3–5 year exit horizon.

GROUNDING RULES (critical):
- Only assert company facts that appear in the provided PIPELINE CONTEXT.
- If asked about something not in context, say you don't have it in the pipeline yet.
- Label speculation as hypothesis.
- Prefer Pass/Watch/Deep Dive language and relative ranks.
- Be concise, partner-grade, no fluff.
"""


def _mix(companies: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(companies) or 1
    dom = sum(1 for c in companies if c.get("pipeline_bucket") == "dominant_tech_growth")
    tac = sum(1 for c in companies if c.get("pipeline_bucket") == "tactical_sector_agnostic")
    return {
        "dominant_pct": round(100 * dom / n, 1),
        "tactical_pct": round(100 * tac / n, 1),
        "target": "60/40",
    }


def build_pipeline_context(limit_companies: int = 60) -> str:
    companies = load_all_companies()[:limit_companies]
    commentary = load_table("commentary")
    news = load_table("news")
    sectors = load_table("sector_calls")
    peers = load_table("peer_activity")
    slim = []
    for c in companies:
        slim.append(
            {
                "name": c.get("name"),
                "one_liner": c.get("one_liner"),
                "sector": c.get("sector_theme"),
                "subsector": c.get("subsector"),
                "stage": c.get("stage"),
                "bucket": c.get("pipeline_bucket"),
                "score": c.get("thesis_score"),
                "rank": c.get("relative_rank"),
                "rec": c.get("recommendation"),
                "tier1": c.get("tier1_names"),
                "tier1_count": c.get("tier1_count"),
                "yoy": c.get("yoy_growth_pct"),
                "valuation_m": c.get("valuation_est_m"),
                "why_now": c.get("why_now"),
                "investors": c.get("investors"),
            }
        )
    return json.dumps(
        {
            "companies": slim,
            "sector_of_tomorrow": sectors,
            "sample_commentary": commentary[:20],
            "news": news[:10],
            "peer_activity": peers[:25],
            "portfolio_mix_observed": _mix(companies),
            "thesis": load_thesis_policy().get("portfolio_mix"),
        },
        indent=2,
    )


def get_brief(company_name: str) -> str:
    c = find_company_by_name(company_name)
    if not c:
        return f"No company matching '{company_name}' in the Signal pipeline."
    commentary = [x for x in load_table("commentary") if x.get("company_id") == c["id"]]
    peers = [x for x in load_table("peer_activity") if x.get("company_id") == c["id"]]
    lines = [
        f"# IC Brief — {c['name']}",
        f"**Recommendation:** {c.get('recommendation')} · **Score:** {c.get('thesis_score')} · **Rank:** {c.get('relative_rank')}",
        "",
        "## One-liner",
        c.get("one_liner") or "",
        "",
        "## Funding history",
        f"Stage {c.get('stage')}; last round ${c.get('last_round_size_m')}M on {c.get('last_round_date')}; "
        f"valuation ${c.get('valuation_est_m')}M ({c.get('valuation_confidence')}); lead {c.get('lead_investor')}.",
        "",
        "## Cap table quality",
        f"Tier-1 count: {c.get('tier1_count')} ({', '.join(c.get('tier1_names') or [])}). "
        f"Tier-2 count: {c.get('tier2_count')}. Investors: {', '.join(c.get('investors') or [])}.",
        "",
        "## Team & hiring",
        c.get("team_notes") or "",
        f"Headcount {c.get('headcount')}; 6m growth {c.get('headcount_6m_growth_pct')}%.",
        "",
        "## Product traction",
        c.get("traction_notes") or "",
        f"YoY {c.get('yoy_growth_pct')}%; runway ~{c.get('runway_months_est')} months.",
        "",
        "## Thesis fit",
        f"{c.get('sector_theme')} / {c.get('subsector')} · bucket {c.get('pipeline_bucket')}",
        c.get("moat_notes") or "",
        "",
        "## Score breakdown",
        json.dumps(c.get("score_breakdown") or {}, indent=2),
        "",
        "## Investor & operator commentary",
    ]
    for cm in commentary:
        lines.append(f"- ({cm.get('source')}, {cm.get('sentiment')}): {cm.get('quote_or_summary')}")
    if not commentary:
        lines.append("- None captured yet.")
    lines += ["", "## Peer activity"]
    for p in peers:
        lines.append(f"- {p.get('firm')} · {p.get('round')} · {p.get('notes')}")
    lines += ["", "## Why now", c.get("why_now") or "", "", "## Open questions for partner"]
    lines += [
        "- What is true entry valuation vs last marked round?",
        "- Diligence: customer references and retention?",
        "- Synergies with existing Thirdbase portfolio?",
    ]
    return "\n".join(lines)


def offline_answer(question: str) -> str:
    q = question.lower()
    companies = load_all_companies()
    sectors = load_table("sector_calls")
    peers = load_table("peer_activity")

    if "60/40" in q or "rebalance" in q or "overweight" in q:
        mix = _mix(companies)
        return (
            f"Observed mix: {mix['dominant_pct']}% dominant / {mix['tactical_pct']}% tactical "
            f"(target {mix['target']}). "
            + (
                "Slightly overweight tactical — bias next Hot Deals toward dominant tech/growth."
                if mix["tactical_pct"] > 45
                else "Close to target; maintain discipline on tactical bar."
                if mix["dominant_pct"] >= 55
                else "Underweight dominant — prioritize AI infra / cyber / defense / robotics Deep Dives."
            )
        )

    if "sector" in q and ("tomorrow" in q or "nobody" in q or "emerging" in q or "sub-sector" in q or "subsector" in q):
        lines = ["Sector of Tomorrow (from Signal heat map):", ""]
        for s in sorted(sectors, key=lambda x: -(x.get("heat_score") or 0))[:3]:
            lines.append(f"**{s['subsector']}** — {s['consensus_level']} (heat {s['heat_score']})")
            lines.append(s.get("why_thirdbase_cares") or "")
            evidence = s.get("evidence") or []
            if isinstance(evidence, list):
                lines.append("Evidence: " + "; ".join(evidence))
            tops = s.get("top_companies") or []
            if isinstance(tops, list):
                lines.append("Companies: " + ", ".join(tops))
            lines.append("")
        return "\n".join(lines)

    if "saying about" in q or "commentary" in q or "twitter" in q:
        for c in companies:
            if c["name"].lower() in q:
                return get_brief(c["name"])
        return "Specify a pipeline company to pull commentary."

    if "quietly investing" in q or "who's" in q or "who is" in q:
        theme_kw = None
        for kw in ("robot", "defense", "defence", "cyber", "fintech", "energy", "bio"):
            if kw in q:
                theme_kw = kw
                break
        hits = []
        for p in peers:
            blob = (p.get("theme") or "").lower() + (p.get("company_name") or "").lower()
            if theme_kw is None or theme_kw in blob:
                hits.append(p)
        lines = ["Peer activity (pipeline-grounded):"]
        for p in hits[:12]:
            lines.append(f"- {p.get('firm')} → {p.get('company_name')} ({p.get('round')}, {p.get('date')})")
        return "\n".join(lines) if hits else "No matching peer activity in pipeline."

    if "off-thesis" in q or "thesis shift" in q:
        shifts = [p for p in peers if p.get("thesis_shift")]
        if not shifts:
            return "No thesis-shift flags currently in peer activity."
        return "\n".join(f"- {p.get('firm')} → {p.get('company_name')}: {p.get('notes')}" for p in shifts)

    if "brief" in q or "one-pager" in q or "one pager" in q:
        for c in companies:
            if c["name"].lower() in q:
                return get_brief(c["name"])

    theme_map = {
        "defense": "Defence",
        "defence": "Defence",
        "cyber": "Cyber",
        "robot": "Robot",
        "fintech": "Fintech",
        "energy": "Energy",
        "bio": "Bio",
        "voice": "Voice",
        "infra": "Infrastructure",
    }
    for kw, label in theme_map.items():
        if kw in q:
            hits = [
                c
                for c in companies
                if label.lower() in (c.get("sector_theme") or "").lower()
                or kw in (c.get("subsector") or "").lower()
            ]
            hits = sorted(hits, key=lambda x: -(x.get("thesis_score") or 0))[:5]
            lines = [f"Best {label}-related deals in Signal right now:", ""]
            for c in hits:
                lines.append(
                    f"**{c['name']}** · {c.get('recommendation')} · {c.get('thesis_score')} · {c.get('relative_rank')}"
                )
                lines.append(c.get("why_now") or c.get("one_liner") or "")
                lines.append("")
            return "\n".join(lines) if hits else f"No {label} companies in pipeline."

    top = [c for c in companies if c.get("recommendation") == "Deep Dive"][:5]
    lines = ["Top Deep Dive deals in the current pipeline:", ""]
    for c in top:
        lines.append(f"**{c['name']}** ({c.get('sector_theme')}) — score {c.get('thesis_score')}")
        lines.append(c.get("why_now") or "")
        lines.append("")
    lines.append("_Offline mode: set ANTHROPIC_API_KEY for Claude partner-grade synthesis._")
    return "\n".join(lines)


def chat(question: str) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return offline_answer(question)
    try:
        import anthropic

        context = build_pipeline_context()
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=os.environ.get("SIGNAL_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=1400,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"PIPELINE CONTEXT (JSON):\n{context}\n\n"
                        f"PARTNER QUESTION:\n{question}\n\n"
                        "Answer using only grounded facts from context. Be partner-grade and concise."
                    ),
                }
            ],
        )
        parts = []
        for block in msg.content:
            if hasattr(block, "text"):
                parts.append(block.text)
        return "\n".join(parts).strip() or offline_answer(question)
    except Exception as exc:
        return offline_answer(question) + f"\n\n_(Claude unavailable: {exc})_"

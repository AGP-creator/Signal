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
    from src.briefs import brief_to_markdown, build_intelligence_brief
    from src.intelligence.peers import build_comparable_sets

    c = find_company_by_name(company_name)
    if not c:
        return f"No company matching '{company_name}' in the Signal pipeline."
    commentary = [x for x in load_table("commentary") if x.get("company_id") == c["id"]]
    peers = [x for x in load_table("peer_activity") if x.get("company_id") == c["id"]]
    companies = load_all_companies()
    comps = (build_comparable_sets(companies).get(c["id"]) or []) if companies else []
    brief = build_intelligence_brief(
        c, commentary, peers, comps, trigger="on_demand"
    )
    return brief_to_markdown(brief)


def _filter_sectors_for_question(question: str, sectors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    q = question.lower()
    ranked = sorted(sectors, key=lambda x: -(x.get("heat_score") or 0))
    wants_ai_infra = any(
        k in q
        for k in (
            "ai infra",
            "ai infrastructure",
            "infrastructure sub",
            "compute stack",
            "nobody is talking",
            "nobody talking",
        )
    )
    if wants_ai_infra or ("ai" in q and ("infra" in q or "sub-sector" in q or "subsector" in q)):
        ai = [
            s
            for s in ranked
            if "ai infrastructure" in (s.get("parent_theme") or "").lower()
            or "ai-native" in (s.get("parent_theme") or "").lower()
        ]
        if len(ai) >= 3:
            return ai[:3]
        if ai:
            return (ai + [s for s in ranked if s not in ai])[:3]
    if "contrarian" in q or "nobody" in q:
        contra = [s for s in ranked if (s.get("consensus_level") or "").lower() == "contrarian"]
        if contra:
            return (contra + [s for s in ranked if s not in contra])[:3]
    return ranked[:3]


def offline_answer(question: str) -> str:
    q = question.lower().strip()
    companies = load_all_companies()
    sectors = load_table("sector_calls")
    peers = load_table("peer_activity")
    commentary = load_table("commentary")

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
        picked = _filter_sectors_for_question(question, sectors)
        lines = ["Sector of Tomorrow (from Signal heat map):", ""]
        for s in picked:
            lines.append(f"**{s['subsector']}** — {s.get('consensus_level')} (heat {s.get('heat_score')})")
            lines.append(f"Parent theme: {s.get('parent_theme')}")
            lines.append(s.get("why_thirdbase_cares") or "")
            evidence = s.get("evidence") or []
            if isinstance(evidence, list):
                lines.append("Evidence: " + "; ".join(evidence))
            tops = s.get("top_companies") or []
            if isinstance(tops, list):
                lines.append("Companies: " + ", ".join(tops))
            lines.append("")
        return "\n".join(lines)

    if "saying about" in q or (("commentary" in q or "twitter" in q) and "about" in q):
        for c in companies:
            if c["name"].lower() in q:
                cms = [x for x in commentary if x.get("company_id") == c["id"]]
                lines = [
                    f"## What people are saying about {c['name']}",
                    f"Pipeline stance: **{c.get('recommendation')}** · score {c.get('thesis_score')} · {c.get('relative_rank')}",
                    "",
                ]
                if cms:
                    for cm in cms:
                        lines.append(
                            f"- ({cm.get('source')}, {cm.get('sentiment')}, {cm.get('credibility_tier')}): "
                            f"{cm.get('quote_or_summary')}"
                        )
                else:
                    lines.append(c.get("commentary_summary") or "No discrete commentary captured yet.")
                lines += ["", f"Full IC brief available via Search or: draft IC one-pager for {c['name']}."]
                return "\n".join(lines)
        return "Specify a pipeline company to pull commentary."

    if "quietly investing" in q or (("who's" in q or "who is" in q) and "invest" in q):
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
        firm_filter = None
        for firm in ("a16z", "andreessen", "sequoia", "lux", "ribbit", "tiger"):
            if firm in q:
                firm_filter = firm
                break
        shifts = [p for p in peers if p.get("thesis_shift")]
        if firm_filter:
            shifts = [p for p in shifts if firm_filter in (p.get("firm") or "").lower()]
        if not shifts:
            return "No thesis-shift flags currently in peer activity" + (
                f" for {firm_filter}." if firm_filter else "."
            )
        return "\n".join(f"- {p.get('firm')} → {p.get('company_name')}: {p.get('notes')}" for p in shifts)

    # Company intelligence — pipeline brief or name lookup
    for c in companies:
        name = (c.get("name") or "").lower()
        if name and name in q and (
            "brief" in q
            or "one-pager" in q
            or "one pager" in q
            or "research" in q
            or "tell me about" in q
            or "summar" in q
            or q.strip() == name
            or q.strip().startswith(name)
        ):
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

    # Bare company name → full brief if in pipeline
    maybe = find_company_by_name(question.strip())
    if maybe:
        return get_brief(maybe["name"])

    top = [c for c in companies if c.get("recommendation") == "Deep Dive"][:5]
    lines = ["Top Deep Dive deals in the current pipeline:", ""]
    for c in top:
        lines.append(f"**{c['name']}** ({c.get('sector_theme')}) — score {c.get('thesis_score')}")
        lines.append(c.get("why_now") or "")
        lines.append("")
    lines.append("_Tip: type a company name for a full IC brief. Use the Next.js /search page to research new names._")
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

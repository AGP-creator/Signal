"""Company intelligence briefs — IC one-pagers.

On demand (agent / API / Streamlit) or auto-triggered when a deal crosses
Watch / Deep Dive thresholds after scoring. Structured sections match the
partner brief: funding history, Tier mix, team & hiring, product traction,
thesis fit, comps, commentary, Pass / Watch / Deep Dive.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# Lazy import of PDF helper — keeps seed generation free of digest/yaml deps


# Recs that auto-generate a persisted brief on refresh
THRESHOLD_RECS = frozenset({"Watch", "Deep Dive"})


def _clause(text: Optional[str]) -> str:
    return (text or "").strip()


def synthesize_funding_rounds(company: dict[str, Any]) -> list[dict[str, Any]]:
    """Build a multi-round funding history from stage + last round when absent."""
    existing = company.get("funding_rounds")
    if isinstance(existing, list) and existing:
        return existing

    stage = (company.get("stage") or "").strip()
    last_size = company.get("last_round_size_m")
    last_date = company.get("last_round_date")
    last_val = company.get("valuation_est_m")
    lead = company.get("lead_investor")
    investors = list(company.get("investors") or [])

    if last_size is None and not stage:
        return []

    # Prior-round heuristics scaled from the latest known round
    size = float(last_size or 10)
    post = float(last_val or size * 5)
    date = str(last_date or "")[:10]

    ladder: list[tuple[str, float, float]] = []
    stage_l = stage.lower()
    if "seed" in stage_l and "series" not in stage_l:
        ladder = [("Seed", size, post)]
    elif "series a" in stage_l:
        ladder = [
            ("Seed", round(size * 0.28, 1), round(post * 0.22, 1)),
            ("Series A", size, post),
        ]
    elif "series b" in stage_l:
        ladder = [
            ("Seed", round(size * 0.12, 1), round(post * 0.08, 1)),
            ("Series A", round(size * 0.35, 1), round(post * 0.28, 1)),
            ("Series B", size, post),
        ]
    elif "series c" in stage_l or "series d" in stage_l or "growth" in stage_l:
        ladder = [
            ("Seed", round(size * 0.06, 1), round(post * 0.04, 1)),
            ("Series A", round(size * 0.18, 1), round(post * 0.12, 1)),
            ("Series B", round(size * 0.4, 1), round(post * 0.35, 1)),
            (stage or "Series C", size, post),
        ]
    else:
        ladder = [(stage or "Latest", size, post)]

    rounds: list[dict[str, Any]] = []
    # Backdate priors by ~14 months each when we only know the last date
    year = month = day = None
    if date and len(date) >= 7:
        try:
            year = int(date[:4])
            month = int(date[5:7])
            day = int(date[8:10]) if len(date) >= 10 else 15
        except ValueError:
            year = month = day = None

    n = len(ladder)
    for i, (label, amt, post_m) in enumerate(ladder):
        r_date = date if i == n - 1 else ""
        if year and month and i < n - 1:
            back = (n - 1 - i) * 14
            m = month - (back % 12)
            y = year - (back // 12)
            if m <= 0:
                m += 12
                y -= 1
            r_date = f"{y:04d}-{m:02d}-{min(day or 15, 28):02d}"
        is_last = i == n - 1
        rounds.append(
            {
                "round": label,
                "date": r_date or None,
                "amount_m": amt,
                "post_m": post_m,
                "lead": lead if is_last else (investors[0] if investors else None),
                "confidence": "reported"
                if is_last and company.get("valuation_confidence") == "reported"
                else "estimated",
            }
        )
    return rounds


def default_product_notes(company: dict[str, Any]) -> str:
    existing = _clause(company.get("product_notes"))
    if existing:
        return existing
    one = _clause(company.get("one_liner"))
    moat = _clause(company.get("moat_notes"))
    bits = []
    if one:
        bits.append(one)
    if moat:
        bits.append(f"Differentiation: {moat}")
    return " ".join(bits)


def enrich_company_brief_fields(company: dict[str, Any]) -> dict[str, Any]:
    """Ensure funding_rounds + product_notes exist for brief generation."""
    out = {**company}
    out["funding_rounds"] = synthesize_funding_rounds(out)
    out["product_notes"] = default_product_notes(out)
    return out


def build_intelligence_brief(
    company: dict[str, Any],
    commentary: Optional[list[dict[str, Any]]] = None,
    peers: Optional[list[dict[str, Any]]] = None,
    comparables: Optional[list[dict[str, Any]]] = None,
    *,
    trigger: str = "on_demand",
) -> dict[str, Any]:
    """Assemble the structured one-page intelligence brief."""
    c = enrich_company_brief_fields(company)
    commentary = [x for x in (commentary or []) if x.get("company_id") == c.get("id")]
    peers = [x for x in (peers or []) if x.get("company_id") == c.get("id")]
    comps = list(comparables or c.get("comparables") or [])

    hiring_signal = None
    hc_g = c.get("headcount_6m_growth_pct")
    if hc_g is not None:
        if hc_g >= 40:
            hiring_signal = "strong hiring inflection"
        elif hc_g >= 20:
            hiring_signal = "solid hiring"
        elif hc_g < 5:
            hiring_signal = "flat / slow hiring"
        else:
            hiring_signal = "moderate hiring"

    return {
        "brief_id": c.get("brief_id") or f"brief_{c.get('id')}",
        "company_id": c.get("id"),
        "slug": c.get("slug"),
        "name": c.get("name"),
        "domain": c.get("domain"),
        "one_liner": c.get("one_liner"),
        "recommendation": c.get("recommendation"),
        "thesis_score": c.get("thesis_score"),
        "relative_rank": c.get("relative_rank"),
        "score_breakdown": c.get("score_breakdown") or {},
        "confidence": "high",
        "trigger": trigger,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "funding_history": {
            "stage": c.get("stage"),
            "last_round_size_m": c.get("last_round_size_m"),
            "last_round_date": c.get("last_round_date"),
            "valuation_est_m": c.get("valuation_est_m"),
            "valuation_confidence": c.get("valuation_confidence"),
            "lead_investor": c.get("lead_investor"),
            "rounds": c.get("funding_rounds") or [],
        },
        "cap_table_quality": {
            "tier1_count": c.get("tier1_count") or 0,
            "tier1_names": c.get("tier1_names") or [],
            "tier2_count": c.get("tier2_count") or 0,
            "tier2_names": c.get("tier2_names") or [],
            "tier3_count": c.get("tier3_count") or 0,
            "tier3_names": c.get("tier3_names") or [],
            "investors": c.get("investors") or [],
            "lead_investor": c.get("lead_investor"),
        },
        "team_and_hiring": {
            "notes": c.get("team_notes") or "",
            "headcount": c.get("headcount"),
            "headcount_6m_growth_pct": c.get("headcount_6m_growth_pct"),
            "hiring_signal": hiring_signal,
        },
        "product_traction": {
            "product_notes": c.get("product_notes") or "",
            "traction_notes": c.get("traction_notes") or "",
            "yoy_growth_pct": c.get("yoy_growth_pct"),
            "runway_months_est": c.get("runway_months_est"),
            "tam_usd_b": c.get("tam_usd_b"),
        },
        "thesis_fit": {
            "sector_theme": c.get("sector_theme"),
            "subsector": c.get("subsector"),
            "pipeline_bucket": c.get("pipeline_bucket"),
            "moat_notes": c.get("moat_notes") or "",
            "why_now": c.get("why_now") or "",
            "score_breakdown": c.get("score_breakdown") or {},
        },
        "comparables": [
            {
                "name": x.get("name") if isinstance(x, dict) else str(x),
                "company_id": x.get("company_id") if isinstance(x, dict) else None,
                "slug": x.get("slug") if isinstance(x, dict) else None,
                "thesis_score": x.get("thesis_score") if isinstance(x, dict) else None,
                "recommendation": x.get("recommendation") if isinstance(x, dict) else None,
                "why": x.get("why") if isinstance(x, dict) else None,
            }
            for x in comps
        ],
        "commentary": {
            "summary": c.get("commentary_summary") or "",
            "items": commentary,
        },
        "peer_activity": peers,
        "open_questions": [
            "What is true entry valuation vs last marked round?",
            "Diligence: customer references and retention?",
            "Synergies with existing Thirdbase portfolio?",
        ],
        "provenance": "Grounded in Signal pipeline (scored against Thirdbase thesis).",
    }


def brief_to_markdown(brief: dict[str, Any]) -> str:
    """Render the structured brief as a partner-readable one-pager."""
    fh = brief.get("funding_history") or {}
    cap = brief.get("cap_table_quality") or {}
    team = brief.get("team_and_hiring") or {}
    pt = brief.get("product_traction") or {}
    tf = brief.get("thesis_fit") or {}
    cm = brief.get("commentary") or {}

    lines = [
        f"# IC Brief — {brief.get('name')}",
        (
            f"**Recommendation:** {brief.get('recommendation')} · "
            f"**Score:** {brief.get('thesis_score')} · "
            f"**Rank:** {brief.get('relative_rank')}"
        ),
        f"_Trigger: {brief.get('trigger')} · {brief.get('generated_at')}_",
        "",
        "## One-liner",
        brief.get("one_liner") or "—",
        "",
        "## Funding history",
        (
            f"Stage {fh.get('stage') or '—'}; last round ${fh.get('last_round_size_m')}M "
            f"on {fh.get('last_round_date') or '—'}; valuation ${fh.get('valuation_est_m')}M "
            f"({fh.get('valuation_confidence') or 'unknown'}); lead {fh.get('lead_investor') or '—'}."
        ),
    ]
    for r in fh.get("rounds") or []:
        lines.append(
            f"- {r.get('round')}: ${r.get('amount_m')}M"
            + (f" · ${r.get('post_m')}M post" if r.get("post_m") else "")
            + (f" · {r.get('date')}" if r.get("date") else "")
            + (f" · lead {r.get('lead')}" if r.get("lead") else "")
            + (f" · {r.get('confidence')}" if r.get("confidence") else "")
        )

    lines += [
        "",
        "## Cap table quality",
        (
            f"Tier-1: {cap.get('tier1_count') or 0} "
            f"({', '.join(cap.get('tier1_names') or []) or '—'}). "
            f"Tier-2: {cap.get('tier2_count') or 0} "
            f"({', '.join(cap.get('tier2_names') or []) or '—'}). "
            f"Tier-3: {cap.get('tier3_count') or 0} "
            f"({', '.join((cap.get('tier3_names') or [])[:6]) or '—'}). "
            f"Investors: {', '.join(cap.get('investors') or []) or '—'}."
        ),
        "",
        "## Team & hiring",
        team.get("notes") or "—",
        (
            f"Headcount {team.get('headcount') if team.get('headcount') is not None else '—'}; "
            f"6m growth {team.get('headcount_6m_growth_pct') if team.get('headcount_6m_growth_pct') is not None else '—'}%"
            + (f"; signal: {team.get('hiring_signal')}" if team.get("hiring_signal") else "")
            + "."
        ),
        "",
        "## Product traction",
        f"**Product:** {pt.get('product_notes') or '—'}",
        f"**Traction:** {pt.get('traction_notes') or '—'}",
        (
            f"YoY {pt.get('yoy_growth_pct') if pt.get('yoy_growth_pct') is not None else '—'}%; "
            f"runway ~{pt.get('runway_months_est') if pt.get('runway_months_est') is not None else '—'} months; "
            f"TAM ${pt.get('tam_usd_b')}B."
            if pt.get("tam_usd_b") is not None
            else (
                f"YoY {pt.get('yoy_growth_pct') if pt.get('yoy_growth_pct') is not None else '—'}%; "
                f"runway ~{pt.get('runway_months_est') if pt.get('runway_months_est') is not None else '—'} months."
            )
        ),
        "",
        "## Thesis fit",
        (
            f"{tf.get('sector_theme') or '—'} / {tf.get('subsector') or '—'} · "
            f"bucket {tf.get('pipeline_bucket') or '—'}"
        ),
        tf.get("moat_notes") or "",
        "",
        "## Why now",
        tf.get("why_now") or "—",
        "",
        "## Score breakdown",
        json.dumps(brief.get("score_breakdown") or {}, indent=2),
        "",
        "## Comparable companies",
    ]
    comps = brief.get("comparables") or []
    if comps:
        for x in comps:
            bit = x.get("name") or "—"
            if x.get("recommendation"):
                bit += f" · {x['recommendation']}"
            if x.get("thesis_score") is not None:
                bit += f" · {x['thesis_score']}"
            if x.get("why"):
                bit += f" — {x['why']}"
            lines.append(f"- {bit}")
    else:
        lines.append("- None in pipeline cohort yet.")

    lines += ["", "## Investor & operator commentary", cm.get("summary") or "—"]
    for item in cm.get("items") or []:
        lines.append(
            f"- ({item.get('source')}, {item.get('sentiment')}): {item.get('quote_or_summary')}"
        )
    if not (cm.get("items") or []) and not cm.get("summary"):
        lines.append("- None captured yet.")

    peers = brief.get("peer_activity") or []
    if peers:
        lines += ["", "## Peer activity"]
        for p in peers:
            lines.append(f"- {p.get('firm')} · {p.get('round')} · {p.get('notes') or ''}")

    lines += ["", "## Open questions for partner"]
    for q in brief.get("open_questions") or []:
        lines.append(f"- {q}")
    lines += ["", f"_{brief.get('provenance')}_"]
    return "\n".join(lines)


def persist_brief(
    brief: dict[str, Any],
    out_dir: Path,
    *,
    also_pdf: bool = False,
) -> dict[str, Any]:
    """Write markdown (+ optional PDF) under data/output/briefs/."""
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = brief.get("slug") or brief.get("company_id") or "unknown"
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(slug))[:60]
    md = brief_to_markdown(brief)
    md_path = out_dir / f"{safe}.md"
    json_path = out_dir / f"{safe}.json"
    md_path.write_text(md, encoding="utf-8")
    json_path.write_text(json.dumps(brief, indent=2), encoding="utf-8")
    result: dict[str, Any] = {
        "brief_id": brief.get("brief_id"),
        "company_id": brief.get("company_id"),
        "slug": slug,
        "markdown_path": str(md_path),
        "json_path": str(json_path),
        "recommendation": brief.get("recommendation"),
        "thesis_score": brief.get("thesis_score"),
        "trigger": brief.get("trigger"),
    }
    if also_pdf:
        from src.digest.pdf_brief import export_brief_pdf

        pdf_path = export_brief_pdf(md, brief.get("name") or safe, out_dir)
        result["pdf_path"] = str(pdf_path)
    return result


def generate_threshold_briefs(
    companies: list[dict[str, Any]],
    commentary: Optional[list[dict[str, Any]]] = None,
    peer_activity: Optional[list[dict[str, Any]]] = None,
    out_dir: Optional[Path] = None,
    *,
    also_pdf: bool = False,
    previous_recs: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    """Auto-generate briefs for Watch / Deep Dive deals after scoring.

    When ``previous_recs`` is provided, only companies that newly crossed into
    a threshold recommendation (or upgraded Watch → Deep Dive) are marked
    ``new_crossings`` — still regenerates all threshold briefs so content stays fresh.
    """
    from src.intelligence.peers import build_comparable_sets

    commentary = commentary or []
    peer_activity = peer_activity or []
    out_dir = out_dir or Path("data/output/briefs")
    previous_recs = previous_recs or {}
    comps_by_id = build_comparable_sets(companies)

    generated: list[dict[str, Any]] = []
    new_crossings: list[dict[str, Any]] = []

    for c in companies:
        rec = c.get("recommendation")
        if rec not in THRESHOLD_RECS:
            continue
        # Enrich in place so downstream store / UI see funding + product
        enriched = enrich_company_brief_fields(c)
        c.update(
            {
                "funding_rounds": enriched["funding_rounds"],
                "product_notes": enriched["product_notes"],
            }
        )
        brief = build_intelligence_brief(
            c,
            commentary,
            peer_activity,
            comps_by_id.get(c["id"]) or [],
            trigger="threshold_auto",
        )
        meta = persist_brief(brief, out_dir, also_pdf=also_pdf)
        generated.append(meta)

        prev = previous_recs.get(c["id"])
        # First snapshot: generate files but don't flood brief_ready alerts
        if previous_recs:
            crossed = prev not in THRESHOLD_RECS or (
                prev == "Watch" and rec == "Deep Dive"
            )
            if crossed:
                new_crossings.append(
                    {
                        "company_id": c["id"],
                        "slug": c.get("slug"),
                        "name": c.get("name"),
                        "recommendation": rec,
                        "thesis_score": c.get("thesis_score"),
                        "previous": prev,
                        "brief_id": brief.get("brief_id"),
                        "brief_path": meta.get("markdown_path"),
                    }
                )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(generated),
        "new_crossing_count": len(new_crossings),
        "briefs": generated,
        "new_crossings": new_crossings,
    }

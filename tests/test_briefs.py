"""Company intelligence briefs — structure, threshold auto-trigger, markdown."""

from __future__ import annotations

from pathlib import Path

from src.briefs import (
    THRESHOLD_RECS,
    brief_to_markdown,
    build_intelligence_brief,
    enrich_company_brief_fields,
    generate_threshold_briefs,
    synthesize_funding_rounds,
)


def _company(**overrides):
    base = {
        "id": "c_agentgate",
        "name": "AgentGate",
        "slug": "agentgate",
        "one_liner": "Identity for AI agents.",
        "sector_theme": "Cybersecurity",
        "subsector": "Identity security for AI agents",
        "stage": "Series A",
        "pipeline_bucket": "dominant_tech_growth",
        "last_round_size_m": 48,
        "last_round_date": "2026-06-25",
        "valuation_est_m": 320,
        "valuation_confidence": "estimated",
        "lead_investor": "Greylock",
        "investors": ["Greylock", "Sequoia Capital", "Spark Capital"],
        "tier1_count": 2,
        "tier1_names": ["Greylock", "Sequoia Capital"],
        "tier2_count": 1,
        "tier2_names": ["Spark Capital"],
        "tier3_count": 0,
        "tier3_names": [],
        "headcount": 72,
        "headcount_6m_growth_pct": 70,
        "yoy_growth_pct": 150,
        "runway_months_est": 32,
        "tam_usd_b": 22,
        "moat_notes": "First-mover category definition.",
        "team_notes": "Ex-Okta and CrowdStrike.",
        "traction_notes": "Design partners at three banks.",
        "recommendation": "Deep Dive",
        "thesis_score": 88,
        "relative_rank": "#1 of 5 Cybersecurity Series A",
        "score_breakdown": {"thesis_fit": 90, "team_quality": 85, "cap_table": 80},
        "why_now": "Category forming; Tier-1 syndicate in.",
        "brief_id": "brief_c_agentgate",
    }
    base.update(overrides)
    return base


def test_funding_rounds_synthesized_for_series_a():
    rounds = synthesize_funding_rounds(_company())
    assert len(rounds) == 2
    assert rounds[0]["round"] == "Seed"
    assert rounds[-1]["round"] == "Series A"
    assert rounds[-1]["amount_m"] == 48


def test_enrich_adds_product_notes():
    c = enrich_company_brief_fields(_company(product_notes=""))
    assert "Identity for AI agents" in c["product_notes"]
    assert c["funding_rounds"]


def test_brief_sections_complete():
    brief = build_intelligence_brief(
        _company(),
        commentary=[
            {
                "id": "cm1",
                "company_id": "c_agentgate",
                "source": "HN",
                "sentiment": "positive",
                "quote_or_summary": "Okta moment for agents.",
            }
        ],
        peers=[],
        comparables=[
            {
                "name": "CloudKeel",
                "company_id": "c_cloudkeel",
                "thesis_score": 72,
                "recommendation": "Watch",
                "why": "same theme",
            }
        ],
        trigger="on_demand",
    )
    assert brief["recommendation"] == "Deep Dive"
    assert brief["funding_history"]["rounds"]
    assert brief["cap_table_quality"]["tier1_count"] == 2
    assert brief["cap_table_quality"]["tier2_count"] == 1
    assert brief["team_and_hiring"]["hiring_signal"] == "strong hiring inflection"
    assert brief["product_traction"]["product_notes"]
    assert brief["product_traction"]["traction_notes"]
    assert brief["thesis_fit"]["why_now"]
    assert brief["comparables"][0]["name"] == "CloudKeel"
    assert brief["commentary"]["items"]

    md = brief_to_markdown(brief)
    for heading in (
        "## Funding history",
        "## Cap table quality",
        "## Team & hiring",
        "## Product traction",
        "## Thesis fit",
        "## Comparable companies",
        "## Investor & operator commentary",
    ):
        assert heading in md
    assert "Deep Dive" in md
    assert "Tier-1: 2" in md


def test_threshold_auto_generates_watch_and_deep_dive(tmp_path: Path):
    companies = [
        _company(id="c1", name="Hot", slug="hot", recommendation="Deep Dive", thesis_score=90),
        _company(
            id="c2",
            name="Warm",
            slug="warm",
            recommendation="Watch",
            thesis_score=65,
            tier1_count=1,
            tier1_names=["Greylock"],
        ),
        _company(
            id="c3",
            name="Cold",
            slug="cold",
            recommendation="Pass",
            thesis_score=40,
            tier1_count=0,
            tier1_names=[],
        ),
    ]
    pack = generate_threshold_briefs(
        companies,
        out_dir=tmp_path,
        previous_recs={"c2": "Pass"},  # Warm newly crossed
    )
    assert pack["count"] == 2
    assert {b["slug"] for b in pack["briefs"]} == {"hot", "warm"}
    assert pack["new_crossing_count"] >= 1
    assert (tmp_path / "hot.md").exists()
    assert (tmp_path / "warm.json").exists()
    assert not (tmp_path / "cold.md").exists()
    warm_md = (tmp_path / "warm.md").read_text(encoding="utf-8")
    assert "## Funding history" in warm_md
    assert "Watch" in warm_md
    assert THRESHOLD_RECS == frozenset({"Watch", "Deep Dive"})

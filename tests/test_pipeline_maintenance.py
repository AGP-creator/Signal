"""Self-maintaining pipeline: merge, stale 90d, partner review before removal."""

from datetime import date, timedelta

from src.pipeline.maintenance import (
    apply_partner_reviews,
    is_archived,
    merge_pipeline_companies,
)
from src.scoring import load_thesis_policy, mark_stale, score_all


def test_merge_keeps_live_discovered_companies():
    seed = [
        {
            "id": "seed1",
            "name": "SeedCo",
            "slug": "seedco",
            "moat_notes": "Seed moat",
            "last_signal_date": "2026-01-01",
            "investors": ["a16z"],
            "sources": ["seed"],
        }
    ]
    db = [
        {
            "id": "seed1",
            "name": "SeedCo",
            "slug": "seedco",
            "moat_notes": "Old moat",
            "last_signal_date": "2026-08-01",
            "investors": ["Sequoia"],
            "sources": ["live"],
            "headcount": 40,
            "review_status": "Reviewed — keep",
            "partner_decision": "keep",
        },
        {
            "id": "live_abc",
            "name": "LiveNova",
            "slug": "livenova",
            "last_signal_date": "2026-08-05",
            "sources": ["live_discovery"],
            "investors": [],
        },
    ]
    merged = merge_pipeline_companies(seed, db)
    assert len(merged) == 2
    seedco = next(c for c in merged if c["name"] == "SeedCo")
    assert seedco["moat_notes"] == "Seed moat"  # seed narrative wins
    assert seedco["last_signal_date"] == "2026-08-01"  # newer signal wins
    assert seedco["headcount"] == 40
    assert "Sequoia" in seedco["investors"] and "a16z" in seedco["investors"]
    assert seedco["partner_decision"] == "keep"
    assert any(c["name"] == "LiveNova" for c in merged)


def test_mark_stale_90_days_and_never_deletes():
    policy = load_thesis_policy()
    as_of = date(2026, 8, 12)
    companies = [
        {
            "id": "fresh",
            "name": "Fresh",
            "last_signal_date": (as_of - timedelta(days=10)).isoformat(),
        },
        {
            "id": "stale",
            "name": "StaleCo",
            "last_signal_date": (as_of - timedelta(days=100)).isoformat(),
        },
    ]
    out = mark_stale(companies, policy, as_of=as_of)
    assert out[0]["is_stale"] is False
    assert out[1]["is_stale"] is True
    assert out[1]["review_status"] == "Pending Partner Review"
    assert len(out) == 2  # never removed


def test_partner_keep_and_archive_survive_mark_stale():
    policy = load_thesis_policy()
    as_of = date(2026, 8, 12)
    companies = [
        {
            "id": "k1",
            "name": "KeepMe",
            "last_signal_date": (as_of - timedelta(days=200)).isoformat(),
            "partner_decision": "keep",
            "review_status": "Reviewed — keep",
            "recommendation": "Watch",
        },
        {
            "id": "a1",
            "name": "ArchiveMe",
            "last_signal_date": (as_of - timedelta(days=200)).isoformat(),
            "partner_decision": "archive",
            "review_status": "Archived (partner)",
            "recommendation": "Watch",
        },
    ]
    out = mark_stale(companies, policy, as_of=as_of)
    keep = out[0]
    arch = out[1]
    assert keep["is_stale"] is False
    assert keep["review_status"] == "Reviewed — keep"
    assert arch["is_stale"] is False
    assert arch["review_status"] == "Archived (partner)"
    assert arch["recommendation"] == "Pass"
    assert is_archived(arch)


def test_apply_partner_reviews_archive_is_pass_not_delete():
    companies = [
        {"id": "c1", "name": "X", "recommendation": "Deep Dive", "is_stale": True},
        {"id": "c2", "name": "Y", "recommendation": "Watch", "is_stale": True},
    ]
    reviews = {
        "c1": {"decision": "archive", "reviewed_by": "GP", "reviewed_at": "2026-08-12"},
        "c2": {"decision": "keep", "reviewed_by": "GP", "reviewed_at": "2026-08-12"},
    }
    out = apply_partner_reviews(companies, reviews)
    assert len(out) == 2
    assert out[0]["recommendation"] == "Pass"
    assert out[0]["review_status"] == "Archived (partner)"
    assert out[1]["review_status"] == "Reviewed — keep"
    assert out[1]["is_stale"] is False


def test_score_all_uses_rolling_as_of():
    policy = load_thesis_policy()
    as_of = date(2026, 8, 12)
    companies = [
        {
            "id": "t1",
            "name": "AgentGate",
            "slug": "agentgate",
            "one_liner": "Identity for agents",
            "sector_theme": "Cybersecurity",
            "theme_id": "cybersecurity",
            "subsector": "Identity security for AI agents",
            "stage": "Series A",
            "pipeline_bucket": "dominant_tech_growth",
            "last_round_size_m": 48,
            "valuation_est_m": 320,
            "valuation_confidence": "estimated",
            "lead_investor": "Greylock",
            "investors": ["Greylock", "Sequoia Capital", "Spark Capital"],
            "headcount": 72,
            "headcount_6m_growth_pct": 70,
            "yoy_growth_pct": 150,
            "runway_months_est": 32,
            "tam_usd_b": 22,
            "moat_notes": "Proprietary identity graph",
            "team_notes": "Ex-Okta",
            "traction_notes": "Bank design partners",
            "last_signal_date": (as_of - timedelta(days=120)).isoformat(),
            "sources": ["seed"],
        }
    ]
    scored = score_all(companies, policy, as_of=as_of)
    assert scored[0]["is_stale"] is True
    assert scored[0]["review_status"] == "Pending Partner Review"
    assert scored[0]["score_breakdown"]["timing"] <= 55

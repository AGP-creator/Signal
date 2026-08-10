"""Tests for Judgment OS X-factor layer."""

from src.intelligence.judgment import build_judgment_pack


def test_judgment_pack_shapes():
    companies = [
        {
            "id": "c1",
            "name": "FastBot",
            "recommendation": "Pass",
            "thesis_score": 52,
            "pipeline_bucket": "tactical_sector_agnostic",
            "yoy_growth_pct": 120,
            "headcount_6m_growth_pct": 90,
            "investors": ["Accel"],
            "team_notes": "Ex-OpenAI infra.",
            "last_signal_date": "2025-01-01",
            "last_round_date": "2025-01-01",
        },
        {
            "id": "c2",
            "name": "QuietSeed",
            "recommendation": "Watch",
            "thesis_score": 68,
            "pipeline_bucket": "dominant_tech_growth",
            "investors": ["Lux Capital"],
            "team_notes": "Ex-Locus Robotics founders.",
            "tier1_count": 0,
            "last_signal_date": "2026-08-01",
            "last_round_date": "2026-07-01",
        },
        {
            "id": "c3",
            "name": "CoreInfra",
            "recommendation": "Deep Dive",
            "thesis_score": 88,
            "pipeline_bucket": "dominant_tech_growth",
            "investors": ["a16z", "Sequoia"],
            "last_signal_date": "2026-08-08",
            "last_round_date": "2026-06-01",
        },
    ]
    peers = [
        {
            "company_id": "c1",
            "firm": "a16z",
            "round": "Series A",
            "date": "2026-08-01",
            "thesis_shift": True,
        },
        {
            "company_id": "c1",
            "firm": "Sequoia",
            "round": "Series A",
            "date": "2026-08-02",
            "thesis_shift": False,
        },
    ]
    commentary = [
        {
            "company_id": "c2",
            "source": "Elad Gil",
            "quote_or_summary": "Elad Gil: watching a watched founder (ex-DeepMind RL) spin up a stealth newco.",
        }
    ]
    news = [
        {
            "title": "Watched founder launching stealth RL environment co",
            "why_it_matters": "GP watchlist hit",
            "source": "seed",
        }
    ]

    pack = build_judgment_pack(companies, peers, commentary, news, alerts=[])
    assert pack["headline"]
    assert pack["must_do"]
    assert pack["mix"]["status"] in ("on_target", "soft_drift", "hard_drift")
    assert pack["misses"], "expected miss candidates from growth/peer heat"
    assert pack["founder_radar"], "expected founder radar hits"
    assert pack["freshness"]
    assert len(pack["digest_ab"]) == 3
    assert pack["digest_ab"][0]["variant"] == "tight"

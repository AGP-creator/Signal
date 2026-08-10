from src.intelligence.peers import (
    build_coinvestor_heatmap,
    build_comparable_sets,
    build_firm_dossiers,
    build_peer_intelligence,
    firm_slug,
)


def test_firm_slug():
    assert firm_slug("Andreessen Horowitz") == "andreessen-horowitz"
    assert firm_slug("a16z") == "a16z"


def test_peer_intelligence_basic():
    companies = [
        {
            "id": "c1",
            "name": "Alpha",
            "slug": "alpha",
            "sector_theme": "AI Infrastructure & Compute Stack",
            "theme_id": "ai_infra",
            "subsector": "Model eval infrastructure",
            "stage": "Series B",
            "investors": ["a16z", "Founders Fund", "Sequoia Capital"],
            "lead_investor": "a16z",
            "thesis_score": 88,
            "recommendation": "Deep Dive",
            "last_round_date": "2026-06-01",
        },
        {
            "id": "c2",
            "name": "Beta",
            "slug": "beta",
            "sector_theme": "AI Infrastructure & Compute Stack",
            "theme_id": "ai_infra",
            "subsector": "Model eval infrastructure",
            "stage": "Series B",
            "investors": ["a16z", "Lux Capital"],
            "lead_investor": "Lux Capital",
            "thesis_score": 81,
            "recommendation": "Deep Dive",
            "last_round_date": "2026-05-01",
        },
        {
            "id": "c3",
            "name": "Gamma",
            "slug": "gamma",
            "sector_theme": "Fintech & Financial Infrastructure",
            "theme_id": "fintech",
            "subsector": "Embedded finance",
            "stage": "Series A",
            "investors": ["Ribbit Capital", "Sequoia Capital"],
            "lead_investor": "Ribbit Capital",
            "thesis_score": 70,
            "recommendation": "Watch",
            "last_round_date": "2026-04-01",
        },
    ]
    peer_activity = [
        {
            "id": "pa1",
            "firm": "Ribbit Capital",
            "company_id": "c1",
            "company_name": "Alpha",
            "round": "Series B",
            "date": "2026-06-01",
            "theme": "AI Infrastructure & Compute Stack",
            "on_thesis_flag": False,
            "thesis_shift": True,
            "notes": "Fintech firm into AI infra.",
        }
    ]

    heat = build_coinvestor_heatmap(companies)
    assert any(h["firm_a"] == "Founders Fund" or h["firm_b"] == "Founders Fund" for h in heat)
    assert heat[0]["coinvest_count"] >= 1

    comps = build_comparable_sets(companies)
    assert comps["c1"][0]["name"] == "Beta"

    dossiers = build_firm_dossiers(companies, peer_activity)
    a16z = next(d for d in dossiers if d["slug"] in ("andreessen-horowitz", "a16z") or "a16z" in d["aliases"])
    assert a16z["deal_count"] >= 2

    ribbit = next(d for d in dossiers if "ribbit" in d["slug"])
    assert ribbit["thesis_shift_count"] >= 1
    assert ribbit["drift_score"] > 0

    intel = build_peer_intelligence(companies, peer_activity)
    assert intel["firm_count"] >= 4
    assert intel["thesis_shift_count"] >= 1
    assert intel["heatmap"]
    assert intel["matrix"]["cells"]

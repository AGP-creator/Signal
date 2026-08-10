from src.scoring import load_thesis_policy, score_all


def test_scoring_produces_recommendations():
    policy = load_thesis_policy()
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
            "last_round_date": "2026-06-25",
            "valuation_est_m": 320,
            "valuation_confidence": "estimated",
            "lead_investor": "Greylock",
            "investors": ["Greylock", "Sequoia Capital", "Spark Capital"],
            "headcount": 72,
            "headcount_6m_growth_pct": 70,
            "yoy_growth_pct": 150,
            "runway_months_est": 32,
            "tam_usd_b": 22,
            "moat_notes": "Proprietary identity graph + regulatory complexity",
            "team_notes": "Ex-Okta and CrowdStrike",
            "traction_notes": "Bank design partners",
            "last_signal_date": "2026-08-05",
            "sources": ["seed"],
        },
        {
            "id": "t2",
            "name": "PipelineCloud",
            "slug": "pipelinecloud",
            "one_liner": "Horizontal CRM with light AI",
            "sector_theme": "AI copilots replacing SaaS",
            "theme_id": "ai_copilots",
            "subsector": "Sales copilots",
            "stage": "Series B",
            "pipeline_bucket": "tactical_sector_agnostic",
            "last_round_size_m": 50,
            "last_round_date": "2025-06-01",
            "valuation_est_m": 450,
            "lead_investor": "IVP",
            "investors": ["IVP"],
            "headcount": 160,
            "yoy_growth_pct": 22,
            "runway_months_est": 20,
            "tam_usd_b": 10,
            "moat_notes": "None meaningful",
            "team_notes": "Solid operators",
            "traction_notes": "Noisy announcement",
            "last_signal_date": "2025-07-15",
            "sources": ["seed"],
        },
    ]
    scored = score_all(companies, policy)
    assert scored[0]["recommendation"] in {"Deep Dive", "Watch", "Pass"}
    assert any(c["name"] == "PipelineCloud" and c["recommendation"] == "Pass" for c in scored)
    assert all(c.get("relative_rank") for c in scored)
    assert all(c.get("why_now") for c in scored)

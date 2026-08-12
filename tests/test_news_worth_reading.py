"""News Worth Reading — curation quality for partner digests."""

from datetime import date

from src.digest import build_digest, select_news_for_digest
from src.ingest.discovery import (
    classify_news_kind,
    curate_news_from_signals,
    why_it_matters_line,
)
from src.scoring import load_thesis_policy


def test_classify_news_kinds():
    assert classify_news_kind("Earnings: hyperscalers accelerate capex") == "earnings"
    assert classify_news_kind("European cyber regulation tightens attestation") == "regulatory"
    assert classify_news_kind("Contrarian: most AI CRM replacements will fail") == "contrarian"
    assert classify_news_kind("DoD budget signals for autonomous systems") == "geopolitical"
    assert classify_news_kind("Why AI agent identity will be the next market", "The Generalist") == "essay"


def test_why_mentions_pipeline_companies():
    theme = {
        "sector_theme": "Cybersecurity",
        "subsector": "Identity security for AI agents",
    }
    companies = [
        {"name": "AgentGate", "sector_theme": "Cybersecurity"},
        {"name": "IDForge", "sector_theme": "Cybersecurity"},
    ]
    why = why_it_matters_line(kind="essay", theme=theme, companies=companies)
    assert "Thirdbase" in why or "Cybersecurity" in why
    assert "AgentGate" in why
    assert "maps to" in why


def test_curate_news_why_is_specific():
    policy = load_thesis_policy()
    companies = [
        {
            "name": "Modular Nucleus",
            "sector_theme": "Energy-as-a-service",
        }
    ]
    news = curate_news_from_signals(
        [],
        [
            {
                "id": "n",
                "source": "rss:Not Boring",
                "signal_type": "news",
                "title": "Why nuclear power for AI data centers is the next infrastructure wave",
                "summary": "Grid and nuclear for GPU clusters",
                "observed_at": "2026-08-07",
                "url": "https://example.com/nuclear",
            }
        ],
        policy,
        companies=companies,
    )
    assert len(news) == 1
    why = news[0]["why_it_matters"]
    assert "Live signal maps to" not in why
    assert "Modular Nucleus" in why or "Energy" in why


def test_select_news_for_digest_caps_and_diversifies():
    news = [
        {
            "id": "1",
            "title": "Earnings: hyperscalers accelerate capex on inference",
            "source": "Bloomberg",
            "published_at": "2026-08-10",
            "why_it_matters": "Reinforces durable demand for inference infra in the Thirdbase book.",
            "related_themes": ["AI Infrastructure & Compute Stack"],
        },
        {
            "id": "2",
            "title": "European cyber regulation tightens supply-chain attestation",
            "source": "FT",
            "published_at": "2026-08-09",
            "why_it_matters": "Regulatory complexity moat for SupplyShield — Thirdbase cyber theme.",
            "related_themes": ["Cybersecurity"],
        },
        {
            "id": "3",
            "title": "Contrarian: most AI CRM replacements will fail on switching costs",
            "source": "Stratechery",
            "published_at": "2026-08-08",
            "why_it_matters": "Supports Pass/Watch discipline on SaaS-replacement narratives.",
            "related_themes": ["AI copilots replacing SaaS"],
        },
        {
            "id": "4",
            "title": "DoD budget signals for autonomous systems and CUAS",
            "source": "Axios",
            "published_at": "2026-08-07",
            "why_it_matters": "Budget tailwinds for SwarmGuard and dual-use autonomy pipeline.",
            "related_themes": ["Defence Tech"],
        },
        {
            "id": "5",
            "title": "Why AI agent identity will be the next Okta-scale market",
            "source": "The Generalist",
            "published_at": "2026-08-06",
            "why_it_matters": "Validates Thirdbase cyber theme and AgentGate opportunity set.",
            "related_themes": ["Cybersecurity"],
        },
        {
            "id": "6",
            "title": "Another earnings note on GPU spend",
            "source": "Reuters",
            "published_at": "2026-08-05",
            "why_it_matters": "Second earnings read-through for AI infra.",
            "related_themes": ["AI Infrastructure & Compute Stack"],
        },
        {
            "id": "7",
            "title": "Humanoid robot pilots expand in US warehouses",
            "source": "TechCrunch",
            "published_at": "2026-08-04",
            "why_it_matters": "Physical AI timing for ForgeBot.",
            "related_themes": ["Robotics & Physical AI"],
        },
    ]
    picked = select_news_for_digest(news, news_limit=5, as_of=date(2026, 8, 12))
    assert 3 <= len(picked) <= 5
    kinds = {
        classify_news_kind(n["title"], n["source"], n["why_it_matters"]) for n in picked
    }
    # Diversity: first pass prefers unique kinds
    assert len(kinds) >= 3


def test_build_digest_includes_kind_and_why():
    companies = [
        {
            "name": "AgentGate",
            "thesis_score": 88,
            "recommendation": "Deep Dive",
            "one_liner": "Agent identity",
            "sector_theme": "Cybersecurity",
            "subsector": "Identity",
            "stage": "Series A",
            "slug": "agentgate",
            "brief_id": "b1",
        },
        {
            "name": "SwarmGuard",
            "thesis_score": 85,
            "recommendation": "Deep Dive",
            "one_liner": "CUAS",
            "sector_theme": "Defence Tech",
            "stage": "Series B",
            "slug": "swarmguard",
            "brief_id": "b2",
        },
        {
            "name": "GPUMesh",
            "thesis_score": 82,
            "recommendation": "Deep Dive",
            "one_liner": "GPU cloud",
            "sector_theme": "AI-native stack",
            "stage": "Series B",
            "slug": "gpumesh",
            "brief_id": "b3",
        },
    ]
    news = [
        {
            "id": "n1",
            "title": "Why AI agent identity will be the next Okta-scale market",
            "source": "The Generalist",
            "url": "https://example.com/a",
            "published_at": "2026-08-04",
            "why_it_matters": "Directly validates Thirdbase cyber theme and AgentGate.",
            "related_themes": ["Cybersecurity"],
        },
        {
            "id": "n2",
            "title": "Earnings: hyperscalers accelerate capex on inference",
            "source": "Bloomberg",
            "url": "https://example.com/b",
            "published_at": "2026-08-03",
            "why_it_matters": "Reinforces demand for inference infra.",
            "related_themes": ["AI Infrastructure & Compute Stack"],
        },
        {
            "id": "n3",
            "title": "European cyber regulation tightens supply-chain attestation",
            "source": "FT",
            "url": "https://example.com/c",
            "published_at": "2026-08-02",
            "why_it_matters": "Regulatory moat for cyber names.",
            "related_themes": ["Cybersecurity"],
        },
    ]
    digest = build_digest(companies, [], news, [], as_of=date(2026, 8, 12))
    assert 3 <= len(digest["news"]) <= 5
    assert all(n.get("why") for n in digest["news"])
    assert all(n.get("kind") for n in digest["news"])
    assert "Why Thirdbase" in digest["html"]
    assert "News worth reading" in digest["markdown"]

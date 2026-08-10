from src.ingest.discovery import (
    apply_live_signals_to_companies,
    curate_news_from_signals,
    match_theme,
)
from src.scoring import load_thesis_policy


def test_match_theme_ai_infra():
    policy = load_thesis_policy()
    hit = match_theme("New synthetic data and RL environment startup raises seed", policy)
    assert hit is not None
    assert hit["theme_id"] in ("ai_infra", "ai_native_stack")


def test_discover_adds_novel_company():
    policy = load_thesis_policy()
    existing = [
        {
            "id": "c1",
            "name": "SynthForge",
            "slug": "synthforge",
            "sector_theme": "AI Infrastructure & Compute Stack",
            "theme_id": "ai_infra",
            "subsector": "Synthetic data",
            "stage": "Series A",
            "pipeline_bucket": "dominant_tech_growth",
            "investors": [],
            "sources": ["seed"],
            "last_signal_date": "2026-01-01",
        }
    ]
    signals = [
        {
            "id": "sig1",
            "source": "hackernews",
            "signal_type": "funding",
            "title": "LatticeNova raises seed for inference optimization GPUs",
            "summary": "Edge inference startup building small language model runtimes",
            "observed_at": "2026-08-09",
            "company_name": "LatticeNova",
            "url": "https://example.com",
        }
    ]
    out, added = apply_live_signals_to_companies(existing, signals, policy, max_new=5)
    assert added == 1
    assert any(c["name"] == "LatticeNova" for c in out)
    # Existing company not duplicated
    assert sum(1 for c in out if c["name"] == "SynthForge") == 1


def test_discover_updates_existing_signal_date():
    policy = load_thesis_policy()
    existing = [
        {
            "id": "c1",
            "name": "LatticeNova",
            "slug": "latticenova",
            "sector_theme": "AI Infrastructure & Compute Stack",
            "theme_id": "ai_infra",
            "subsector": "Inference",
            "stage": "Seed",
            "pipeline_bucket": "dominant_tech_growth",
            "investors": [],
            "sources": ["seed"],
            "last_signal_date": "2026-01-01",
        }
    ]
    signals = [
        {
            "id": "sig2",
            "source": "rss:TechCrunch",
            "signal_type": "news",
            "title": "LatticeNova launches new edge inference product",
            "summary": "GPU inference optimization for edge AI",
            "observed_at": "2026-08-08",
            "company_name": "LatticeNova",
        }
    ]
    out, added = apply_live_signals_to_companies(existing, signals, policy)
    assert added == 0
    assert out[0]["last_signal_date"] == "2026-08-08"
    assert "rss:TechCrunch" in out[0]["sources"]


def test_curate_news_from_rss():
    policy = load_thesis_policy()
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
    )
    assert len(news) == 1
    assert "Thirdbase" in news[0]["why_it_matters"]


def test_theme_word_not_company():
    policy = load_thesis_policy()
    out, added = apply_live_signals_to_companies(
        [],
        [
            {
                "id": "s1",
                "source": "rss:Not Boring",
                "signal_type": "news",
                "title": "Nuclear data center power for AI training clusters",
                "summary": "Grid and SMR for GPU farms",
                "observed_at": "2026-08-09",
                "company_name": None,
            }
        ],
        policy,
    )
    assert added == 0
    assert out == []

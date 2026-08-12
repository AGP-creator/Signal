"""Smoke tests for qualitative commentary seed coverage."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "data" / "seed" / "seed_corpus.json"

REQUIRED_SOURCES = {
    "Twitter/X",
    "Hacker News",
    "Reddit",
    "Blind",
    "Podcast",
    "Substack",
}


def test_commentary_seed_has_multi_channel_coverage():
    data = json.loads(SEED.read_text(encoding="utf-8"))
    rows = data["commentary"]
    assert len(rows) >= 28
    sources = {r.get("source") for r in rows}
    missing = REQUIRED_SOURCES - sources
    assert not missing, f"Missing commentary sources: {missing}"

    for r in rows:
        assert r.get("company_id")
        assert r.get("quote_or_summary")
        assert r.get("sentiment") in {"positive", "mixed", "negative", "neutral"}
        assert r.get("credibility_tier") in {"high", "medium", "low", "live_signal"}


def test_commentary_flags_skepticism_and_engineer_love():
    data = json.loads(SEED.read_text(encoding="utf-8"))
    blob = " ".join(r.get("quote_or_summary") or "" for r in data["commentary"]).lower()
    assert "skeptical" in blob or "skepticism" in blob
    assert "engineer" in blob or "hacker news" in blob or "show hn" in blob
    assert "retention" in blob or "churn" in blob or "incentive" in blob

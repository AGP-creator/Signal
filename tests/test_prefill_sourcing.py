"""Tests for prefill continuous deal sourcing (no network / Gemini)."""

from src.ingest import run_live_ingest
from src.ingest.dedupe import find_duplicate
from src.ingest.prefill import PrefillSignalAdapter, normalize_signal_kind, sourcing_mode


def test_normalize_signal_kinds():
    assert normalize_signal_kind("product") == "product_launch"
    assert normalize_signal_kind("hiring") == "hiring"
    assert normalize_signal_kind("founder") == "founder_move"
    assert normalize_signal_kind("customer") == "customer_win"


def test_prefill_adapter_covers_sourcing_kinds(monkeypatch):
    monkeypatch.setenv("SIGNAL_SOURCING_MODE", "prefill")
    assert sourcing_mode() == "prefill"
    rows = PrefillSignalAdapter().fetch()
    assert len(rows) >= 10
    kinds = {r.signal_type for r in rows}
    for needed in ("funding", "hiring", "product_launch", "founder_move", "customer_win"):
        assert needed in kinds, f"missing {needed}"


def test_prefill_dedupes_same_company_title(monkeypatch):
    monkeypatch.setenv("SIGNAL_SOURCING_MODE", "prefill")
    signals = run_live_ingest()
    # IDForge + ShadowRelay each appear twice in seed; ingest must consolidate
    idforge = [s for s in signals if (s.company_name or "") == "IDForge Labs"]
    titles = {(s.title or "").lower()[:48] for s in idforge}
    assert len(idforge) == len(titles)  # no duplicate title for same name


def test_find_duplicate_consolidates_company_keys():
    existing = [
        {"id": "c1", "name": "IDForge Labs", "slug": "idforge", "domain": "idforge.ai"},
    ]
    assert find_duplicate(existing, {"name": "IDForge Labs", "slug": "idforge"}) is not None
    assert find_duplicate(existing, {"name": "Other Co", "slug": "other"}) is None

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import yaml

from src.ingest.adapters import EdgarFormDAdapter, HackerNewsAdapter, RSSAdapter
from src.ingest.arxiv import ArxivAdapter
from src.ingest.base import NormalizedSignal, StubConnector
from src.ingest.prefill import PrefillSignalAdapter, sourcing_mode

ROOT = Path(__file__).resolve().parents[2]


def load_watchlists(path: Optional[Path] = None) -> dict[str, Any]:
    p = path or (ROOT / "config" / "watchlists.yaml")
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _dedupe_signals(signals: list[NormalizedSignal]) -> list[NormalizedSignal]:
    """Consolidate same company + similar title across adapters (prefill ∪ live)."""
    seen_ids: set[str] = set()
    # company_name|normalized title prefix → keep first (prefer live over prefill by sort)
    seen_keys: set[str] = set()
    out: list[NormalizedSignal] = []
    for s in signals:
        if s.id in seen_ids:
            continue
        name = (s.company_name or "").strip().lower()
        title_key = "".join(ch for ch in (s.title or "").lower() if ch.isalnum())[:48]
        key = f"{name}|{title_key}" if name or title_key else s.id
        if key in seen_keys:
            continue
        seen_ids.add(s.id)
        seen_keys.add(key)
        out.append(s)
    return out


def _live_adapters(wl: dict[str, Any]) -> list:
    edgar_cfg = wl.get("edgar", {})
    return [
        EdgarFormDAdapter(
            user_agent=edgar_cfg.get("user_agent", "Thirdbase Signal MVP"),
            max_results=int(edgar_cfg.get("max_results", 15)),
        ),
        HackerNewsAdapter(queries=wl.get("hn_topics"), max_hits=12),
        RSSAdapter(feeds=wl.get("rss_feeds") or []),
        ArxivAdapter(),
        # Paid DBs — empty until licensed; same interface as live adapters.
        StubConnector("pitchbook"),
        StubConnector("crunchbase"),
        StubConnector("coresignal"),
        StubConnector("harmonic"),
        StubConnector("dealroom"),
    ]


def run_live_ingest(watchlists: Optional[dict[str, Any]] = None) -> list[NormalizedSignal]:
    """Continuous deal sourcing ingest.

    Modes (SIGNAL_SOURCING_MODE):
      prefill (default) — seed signals only; no network; no Gemini
      live — public adapters + paid stubs
      hybrid — prefill then live, deduped by company+title
    """
    wl = watchlists or load_watchlists()
    mode = sourcing_mode()
    adapters: list = []
    if mode in ("prefill", "hybrid"):
        adapters.append(PrefillSignalAdapter())
    if mode in ("live", "hybrid"):
        adapters.extend(_live_adapters(wl))

    out: list[NormalizedSignal] = []
    for a in adapters:
        try:
            out.extend(a.fetch())
        except Exception:
            continue
    return _dedupe_signals(out)

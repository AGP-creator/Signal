from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import yaml

from src.ingest.adapters import EdgarFormDAdapter, HackerNewsAdapter, RSSAdapter
from src.ingest.base import NormalizedSignal, StubConnector

ROOT = Path(__file__).resolve().parents[2]


def load_watchlists(path: Optional[Path] = None) -> dict[str, Any]:
    p = path or (ROOT / "config" / "watchlists.yaml")
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


def run_live_ingest(watchlists: Optional[dict[str, Any]] = None) -> list[NormalizedSignal]:
    wl = watchlists or load_watchlists()
    edgar_cfg = wl.get("edgar", {})
    adapters = [
        EdgarFormDAdapter(
            user_agent=edgar_cfg.get("user_agent", "Thirdbase Signal MVP"),
            max_results=int(edgar_cfg.get("max_results", 15)),
        ),
        HackerNewsAdapter(queries=wl.get("hn_topics"), max_hits=12),
        RSSAdapter(feeds=wl.get("rss_feeds") or []),
        # Phase-2 stubs (no-op) — present for architecture honesty
        StubConnector("pitchbook"),
        StubConnector("crunchbase"),
        StubConnector("coresignal"),
    ]
    out: list[NormalizedSignal] = []
    for a in adapters:
        try:
            out.extend(a.fetch())
        except Exception:
            continue
    return out

"""Prefill deal-sourcing signals — demo corpus with zero network / Gemini cost.

Flip SIGNAL_SOURCING_MODE=live (or hybrid) to use real adapters instead.
Same NormalizedSignal shape as EDGAR / HN / RSS so discovery + dedupe stay unchanged.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from src.ingest.base import NormalizedSignal, SourceAdapter

ROOT = Path(__file__).resolve().parents[2]
SEED_PATH = ROOT / "data" / "seed" / "seed_corpus.json"

# Canonical continuous-sourcing kinds (UI + discovery).
SOURCING_KINDS = frozenset(
    {
        "funding",
        "hiring",
        "product_launch",
        "founder_move",
        "customer_win",
    }
)

_KIND_ALIASES = {
    "product": "product_launch",
    "launch": "product_launch",
    "product_launch": "product_launch",
    "funding": "funding",
    "raise": "funding",
    "hiring": "hiring",
    "headcount": "hiring",
    "founder_move": "founder_move",
    "founder": "founder_move",
    "newco": "founder_move",
    "customer_win": "customer_win",
    "customer": "customer_win",
    "traction": "customer_win",
}


def sourcing_mode() -> str:
    """prefill (default) | live | hybrid — never calls Gemini."""
    raw = (os.environ.get("SIGNAL_SOURCING_MODE") or "prefill").strip().lower()
    if raw in ("live", "hybrid", "prefill"):
        return raw
    return "prefill"


def normalize_signal_kind(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    return _KIND_ALIASES.get(raw.strip().lower())


def load_seed_signals(path: Optional[Path] = None) -> list[dict[str, Any]]:
    p = path or SEED_PATH
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []
    return list(data.get("signals") or [])


class PrefillSignalAdapter(SourceAdapter):
    """Returns high-fidelity seed signals as NormalizedSignal rows.

    Covers funding, hiring, product launches, founder moves, and customer wins.
    Includes multi-source hits on the same company so pipeline dedupe can consolidate.
    """

    name = "prefill"

    def __init__(self, path: Optional[Path] = None):
        self.path = path or SEED_PATH

    def fetch(self) -> list[NormalizedSignal]:
        out: list[NormalizedSignal] = []
        for row in load_seed_signals(self.path):
            kind = normalize_signal_kind(row.get("signal_type")) or (row.get("signal_type") or "funding")
            # Keep non-sourcing types out of continuous sourcer adapters; seed may still store them.
            if kind not in SOURCING_KINDS and kind not in ("news", "commentary", "regulatory_filing"):
                kind = "funding"
            sid = str(row.get("id") or "")
            if not sid:
                continue
            raw = dict(row.get("raw") or {})
            raw.setdefault("prefill", True)
            if row.get("early_signal") is not None:
                raw["early_signal"] = bool(row.get("early_signal"))
            if row.get("mainstream") is not None:
                raw["mainstream"] = bool(row.get("mainstream"))
            out.append(
                NormalizedSignal(
                    id=sid,
                    source=str(row.get("source") or "prefill"),
                    signal_type=kind if kind in SOURCING_KINDS else str(row.get("signal_type") or "funding"),
                    title=str(row.get("title") or "")[:200],
                    summary=str(row.get("summary") or "")[:500],
                    url=row.get("url"),
                    observed_at=str(row.get("observed_at") or "")[:10],
                    company_id=row.get("company_id"),
                    company_name=row.get("company_name"),
                    raw=raw,
                )
            )
        return out

"""arXiv research-velocity adapter for technical theme signals."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Optional
from xml.etree import ElementTree as ET

import httpx

from src.ingest.base import NormalizedSignal, SourceAdapter


def _sid(*parts: str) -> str:
    return "sig_" + hashlib.sha1("|".join(parts).encode()).hexdigest()[:12]


class ArxivAdapter(SourceAdapter):
    name = "arxiv"

    def __init__(self, queries: Optional[list[str]] = None, max_results: int = 8):
        self.queries = queries or [
            "AI agent evaluation",
            "robotics simulation learning",
            "language model security identity",
        ]
        self.max_results = max_results

    def fetch(self) -> list[NormalizedSignal]:
        signals: list[NormalizedSignal] = []
        try:
            with httpx.Client(timeout=25.0, follow_redirects=True) as client:
                for q in self.queries[:3]:
                    r = client.get(
                        "http://export.arxiv.org/api/query",
                        params={
                            "search_query": f"all:{q}",
                            "start": 0,
                            "max_results": 3,
                            "sortBy": "submittedDate",
                            "sortOrder": "descending",
                        },
                    )
                    if r.status_code != 200:
                        continue
                    signals.extend(self._parse(r.text, q))
        except Exception as exc:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            return [
                NormalizedSignal(
                    id=_sid("arxiv_fallback", str(exc), now),
                    source=self.name,
                    signal_type="research",
                    title="[Demo fallback] arXiv unavailable",
                    summary=str(exc)[:200],
                    observed_at=now,
                    raw={"fallback": True},
                )
            ]
        return signals[: self.max_results]

    def _parse(self, text: str, query: str) -> list[NormalizedSignal]:
        out: list[NormalizedSignal] = []
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            return out
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("a:entry", ns):
            title = (entry.findtext("a:title", default="", namespaces=ns) or "").strip()
            title = " ".join(title.split())
            summary = (entry.findtext("a:summary", default="", namespaces=ns) or "").strip()
            summary = " ".join(summary.split())[:400]
            published = entry.findtext("a:published", default="", namespaces=ns) or ""
            link = ""
            for l in entry.findall("a:link", ns):
                if l.get("type") == "text/html" or l.get("rel") == "alternate":
                    link = l.get("href") or link
            out.append(
                NormalizedSignal(
                    id=_sid("arxiv", title),
                    source=self.name,
                    signal_type="research",
                    title=f"arXiv: {title}"[:200],
                    summary=f"Query={query}. {summary}",
                    url=link or None,
                    observed_at=(published[:10] if published else datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                    raw={"query": query},
                )
            )
        return out

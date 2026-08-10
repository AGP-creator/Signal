from __future__ import annotations

import hashlib
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

from src.ingest.base import SourceAdapter, NormalizedSignal


def _sid(*parts: str) -> str:
    h = hashlib.sha1("|".join(parts).encode()).hexdigest()[:12]
    return f"sig_{h}"


class EdgarFormDAdapter(SourceAdapter):
    """Pull recent SEC Form D filings via EDGAR full-text search API."""

    name = "edgar_form_d"

    def __init__(self, user_agent: str, max_results: int = 15):
        self.user_agent = user_agent
        self.max_results = max_results

    def fetch(self) -> list[NormalizedSignal]:
        url = (
            "https://efts.sec.gov/LATEST/search-index?"
            f"q=%22form%20type%22%3A%22D%22&dateRange=custom&startdt=2026-01-01&enddt=2026-08-09"
            f"&forms=D&from=0&size={self.max_results}"
        )
        # EDGAR efts can be flaky; also try data.sec.gov company search fallback via atom
        headers = {"User-Agent": self.user_agent, "Accept": "application/json"}
        signals: list[NormalizedSignal] = []
        try:
            with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
                # Use submissions recent via a known working endpoint pattern
                r = client.get(
                    "https://www.sec.gov/cgi-bin/browse-edgar",
                    params={
                        "action": "getcurrent",
                        "type": "D",
                        "company": "",
                        "dateb": "",
                        "owner": "include",
                        "count": str(self.max_results),
                        "output": "atom",
                    },
                )
                if r.status_code != 200:
                    return self._fallback_demo_signals("edgar_http_error")
                signals = self._parse_atom(r.text)
        except Exception as exc:  # network / parse
            return self._fallback_demo_signals(str(exc))
        return signals or self._fallback_demo_signals("empty")

    def _parse_atom(self, text: str) -> list[NormalizedSignal]:
        signals: list[NormalizedSignal] = []
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            return []
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("a:entry", ns)[: self.max_results]:
            title = (entry.findtext("a:title", default="", namespaces=ns) or "").strip()
            link_el = entry.find("a:link", ns)
            href = link_el.get("href") if link_el is not None else None
            updated = entry.findtext("a:updated", default="", namespaces=ns) or datetime.now(timezone.utc).isoformat()
            summary = entry.findtext("a:summary", default="", namespaces=ns) or title
            company_guess = title.split(" - ")[0].strip() if " - " in title else title[:80]
            signals.append(
                NormalizedSignal(
                    id=_sid("edgar", title, updated),
                    source=self.name,
                    signal_type="regulatory_filing",
                    title=title[:200],
                    summary=(summary or "")[:500],
                    url=href,
                    observed_at=updated[:10],
                    company_name=company_guess[:120],
                    raw={"title": title},
                )
            )
        return signals

    def _fallback_demo_signals(self, reason: str) -> list[NormalizedSignal]:
        """Keep demo resilient offline — clearly labeled."""
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return [
            NormalizedSignal(
                id=_sid("edgar_fallback", reason, now),
                source=self.name,
                signal_type="regulatory_filing",
                title="[Demo fallback] Form D activity sample — live EDGAR unavailable",
                summary=f"Offline/demo Form D placeholder. Reason: {reason[:120]}",
                url="https://www.sec.gov/edgar/searchedgar/companysearch",
                observed_at=now,
                company_name=None,
                raw={"fallback": True, "reason": reason},
            )
        ]


class HackerNewsAdapter(SourceAdapter):
    name = "hackernews"

    def __init__(self, queries: Optional[list[str]] = None, max_hits: int = 10):
        self.queries = queries or ["AI startup funding", "cybersecurity", "robotics"]
        self.max_hits = max_hits

    def fetch(self) -> list[NormalizedSignal]:
        signals: list[NormalizedSignal] = []
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                for q in self.queries[:3]:
                    r = client.get(
                        "https://hn.algolia.com/api/v1/search",
                        params={"query": q, "tags": "story", "hitsPerPage": 5},
                    )
                    if r.status_code != 200:
                        continue
                    data = r.json()
                    for hit in data.get("hits", [])[:5]:
                        title = hit.get("title") or ""
                        object_id = str(hit.get("objectID"))
                        url = hit.get("url") or f"https://news.ycombinator.com/item?id={object_id}"
                        ts = hit.get("created_at") or datetime.now(timezone.utc).isoformat()
                        signals.append(
                            NormalizedSignal(
                                id=_sid("hn", object_id),
                                source=self.name,
                                signal_type="commentary",
                                title=title[:200],
                                summary=f"HN score {hit.get('points')} · {hit.get('num_comments')} comments · query={q}",
                                url=url,
                                observed_at=ts[:10],
                                company_name=None,
                                raw=hit,
                            )
                        )
        except Exception as exc:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            return [
                NormalizedSignal(
                    id=_sid("hn_fallback", str(exc), now),
                    source=self.name,
                    signal_type="commentary",
                    title="[Demo fallback] HN feed unavailable",
                    summary=str(exc)[:200],
                    url="https://news.ycombinator.com/",
                    observed_at=now,
                    raw={"fallback": True},
                )
            ]
        return signals[: self.max_hits]


class RSSAdapter(SourceAdapter):
    name = "rss"

    def __init__(self, feeds: list[dict[str, str]], max_per_feed: int = 5):
        self.feeds = feeds
        self.max_per_feed = max_per_feed

    def fetch(self) -> list[NormalizedSignal]:
        signals: list[NormalizedSignal] = []
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                for feed in self.feeds:
                    try:
                        r = client.get(feed["url"])
                        if r.status_code != 200:
                            continue
                        signals.extend(self._parse_rss(r.text, feed.get("name", "rss")))
                    except Exception:
                        continue
        except Exception as exc:
            now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            return [
                NormalizedSignal(
                    id=_sid("rss_fallback", str(exc), now),
                    source=self.name,
                    signal_type="news",
                    title="[Demo fallback] RSS unavailable",
                    summary=str(exc)[:200],
                    observed_at=now,
                    raw={"fallback": True},
                )
            ]
        return signals

    def _parse_rss(self, text: str, source_name: str) -> list[NormalizedSignal]:
        out: list[NormalizedSignal] = []
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            return out
        items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
        for item in items[: self.max_per_feed]:
            title = (item.findtext("title") or item.findtext("{http://www.w3.org/2005/Atom}title") or "").strip()
            link = item.findtext("link") or ""
            if not link:
                link_el = item.find("{http://www.w3.org/2005/Atom}link")
                if link_el is not None:
                    link = link_el.get("href") or ""
            pub = (
                item.findtext("pubDate")
                or item.findtext("{http://www.w3.org/2005/Atom}updated")
                or datetime.now(timezone.utc).isoformat()
            )
            desc = item.findtext("description") or item.findtext("{http://www.w3.org/2005/Atom}summary") or title
            out.append(
                NormalizedSignal(
                    id=_sid("rss", source_name, title),
                    source=f"rss:{source_name}",
                    signal_type="news",
                    title=title[:200],
                    summary=(ET.tostring(item, encoding="unicode") and re_strip(desc))[:400],
                    url=link or None,
                    observed_at=pub[:10] if len(pub) >= 10 and pub[4] == "-" else datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    raw={"feed": source_name},
                )
            )
        return out


def re_strip(htmlish: str) -> str:
    import re

    return re.sub(r"<[^>]+>", "", htmlish or "").strip()

"""Promote live market signals into pipeline companies + curated news.

MVP discovery does not call paid deal databases. It:
- Matches live EDGAR / HN / RSS / arXiv signals against thesis keywords
- Updates existing companies when their name appears
- Creates capped Watchlist skeletons for novel thesis-matching names
- Turns thesis-relevant RSS/HN items into News Worth Reading candidates
"""

from __future__ import annotations

import hashlib
import re
from typing import Any, Optional

from src.ingest.dedupe import find_duplicate, normalize_name

NOISE_NAME = re.compile(
    r"\b(form\s*d|sec\.gov|filing|llc|inc\.?|corp\.?|ltd\.?|demo fallback|placeholder)\b",
    re.I,
)
FUNDING_HINT = re.compile(
    r"\b(rais(ed|es|ing)|funding|series\s+[a-f]|seed\s+round|venture|backed|invests?|launches?)\b",
    re.I,
)
THEME_STOPWORDS = {
    "nuclear",
    "energy",
    "robotics",
    "defense",
    "defence",
    "cyber",
    "security",
    "fintech",
    "crypto",
    "biotech",
    "healthcare",
    "infrastructure",
    "artificial",
    "intelligence",
    "startup",
    "startups",
    "venture",
    "capital",
    "market",
    "markets",
    "data",
    "center",
    "centers",
    "cloud",
    "agent",
    "agents",
    "model",
    "models",
    "training",
    "inference",
    "power",
    "grid",
    "space",
    "drone",
    "voice",
    "audio",
    "multimodal",
}


def _sid(prefix: str, *parts: str) -> str:
    h = hashlib.sha1("|".join(parts).encode()).hexdigest()[:10]
    return f"{prefix}_{h}"


def _theme_keyword_map(policy: dict[str, Any]) -> list[tuple[dict[str, Any], list[str]]]:
    out: list[tuple[dict[str, Any], list[str]]] = []
    for theme in policy.get("themes") or []:
        kws: list[str] = []
        name = (theme.get("name") or "").lower()
        kws.extend([w for w in re.split(r"[^a-z0-9]+", name) if len(w) > 3])
        for sub in theme.get("subsectors") or []:
            kws.extend([w for w in re.split(r"[^a-z0-9]+", sub.lower()) if len(w) > 3])
        # High-signal extras per theme id
        extras = {
            "ai_infra": ["inference", "gpu", "llm", "vector", "eval", "synthetic"],
            "cybersecurity": ["cyber", "identity", "soc", "zerotrust", "security"],
            "defence": ["defense", "defence", "drone", "uas", "c4isr", "satellite"],
            "robotics": ["robot", "humanoid", "automation", "warehouse"],
            "energy": ["nuclear", "grid", "power", "energy"],
            "fintech": ["fintech", "payments", "banking", "crypto", "trading"],
            "biotech": ["biotech", "genomics", "clinical", "drug"],
            "voice_multimodal": ["voice", "speech", "multimodal", "audio"],
            "materials": ["materials", "semiconductor", "chemical"],
            "ai_native_stack": ["orchestration", "agent", "devtools", "fine-tun"],
            "ai_copilots": ["copilot", "saas"],
            "ai_manufacturing": ["manufacturing", "industrial"],
        }.get(theme.get("id") or "", [])
        kws.extend(extras)
        # dedupe preserve order
        seen: set[str] = set()
        uniq = []
        for k in kws:
            if k not in seen and len(k) > 2:
                seen.add(k)
                uniq.append(k)
        out.append((theme, uniq))
    return out


def match_theme(blob: str, policy: dict[str, Any]) -> Optional[dict[str, Any]]:
    text = (blob or "").lower()
    best: Optional[tuple[int, dict[str, Any], str]] = None
    for theme, kws in _theme_keyword_map(policy):
        hits = [k for k in kws if k in text]
        if not hits:
            continue
        score = len(hits)
        # Prefer longer keyword hits
        score += sum(1 for k in hits if len(k) >= 6)
        if best is None or score > best[0]:
            best = (score, theme, hits[0])
    if not best:
        return None
    theme = best[1]
    sub = best[2]
    subs = theme.get("subsectors") or [sub]
    return {
        "theme_id": theme.get("id"),
        "sector_theme": theme.get("name"),
        "subsector": subs[0] if subs else sub,
    }


def _clean_company_name(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    name = re.sub(r"\s+", " ", raw).strip(" -–—|·")
    name = re.split(r"\s[-–—|·]\s", name)[0].strip()
    name = re.sub(r"\b(Inc\.?|LLC|Ltd\.?|Corp\.?)\b", "", name, flags=re.I).strip(" ,.")
    if len(name) < 2 or len(name) > 64:
        return None
    if NOISE_NAME.search(name) and not FUNDING_HINT.search(name):
        # Form D titles often include LLC — allow if alphabetic startup-like
        letters = re.sub(r"[^a-zA-Z]", "", name)
        if len(letters) < 4:
            return None
    # Reject generic titles and bare theme words
    low = name.lower()
    if low in {"hacker news", "techcrunch", "arxiv", "untitled", "demo"}:
        return None
    tokens = [t for t in re.split(r"\s+", low) if t]
    if len(tokens) == 1 and tokens[0] in THEME_STOPWORDS:
        return None
    if all(t in THEME_STOPWORDS for t in tokens):
        return None
    return name


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:48] or "company"


def apply_live_signals_to_companies(
    companies: list[dict[str, Any]],
    live_signals: list[dict[str, Any]],
    policy: dict[str, Any],
    max_new: int = 8,
) -> tuple[list[dict[str, Any]], int]:
    """Update last_signal on matches; create Watch skeletons for novel thesis hits."""
    out = list(companies)
    added = 0
    for sig in live_signals:
        title = sig.get("title") or ""
        summary = sig.get("summary") or ""
        blob = f"{title} {summary}"
        theme = match_theme(blob, policy)
        if not theme:
            continue

        name = _clean_company_name(sig.get("company_name"))
        if not name:
            # Only invent a name from the title when funding language is present
            if FUNDING_HINT.search(blob):
                m = re.search(
                    r"\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b(?:\s+(?:raises|raised|raises|launches|lands|closes))",
                    title,
                )
                if not m:
                    m = re.search(r"\b([A-Z][A-Za-z0-9]{2,})\b\s+(?:raises|raised|launches)", title)
                name = _clean_company_name(m.group(1) if m else None)
        if not name:
            continue

        existing = find_duplicate(out, {"name": name, "slug": _slugify(name)})
        observed = (sig.get("observed_at") or "")[:10]
        source = sig.get("source") or "live"

        if existing:
            if observed and (not existing.get("last_signal_date") or observed > str(existing.get("last_signal_date"))):
                existing["last_signal_date"] = observed
            existing["sources"] = list(dict.fromkeys((existing.get("sources") or []) + [source]))
            continue

        if added >= max_new:
            continue
        st = (sig.get("signal_type") or "").lower()
        # Form D / regulatory alone is noisy — require funding language in the title/summary
        if st in ("regulatory_filing",) and not FUNDING_HINT.search(blob):
            continue

        cid = _sid("live", normalize_name(name))
        skeleton = {
            "id": cid,
            "name": name,
            "slug": _slugify(name),
            "domain": None,
            "one_liner": (summary or title)[:180] or f"Live-discovered signal in {theme['sector_theme']}",
            "sector_theme": theme["sector_theme"],
            "theme_id": theme["theme_id"],
            "subsector": theme["subsector"],
            "stage": "Seed",
            "pipeline_bucket": (
                "dominant_tech_growth"
                if theme["theme_id"]
                in ("ai_infra", "cybersecurity", "defence", "robotics", "ai_native_stack", "energy")
                else "tactical_sector_agnostic"
            ),
            "last_round_size_m": None,
            "last_round_date": observed or None,
            "valuation_est_m": None,
            "valuation_confidence": "unknown",
            "lead_investor": None,
            "investors": [],
            "headcount": None,
            "headcount_6m_growth_pct": None,
            "yoy_growth_pct": None,
            "runway_months_est": None,
            "tam_usd_b": None,
            "moat_notes": "Live discovery — moat unverified; requires partner diligence.",
            "team_notes": "Team not yet verified from public signal.",
            "traction_notes": (summary or title)[:220],
            "last_signal_date": observed or None,
            "sources": [source, "live_discovery"],
            "brief_id": f"brief_{cid}",
            "discovery_origin": {
                "signal_id": sig.get("id"),
                "signal_type": sig.get("signal_type"),
                "url": sig.get("url"),
            },
        }
        out.append(skeleton)
        added += 1
    return out, added


def curate_news_from_signals(
    existing_news: list[dict[str, Any]],
    live_signals: list[dict[str, Any]],
    policy: dict[str, Any],
    max_new: int = 5,
) -> list[dict[str, Any]]:
    """Append thesis-relevant RSS/HN items as News Worth Reading with Thirdbase rationale."""
    news = list(existing_news)
    seen_titles = {normalize_name(n.get("title") or "") for n in news}
    added = 0
    for sig in live_signals:
        if added >= max_new:
            break
        source = (sig.get("source") or "").lower()
        st = (sig.get("signal_type") or "").lower()
        is_newsish = (
            source.startswith("rss")
            or source in ("hackernews", "hacker_news", "hn")
            or st in ("news", "commentary")
        )
        if not is_newsish or "edgar" in source or "arxiv" in source:
            continue
        title = sig.get("title") or ""
        if not title or normalize_name(title) in seen_titles:
            continue
        if title.lower().startswith("[demo fallback]"):
            continue
        theme = match_theme(f"{title} {sig.get('summary') or ''}", policy)
        if not theme:
            continue
        nid = _sid("n", title)
        news.append(
            {
                "id": nid,
                "title": title[:200],
                "source": sig.get("source") or "live",
                "url": sig.get("url"),
                "published_at": (sig.get("observed_at") or "")[:10],
                "why_it_matters": (
                    f"Live signal maps to Thirdbase theme {theme['sector_theme']} "
                    f"({theme['subsector']}) — worth a 2-minute partner skim."
                ),
                "related_themes": [theme["sector_theme"]],
            }
        )
        seen_titles.add(normalize_name(title))
        added += 1
    return news


def enrich_sector_evidence(
    sector_calls: list[dict[str, Any]],
    live_signals: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Append live evidence snippets onto existing Sector of Tomorrow calls."""
    out = []
    for sc in sector_calls:
        sc = {**sc, "evidence": list(sc.get("evidence") or [])}
        sub = (sc.get("subsector") or "").lower()
        parent = (sc.get("parent_theme") or "").lower()
        tokens = [t for t in re.split(r"[^a-z0-9]+", f"{sub} {parent}") if len(t) > 3][:6]
        for sig in live_signals:
            blob = f"{sig.get('title') or ''} {sig.get('summary') or ''}".lower()
            if tokens and any(t in blob for t in tokens):
                bit = f"Live {(sig.get('source') or 'signal')}: {(sig.get('title') or '')[:90]}"
                if bit not in sc["evidence"]:
                    sc["evidence"] = (sc["evidence"] + [bit])[:8]
                    # Slight heat bump for live corroboration
                    sc["heat_score"] = min(99, int(sc.get("heat_score") or 70) + 1)
        out.append(sc)
    return out

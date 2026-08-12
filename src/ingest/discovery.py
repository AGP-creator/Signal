"""Promote live market signals into pipeline companies + curated news.

Self-maintaining discovery:
- Matches live EDGAR / HN / RSS / arXiv signals against thesis keywords
- Updates existing companies when new info arrives (round, headcount, investors, commentary)
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
ROUND_SIZE_RE = re.compile(
    r"(?:raised|raises|raising|closed|closes|announces?)\s+(?:a\s+)?(?:\$|USD\s*)?(\d+(?:\.\d+)?)\s*(m|mm|million|b|bn|billion)\b"
    r"|\$\s*(\d+(?:\.\d+)?)\s*(m|mm|million|b|bn|billion)\b",
    re.I,
)
STAGE_RE = re.compile(
    r"\b(pre-?seed|seed|series\s+[a-f]|series\s+[a-f]\+|growth)\s*(?:round|funding)?\b",
    re.I,
)
HEADCOUNT_RE = re.compile(
    r"\b(\d{1,5})\s*(?:employees|headcount|people|staff)\b"
    r"|\bheadcount(?:\s+(?:of|at|hits?|reaches?))?\s+(\d{1,5})\b",
    re.I,
)
HC_GROWTH_RE = re.compile(
    r"\b(\d{1,3})\s*%\s*(?:headcount|hc|team|workforce)\s*(?:growth|increase)?\b"
    r"|\b(?:headcount|team)\s+(?:grew|up|growth)\s+(\d{1,3})\s*%\b",
    re.I,
)
LED_BY_RE = re.compile(
    r"\bled\s+by\s+([A-Z][A-Za-z0-9&.\-']+(?:\s+[A-Z][A-Za-z0-9&.\-']+){0,4})",
)
BACKED_BY_RE = re.compile(
    r"\b(?:backed by|investors?(?:\s+include)?|with participation from)\s+"
    r"([A-Z][A-Za-z0-9&.\-']+(?:\s+(?:[A-Z][A-Za-z0-9&.\-']+|and|,)){0,12})",
)
COMMENTARY_HINT = re.compile(
    r"\b(says?|said|writes?|wrote|believes?|thesis|memo|partner\s+note|commentary)\b",
    re.I,
)
FIRM_TRAILING_STOP = {
    "now",
    "with",
    "for",
    "in",
    "to",
    "on",
    "at",
    "as",
    "the",
    "a",
    "an",
    "inference",
    "startup",
    "startups",
    "company",
    "companies",
    "raises",
    "raised",
    "announces",
    "announced",
    "closes",
    "closed",
    "launches",
    "launched",
    "building",
    "edge",
    "gpu",
    "ai",
}
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


def _money_to_millions(amount: str, unit: str) -> float:
    n = float(amount)
    u = (unit or "m").lower()
    if u.startswith("b"):
        return n * 1000.0
    return n


def _normalize_stage(raw: str) -> str:
    s = re.sub(r"\s+", " ", raw.strip().lower())
    if "pre" in s and "seed" in s:
        return "Pre-Seed"
    if s.startswith("seed"):
        return "Seed"
    m = re.search(r"series\s+([a-f])", s)
    if m:
        return f"Series {m.group(1).upper()}"
    if "growth" in s:
        return "Growth"
    return raw.strip().title()


def _clean_firm_name(raw: str) -> Optional[str]:
    if not raw:
        return None
    tokens: list[str] = []
    for t in re.split(r"\s+", raw.strip(" ,.")):
        if not t:
            continue
        if t.lower() in FIRM_TRAILING_STOP:
            break
        if t in {",", "and"}:
            break
        tokens.append(t.strip(" ,."))
    name = " ".join(tokens).strip(" ,.")
    if len(name) < 2 or len(name) > 64:
        return None
    return name


def extract_structured_updates(blob: str, observed: Optional[str] = None) -> dict[str, Any]:
    """Parse round / stage / headcount / investors from a signal blob."""
    updates: dict[str, Any] = {}
    m = ROUND_SIZE_RE.search(blob or "")
    if m:
        amt = m.group(1) or m.group(3)
        unit = m.group(2) or m.group(4) or "m"
        if amt:
            updates["last_round_size_m"] = _money_to_millions(amt, unit)
            if observed:
                updates["last_round_date"] = observed[:10]

    sm = STAGE_RE.search(blob or "")
    if sm:
        updates["stage"] = _normalize_stage(sm.group(1))

    hm = HEADCOUNT_RE.search(blob or "")
    if hm:
        n = hm.group(1) or hm.group(2)
        if n:
            updates["headcount"] = int(n)

    hg = HC_GROWTH_RE.search(blob or "")
    if hg:
        n = hg.group(1) or hg.group(2)
        if n:
            updates["headcount_6m_growth_pct"] = float(n)

    lead = LED_BY_RE.search(blob or "")
    if lead:
        firm = _clean_firm_name(lead.group(1))
        if firm:
            updates["lead_investor"] = firm
            updates["investors"] = [firm]

    backed = BACKED_BY_RE.search(blob or "")
    if backed:
        chunk = backed.group(1)
        names = []
        for p in re.split(r"\s+and\s+|,\s*", chunk):
            cleaned = _clean_firm_name(p)
            if cleaned:
                names.append(cleaned)
        if names:
            inv = list(updates.get("investors") or [])
            for n in names[:6]:
                if n not in inv:
                    inv.append(n)
            updates["investors"] = inv
            if not updates.get("lead_investor") and names:
                updates["lead_investor"] = names[0]
    return updates


def _apply_updates_to_company(
    company: dict[str, Any],
    updates: dict[str, Any],
    *,
    observed: Optional[str],
    source: str,
    signal_id: Optional[str],
) -> list[str]:
    """Mutate company with structured updates; return list of changed field names."""
    changed: list[str] = []
    for key, value in updates.items():
        if value is None or value == "" or value == []:
            continue
        if key == "investors":
            merged = list(dict.fromkeys((company.get("investors") or []) + list(value)))
            if merged != (company.get("investors") or []):
                company["investors"] = merged
                changed.append("investors")
            continue
        if key == "last_round_date":
            prev = str(company.get("last_round_date") or "")
            if not prev or str(value) >= prev:
                if company.get(key) != value:
                    company[key] = value
                    changed.append(key)
            continue
        if key == "last_round_size_m":
            # Prefer newer round when date advanced or size previously missing
            prev_date = str(company.get("last_round_date") or "")
            if company.get(key) is None or (observed and observed[:10] >= prev_date):
                if company.get(key) != value:
                    company[key] = value
                    changed.append(key)
            continue
        if company.get(key) != value:
            company[key] = value
            changed.append(key)

    if changed:
        events = list(company.get("update_events") or [])
        events.append(
            {
                "at": observed,
                "source": source,
                "signal_id": signal_id,
                "fields": changed,
            }
        )
        company["update_events"] = events[-20:]
        # Fresh signal clears pending stale flag; partner archive/keep handled later
        if (company.get("review_status") or "") == "Pending Partner Review":
            company["review_status"] = None
        company["is_stale"] = False
    return changed


def _commentary_from_signal(
    sig: dict[str, Any],
    company: dict[str, Any],
) -> Optional[dict[str, Any]]:
    st = (sig.get("signal_type") or "").lower()
    source = sig.get("source") or "live"
    blob = f"{sig.get('title') or ''} {sig.get('summary') or ''}"
    is_commentary = st in ("commentary", "investor_commentary") or (
        COMMENTARY_HINT.search(blob) and ("partner" in blob.lower() or "investor" in blob.lower() or "thesis" in blob.lower())
    )
    if not is_commentary:
        return None
    quote = (sig.get("summary") or sig.get("title") or "").strip()
    if len(quote) < 20:
        return None
    return {
        "id": _sid("cm", str(sig.get("id") or quote[:40])),
        "company_id": company.get("id"),
        "company_name": company.get("name"),
        "source": source,
        "quote_or_summary": quote[:500],
        "sentiment": "neutral",
        "credibility_tier": "live_signal",
        "captured_at": (sig.get("observed_at") or "")[:10],
    }


def apply_live_signals_to_companies(
    companies: list[dict[str, Any]],
    live_signals: list[dict[str, Any]],
    policy: dict[str, Any],
    max_new: int = 8,
) -> tuple[list[dict[str, Any]], int, list[dict[str, Any]]]:
    """Add/update companies from live signals; return (companies, added, new_commentary)."""
    out = list(companies)
    added = 0
    commentary: list[dict[str, Any]] = []
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
        structured = extract_structured_updates(blob, observed)

        if existing:
            if observed and (not existing.get("last_signal_date") or observed > str(existing.get("last_signal_date"))):
                existing["last_signal_date"] = observed
            existing["sources"] = list(dict.fromkeys((existing.get("sources") or []) + [source]))
            _apply_updates_to_company(
                existing,
                structured,
                observed=observed,
                source=source,
                signal_id=sig.get("id"),
            )
            if structured.get("investors") or summary:
                # Keep a short rolling note of what changed
                bit = (summary or title)[:220]
                if bit and bit not in (existing.get("traction_notes") or ""):
                    existing["traction_notes"] = bit
            cm = _commentary_from_signal(sig, existing)
            if cm:
                commentary.append(cm)
            continue

        if added >= max_new:
            continue
        st = (sig.get("signal_type") or "").lower()
        # Form D / regulatory alone is noisy — require funding language in the title/summary
        if st in ("regulatory_filing",) and not FUNDING_HINT.search(blob):
            continue

        cid = _sid("live", normalize_name(name))
        stage = structured.get("stage") or "Seed"
        skeleton = {
            "id": cid,
            "name": name,
            "slug": _slugify(name),
            "domain": None,
            "one_liner": (summary or title)[:180] or f"Live-discovered signal in {theme['sector_theme']}",
            "sector_theme": theme["sector_theme"],
            "theme_id": theme["theme_id"],
            "subsector": theme["subsector"],
            "stage": stage,
            "pipeline_bucket": (
                "dominant_tech_growth"
                if theme["theme_id"]
                in ("ai_infra", "cybersecurity", "defence", "robotics", "ai_native_stack", "energy")
                else "tactical_sector_agnostic"
            ),
            "last_round_size_m": structured.get("last_round_size_m"),
            "last_round_date": structured.get("last_round_date") or observed or None,
            "valuation_est_m": None,
            "valuation_confidence": "unknown",
            "lead_investor": structured.get("lead_investor"),
            "investors": list(structured.get("investors") or []),
            "headcount": structured.get("headcount"),
            "headcount_6m_growth_pct": structured.get("headcount_6m_growth_pct"),
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
            "update_events": [],
        }
        if structured:
            _apply_updates_to_company(
                skeleton,
                structured,
                observed=observed,
                source=source,
                signal_id=sig.get("id"),
            )
        out.append(skeleton)
        added += 1
        cm = _commentary_from_signal(sig, skeleton)
        if cm:
            commentary.append(cm)
    return out, added, commentary


def classify_news_kind(title: str = "", source: str = "", summary: str = "") -> str:
    """earnings | regulatory | essay | contrarian | geopolitical | market"""
    blob = f"{title} {source} {summary}"
    patterns = (
        ("earnings", r"\b(earnings|capex|guidance|read[- ]?through|10[- ]?q|10[- ]?k|hyperscaler)\b"),
        ("regulatory", r"\b(regulat|sec\b|form\s*d|attestation|compliance|eu cyber|doj|ftc|antitrust|budget signal)\b"),
        ("contrarian", r"\b(contrarian|most .+ will fail|skeptic|overhyped|against the grain)\b"),
        ("geopolitical", r"\b(geopolitic|dod\b|defence|defense|china|taiwan|sanction|war|nato|export control)\b"),
        ("essay", r"\b(why |essay|framework|deep dive|long[- ]?form|thesis|playbook)\b"),
    )
    for kind, pat in patterns:
        if re.search(pat, blob, re.I):
            return kind
    if re.search(r"stratechery|generalist|not boring|newcomer|the information", source or "", re.I):
        return "essay"
    return "market"


def _pipeline_names_for_theme(
    sector_theme: str,
    companies: list[dict[str, Any]],
    limit: int = 3,
) -> list[str]:
    key = (sector_theme or "").lower()
    if not key:
        return []
    names: list[str] = []
    for c in companies:
        theme = (c.get("sector_theme") or "").lower()
        if theme == key or key in theme or theme in key:
            name = c.get("name")
            if name and name not in names:
                names.append(name)
            if len(names) >= limit:
                break
    return names


def why_it_matters_line(
    *,
    kind: str,
    theme: dict[str, Any],
    companies: Optional[list[dict[str, Any]]] = None,
) -> str:
    """One-line Thirdbase-specific rationale for News Worth Reading."""
    sector = theme.get("sector_theme") or "thesis themes"
    sub = theme.get("subsector") or ""
    names = _pipeline_names_for_theme(sector, companies or [])
    book = f" — maps to {', '.join(names)} in the book" if names else ""
    focus = f"{sector}" + (f" ({sub})" if sub else "")

    leads = {
        "earnings": f"Earnings/read-through for Thirdbase {focus}{book}; check demand durability before IC.",
        "regulatory": f"Regulatory shift on {focus}{book}; may change moat and timing assumptions.",
        "contrarian": f"Contrarian take on {focus}{book}; stress-tests Pass/Watch discipline.",
        "geopolitical": f"Geopolitical / budget signal for {focus}{book}; could move dual-use and infra timing.",
        "essay": f"Long-form framing for Thirdbase {focus}{book}; sharpens how we talk about the category.",
        "market": f"Sector context for Thirdbase {focus}{book}; worth a two-minute partner skim.",
    }
    return leads.get(kind, leads["market"])


def curate_news_from_signals(
    existing_news: list[dict[str, Any]],
    live_signals: list[dict[str, Any]],
    policy: dict[str, Any],
    max_new: int = 5,
    companies: Optional[list[dict[str, Any]]] = None,
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
        summary = sig.get("summary") or ""
        theme = match_theme(f"{title} {summary}", policy)
        if not theme:
            continue
        kind = classify_news_kind(title, sig.get("source") or "", summary)
        nid = _sid("n", title)
        news.append(
            {
                "id": nid,
                "title": title[:200],
                "source": sig.get("source") or "live",
                "url": sig.get("url"),
                "published_at": (sig.get("observed_at") or "")[:10],
                "why_it_matters": why_it_matters_line(
                    kind=kind, theme=theme, companies=companies
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

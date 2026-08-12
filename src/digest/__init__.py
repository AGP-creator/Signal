from __future__ import annotations

import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml
from dotenv import load_dotenv

from src.ingest.discovery import classify_news_kind

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_APP_BASE = "http://localhost:3000"


def _app_base(explicit: Optional[str] = None) -> str:
    if explicit:
        return explicit.rstrip("/")
    load_dotenv(ROOT / ".env")
    load_dotenv(ROOT / "env.txt")
    return (
        os.getenv("SIGNAL_APP_BASE")
        or os.getenv("APP_BASE_URL")
        or DEFAULT_APP_BASE
    ).rstrip("/")


def _load_watchlists() -> dict[str, Any]:
    path = ROOT / "config" / "watchlists.yaml"
    if not path.exists():
        return {"gp_watchlist": [], "watched_operators": []}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {
        "gp_watchlist": list(data.get("gp_watchlist") or []),
        "watched_operators": list(data.get("watched_operators") or []),
    }


def _load_gp_watchlist() -> list[dict[str, Any]]:
    return list(_load_watchlists().get("gp_watchlist") or [])


# Special routing — email immediately, never wait for M/W/F digest
IMMEDIATE_ALERT_TYPES = frozenset(
    {
        "tier1_density",
        "off_thesis_peer_move",
        "watched_founder_newco",
    }
)

_NEWCO_KEYWORDS = (
    "founder",
    "newco",
    "stealth",
    "spin up",
    "launching",
    "starting",
    "starting a",
    "new company",
)


def _brief_url(company: dict[str, Any], app_base: str) -> str:
    slug = company.get("slug") or company.get("id") or ""
    return f"{app_base}/company/{slug}"


def _workbook_url(app_base: str) -> str:
    return f"{app_base}/api/workbook"


def _digest_url(app_base: str) -> str:
    return f"{app_base}/digest"


def _clause(text: Any) -> str:
    raw = str(text or "").strip()
    if not raw:
        return ""
    cleaned = raw.replace("..", ".")
    while ".." in cleaned:
        cleaned = cleaned.replace("..", ".")
    return cleaned.rstrip(".;,: ").strip()


def _deal_summary(c: dict[str, Any]) -> str:
    """One clean paragraph for email — prefer one_liner, else first why_now sentence."""
    one = _clause(c.get("one_liner"))
    if one:
        return one
    why = _clause(c.get("why_now"))
    if why:
        cut = why.split(". ")[0].rstrip(".")
        return cut
    bits = [c.get("subsector") or c.get("sector_theme"), c.get("stage")]
    return " · ".join(str(b) for b in bits if b)


def _rationale_paragraph(c: dict[str, Any]) -> str:
    """Partner-facing one-paragraph rationale for digest cards."""
    summary = _deal_summary(c)
    bits: list[str] = []
    team = _clause(c.get("team_notes"))
    if team:
        bits.append(f"Team: {team}")
    t1 = c.get("tier1_count") or 0
    names = list(c.get("tier1_names") or [])[:3]
    if t1:
        label = f"{t1} Tier-1"
        if names:
            label += f" ({', '.join(names)})"
        bits.append(f"Cap table: {label}")
    lead = c.get("lead_investor")
    if lead:
        bits.append(f"Lead {lead}")
    traction = _clause(c.get("traction_notes"))
    growth = c.get("yoy_growth_pct")
    if traction or growth is not None:
        t = traction or "Traction building"
        if growth is not None:
            t = f"{t.rstrip('.')} ({growth:.0f}% YoY)"
        bits.append(t)
    moat = _clause(c.get("moat_notes"))
    if moat:
        bits.append(f"Moat: {moat}")
    if bits:
        return f"{summary}. {' · '.join(bits)}."
    return summary


_CREDIBLE_SOURCE = re.compile(
    r"stratechery|the information|newcomer|not boring|generalist|bloomberg|"
    r"reuters|\bft\b|financial times|axios|wsj|economist|foreign affairs|arxiv",
    re.I,
)


def _news_score(n: dict[str, Any], as_of: date) -> tuple[float, str]:
    """Higher is better. Returns (score, kind)."""
    title = n.get("title") or ""
    source = n.get("source") or ""
    why = n.get("why_it_matters") or ""
    kind = n.get("kind") or classify_news_kind(title, source, why)
    score = 0.0
    if _CREDIBLE_SOURCE.search(source):
        score += 18
    else:
        score += 6
    pub = (n.get("published_at") or "")[:10]
    if pub:
        try:
            d = date.fromisoformat(pub)
            days = (as_of - d).days
            if days <= 3:
                score += 20
            elif days <= 10:
                score += 14
            elif days <= 21:
                score += 8
            elif days <= 45:
                score += 4
            else:
                score += 1
        except ValueError:
            score += 4
    else:
        score += 4
    if re.search(r"live signal maps to thirdbase theme|2-minute partner skim", why, re.I):
        score += 4
    else:
        score += 10
        if re.search(r"thirdbase|pipeline|thesis|deep dive|watch|\bic\b", why, re.I):
            score += 8
        if 40 <= len(why) <= 220:
            score += 6
    themes = n.get("related_themes") or []
    score += min(12, len(themes) * 4)
    if kind in ("regulatory", "earnings", "contrarian"):
        score += 3
    elif kind in ("essay", "geopolitical"):
        score += 2
    return score, kind


def select_news_for_digest(
    news: list[dict[str, Any]],
    *,
    news_limit: int = 5,
    as_of: Optional[date] = None,
) -> list[dict[str, Any]]:
    """Curate 3–5 News Worth Reading items with kind diversity."""
    as_of = as_of or date.today()
    cap = max(3, min(5, news_limit))
    scored: list[tuple[float, str, dict[str, Any]]] = []
    for n in news:
        if not (n.get("title") or "").strip():
            continue
        score, kind = _news_score(n, as_of)
        scored.append((score, kind, n))
    scored.sort(key=lambda x: -x[0])

    picked: list[tuple[float, str, dict[str, Any]]] = []
    seen_kinds: set[str] = set()
    for row in scored:
        if len(picked) >= cap:
            break
        if row[1] in seen_kinds:
            continue
        picked.append(row)
        seen_kinds.add(row[1])
    for row in scored:
        if len(picked) >= cap:
            break
        if any(p[2] is row[2] or p[2].get("id") == row[2].get("id") for p in picked):
            continue
        picked.append(row)
    return [p[2] for p in picked[:cap]]


def build_digest(
    companies: list[dict[str, Any]],
    sector_calls: list[dict[str, Any]],
    news: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    as_of: Optional[date] = None,
    app_base: Optional[str] = None,
    *,
    deal_limit: int = 5,
    news_limit: int = 5,
    sector_limit: int = 2,
    peer_limit: int = 5,
    day_label: Optional[str] = None,
    since_label: Optional[str] = None,
) -> dict[str, Any]:
    as_of = as_of or date.today()
    base = _app_base(app_base)
    workbook = _workbook_url(base)
    digest_page = _digest_url(base)
    deal_cap = max(3, min(5, deal_limit))

    hot = [
        c
        for c in sorted(companies, key=lambda x: -(x.get("thesis_score") or 0))
        if c.get("recommendation") == "Deep Dive"
    ][:deal_cap]
    if len(hot) < 3:
        extra = [
            c
            for c in sorted(companies, key=lambda x: -(x.get("thesis_score") or 0))
            if c not in hot
        ]
        hot = (hot + extra)[:deal_cap]

    deals = []
    for c in hot:
        score = c.get("thesis_score")
        deals.append(
            {
                "name": c["name"],
                "score": score,
                "recommendation": c.get("recommendation"),
                "rationale": _rationale_paragraph(c),
                "why_now": _clause(c.get("why_now")),
                "one_liner": _clause(c.get("one_liner")),
                "brief_id": c.get("brief_id"),
                "brief_url": _brief_url(c, base),
                "slug": c.get("slug"),
                "sector": c.get("sector_theme"),
                "subsector": c.get("subsector"),
                "stage": c.get("stage"),
                "team_notes": _clause(c.get("team_notes")),
                "traction_notes": _clause(c.get("traction_notes")),
                "moat_notes": _clause(c.get("moat_notes")),
                "lead_investor": c.get("lead_investor"),
                "tier1_count": c.get("tier1_count"),
                "tier1_names": c.get("tier1_names") or [],
                "yoy_growth_pct": c.get("yoy_growth_pct"),
                "valuation_est_m": c.get("valuation_est_m"),
                "valuation_confidence": c.get("valuation_confidence"),
            }
        )
    sectors = [
        {
            "subsector": s.get("subsector"),
            "consensus_level": s.get("consensus_level"),
            "why": _clause(s.get("why_thirdbase_cares")),
            "top_companies": s.get("top_companies"),
            "parent_theme": s.get("parent_theme"),
        }
        for s in sorted(sector_calls, key=lambda x: -(x.get("heat_score") or 0))[:sector_limit]
    ]
    news_cap = max(3, min(5, news_limit))
    curated_news = select_news_for_digest(news, news_limit=news_cap, as_of=as_of)
    news_items = []
    for n in curated_news:
        kind = n.get("kind") or classify_news_kind(
            n.get("title") or "", n.get("source") or "", n.get("why_it_matters") or ""
        )
        news_items.append(
            {
                "title": n.get("title"),
                "source": n.get("source"),
                "why": _clause(n.get("why_it_matters")),
                "url": n.get("url"),
                "kind": kind,
                "related_themes": list(n.get("related_themes") or []),
                "published_at": n.get("published_at"),
            }
        )
    peer_moves = [
        {
            "firm": p.get("firm"),
            "company": p.get("company_name"),
            "notes": _clause(p.get("notes")),
            "thesis_shift": p.get("thesis_shift"),
        }
        for p in peer_activity
    ]
    peer_moves = sorted(peer_moves, key=lambda x: (not x.get("thesis_shift"), x.get("firm") or ""))[
        :peer_limit
    ]

    weekday = day_label or as_of.strftime("%A")
    date_label = f"{as_of.strftime('%b')} {as_of.day}, {as_of.year}"
    deal_word = "deal" if len(deals) == 1 else "deals"
    subject = f"Thirdbase Signal · {weekday}: {len(deals)} {deal_word} for {date_label}"
    generated_at = datetime.now(timezone.utc).isoformat()
    since = since_label or "the last digest"
    intro = (
        f"Highest-priority items since {since}. "
        f"Hard-capped for partner attention — open any brief or the workbook for the full book."
    )

    md_lines = [
        f"# {subject}",
        "",
        intro,
        "",
        f"_Generated {generated_at}_",
        "",
        "## Top deals",
        "",
    ]
    for d in deals:
        score = d.get("score")
        score_txt = f"{score:g}" if isinstance(score, (int, float)) else "—"
        md_lines.append(f"### {d['name']}")
        md_lines.append(f"{d.get('recommendation') or '—'} · score {score_txt}")
        if d.get("subsector") or d.get("stage"):
            md_lines.append(
                " · ".join(x for x in [d.get("subsector"), d.get("stage")] if x)
            )
        md_lines.append("")
        md_lines.append(d.get("rationale") or "")
        md_lines.append("")
        md_lines.append(f"[Open brief]({d.get('brief_url')})")
        md_lines.append("")

    md_lines.append("## Sector calls")
    md_lines.append("")
    for s in sectors:
        md_lines.append(f"- **{s['subsector']}** ({s['consensus_level']}): {s['why']}")
        if s.get("top_companies"):
            md_lines.append(f"  Look at: {', '.join(s.get('top_companies') or [])}")
    md_lines.append("")
    md_lines.append("## News worth reading (3–5 · not a firehose)")
    md_lines.append("")
    for i, n in enumerate(news_items, 1):
        link = f" ([source]({n['url']}))" if n.get("url") else ""
        kind = n.get("kind") or "market"
        md_lines.append(
            f"{i}. **{n['title']}** ({n.get('source') or '—'} · {kind}){link}"
        )
        md_lines.append(f"   Why Thirdbase: {n['why']}")
    md_lines.append("")
    md_lines.append("## Notable peer-set activity")
    md_lines.append("")
    for p in peer_moves:
        shift = " [thesis shift]" if p.get("thesis_shift") else ""
        md_lines.append(f"- {p['firm']} on {p['company']}{shift}: {p['notes']}")
    md_lines.append("")
    md_lines.append(
        f"[Open full digest in Signal]({digest_page}) · "
        f"[Download workbook]({workbook})"
    )
    markdown = "\n".join(md_lines)

    html_parts = [
        "<div style=\"font-family:Georgia,'Times New Roman',serif;max-width:640px;"
        "margin:0 auto;color:#1a1a1a;line-height:1.45\">",
        f"<h2 style=\"font-size:1.35rem;margin:0 0 0.5rem 0\">{subject}</h2>",
        f"<p style=\"margin:0 0 1.25rem 0;color:#555\">{intro}</p>",
        "<h3 style=\"font-size:1.05rem;margin:1.5rem 0 0.75rem 0;"
        "border-bottom:1px solid #ddd;padding-bottom:0.35rem\">Top deals</h3>",
    ]
    for d in deals:
        score = d.get("score")
        score_txt = f"{score:g}" if isinstance(score, (int, float)) else "—"
        meta = " · ".join(
            x
            for x in [
                d.get("recommendation"),
                f"score {score_txt}",
                d.get("subsector"),
                d.get("stage"),
            ]
            if x
        )
        html_parts.append(
            f"<div style=\"margin:0 0 1.35rem 0\">"
            f"<p style=\"margin:0 0 0.35rem 0\"><strong>{d['name']}</strong><br/>"
            f"<span style=\"color:#666;font-size:0.92rem\">{meta}</span></p>"
            f"<p style=\"margin:0 0 0.45rem 0\">{d.get('rationale') or ''}</p>"
            f"<p style=\"margin:0\"><a href=\"{d.get('brief_url')}\">Open brief →</a></p>"
            f"</div>"
        )
    html_parts.append(
        "<h3 style=\"font-size:1.05rem;margin:1.5rem 0 0.75rem 0;"
        "border-bottom:1px solid #ddd;padding-bottom:0.35rem\">Sector calls</h3><ul>"
    )
    for s in sectors:
        look = ""
        if s.get("top_companies"):
            look = f" Look at: {', '.join(s['top_companies'])}."
        html_parts.append(
            f"<li style=\"margin:0 0 0.65rem 0\"><strong>{s['subsector']}</strong> "
            f"({s['consensus_level']}): {s['why']}{look}</li>"
        )
    html_parts.append(
        "</ul><h3 style=\"font-size:1.05rem;margin:1.5rem 0 0.75rem 0;"
        "border-bottom:1px solid #ddd;padding-bottom:0.35rem\">"
        "News worth reading</h3>"
        "<p style=\"margin:0 0 0.75rem 0;color:#666;font-size:0.9rem\">"
        "Curated 3–5 — each with a one-line why it matters to Thirdbase.</p><ol>"
    )
    for n in news_items:
        title = n["title"]
        if n.get("url"):
            title = f"<a href=\"{n['url']}\">{title}</a>"
        kind = n.get("kind") or "market"
        src = n.get("source") or "—"
        html_parts.append(
            f"<li style=\"margin:0 0 0.85rem 0\"><strong>{title}</strong><br/>"
            f"<span style=\"color:#666;font-size:0.88rem\">{src} · {kind}</span><br/>"
            f"<em style=\"color:#333\">Why Thirdbase:</em> {n['why']}</li>"
        )
    html_parts.append("</ol>")
    html_parts.append(
        "<h3 style=\"font-size:1.05rem;margin:1.5rem 0 0.75rem 0;"
        "border-bottom:1px solid #ddd;padding-bottom:0.35rem\">"
        "Notable peer-set activity</h3><ul>"
    )
    for p in peer_moves:
        shift = " <em>[thesis shift]</em>" if p.get("thesis_shift") else ""
        html_parts.append(
            f"<li style=\"margin:0 0 0.65rem 0\">{p['firm']} on {p['company']}"
            f"{shift}: {p['notes']}</li>"
        )
    html_parts.append(
        f"</ul><p style=\"margin:1.5rem 0 0 0;padding-top:0.75rem;"
        f"border-top:1px solid #ddd;color:#555;font-size:0.92rem\">"
        f"<a href=\"{digest_page}\">Open digest in Signal</a> · "
        f"<a href=\"{workbook}\">Download workbook (xlsx)</a><br/>"
        f"<em>Generated {generated_at}</em></p></div>"
    )
    html = "\n".join(html_parts)

    return {
        "subject": subject,
        "generated_at": generated_at,
        "weekday": weekday,
        "as_of": as_of.isoformat(),
        "intro": intro,
        "deals": deals,
        "sector_calls": sectors,
        "news": news_items,
        "peer_moves": peer_moves,
        "workbook_url": workbook,
        "digest_url": digest_page,
        "markdown": markdown,
        "html": html,
    }


def evaluate_alerts(
    companies: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    commentary: Optional[list[dict[str, Any]]] = None,
    signals: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    """Score-time alert evaluation.

    Special routing (high, emailed immediately — see ``dispatch_immediate_alerts``):
      - ``tier1_density`` — Deep Dive with 2+ Tier-1 co-investors
      - ``off_thesis_peer_move`` — tracked firm off-thesis / thesis-shift invest
      - ``watched_founder_newco`` — GP watchlist or watched-operator newco hit
    """
    alerts: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()
    commentary = commentary or []
    signals = signals or []
    lists = _load_watchlists()
    gps = list(lists.get("gp_watchlist") or [])
    operators = list(lists.get("watched_operators") or [])
    company_by_id = {c.get("id"): c for c in companies if c.get("id")}

    for c in companies:
        if (c.get("tier1_count") or 0) >= 2 and c.get("recommendation") == "Deep Dive":
            names = ", ".join(c.get("tier1_names") or []) or "Tier-1 syndicate"
            alerts.append(
                {
                    "id": f"alert_tier1_{c['id']}",
                    "alert_type": "tier1_density",
                    "severity": "high",
                    "title": f"2+ Tier-1 on {c['name']}",
                    "body": (
                        f"{c['name']} has {c['tier1_count']} Tier-1 investors "
                        f"({names}) with score {c.get('thesis_score')}. "
                        f"Immediate routing — do not wait for next digest."
                    ),
                    "company_id": c["id"],
                    "company_slug": c.get("slug") or c["id"],
                    "company_name": c.get("name"),
                    "created_at": now,
                }
            )
        if c.get("recommendation") == "Deep Dive" and (c.get("thesis_score") or 0) >= 85:
            alerts.append(
                {
                    "id": f"alert_score_{c['id']}",
                    "alert_type": "deep_dive_threshold",
                    "severity": "medium",
                    "title": f"Deep Dive threshold crossed: {c['name']}",
                    "body": _clause(c.get("why_now")) or _clause(c.get("one_liner")) or "",
                    "company_id": c["id"],
                    "company_slug": c.get("slug") or c["id"],
                    "company_name": c.get("name"),
                    "created_at": now,
                }
            )

    for p in peer_activity:
        off_thesis = p.get("thesis_shift") or p.get("on_thesis_flag") is False
        if not off_thesis:
            continue
        firm = p.get("firm") or "Tracked firm"
        co_name = p.get("company_name") or "unknown"
        shift = bool(p.get("thesis_shift"))
        label = "Thesis shift" if shift else "Off-thesis"
        notes = _clause(p.get("notes")) or (
            f"{firm} invested in {co_name} outside stated thesis."
        )
        alerts.append(
            {
                "id": f"alert_shift_{p['id']}",
                "alert_type": "off_thesis_peer_move",
                "severity": "high",
                "title": f"{label}: {firm} on {co_name}",
                "body": (
                    f"{notes} Immediate routing — tracked-firm off-thesis move; "
                    f"do not wait for next digest."
                ),
                "company_id": p.get("company_id"),
                "company_slug": (company_by_id.get(p.get("company_id")) or {}).get("slug"),
                "company_name": co_name,
                "created_at": now,
            }
        )

    blobs: list[tuple[str, str | None, str]] = []
    for cm in commentary:
        text = cm.get("quote_or_summary") or ""
        if text.strip():
            blobs.append((text, cm.get("company_id"), f"commentary:{cm.get('id')}"))
    for sig in signals:
        text = " ".join(
            [
                str(sig.get("title") or ""),
                str(sig.get("summary") or ""),
            ]
        ).strip()
        if not text:
            continue
        tl = text.lower()
        if any(k in tl for k in ("founder", "newco", "watched", "stealth", "ex-", "launching")):
            blobs.append((text, sig.get("company_id"), f"signal:{sig.get('id')}"))

    for gp in gps:
        name = (gp.get("name") or "").strip()
        handle = (gp.get("handle") or "").strip()
        if len(name) < 4:
            continue
        name_l = name.lower()
        handle_l = handle.lower()
        for text, company_id, src in blobs:
            tl = text.lower()
            if name_l not in tl and not (handle_l and handle_l in tl):
                continue
            if not any(k in tl for k in _NEWCO_KEYWORDS):
                if "watching" not in tl and "flagged" not in tl:
                    continue
            co = company_by_id.get(company_id) or {}
            alerts.append(
                {
                    "id": f"alert_gp_{_norm_id(name)}_{src}",
                    "alert_type": "watched_founder_newco",
                    "severity": "high",
                    "title": f"GP watchlist hit: {name}",
                    "body": (
                        f"{name}"
                        + (f" (@{handle})" if handle else "")
                        + f" surfaced in ingested signal — {text[:280]} "
                        f"Immediate routing per Thirdbase special-alert rules."
                    ),
                    "company_id": company_id,
                    "company_slug": co.get("slug"),
                    "company_name": co.get("name"),
                    "created_at": now,
                }
            )
            break

    for op in operators:
        prior = (op.get("prior") or "").strip()
        aliases = [str(a).strip() for a in (op.get("aliases") or []) if str(a).strip()]
        needles = [n.lower() for n in ([prior] + aliases) if n and len(n) >= 3]
        if not needles:
            continue
        for text, company_id, src in blobs:
            tl = text.lower()
            hit = next((n for n in needles if n in tl), None)
            if not hit:
                continue
            if not any(k in tl for k in _NEWCO_KEYWORDS):
                continue
            co = company_by_id.get(company_id) or {}
            label = prior or hit
            alerts.append(
                {
                    "id": f"alert_op_{_norm_id(label)}_{src}",
                    "alert_type": "watched_founder_newco",
                    "severity": "high",
                    "title": f"Watched founder / operator: {label}",
                    "body": (
                        f"Watched operator prior '{label}' matched ingested signal — {text[:280]} "
                        f"Immediate routing — newco / stealth start; do not wait for digest."
                    ),
                    "company_id": company_id,
                    "company_slug": co.get("slug"),
                    "company_name": co.get("name"),
                    "created_at": now,
                }
            )
            break

    seen: set[str] = set()
    uniq: list[dict[str, Any]] = []
    for a in alerts:
        if a["id"] in seen:
            continue
        seen.add(a["id"])
        uniq.append(a)
    return uniq


def _norm_id(s: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in s.lower())[:40]


def is_immediate_alert(alert: dict[str, Any]) -> bool:
    return (alert.get("alert_type") or "") in IMMEDIATE_ALERT_TYPES


def filter_immediate_alerts(alerts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [a for a in alerts if is_immediate_alert(a)]


def render_alert_email(
    alert: dict[str, Any],
    *,
    app_base: Optional[str] = None,
) -> dict[str, str]:
    """Build subject + text + html for an immediate special-routing email."""
    base = _app_base(app_base)
    title = alert.get("title") or "Signal alert"
    subject = f"[Signal ALERT] {title}"
    severity = (alert.get("severity") or "high").upper()
    alert_type = alert.get("alert_type") or "special_routing"
    body = _clause(alert.get("body")) or ""
    slug = alert.get("company_slug")
    company_id = alert.get("company_id")
    brief = ""
    if slug or company_id:
        brief = f"{base}/company/{slug or company_id}"
    desk = f"{base}/"
    digest_page = _digest_url(base)

    type_labels = {
        "tier1_density": "2+ Tier-1 co-investments",
        "off_thesis_peer_move": "Off-thesis investment by tracked firm",
        "watched_founder_newco": "Watched founder starting a new company",
    }
    reason = type_labels.get(alert_type, "Special routing")

    text = "\n".join(
        [
            subject,
            "",
            f"Severity: {severity}",
            f"Reason: {reason}",
            f"Type: {alert_type}",
            "",
            body,
            "",
            f"Open brief: {brief}" if brief else "",
            f"Desk: {desk}",
            f"Digest (batched): {digest_page}",
            "",
            "Thirdbase Signal — immediate routing (do not wait for M/W/F digest).",
        ]
    )
    # drop empty lines from optional brief
    text = "\n".join(line for line in text.split("\n") if line is not None)

    brief_html = (
        f'<p style="margin:0 0 0.75rem 0"><a href="{brief}">Open company brief →</a></p>'
        if brief
        else ""
    )
    html = (
        "<div style=\"font-family:Georgia,'Times New Roman',serif;max-width:560px;"
        "margin:0 auto;color:#1a1a1a;line-height:1.45\">"
        f'<p style="margin:0 0 0.35rem 0;color:#8a1f11;font-size:0.85rem;'
        f'letter-spacing:0.04em;text-transform:uppercase">{severity} · Immediate</p>'
        f'<h2 style="font-size:1.25rem;margin:0 0 0.5rem 0">{title}</h2>'
        f'<p style="margin:0 0 1rem 0;color:#555">{reason}</p>'
        f'<p style="margin:0 0 1rem 0">{body}</p>'
        f"{brief_html}"
        f'<p style="margin:1.25rem 0 0 0;padding-top:0.75rem;border-top:1px solid #ddd;'
        f'color:#555;font-size:0.9rem">'
        f'<a href="{desk}">Open desk</a> · '
        f'<a href="{digest_page}">Next digest (batched)</a><br/>'
        "<em>Special routing — emailed now, not held for Mon/Wed/Fri.</em></p></div>"
    )
    return {"subject": subject, "text": text, "html": html}


def dispatch_immediate_alerts(
    alerts: list[dict[str, Any]],
    *,
    previously_emailed: Optional[set[str] | list[str]] = None,
    out_dir: Optional[Path] = None,
    app_base: Optional[str] = None,
    send: bool = True,
    bootstrap_existing: Optional[bool] = None,
) -> dict[str, Any]:
    """Email newly seen special-routing alerts; always write preview files.

    Dedupes by alert ``id`` against ``previously_emailed`` so refresh + scheduler
    do not re-fire the same Tier-1 / off-thesis / watched-founder hit.

    First run (empty emailed set): by default **bootstrap** — record current
    immediate IDs without sending, so enabling SMTP does not flood the inbox
    with the whole historical book. Set ``ALERTS_SEND_EXISTING=true`` (or pass
    ``bootstrap_existing=False``) to email the current set once.
    """
    from src.digest.emailer import alerts_enabled, send_alert_email, write_alert_previews

    immediate = filter_immediate_alerts(alerts)
    seen = set(previously_emailed or [])
    pending = [a for a in immediate if a.get("id") and a["id"] not in seen]

    if bootstrap_existing is None:
        load_dotenv(ROOT / ".env")
        load_dotenv(ROOT / "env.txt")
        send_existing = (os.getenv("ALERTS_SEND_EXISTING") or "").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        bootstrap_existing = (not seen) and (not send_existing) and bool(pending)

    if bootstrap_existing and pending:
        emailed = seen | {a["id"] for a in pending}
        return {
            "ok": True,
            "enabled": alerts_enabled(),
            "bootstrapped": True,
            "immediate_count": len(immediate),
            "pending_count": 0,
            "sent": [],
            "sent_ids": [],
            "emailed_ids": sorted(emailed),
            "suppressed": [a["id"] for a in pending],
            "reason": "bootstrapped existing special-routing alerts (set ALERTS_SEND_EXISTING=true to email once)",
        }

    if not alerts_enabled():
        return {
            "ok": True,
            "enabled": False,
            "immediate_count": len(immediate),
            "pending_count": len(pending),
            "sent": [],
            "skipped": [a["id"] for a in pending],
            "reason": "ALERTS_ENABLED=false",
            "emailed_ids": sorted(seen),
        }

    preview_dir = out_dir or (ROOT / "data" / "output" / "alerts")
    results: list[dict[str, Any]] = []
    newly_sent: list[str] = []

    for alert in pending:
        rendered = render_alert_email(alert, app_base=app_base)
        paths = write_alert_previews(alert, rendered, preview_dir)
        mail: dict[str, Any] = {"sent": False, "preview_only": True}
        if send:
            mail = send_alert_email(
                rendered["subject"],
                rendered["html"],
                rendered["text"],
            )
        aid = alert["id"]
        # Count as delivered for dedupe once we attempted + wrote preview,
        # so missing SMTP still advances state (previews are the demo path).
        newly_sent.append(aid)
        results.append(
            {
                "id": aid,
                "alert_type": alert.get("alert_type"),
                "title": alert.get("title"),
                "email": mail,
                "previews": paths,
            }
        )

    emailed = seen | set(newly_sent)
    return {
        "ok": True,
        "enabled": True,
        "bootstrapped": False,
        "immediate_count": len(immediate),
        "pending_count": len(pending),
        "sent": results,
        "sent_ids": newly_sent,
        "emailed_ids": sorted(emailed),
        "suppressed": [a["id"] for a in immediate if a["id"] in seen],
    }

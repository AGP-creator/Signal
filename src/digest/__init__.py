from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_APP_BASE = "http://localhost:3000"


def _load_gp_watchlist() -> list[dict[str, Any]]:
    path = ROOT / "config" / "watchlists.yaml"
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return list(data.get("gp_watchlist") or [])


def _brief_url(company: dict[str, Any], app_base: str) -> str:
    slug = company.get("slug") or company.get("id") or ""
    return f"{app_base.rstrip('/')}/company/{slug}"


def build_digest(
    companies: list[dict[str, Any]],
    sector_calls: list[dict[str, Any]],
    news: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    as_of: Optional[date] = None,
    app_base: str = DEFAULT_APP_BASE,
) -> dict[str, Any]:
    as_of = as_of or date.today()
    hot = [
        c
        for c in sorted(companies, key=lambda x: -(x.get("thesis_score") or 0))
        if c.get("recommendation") == "Deep Dive"
    ][:5]
    if len(hot) < 3:
        extra = [
            c
            for c in sorted(companies, key=lambda x: -(x.get("thesis_score") or 0))
            if c not in hot
        ]
        hot = (hot + extra)[:5]

    deals = [
        {
            "name": c["name"],
            "score": c.get("thesis_score"),
            "recommendation": c.get("recommendation"),
            "rationale": c.get("why_now"),
            "brief_id": c.get("brief_id"),
            "brief_url": _brief_url(c, app_base),
            "slug": c.get("slug"),
            "sector": c.get("sector_theme"),
        }
        for c in hot
    ]
    sectors = [
        {
            "subsector": s.get("subsector"),
            "consensus_level": s.get("consensus_level"),
            "why": s.get("why_thirdbase_cares"),
            "top_companies": s.get("top_companies"),
            "parent_theme": s.get("parent_theme"),
        }
        for s in sorted(sector_calls, key=lambda x: -(x.get("heat_score") or 0))[:2]
    ]
    news_items = [
        {
            "title": n.get("title"),
            "source": n.get("source"),
            "why": n.get("why_it_matters"),
            "url": n.get("url"),
        }
        for n in news[:5]
    ]
    peer_moves = [
        {
            "firm": p.get("firm"),
            "company": p.get("company_name"),
            "notes": p.get("notes"),
            "thesis_shift": p.get("thesis_shift"),
        }
        for p in peer_activity
    ]
    peer_moves = sorted(peer_moves, key=lambda x: (not x.get("thesis_shift"), x.get("firm") or ""))[:5]

    subject = f"Thirdbase Signal — {as_of.isoformat()} — {len(deals)} deals worth your time"
    generated_at = datetime.now(timezone.utc).isoformat()

    md_lines = [
        f"# {subject}",
        "",
        f"_Generated {generated_at}_",
        "",
        "## Top deals",
    ]
    for d in deals:
        md_lines.append(f"### {d['name']} · {d['recommendation']} · score {d['score']}")
        md_lines.append(d.get("rationale") or "")
        md_lines.append(
            f"Brief: [{d.get('brief_id')}]({d.get('brief_url')}) · Sector: {d.get('sector')}"
        )
        md_lines.append("")
    md_lines.append("## Sector calls")
    for s in sectors:
        md_lines.append(f"- **{s['subsector']}** ({s['consensus_level']}): {s['why']}")
        md_lines.append(f"  Companies: {', '.join(s.get('top_companies') or [])}")
    md_lines.append("")
    md_lines.append("## News worth reading")
    for n in news_items:
        md_lines.append(f"- **{n['title']}** ({n['source']}) — {n['why']}")
    md_lines.append("")
    md_lines.append("## Notable peer-set activity")
    for p in peer_moves:
        shift = " · THESIS SHIFT" if p.get("thesis_shift") else ""
        md_lines.append(f"- {p['firm']} → {p['company']}{shift}: {p['notes']}")
    md_lines.append("")
    md_lines.append(
        f"_Full pipeline refreshed {generated_at}. Open Thirdbase_Deal_Pipeline.xlsx or {app_base}_"
    )
    markdown = "\n".join(md_lines)

    html_parts = [
        f"<h2>{subject}</h2>",
        f"<p><em>Generated {generated_at}</em></p>",
        "<h3>Top deals</h3>",
    ]
    for d in deals:
        html_parts.append(
            f"<p><strong>{d['name']}</strong> · {d['recommendation']} · score {d['score']}<br/>"
            f"{d.get('rationale')}<br/>"
            f"<a href=\"{d.get('brief_url')}\">{d.get('brief_id')}</a></p>"
        )
    html_parts.append("<h3>Sector calls</h3><ul>")
    for s in sectors:
        html_parts.append(
            f"<li><strong>{s['subsector']}</strong> ({s['consensus_level']}): {s['why']}</li>"
        )
    html_parts.append("</ul><h3>News worth reading</h3><ul>")
    for n in news_items:
        html_parts.append(f"<li><strong>{n['title']}</strong> ({n['source']}) — {n['why']}</li>")
    html_parts.append("</ul><h3>Peer-set activity</h3><ul>")
    for p in peer_moves:
        shift = " [THESIS SHIFT]" if p.get("thesis_shift") else ""
        html_parts.append(f"<li>{p['firm']} → {p['company']}{shift}: {p['notes']}</li>")
    html_parts.append(
        f"</ul><p><em>Full pipeline refreshed {generated_at}. "
        f"<a href=\"{app_base}\">Open Signal</a> or Thirdbase_Deal_Pipeline.xlsx.</em></p>"
    )
    html = "\n".join(html_parts)

    return {
        "subject": subject,
        "generated_at": generated_at,
        "deals": deals,
        "sector_calls": sectors,
        "news": news_items,
        "peer_moves": peer_moves,
        "markdown": markdown,
        "html": html,
    }


def evaluate_alerts(
    companies: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    commentary: Optional[list[dict[str, Any]]] = None,
    signals: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()
    commentary = commentary or []
    signals = signals or []
    gps = _load_gp_watchlist()

    for c in companies:
        if (c.get("tier1_count") or 0) >= 2 and c.get("recommendation") == "Deep Dive":
            alerts.append(
                {
                    "id": f"alert_tier1_{c['id']}",
                    "alert_type": "tier1_density",
                    "severity": "high",
                    "title": f"2+ Tier-1 on {c['name']}",
                    "body": (
                        f"{c['name']} has {c['tier1_count']} Tier-1 investors "
                        f"({', '.join(c.get('tier1_names') or [])}) with score {c.get('thesis_score')}. "
                        f"Immediate routing — do not wait for next digest."
                    ),
                    "company_id": c["id"],
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
                    "body": c.get("why_now") or "",
                    "company_id": c["id"],
                    "created_at": now,
                }
            )

    for p in peer_activity:
        if p.get("thesis_shift"):
            alerts.append(
                {
                    "id": f"alert_shift_{p['id']}",
                    "alert_type": "off_thesis_peer_move",
                    "severity": "high",
                    "title": f"Thesis shift: {p.get('firm')} → {p.get('company_name')}",
                    "body": p.get("notes") or "",
                    "company_id": p.get("company_id"),
                    "created_at": now,
                }
            )

    # Watched GP / founder signals from commentary + live/seed signals
    blobs: list[tuple[str, str | None, str]] = []
    for cm in commentary:
        text = cm.get("quote_or_summary") or ""
        blobs.append((text, cm.get("company_id"), f"commentary:{cm.get('id')}"))
    for sig in signals:
        text = " ".join(
            [
                str(sig.get("title") or ""),
                str(sig.get("summary") or ""),
            ]
        )
        if "founder" in text.lower() or "newco" in text.lower() or "watched" in text.lower():
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
            if name_l in tl or (handle_l and handle_l in tl):
                if not any(
                    k in tl
                    for k in ("founder", "newco", "stealth", "spin up", "launching", "starting")
                ):
                    # Still surface high-signal GP mentions on pipeline cos as watch
                    if "watching" not in tl and "flagged" not in tl:
                        continue
                alerts.append(
                    {
                        "id": f"alert_gp_{_norm_id(name)}_{src}",
                        "alert_type": "watched_founder_newco",
                        "severity": "high",
                        "title": f"GP watchlist hit: {name}",
                        "body": (
                            f"{name} (@{handle}) surfaced in ingested signal — {text[:280]} "
                            f"Immediate routing per Thirdbase special-alert rules."
                        ),
                        "company_id": company_id,
                        "created_at": now,
                    }
                )
                break

    # Dedupe by id
    seen = set()
    uniq = []
    for a in alerts:
        if a["id"] in seen:
            continue
        seen.add(a["id"])
        uniq.append(a)
    return uniq


def _norm_id(s: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in s.lower())[:40]


def render_alert_email(alert: dict[str, Any]) -> str:
    return (
        f"Subject: [Signal ALERT] {alert.get('title')}\n\n"
        f"Severity: {alert.get('severity')}\n"
        f"Type: {alert.get('alert_type')}\n\n"
        f"{alert.get('body')}\n\n"
        f"— Thirdbase Signal immediate routing\n"
    )

"""Judgment OS — miss retro, mix drift, freshness SLA, founder radar, digest A/B."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


AS_OF = datetime(2026, 8, 10, tzinfo=timezone.utc)

FIELD_SLA = [
    ("last_signal_date", "Last market signal", 21),
    ("last_round_date", "Last round date", 180),
    ("valuation_est_m", "Valuation estimate", 90),
    ("headcount", "Headcount", 60),
    ("yoy_growth_pct", "YoY growth", 90),
    ("runway_months_est", "Runway", 60),
    ("commentary_summary", "Commentary", 45),
]

WATCHED_PRIORS = [
    ("ex-DeepMind", "DeepMind"),
    ("ex-Locus", "Locus Robotics"),
    ("ex-OpenAI", "OpenAI"),
    ("ex-Anduril", "Anduril"),
    ("ex-Palantir", "Palantir"),
    ("ex-Scale", "Scale AI"),
    ("ex-Databricks", "Databricks"),
    ("ex-Stripe", "Stripe"),
]


def _days_since(iso: str | None) -> int | None:
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return max(0, int((AS_OF - d).total_seconds() // 86400))
    except Exception:
        return None


def _mix(companies: list[dict[str, Any]]) -> dict[str, Any]:
    n = max(1, len(companies))
    dominant = sum(1 for c in companies if c.get("pipeline_bucket") == "dominant_tech_growth")
    tactical = sum(1 for c in companies if c.get("pipeline_bucket") == "tactical_sector_agnostic")
    dom_pct = round(100 * dominant / n)
    tac_pct = round(100 * tactical / n)
    delta = abs(tac_pct - 40)
    status = "on_target" if delta < 6 else "soft_drift" if delta < 12 else "hard_drift"
    overweight_t = tac_pct > 40
    alarm = None
    if status == "hard_drift":
        alarm = (
            f"HARD DRIFT — tactical at {tac_pct}% (target ≤40%)."
            if overweight_t
            else f"HARD DRIFT — dominant only {dom_pct}% (target 60%)."
        )
    elif status == "soft_drift":
        alarm = f"Soft mix drift — {dom_pct}/{tac_pct} vs 60/40."
    counsel = (
        "Mix within band."
        if status == "on_target"
        else (
            "Bias next Deep Dives toward AI infra / cyber / defense / robotics."
            if overweight_t
            else "Allow 1–2 high-conviction tactical names only if relative rank is #1."
        )
    )
    return {
        "dominant_pct": dom_pct,
        "tactical_pct": tac_pct,
        "status": status,
        "alarm": alarm,
        "counsel": counsel,
    }


def _freshness(companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for c in companies:
        anchor = c.get("last_signal_date")
        fields = []
        haircuts = []
        for key, label, sla in FIELD_SLA:
            if key in ("last_signal_date", "last_round_date"):
                age = _days_since(c.get(key))
            else:
                age = _days_since(anchor)
            if age is None:
                status = "unknown"
                haircut = 0.15
            elif age <= sla * 0.6:
                status = "fresh"
                haircut = 0.0
            elif age <= sla:
                status = "aging"
                haircut = 0.1
            else:
                status = "stale"
                haircut = 0.25
            haircuts.append(haircut)
            fields.append(
                {
                    "field": key,
                    "label": label,
                    "age_days": age,
                    "sla_days": sla,
                    "status": status,
                }
            )
        if any(f["status"] == "stale" for f in fields):
            overall = "stale"
        elif any(f["status"] == "aging" for f in fields):
            overall = "aging"
        elif all(f["status"] == "unknown" for f in fields):
            overall = "unknown"
        else:
            overall = "fresh"
        haircut = min(0.45, sum(haircuts) / max(1, len(haircuts)))
        rows.append(
            {
                "company": c.get("name"),
                "company_id": c.get("id"),
                "overall": overall,
                "score_confidence": round(100 * (1 - haircut)),
                "stale_fields": ", ".join(
                    f["label"] for f in fields if f["status"] in ("stale", "aging", "unknown")
                )[:120],
            }
        )
    order = {"stale": 0, "aging": 1, "unknown": 2, "fresh": 3}
    rows.sort(key=lambda r: (order.get(r["overall"], 9), r["score_confidence"]))
    return rows[:20]


def _misses(companies: list[dict[str, Any]], peers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by: dict[str, list[dict[str, Any]]] = {}
    for p in peers:
        cid = p.get("company_id")
        if cid:
            by.setdefault(cid, []).append(p)
    out: list[dict[str, Any]] = []
    for c in companies:
        rec = c.get("recommendation") or "Pass"
        score = float(c.get("thesis_score") or 0)
        growth = float(c.get("yoy_growth_pct") or 0)
        hc = float(c.get("headcount_6m_growth_pct") or 0)
        peer_hits = by.get(c.get("id"), [])
        if (rec == "Pass" or (rec == "Watch" and score < 65)) and (growth >= 80 or hc >= 80):
            out.append(
                {
                    "company": c.get("name"),
                    "then_rec": rec,
                    "then_score": score,
                    "severity": "high" if growth >= 100 or hc >= 100 else "medium",
                    "now_signal": f"Breakout velocity YoY {growth or 'n/a'}% · HC6m {hc}%",
                    "lesson": "When HC 6m ≥80% on a thesis theme, force a Watch floor.",
                    "action": "Open miss retrospective before Monday digest.",
                }
            )
        elif (rec in ("Pass", "Watch")) and len(peer_hits) >= 2 and score < 72:
            out.append(
                {
                    "company": c.get("name"),
                    "then_rec": rec,
                    "then_score": score,
                    "severity": "high" if any(p.get("thesis_shift") for p in peer_hits) else "medium",
                    "now_signal": f"{len(peer_hits)} peer firms tagged while Signal stayed {rec}",
                    "lesson": "Peer heat should bump timing even if absolute score is mid.",
                    "action": "Re-score with peer heat as timing dimension.",
                }
            )
        elif (
            rec == "Watch"
            and len(c.get("investors") or []) <= 2
            and "ex-" in (c.get("team_notes") or "").lower()
            and score >= 60
        ):
            out.append(
                {
                    "company": c.get("name"),
                    "then_rec": rec,
                    "then_score": score,
                    "severity": "watch",
                    "now_signal": "Quiet tape + watched operator DNA",
                    "lesson": "At Seed, founder prior can outweigh empty Tier-1 count.",
                    "action": "Promote to Deep Dive queue or Pass with founder-radar note.",
                }
            )
    seen: set[str] = set()
    deduped = []
    for m in out:
        name = m["company"]
        if name in seen:
            continue
        seen.add(name)
        deduped.append(m)
    return deduped[:8]


def _founder_radar(
    companies: list[dict[str, Any]],
    commentary: list[dict[str, Any]],
    news: list[dict[str, Any]],
    alerts: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    blobs: list[tuple[str, str, dict | None]] = []
    co_by_id = {c.get("id"): c for c in companies}
    for cm in commentary:
        blobs.append(
            (
                f"{cm.get('source') or ''} {cm.get('quote_or_summary') or ''}",
                cm.get("source") or "commentary",
                co_by_id.get(cm.get("company_id")),
            )
        )
    for n in news:
        blobs.append(
            (f"{n.get('title') or ''} {n.get('why_it_matters') or ''}", n.get("source") or "news", None)
        )
    for a in alerts or []:
        blobs.append(
            (
                f"{a.get('title') or ''} {a.get('body') or ''}",
                "alert",
                co_by_id.get(a.get("company_id")),
            )
        )
    for c in companies:
        if c.get("team_notes"):
            blobs.append((c["team_notes"], "team_notes", c))

    keys = ("watched founder", "spinning up", "stealth", "newco", "ex-", "launching")
    hits = []
    for text, source, company in blobs:
        low = text.lower()
        if not any(k in low for k in keys):
            continue
        prior = next((p for k, p in WATCHED_PRIORS if k.lower() in low), "Watched operator")
        founder = next((k for k, _ in WATCHED_PRIORS if k.lower() in low), "Watched operator")
        urgency = "now" if any(x in low for x in ("stealth", "newco", "spin", "elad")) else "this_week"
        hits.append(
            {
                "founder": founder,
                "prior": prior,
                "urgency": urgency,
                "source": source,
                "company": (company or {}).get("name") if company else None,
                "signal": text.strip()[:200],
                "action": (
                    "Immediate alert — research agent brief within 24h."
                    if urgency == "now"
                    else "Add to founder radar board."
                ),
            }
        )
    seen: set[str] = set()
    out = []
    for h in hits:
        key = f"{h['founder']}|{h.get('company') or h['signal'][:40]}"
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    order = {"now": 0, "this_week": 1, "monitor": 2}
    out.sort(key=lambda h: order.get(h["urgency"], 9))
    return out[:10]


def _digest_ab(companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = sorted(
        [
            c
            for c in companies
            if c.get("recommendation") == "Deep Dive" or float(c.get("thesis_score") or 0) >= 70
        ],
        key=lambda c: float(c.get("thesis_score") or 0),
        reverse=True,
    )
    variants = []
    for vid, cap, note in (
        ("tight", 3, "Ruthless forwardable digest"),
        ("standard", 5, "M/W/F default"),
        ("loose", 8, "Coverage creep — refuse as default"),
    ):
        deals = ranked[:cap]
        avg = sum(float(c.get("thesis_score") or 0) for c in deals) / max(1, len(deals))
        precision = round(min(98, avg * 0.92 + (5 - min(5, cap)) * 3))
        variants.append(
            {
                "variant": vid,
                "deal_cap": cap,
                "precision_proxy": precision,
                "partner_minutes": round(cap * 8 + (max(0, cap - 3) * 4)),
                "deals": ", ".join(c.get("name") or "" for c in deals),
                "note": note,
            }
        )
    return variants


def build_judgment_pack(
    companies: list[dict[str, Any]],
    peers: list[dict[str, Any]],
    commentary: list[dict[str, Any]],
    news: list[dict[str, Any]],
    alerts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    mix = _mix(companies)
    misses = _misses(companies, peers)
    founders = _founder_radar(companies, commentary, news, alerts)
    freshness = _freshness(companies)
    digest = _digest_ab(companies)
    must: list[str] = []
    if mix.get("alarm"):
        must.append(mix["alarm"])
    if founders and founders[0]["urgency"] == "now":
        must.append(f"Founder radar: {founders[0]['founder']} — {founders[0]['action']}")
    if misses and misses[0]["severity"] == "high":
        must.append(f"Miss retro: {misses[0]['company']} — {misses[0]['action']}")
    stale_n = sum(1 for f in freshness if f["overall"] == "stale")
    if stale_n:
        must.append(f"{stale_n} names breaching evidence freshness SLA.")
    if not must:
        must.append("No hard alarms — calibrate with one Pass and one Deep Dive override this week.")
    if founders and founders[0]["urgency"] == "now":
        headline = f"Founder radar hot: {founders[0]['founder']}"
    elif mix["status"] == "hard_drift":
        headline = f"Mix drift — {mix['dominant_pct']}/{mix['tactical_pct']}"
    elif misses:
        headline = f"Miss watch: {misses[0]['company']}"
    else:
        headline = "Judgment loop healthy"
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "headline": headline,
        "must_do": must[:4],
        "mix": mix,
        "misses": misses,
        "founder_radar": founders,
        "freshness": freshness,
        "digest_ab": digest,
        "edge_note": (
            "Edge compounds from override labels + miss postmortems — not from a bigger LLM."
        ),
    }

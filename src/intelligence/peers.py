"""Peer-set competitor intelligence.

Implements Thirdbase brief: track what peer VCs buy, flag thesis shifts,
build co-investor heatmap for syndicate building, and surface comps for
company briefs.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml

ROOT = Path(__file__).resolve().parents[2]


def firm_slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "unknown"


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def load_peer_firms(path: Optional[Path] = None) -> list[dict[str, Any]]:
    p = path or (ROOT / "config" / "watchlists.yaml")
    with open(p, encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    return list(cfg.get("peer_firms") or [])


def _alias_map(peer_firms: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Map normalized name/alias → canonical firm config."""
    out: dict[str, dict[str, Any]] = {}
    for firm in peer_firms:
        canon = {
            "name": firm["name"],
            "aliases": list(firm.get("aliases") or []),
            "stated_focus": firm.get("stated_focus") or "",
            "slug": firm_slug(firm["name"]),
        }
        out[_norm(firm["name"])] = canon
        for a in canon["aliases"]:
            out[_norm(a)] = canon
    return out


def _resolve_firm(raw: str, alias_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    n = _norm(raw)
    if n in alias_map:
        return alias_map[n]
    # substring match for "a16z Speedrun" etc.
    for key, firm in alias_map.items():
        if key and (key in n or n in key):
            return firm
    return {
        "name": raw,
        "aliases": [],
        "stated_focus": "",
        "slug": firm_slug(raw),
    }


def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return datetime.strptime(str(s)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def _theme_tokens(focus: str) -> set[str]:
    focus = (focus or "").lower()
    tokens = set()
    mapping = {
        "ai": {"ai", "infra", "model", "compute", "gpu", "ml"},
        "bio": {"bio", "health", "life", "pharma"},
        "crypto": {"crypto", "web3", "blockchain"},
        "fintech": {"fintech", "finance", "payment", "bank"},
        "defense": {"defence", "defense", "national security", "cyber", "space"},
        "cyber": {"cyber", "security", "identity"},
        "robot": {"robot", "physical ai", "automation"},
        "energy": {"energy", "climate", "nuclear", "grid"},
        "enterprise": {"enterprise", "saas", "software", "cloud"},
        "consumer": {"consumer", "internet"},
        "space": {"space", "satellite"},
        "frontier": {"frontier", "deep tech", "science"},
    }
    for key, syns in mapping.items():
        if key in focus or any(k in focus for k in syns):
            tokens |= syns | {key}
    return tokens


def _on_stated_focus(theme: str, stated_focus: str) -> bool:
    if not stated_focus:
        return True
    focus_toks = _theme_tokens(stated_focus)
    theme_l = (theme or "").lower()
    if not focus_toks:
        return True
    return any(t in theme_l for t in focus_toks)


def build_coinvestor_heatmap(companies: list[dict[str, Any]], min_count: int = 1) -> list[dict[str, Any]]:
    pair_data: dict[tuple[str, str], dict[str, Any]] = {}
    for c in companies:
        invs = sorted({str(x) for x in (c.get("investors") or []) if x})
        for i in range(len(invs)):
            for j in range(i + 1, len(invs)):
                a, b = invs[i], invs[j]
                key = (a, b)
                rec = pair_data.setdefault(
                    key,
                    {
                        "firm_a": a,
                        "firm_b": b,
                        "coinvest_count": 0,
                        "shared_themes": set(),
                        "shared_deals": [],
                        "last_shared_deal": "",
                        "last_shared_date": "",
                    },
                )
                rec["coinvest_count"] += 1
                theme = c.get("sector_theme") or ""
                if theme:
                    rec["shared_themes"].add(theme)
                deal = c.get("name") or ""
                if deal and deal not in rec["shared_deals"]:
                    rec["shared_deals"].append(deal)
                d = c.get("last_round_date") or ""
                if d >= rec["last_shared_date"]:
                    rec["last_shared_date"] = d
                    rec["last_shared_deal"] = deal

    rows = []
    for rec in pair_data.values():
        if rec["coinvest_count"] < min_count:
            continue
        rows.append(
            {
                "id": f"hm_{firm_slug(rec['firm_a'])}_{firm_slug(rec['firm_b'])}",
                "firm_a": rec["firm_a"],
                "firm_b": rec["firm_b"],
                "coinvest_count": rec["coinvest_count"],
                "shared_themes": sorted(rec["shared_themes"]),
                "shared_deals": rec["shared_deals"][:8],
                "last_shared_deal": rec["last_shared_deal"],
                "last_shared_date": rec["last_shared_date"],
                "syndicate_score": round(
                    min(100.0, 40 + rec["coinvest_count"] * 18 + len(rec["shared_themes"]) * 6),
                    1,
                ),
            }
        )
    rows.sort(key=lambda x: (-x["coinvest_count"], -x["syndicate_score"]))
    return rows


def build_comparable_sets(companies: list[dict[str, Any]], limit: int = 4) -> dict[str, list[dict[str, Any]]]:
    """For each company, nearest comps in same theme×stage (and nearby stage)."""
    by_id = {c["id"]: c for c in companies}
    out: dict[str, list[dict[str, Any]]] = {}

    for c in companies:
        peers = []
        for other in companies:
            if other["id"] == c["id"]:
                continue
            score = 0.0
            if (other.get("theme_id") or "") == (c.get("theme_id") or "") and c.get("theme_id"):
                score += 40
            if (other.get("sector_theme") or "") == (c.get("sector_theme") or "") and c.get("sector_theme"):
                score += 20
            if (other.get("subsector") or "") == (c.get("subsector") or "") and c.get("subsector"):
                score += 25
            if (other.get("stage") or "") == (c.get("stage") or "") and c.get("stage"):
                score += 20
            # Shared investors = competitive / syndicate overlap
            a = set(c.get("investors") or [])
            b = set(other.get("investors") or [])
            shared = a & b
            score += min(20, len(shared) * 8)
            # Similar score band
            sa, sb = c.get("thesis_score") or 0, other.get("thesis_score") or 0
            if abs(sa - sb) <= 8:
                score += 8
            if score < 35:
                continue
            peers.append(
                {
                    "company_id": other["id"],
                    "name": other.get("name"),
                    "slug": other.get("slug"),
                    "stage": other.get("stage"),
                    "subsector": other.get("subsector"),
                    "thesis_score": other.get("thesis_score"),
                    "recommendation": other.get("recommendation"),
                    "relative_rank": other.get("relative_rank"),
                    "shared_investors": sorted(shared),
                    "comp_score": round(score, 1),
                    "why": _comp_why(c, other, shared),
                }
            )
        peers.sort(key=lambda x: (-x["comp_score"], -(x.get("thesis_score") or 0)))
        out[c["id"]] = peers[:limit]
        # attach onto company payload convenience
        by_id[c["id"]]["comparables"] = out[c["id"]]
    return out


def _comp_why(c: dict[str, Any], other: dict[str, Any], shared: set[str]) -> str:
    bits = []
    if (c.get("subsector") or "") and c.get("subsector") == other.get("subsector"):
        bits.append(f"same subsector ({c.get('subsector')})")
    elif c.get("sector_theme") == other.get("sector_theme"):
        bits.append(f"same theme ({c.get('sector_theme')})")
    if c.get("stage") == other.get("stage"):
        bits.append(f"same stage ({c.get('stage')})")
    if shared:
        bits.append(f"shared investors: {', '.join(sorted(shared)[:3])}")
    return "; ".join(bits) or "adjacent deal in pipeline"


def build_firm_dossiers(
    companies: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    peer_firms: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    peer_firms = peer_firms if peer_firms is not None else load_peer_firms()
    alias_map = _alias_map(peer_firms)

    # Index company appearances by resolved firm
    firm_deals: dict[str, dict[str, Any]] = {}

    def ensure(raw_name: str) -> dict[str, Any]:
        resolved = _resolve_firm(raw_name, alias_map)
        key = resolved["slug"]
        if key not in firm_deals:
            firm_deals[key] = {
                "id": f"firm_{key}",
                "slug": key,
                "name": resolved["name"],
                "aliases": resolved["aliases"],
                "stated_focus": resolved["stated_focus"],
                "deal_ids": set(),
                "deals": [],
                "themes": Counter(),
                "stages": Counter(),
                "activity": [],
                "thesis_shifts": [],
                "coinvestors": Counter(),
                "tier1_overlap": 0,
                "last_activity_date": "",
            }
        # Prefer richer canonical name if we only had alias
        if resolved.get("stated_focus") and not firm_deals[key]["stated_focus"]:
            firm_deals[key]["stated_focus"] = resolved["stated_focus"]
            firm_deals[key]["name"] = resolved["name"]
        return firm_deals[key]

    # From company cap tables
    for c in companies:
        invs = list(c.get("investors") or [])
        lead = c.get("lead_investor")
        names = list(dict.fromkeys(([lead] if lead else []) + invs))
        for raw in names:
            if not raw:
                continue
            bucket = ensure(str(raw))
            if c["id"] in bucket["deal_ids"]:
                continue
            bucket["deal_ids"].add(c["id"])
            on_thesis = _on_stated_focus(c.get("sector_theme") or "", bucket["stated_focus"])
            deal = {
                "company_id": c["id"],
                "company_name": c.get("name"),
                "slug": c.get("slug"),
                "round": c.get("stage"),
                "date": c.get("last_round_date"),
                "theme": c.get("sector_theme"),
                "subsector": c.get("subsector"),
                "recommendation": c.get("recommendation"),
                "thesis_score": c.get("thesis_score"),
                "on_thesis_flag": on_thesis,
                "is_lead": bool(lead and _norm(str(lead)) == _norm(str(raw))),
            }
            bucket["deals"].append(deal)
            if c.get("sector_theme"):
                bucket["themes"][c["sector_theme"]] += 1
            if c.get("stage"):
                bucket["stages"][c["stage"]] += 1
            d = c.get("last_round_date") or ""
            if d >= bucket["last_activity_date"]:
                bucket["last_activity_date"] = d
            for other in invs:
                if other and _norm(str(other)) != _norm(str(raw)):
                    bucket["coinvestors"][str(other)] += 1

    # From explicit peer_activity rows (enrich + thesis shifts)
    for pa in peer_activity:
        firm_raw = pa.get("firm") or ""
        if not firm_raw:
            continue
        bucket = ensure(firm_raw)
        activity = {
            "id": pa.get("id"),
            "company_id": pa.get("company_id"),
            "company_name": pa.get("company_name"),
            "round": pa.get("round"),
            "date": pa.get("date"),
            "theme": pa.get("theme"),
            "on_thesis_flag": bool(pa.get("on_thesis_flag", True)),
            "thesis_shift": bool(pa.get("thesis_shift")),
            "notes": pa.get("notes") or "",
        }
        bucket["activity"].append(activity)
        d = pa.get("date") or ""
        if d >= bucket["last_activity_date"]:
            bucket["last_activity_date"] = d
        if pa.get("theme"):
            bucket["themes"][pa["theme"]] += 1
        if activity["thesis_shift"] or not activity["on_thesis_flag"]:
            bucket["thesis_shifts"].append(activity)

    dossiers: list[dict[str, Any]] = []
    for bucket in firm_deals.values():
        deals = bucket["deals"]
        n = len(deals) or 1
        off = sum(1 for d in deals if not d.get("on_thesis_flag"))
        shift_n = len(bucket["thesis_shifts"])
        # Drift: share of off-focus deals + explicit shift flags
        drift = min(100.0, (100.0 * off / n) * 0.7 + min(40.0, shift_n * 18))
        top_themes = [{"theme": t, "count": c} for t, c in bucket["themes"].most_common(5)]
        top_stages = [{"stage": s, "count": c} for s, c in bucket["stages"].most_common(5)]
        top_co = [{"firm": f, "count": c} for f, c in bucket["coinvestors"].most_common(8)]
        conviction = round(
            min(
                100.0,
                20
                + len(deals) * 12
                + sum(1 for d in deals if d.get("recommendation") == "Deep Dive") * 8
                + sum(1 for d in deals if d.get("is_lead")) * 6,
            ),
            1,
        )
        focus_alignment = round(100.0 - drift, 1)
        intel_summary = _firm_summary(bucket["name"], top_themes, drift, shift_n, deals)

        dossiers.append(
            {
                "id": bucket["id"],
                "slug": bucket["slug"],
                "name": bucket["name"],
                "aliases": bucket["aliases"],
                "stated_focus": bucket["stated_focus"],
                "deal_count": len(deals),
                "lead_count": sum(1 for d in deals if d.get("is_lead")),
                "deep_dive_count": sum(1 for d in deals if d.get("recommendation") == "Deep Dive"),
                "thesis_shift_count": shift_n,
                "off_thesis_count": off,
                "drift_score": round(drift, 1),
                "focus_alignment": focus_alignment,
                "conviction_score": conviction,
                "top_themes": top_themes,
                "top_stages": top_stages,
                "top_coinvestors": top_co,
                "last_activity_date": bucket["last_activity_date"],
                "deals": sorted(deals, key=lambda x: x.get("date") or "", reverse=True),
                "recent_activity": sorted(
                    bucket["activity"], key=lambda x: x.get("date") or "", reverse=True
                )[:12],
                "thesis_shifts": bucket["thesis_shifts"],
                "intel_summary": intel_summary,
                "watch_priority": _watch_priority(drift, conviction, shift_n, len(deals)),
            }
        )

    dossiers.sort(
        key=lambda x: (
            -x["watch_priority"],
            -x["conviction_score"],
            -x["deal_count"],
            x["name"],
        )
    )
    return dossiers


def _firm_summary(
    name: str,
    top_themes: list[dict[str, Any]],
    drift: float,
    shift_n: int,
    deals: list[dict[str, Any]],
) -> str:
    theme_str = ", ".join(t["theme"] for t in top_themes[:3]) or "mixed"
    leads = sum(1 for d in deals if d.get("is_lead"))
    bits = [
        f"{name} appears on {len(deals)} pipeline companies ({leads} as lead).",
        f"Concentration: {theme_str}.",
    ]
    if drift >= 35 or shift_n:
        bits.append(
            f"Thesis drift elevated ({drift:.0f}/100, {shift_n} shift flag(s)) — investigate off-focus bets."
        )
    elif drift <= 15:
        bits.append("Staying close to stated focus — useful as a clean peer read.")
    else:
        bits.append("Mild drift — normal multi-stage portfolio noise.")
    return " ".join(bits)


def _watch_priority(drift: float, conviction: float, shift_n: int, deal_n: int) -> float:
    # Partners care most about: active peers, thesis shifts, high-conviction overlap
    return round(conviction * 0.45 + min(40, drift) * 0.35 + shift_n * 8 + min(15, deal_n), 1)


def build_investor_company_matrix(
    dossiers: list[dict[str, Any]],
    companies: list[dict[str, Any]],
    top_firms: int = 18,
    top_companies: int = 24,
) -> dict[str, Any]:
    firm_list = dossiers[:top_firms]
    # Prefer Deep Dive / high score companies for matrix columns
    cos = sorted(companies, key=lambda c: -(c.get("thesis_score") or 0))[:top_companies]
    cells = []
    for f in firm_list:
        deal_ids = {d["company_id"] for d in f.get("deals") or []}
        for c in cos:
            if c["id"] in deal_ids:
                deal = next(d for d in f["deals"] if d["company_id"] == c["id"])
                cells.append(
                    {
                        "firm_slug": f["slug"],
                        "firm": f["name"],
                        "company_id": c["id"],
                        "company": c["name"],
                        "is_lead": deal.get("is_lead", False),
                        "on_thesis": deal.get("on_thesis_flag", True),
                    }
                )
    return {
        "firms": [{"slug": f["slug"], "name": f["name"]} for f in firm_list],
        "companies": [{"id": c["id"], "name": c["name"], "slug": c.get("slug")} for c in cos],
        "cells": cells,
    }


def build_peer_intelligence(
    companies: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    peer_firms: Optional[list[dict[str, Any]]] = None,
) -> dict[str, Any]:
    peer_firms = peer_firms if peer_firms is not None else load_peer_firms()
    comps = build_comparable_sets(companies)
    dossiers = build_firm_dossiers(companies, peer_activity, peer_firms)
    heatmap = build_coinvestor_heatmap(companies)
    matrix = build_investor_company_matrix(dossiers, companies)
    shifts = [pa for pa in peer_activity if pa.get("thesis_shift")]
    sector_bets: Counter = Counter()
    for d in dossiers:
        for t in d.get("top_themes") or []:
            sector_bets[t["theme"]] += t["count"]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "firm_count": len(dossiers),
        "active_peer_count": sum(1 for d in dossiers if d["deal_count"] > 0),
        "thesis_shift_count": len(shifts),
        "firms": dossiers,
        "heatmap": heatmap[:40],
        "matrix": matrix,
        "comparables": comps,
        "thesis_shifts": shifts,
        "sector_bets": [{"theme": t, "count": c} for t, c in sector_bets.most_common(12)],
        "top_watch": [
            {
                "slug": d["slug"],
                "name": d["name"],
                "watch_priority": d["watch_priority"],
                "drift_score": d["drift_score"],
                "deal_count": d["deal_count"],
                "intel_summary": d["intel_summary"],
            }
            for d in dossiers[:8]
        ],
    }

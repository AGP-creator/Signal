from __future__ import annotations

import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import yaml

ROOT = Path(__file__).resolve().parents[2]


def load_thesis_policy(path: Optional[Path] = None) -> dict[str, Any]:
    p = path or (ROOT / "config" / "thesis_policy.yaml")
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def classify_investors(
    investors: list[str], policy: dict[str, Any]
) -> tuple[list[str], list[str], list[str], int, int, int]:
    """Return Tier-1 / Tier-2 / Tier-3 (everyone else) names + counts."""
    tier1 = {_norm(x) for x in policy.get("tier1_firms", [])}
    tier2 = {_norm(x) for x in policy.get("tier2_firms", [])}
    t1_names: list[str] = []
    t2_names: list[str] = []
    t3_names: list[str] = []
    for inv in investors:
        n = _norm(inv)
        if any(n == t or n in t or t in n for t in tier1):
            if inv not in t1_names:
                t1_names.append(inv)
        elif any(n == t or n in t or t in n for t in tier2):
            if inv not in t2_names:
                t2_names.append(inv)
        else:
            if inv not in t3_names:
                t3_names.append(inv)
    return t1_names, t2_names, t3_names, len(t1_names), len(t2_names), len(t3_names)


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def score_dimension_thesis_fit(company: dict[str, Any], policy: dict[str, Any]) -> float:
    theme_ids = {t["id"] for t in policy.get("themes", [])}
    score = 55.0
    if company.get("theme_id") in theme_ids:
        score += 25
    if company.get("pipeline_bucket") == "dominant_tech_growth":
        score += 10
    # Cross-cutting: data moat / regulatory mentioned
    blob = " ".join(
        [
            company.get("moat_notes", ""),
            company.get("one_liner", ""),
            company.get("subsector", ""),
        ]
    ).lower()
    if any(k in blob for k in ("regulat", "data moat", "proprietary", "clearance", "attestation")):
        score += 8
    # Soft penalty when notes explicitly deny defensibility (policy signal, not name list)
    moat = (company.get("moat_notes") or "").lower()
    if any(k in moat for k in ("none", "weak", "no moat", "eroding")):
        score -= 12
    return _clamp(score)


def score_team(company: dict[str, Any]) -> float:
    notes = (company.get("team_notes") or "").lower()
    score = 50.0
    for kw, pts in [
        ("ex-openai", 18),
        ("deepmind", 16),
        ("ex-anduril", 14),
        ("ex-palantir", 12),
        ("ex-stripe", 10),
        ("ex-tesla", 10),
        ("founder", 5),
        ("phd", 5),
    ]:
        if kw in notes:
            score += pts
    return _clamp(score)


def score_cap_table(company: dict[str, Any], policy: dict[str, Any]) -> float:
    t1 = company.get("tier1_count") or 0
    preferred_min = policy["growth_targets"]["preferred_tier1_count_min"]
    preferred_max = policy["growth_targets"]["preferred_tier1_count_max"]
    if t1 >= preferred_min and t1 <= preferred_max + 1:
        score = 90.0
    elif t1 >= 2:
        score = 75.0
    elif t1 == 1:
        score = 60.0
    else:
        score = 35.0
    if company.get("lead_investor"):
        score += 5
    return _clamp(score)


def score_traction(company: dict[str, Any], policy: dict[str, Any]) -> float:
    stage = (company.get("stage") or "").lower()
    yoy = company.get("yoy_growth_pct")
    hc_g = company.get("headcount_6m_growth_pct")
    target = policy["growth_targets"]["growth_stage_yoy_pct"]
    score = 50.0
    if yoy is not None:
        if yoy >= target + 40:
            score = 95
        elif yoy >= target:
            score = 85
        elif yoy >= target * 0.7:
            score = 65
        else:
            score = 40
    elif hc_g is not None:
        # Early-stage proxy
        if hc_g >= 50:
            score = 80
        elif hc_g >= 30:
            score = 70
        else:
            score = 55
    elif "seed" in stage or "pre" in stage:
        score = 60
    notes = (company.get("traction_notes") or "").lower()
    if "decelerat" in notes or "crowded" in notes:
        score -= 15
    return _clamp(score)


def score_moat(company: dict[str, Any]) -> float:
    notes = (company.get("moat_notes") or "").lower()
    score = 45.0
    for kw, pts in [
        ("proprietary", 12),
        ("patent", 10),
        ("regulatory", 12),
        ("clearance", 12),
        ("data", 8),
        ("network", 8),
        ("integration", 6),
        ("weak", -25),
        ("none", -30),
    ]:
        if kw in notes:
            score += pts
    return _clamp(score)


def score_valuation(company: dict[str, Any]) -> float:
    """Banded judgment — never pretend false precision."""
    stage = (company.get("stage") or "").lower()
    val = company.get("valuation_est_m")
    round_size = company.get("last_round_size_m")
    conf = company.get("valuation_confidence", "estimated")
    score = 60.0
    if val is None:
        return 55.0
    # Rough heuristics by stage
    bands = {
        "pre-seed": (10, 40),
        "seed": (20, 80),
        "series a": (80, 350),
        "series b": (300, 1000),
        "series c": (800, 2500),
        "growth": (1000, 5000),
    }
    lo, hi = 50, 2000
    for k, band in bands.items():
        if k in stage:
            lo, hi = band
            break
    if lo <= val <= hi:
        score = 75
    elif val < lo:
        score = 85  # potentially attractive entry
    else:
        # rich
        over = (val - hi) / hi
        score = _clamp(70 - over * 40)
    if conf == "estimated":
        score -= 3
    if round_size and val and round_size / val > 0.25:
        score += 5  # not insanely marked up vs raise
    # Rich entry + weak growth is a valuation haircut (config-driven via growth target)
    yoy = company.get("yoy_growth_pct")
    if val is not None and yoy is not None and yoy < 30 and score > 55:
        score = min(score, 48)
    return _clamp(score)


def score_runway(company: dict[str, Any], policy: dict[str, Any]) -> float:
    runway = company.get("runway_months_est")
    ideal = policy["growth_targets"]["runway_months_ideal"]
    minimum = policy["growth_targets"]["runway_months_min"]
    if runway is None:
        return 50.0
    if runway >= ideal:
        return 90.0
    if runway >= minimum:
        return 70.0
    if runway >= 12:
        return 45.0
    return 25.0


def score_tam_exit(company: dict[str, Any], policy: dict[str, Any]) -> float:
    tam_b = company.get("tam_usd_b")
    min_b = policy["growth_targets"]["tam_usd_min"] / 1e9
    gt = policy.get("growth_targets") or {}
    exit_min = gt.get("exit_horizon_years_min", 3)
    exit_max = gt.get("exit_horizon_years_max", 5)
    exit_years = company.get("exit_horizon_years")
    if exit_years is None:
        # Infer from stage: growth / late = closer to exit window
        stage = (company.get("stage") or "").lower()
        if "growth" in stage or "series d" in stage or "series c" in stage:
            exit_years = exit_min + 1
        elif "series b" in stage:
            exit_years = 4
        else:
            exit_years = 5

    if tam_b is None:
        tam_score = 50.0
    elif tam_b >= min_b * 2:
        tam_score = 90.0
    elif tam_b >= min_b:
        tam_score = 80.0
    elif tam_b >= min_b * 0.5:
        tam_score = 60.0
    else:
        tam_score = 40.0

    if exit_min <= exit_years <= exit_max:
        exit_score = 90.0
    elif exit_years < exit_min:
        exit_score = 70.0  # possibly too near-term / late
    else:
        exit_score = 55.0  # long-dated vs 3–5yr preference
    return _clamp(0.7 * tam_score + 0.3 * exit_score)


def score_timing(company: dict[str, Any], as_of: Optional[date] = None) -> float:
    as_of = as_of or date.today()
    raw = company.get("last_signal_date")
    if not raw:
        return 40.0
    try:
        d = datetime.strptime(raw[:10], "%Y-%m-%d").date()
    except ValueError:
        return 40.0
    days = (as_of - d).days
    if days <= 14:
        return 95.0
    if days <= 30:
        return 85.0
    if days <= 60:
        return 70.0
    if days <= 90:
        return 55.0
    return 30.0


def _clause(text: Any, fallback: str = "") -> str:
    """Normalize a note into a single clause without trailing junk punctuation."""
    raw = str(text or "").strip()
    if not raw:
        return fallback
    # Collapse AI-ish double periods / ellipsis noise into one stop
    cleaned = re.sub(r"\.{2,}", ".", raw)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = cleaned.rstrip(".;,: ")
    return cleaned


def build_why_now(company: dict[str, Any], breakdown: dict[str, float]) -> str:
    """Short partner-readable why-now. Clean sentences only — no label soup or score echo."""
    _ = breakdown  # kept for call-site compatibility
    name = company.get("name") or "This company"
    sub = _clause(company.get("subsector") or company.get("sector_theme"), "its category")
    stage = _clause(company.get("stage"), "an undisclosed stage")
    team = _clause(company.get("team_notes"))
    traction = _clause(company.get("traction_notes"))
    moat = _clause(company.get("moat_notes"))
    lead = _clause(company.get("lead_investor"), "undisclosed")
    t1_names = [n for n in (company.get("tier1_names") or []) if n]
    t1_count = int(company.get("tier1_count") or len(t1_names) or 0)
    growth = company.get("yoy_growth_pct")
    growth_bit = f"{growth:.0f}% YoY" if growth is not None else None
    val = company.get("valuation_est_m")
    conf = _clause(company.get("valuation_confidence"), "estimated")

    sentences: list[str] = [f"{name} is a {sub} company at {stage}."]

    if team:
        team = team.replace(" + ", " and ")
        sentences.append(f"{team}.")

    if t1_count > 0 and t1_names:
        names = ", ".join(t1_names[:4])
        more = f" and {t1_count - 4} more" if t1_count > 4 else ""
        sentences.append(f"{t1_count} Tier-1 on the cap table ({names}{more}), led by {lead}.")
    elif t1_count > 0:
        sentences.append(f"{t1_count} Tier-1 on the cap table, led by {lead}.")
    else:
        sentences.append(f"Cap table is still light on Tier-1. Lead is {lead}.")

    if traction and growth_bit:
        sentences.append(f"{traction} ({growth_bit}).")
    elif traction:
        sentences.append(f"{traction}.")
    elif growth_bit:
        sentences.append(f"Growth running near {growth_bit}.")

    if moat:
        moat = moat.replace(" + ", " and ")
        sentences.append(f"{moat}.")

    if val is not None:
        sentences.append(f"Entry around ${val:g}M post ({conf}).")

    return " ".join(sentences)


def score_company(company: dict[str, Any], policy: dict[str, Any], as_of: Optional[date] = None) -> dict[str, Any]:
    t1_names, t2_names, t3_names, t1_count, t2_count, t3_count = classify_investors(
        company.get("investors") or [], policy
    )
    company = {**company}
    company["tier1_names"] = t1_names
    company["tier1_count"] = t1_count
    company["tier2_names"] = t2_names
    company["tier2_count"] = t2_count
    company["tier3_names"] = t3_names
    company["tier3_count"] = t3_count

    weights = policy["scoring_weights"]
    breakdown = {
        "thesis_fit": score_dimension_thesis_fit(company, policy),
        "team_quality": score_team(company),
        "cap_table": score_cap_table(company, policy),
        "traction": score_traction(company, policy),
        "moat": score_moat(company),
        "valuation": score_valuation(company),
        "runway": score_runway(company, policy),
        "tam_exit": score_tam_exit(company, policy),
        "timing": score_timing(company, as_of),
    }
    total = sum(breakdown[k] * weights[k] for k in weights)
    company["score_breakdown"] = {k: round(v, 1) for k, v in breakdown.items()}
    company["thesis_score"] = round(total, 1)

    thresholds = policy["recommendation_thresholds"]
    # Deep Dive prefers Tier-1 density; exceptional scores without T1 still qualify
    if total >= thresholds["deep_dive"] and (t1_count >= 2 or total >= thresholds["deep_dive"] + 5):
        rec = "Deep Dive"
    elif total >= thresholds["deep_dive"]:
        rec = "Watch"  # high score but thin cap table → watch, not IC yet
    elif total >= thresholds["watch"]:
        rec = "Watch"
    else:
        rec = "Pass"
    # Hard floors from thesis policy — never Deep Dive without growth + moat signal
    yoy = company.get("yoy_growth_pct")
    moat = (company.get("moat_notes") or "").lower()
    weak_moat = any(k in moat for k in ("none", "weak", "no moat", "eroding"))
    growth_floor = policy["growth_targets"]["growth_stage_yoy_pct"]
    if weak_moat and (yoy is None or yoy < growth_floor * 0.75) and t1_count < 2:
        rec = "Pass"
        company["thesis_score"] = min(company["thesis_score"], 52.0)

    company["recommendation"] = rec
    company["why_now"] = build_why_now(company, breakdown)
    company["brief_id"] = company.get("brief_id") or f"brief_{company['id']}"
    return company


def apply_relative_ranks(companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    from collections import defaultdict

    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for c in companies:
        key = (c.get("theme_id") or c.get("sector_theme") or "other", c.get("stage") or "n/a")
        groups[key].append(c)

    for (theme, stage), members in groups.items():
        ordered = sorted(members, key=lambda x: x.get("thesis_score") or 0, reverse=True)
        n = len(ordered)
        for i, c in enumerate(ordered):
            c["relative_rank"] = f"#{i + 1} of {n} {c.get('sector_theme', theme)} {stage}"
    return companies


def mark_stale(companies: list[dict[str, Any]], policy: dict[str, Any], as_of: Optional[date] = None) -> list[dict[str, Any]]:
    """Flag 90d+ quiet names for partner review. Never deletes.

    Partner Keep / Archive decisions survive — they are not reset to Pending.
    """
    as_of = as_of or date.today()
    stale_days = policy.get("stale_days", 90)
    protected = {
        "reviewed — keep",
        "archived (partner)",
        "keep in pipeline",
        "archived (partner pass)",
    }
    for c in companies:
        decision = (c.get("partner_decision") or "").lower()
        status = (c.get("review_status") or "").lower()
        raw = c.get("last_signal_date")
        try:
            d = datetime.strptime(str(raw)[:10], "%Y-%m-%d").date()
            days = (as_of - d).days
        except Exception:
            days = 999

        chronologically_stale = days >= stale_days

        if decision == "archive" or "archived" in status:
            c["is_stale"] = False
            c["review_status"] = "Archived (partner)"
            c["recommendation"] = "Pass"
            continue
        if decision == "keep" or status in protected:
            # Partner kept it — stay on the list even if quiet; not in pending queue
            c["is_stale"] = False
            c["review_status"] = "Reviewed — keep"
            continue
        if decision == "refresh" or status == "refresh requested":
            c["is_stale"] = True
            c["review_status"] = "Refresh requested"
            continue

        if chronologically_stale:
            c["is_stale"] = True
            c["review_status"] = "Pending Partner Review"
        else:
            c["is_stale"] = False
            # Clear stale pending when a fresh signal arrived; keep other statuses
            if status == "pending partner review":
                c["review_status"] = None
            else:
                c["review_status"] = c.get("review_status")
    return companies


def score_all(
    companies: list[dict[str, Any]],
    policy: Optional[dict[str, Any]] = None,
    as_of: Optional[date] = None,
) -> list[dict[str, Any]]:
    """Full batch re-score (thesis weights + relative rank + 90d stale hygiene)."""
    policy = policy or load_thesis_policy()
    as_of = as_of or date.today()
    scored = [score_company(c, policy, as_of=as_of) for c in companies]
    scored = apply_relative_ranks(scored)
    scored = mark_stale(scored, policy, as_of=as_of)
    return scored

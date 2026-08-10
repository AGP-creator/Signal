"""Golden / partner-grade insights derived from peer intelligence."""

from __future__ import annotations

from typing import Any


def build_golden_insights(
    companies: list[dict[str, Any]],
    peer_intel: dict[str, Any],
) -> dict[str, Any]:
    firms = peer_intel.get("firms") or []
    heatmap = peer_intel.get("heatmap") or []
    shifts = peer_intel.get("thesis_shifts") or []
    deep = [c for c in companies if c.get("recommendation") == "Deep Dive"]

    insights: list[dict[str, Any]] = []
    proprietary = []
    for c in deep:
        n = len(c.get("investors") or [])
        if n <= 3 and (c.get("thesis_score") or 0) >= 75:
            proprietary.append(c)
            insights.append(
                {
                    "urgency": "now",
                    "kind": "alpha",
                    "title": f"Proprietary edge: {c.get('name')}",
                    "insight": (
                        f"{c.get('name')} is Deep Dive (score {c.get('thesis_score')}) "
                        f"with a quiet/selective cap table ({n} known peers)."
                    ),
                    "action": "Partner takes the call this week — lock process before peer FOMO.",
                    "score": 95 if n <= 2 else 90,
                }
            )

    for shift in shifts[:4]:
        insights.append(
            {
                "urgency": "now",
                "kind": "asymmetric",
                "title": f"Asymmetric: {shift.get('firm')} → {shift.get('company_name')}",
                "insight": shift.get("notes") or "Off-thesis peer move.",
                "action": f"Sector-scan around {shift.get('theme')} before consensus forms.",
                "score": 92,
            }
        )

    # Crowded Deep Dives
    for c in deep:
        n = len(c.get("investors") or [])
        if n >= 5:
            insights.append(
                {
                    "urgency": "this_week",
                    "kind": "race",
                    "title": f"Competitive race: {c.get('name')}",
                    "insight": f"{n} investors already on the tape.",
                    "action": "Decide lead vs pass fast; use heatmap for one syndicate ally.",
                    "score": 80,
                }
            )

    # Syndicate unlocks (top heatmap adjacency)
    for c in deep[:8]:
        already = {str(x).lower() for x in (c.get("investors") or [])}
        for pair in heatmap[:30]:
            a, b = (pair.get("firm_a") or "").lower(), (pair.get("firm_b") or "").lower()
            a_in, b_in = a in already, b in already
            if a_in == b_in:
                continue
            missing = pair.get("firm_b") if a_in else pair.get("firm_a")
            present = pair.get("firm_a") if a_in else pair.get("firm_b")
            insights.append(
                {
                    "urgency": "this_week",
                    "kind": "syndicate",
                    "title": f"Syndicate unlock: call {missing} on {c.get('name')}",
                    "insight": f"Co-invests with {present} ({pair.get('coinvest_count')}×).",
                    "action": f"Warm intro path; position Thirdbase as high-conviction co-investor.",
                    "score": 84,
                }
            )
            break

    insights = sorted(
        insights,
        key=lambda x: ({"now": 0, "this_week": 1, "monitor": 2}.get(x["urgency"], 9), -x["score"]),
    )[:14]

    must = [i for i in insights if i["urgency"] == "now"][:4]
    brief = {
        "subject": f"Signal Competitor Brief — {len(must)} moves that matter",
        "headline": must[0]["title"] if must else "Peer set quiet — deepen proprietary coverage",
        "must_do": [f"{i['title']}: {i['action']}" for i in must],
        "watch": [i["title"] for i in insights if i["urgency"] != "now"][:4],
        "proprietary": [c.get("name") for c in proprietary[:6]],
    }
    return {"insights": insights, "brief": brief, "proprietary_count": len(proprietary)}

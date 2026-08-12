"""Immediate special-routing alerts — evaluate + dispatch."""

from __future__ import annotations

from pathlib import Path

from src.digest import (
    IMMEDIATE_ALERT_TYPES,
    dispatch_immediate_alerts,
    evaluate_alerts,
    filter_immediate_alerts,
    render_alert_email,
)


def test_tier1_density_fires_for_deep_dive():
    companies = [
        {
            "id": "c1",
            "name": "AgentGate",
            "slug": "agentgate",
            "recommendation": "Deep Dive",
            "thesis_score": 88,
            "tier1_count": 3,
            "tier1_names": ["Sequoia", "a16z", "Greylock"],
        },
        {
            "id": "c2",
            "name": "WatchOnly",
            "slug": "watchonly",
            "recommendation": "Watch",
            "thesis_score": 70,
            "tier1_count": 3,
            "tier1_names": ["Sequoia", "a16z", "Greylock"],
        },
    ]
    alerts = evaluate_alerts(companies, [])
    tier1 = [a for a in alerts if a["alert_type"] == "tier1_density"]
    assert len(tier1) == 1
    assert tier1[0]["company_id"] == "c1"
    assert tier1[0]["severity"] == "high"
    assert tier1[0]["id"] in {a["id"] for a in filter_immediate_alerts(alerts)}


def test_off_thesis_fires_on_flag_or_shift():
    peers = [
        {
            "id": "p1",
            "firm": "Sequoia",
            "company_name": "CryptoCo",
            "company_id": None,
            "thesis_shift": True,
            "on_thesis_flag": False,
            "notes": "First crypto check in years.",
        },
        {
            "id": "p2",
            "firm": "a16z",
            "company_name": "QuietOff",
            "company_id": None,
            "thesis_shift": False,
            "on_thesis_flag": False,
            "notes": "Outside stated focus.",
        },
        {
            "id": "p3",
            "firm": "Ribbit",
            "company_name": "OnThesis",
            "company_id": None,
            "thesis_shift": False,
            "on_thesis_flag": True,
            "notes": "Core fintech.",
        },
    ]
    alerts = evaluate_alerts([], peers)
    off = [a for a in alerts if a["alert_type"] == "off_thesis_peer_move"]
    assert {a["id"] for a in off} == {"alert_shift_p1", "alert_shift_p2"}
    assert all(a["severity"] == "high" for a in off)


def test_watched_founder_from_gp_and_operator():
    commentary = [
        {
            "id": "cm1",
            "company_id": "c9",
            "quote_or_summary": "Elad Gil watching a stealth newco in RL infra.",
        }
    ]
    signals = [
        {
            "id": "s1",
            "company_id": "c10",
            "title": "ex-DeepMind founder launching robotics newco",
            "summary": "Stealth start from watched operator prior.",
        }
    ]
    companies = [
        {"id": "c9", "name": "StealthRL", "slug": "stealthrl"},
        {"id": "c10", "name": "RoboNew", "slug": "robonew"},
    ]
    alerts = evaluate_alerts(companies, [], commentary=commentary, signals=signals)
    founders = [a for a in alerts if a["alert_type"] == "watched_founder_newco"]
    assert len(founders) >= 2
    assert any("Elad" in (a.get("title") or "") for a in founders)
    assert any("DeepMind" in (a.get("title") or "") for a in founders)
    assert set(IMMEDIATE_ALERT_TYPES) >= {"tier1_density", "off_thesis_peer_move", "watched_founder_newco"}


def test_dispatch_dedupes_and_writes_previews(tmp_path: Path):
    alerts = [
        {
            "id": "alert_tier1_c1",
            "alert_type": "tier1_density",
            "severity": "high",
            "title": "2+ Tier-1 on AgentGate",
            "body": "Immediate routing — do not wait for next digest.",
            "company_id": "c1",
            "company_slug": "agentgate",
            "company_name": "AgentGate",
        },
        {
            "id": "alert_score_c1",
            "alert_type": "deep_dive_threshold",
            "severity": "medium",
            "title": "Deep Dive threshold",
            "body": "score crossed",
            "company_id": "c1",
        },
    ]
    # Empty emailed set would bootstrap — force send for this unit test
    first = dispatch_immediate_alerts(
        alerts,
        previously_emailed=set(),
        out_dir=tmp_path,
        send=True,
        bootstrap_existing=False,
    )
    assert first["pending_count"] == 1
    assert first["sent_ids"] == ["alert_tier1_c1"]
    assert (tmp_path / "alert_latest.eml").exists()

    second = dispatch_immediate_alerts(
        alerts,
        previously_emailed=set(first["emailed_ids"]),
        out_dir=tmp_path,
        send=True,
    )
    assert second["pending_count"] == 0
    assert second["sent_ids"] == []
    assert "alert_tier1_c1" in second["suppressed"]


def test_dispatch_bootstraps_existing_without_send(tmp_path: Path):
    alerts = [
        {
            "id": "alert_tier1_c1",
            "alert_type": "tier1_density",
            "severity": "high",
            "title": "2+ Tier-1 on AgentGate",
            "body": "body",
            "company_id": "c1",
        }
    ]
    result = dispatch_immediate_alerts(
        alerts,
        previously_emailed=set(),
        out_dir=tmp_path,
        send=True,
        bootstrap_existing=True,
    )
    assert result["bootstrapped"] is True
    assert result["sent_ids"] == []
    assert "alert_tier1_c1" in result["emailed_ids"]
    assert not (tmp_path / "alert_latest.eml").exists()


def test_render_alert_email_has_subject_html():
    rendered = render_alert_email(
        {
            "title": "2+ Tier-1 on AgentGate",
            "severity": "high",
            "alert_type": "tier1_density",
            "body": "Three Tier-1 on the cap table.",
            "company_slug": "agentgate",
        }
    )
    assert rendered["subject"].startswith("[Signal ALERT]")
    assert "Immediate" in rendered["html"]
    assert "agentgate" in rendered["html"]
    assert "do not wait" in rendered["text"].lower() or "Immediate" in rendered["text"]

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.briefs import enrich_company_brief_fields, generate_threshold_briefs
from src.db.supabase_store import (
    get_meta,
    healthcheck,
    load_all_companies,
    load_table,
    replace_table,
    set_meta,
    upsert_companies,
)
from src.digest import build_digest, dispatch_immediate_alerts, evaluate_alerts
from src.excel import build_workbook
from src.ingest import run_live_ingest
from src.ingest.dedupe import dedupe_companies
from src.ingest.discovery import (
    apply_live_signals_to_companies,
    curate_news_from_signals,
    enrich_sector_evidence,
)
from src.ingest.prefill import sourcing_mode
from src.intelligence import build_peer_intelligence
from src.intelligence.golden import build_golden_insights
from src.intelligence.judgment import build_judgment_pack
from src.pipeline import (
    apply_partner_reviews,
    is_archived,
    load_partner_reviews,
    merge_pipeline_companies,
    merge_record_lists,
)
from src.scoring import load_thesis_policy, score_all
SEED_PATH = ROOT / "data" / "seed" / "seed_corpus.json"
OUT_DIR = ROOT / "data" / "output"


def load_seed() -> dict[str, Any]:
    if not SEED_PATH.exists():
        from scripts.generate_seed import main as gen

        gen()
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def attach_commentary_summaries(companies: list[dict], commentary: list[dict]) -> None:
    by: dict[str, list[str]] = {}
    for cm in commentary:
        by.setdefault(cm.get("company_id"), []).append(cm.get("quote_or_summary") or "")
    for c in companies:
        bits = by.get(c["id"], [])
        c["commentary_summary"] = "; ".join(bits[:2]) if bits else c.get("commentary_summary")


def _signal_row(s: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": s["id"],
        "company_id": s.get("company_id"),
        "company_name": s.get("company_name"),
        "source": s.get("source"),
        "signal_type": s.get("signal_type"),
        "title": s.get("title"),
        "summary": s.get("summary"),
        "url": s.get("url"),
        "observed_at": s.get("observed_at"),
        "raw": s.get("raw") or {},
    }


def _dedupe_signal_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Same company + title from multiple sources consolidates to one row."""
    seen_ids: set[str] = set()
    seen_keys: set[str] = set()
    out: list[dict[str, Any]] = []
    for s in rows:
        sid = str(s.get("id") or "")
        if sid and sid in seen_ids:
            continue
        name = (s.get("company_name") or "").strip().lower()
        title = "".join(ch for ch in (s.get("title") or "").lower() if ch.isalnum())[:48]
        key = f"{name}|{title}" if name or title else sid
        if key in seen_keys:
            continue
        if sid:
            seen_ids.add(sid)
        seen_keys.add(key)
        out.append(s)
    return out


def run_refresh(live: bool = True) -> dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    hc = healthcheck()
    if not hc.get("tables"):
        return {
            "ok": False,
            "error": "Supabase schema not applied",
            "hint": "Open https://supabase.com/dashboard/project/ixnenoiggoijvawoykto/sql/new and run supabase/migrations/001_init.sql",
            "detail": hc.get("error"),
        }

    seed = load_seed()
    policy = load_thesis_policy()

    seed_companies = list(seed.get("companies") or [])
    commentary = list(seed.get("commentary") or [])
    news = list(seed.get("news") or [])
    peer_activity = list(seed.get("peer_activity") or [])
    sector_calls = list(seed.get("sector_calls") or [])
    signals = list(seed.get("signals") or [])

    # Self-maintaining: union seed with prior DB state so live discoveries + partner
    # decisions survive the next refresh (seed alone would wipe them).
    db_companies: list[dict] = []
    try:
        db_companies = load_all_companies()
    except Exception as exc:
        set_meta("pipeline_db_load_error", str(exc)[:500])
    try:
        commentary = merge_record_lists(commentary, load_table("commentary"))
        news = merge_record_lists(news, load_table("news"))
        peer_activity = merge_record_lists(peer_activity, load_table("peer_activity"))
    except Exception:
        pass

    companies = merge_pipeline_companies(seed_companies, db_companies)
    partner_reviews = load_partner_reviews()
    # Stamp partner fields onto companies before scoring so mark_stale respects them
    companies = apply_partner_reviews(companies, partner_reviews)

    live_signals: list[dict] = []
    discovered = 0
    live_commentary: list[dict] = []
    if live:
        live_signals = [s.to_dict() for s in run_live_ingest()]
        mode = sourcing_mode()
        if mode == "prefill" and live_signals:
            # Prefill adapter already is the seed corpus — avoid double-count
            signals = list(live_signals)
        else:
            signals = _dedupe_signal_rows(list(signals) + list(live_signals))
        companies, discovered, live_commentary = apply_live_signals_to_companies(
            companies, live_signals, policy
        )
        news = curate_news_from_signals(news, live_signals, policy, companies=companies)
        sector_calls = enrich_sector_evidence(sector_calls, live_signals)

    if live_commentary:
        commentary = merge_record_lists(commentary, live_commentary)

    companies = dedupe_companies(companies)
    scored = score_all(companies, policy)
    # Re-apply after scoring so archive → Pass wins over score recommendation
    scored = apply_partner_reviews(scored, partner_reviews)
    attach_commentary_summaries(scored, commentary)

    active = [c for c in scored if not is_archived(c)]
    archived_count = len(scored) - len(active)

    # Soft portfolio mix check (60/40 target) — surfaces in meta for partners
    dominant = sum(1 for c in active if c.get("pipeline_bucket") == "dominant_tech_growth")
    tactical = sum(1 for c in active if c.get("pipeline_bucket") == "tactical_sector_agnostic")
    total_bucketed = dominant + tactical or 1
    mix_observed = {
        "dominant_tech_growth": round(dominant / total_bucketed, 3),
        "tactical_sector_agnostic": round(tactical / total_bucketed, 3),
        "target_dominant": (policy.get("portfolio_mix") or {}).get("dominant_tech_growth", 0.6),
        "target_tactical": (policy.get("portfolio_mix") or {}).get("tactical_sector_agnostic", 0.4),
    }

    alerts = evaluate_alerts(active, peer_activity, commentary=commentary, signals=signals)
    # Company intelligence briefs — auto-trigger when Watch / Deep Dive threshold crossed
    previous_recs: dict[str, str] = {}
    try:
        raw_prev = get_meta("brief_recommendation_snapshot", "{}")
        previous_recs = json.loads(raw_prev or "{}")
    except Exception:
        previous_recs = {}
    brief_pack = generate_threshold_briefs(
        active,
        commentary,
        peer_activity,
        OUT_DIR / "briefs",
        previous_recs=previous_recs,
    )
    try:
        set_meta(
            "brief_recommendation_snapshot",
            json.dumps(
                {
                    c["id"]: c.get("recommendation")
                    for c in active
                    if c.get("recommendation")
                }
            ),
        )
        set_meta("last_briefs", json.dumps(brief_pack))
    except Exception as exc:
        set_meta("brief_error", str(exc)[:500])

    # Attach brief URLs onto threshold alerts for partner routing
    brief_by_id = {
        b.get("company_id"): b for b in (brief_pack.get("briefs") or []) if b.get("company_id")
    }
    for a in alerts:
        b = brief_by_id.get(a.get("company_id"))
        if b:
            a["brief_id"] = b.get("brief_id")
            a["brief_path"] = b.get("markdown_path")
            slug = a.get("company_slug") or b.get("slug")
            if slug:
                a["brief_url"] = f"/company/{slug}"

    # New threshold crossings get an explicit brief_ready alert (medium)
    now_iso = datetime.now(timezone.utc).isoformat()
    for cross in brief_pack.get("new_crossings") or []:
        cid = cross.get("company_id")
        if not cid:
            continue
        # Skip if we already have a deep_dive_threshold / tier1 alert for same company
        existing = {
            (x.get("alert_type"), x.get("company_id"))
            for x in alerts
        }
        if ("brief_ready", cid) in existing:
            continue
        alerts.append(
            {
                "id": f"alert_brief_{cid}",
                "alert_type": "brief_ready",
                "severity": "medium",
                "title": f"Intelligence brief ready: {cross.get('name')}",
                "body": (
                    f"{cross.get('name')} scored {cross.get('recommendation')} "
                    f"({cross.get('thesis_score')}). Structured one-pager generated — "
                    f"funding, Tier mix, team/hiring, product traction, thesis fit, comps, commentary."
                ),
                "company_id": cid,
                "company_slug": cross.get("slug") or cid,
                "company_name": cross.get("name"),
                "brief_id": cross.get("brief_id"),
                "brief_path": cross.get("brief_path"),
                "brief_url": f"/company/{cross.get('slug') or cid}",
                "created_at": now_iso,
            }
        )

    # Immediate special-routing emails (2+ Tier-1, off-thesis peer, watched founder)
    # — fire on every refresh when new; never held for M/W/F digest.
    previously_emailed: set[str] = set()
    try:
        raw_sent = get_meta("alert_emails_sent", "[]")
        previously_emailed = set(json.loads(raw_sent or "[]"))
    except Exception:
        previously_emailed = set()
    alert_mail = dispatch_immediate_alerts(
        alerts,
        previously_emailed=previously_emailed,
        out_dir=OUT_DIR / "alerts",
    )
    try:
        set_meta("alert_emails_sent", json.dumps(alert_mail.get("emailed_ids") or []))
        set_meta(
            "last_immediate_alerts",
            json.dumps(
                {
                    "at": datetime.now(timezone.utc).isoformat(),
                    "pending": alert_mail.get("pending_count"),
                    "sent_ids": alert_mail.get("sent_ids") or [],
                    "immediate_count": alert_mail.get("immediate_count"),
                }
            ),
        )
    except Exception as exc:
        set_meta("alert_email_error", str(exc)[:500])

    digest = build_digest(active, sector_calls, news, peer_activity)
    peer_intel = build_peer_intelligence(active, peer_activity)
    golden = build_golden_insights(active, peer_intel)
    judgment = build_judgment_pack(active, peer_activity, commentary, news, alerts)
    # Persist funding history + product notes on every company (payload-backed)
    for c in scored:
        enriched = enrich_company_brief_fields(c)
        c["funding_rounds"] = enriched["funding_rounds"]
        c["product_notes"] = enriched["product_notes"]

    # Persist to Supabase (source of truth)
    upsert_companies(scored)
    replace_table("commentary", commentary)
    replace_table("news", news)
    replace_table("peer_activity", peer_activity)
    try:
        replace_table(
            "peer_firms",
            [
                {
                    "id": f["id"],
                    "slug": f["slug"],
                    "name": f["name"],
                    "aliases": f.get("aliases") or [],
                    "stated_focus": f.get("stated_focus"),
                    "deal_count": f.get("deal_count") or 0,
                    "lead_count": f.get("lead_count") or 0,
                    "deep_dive_count": f.get("deep_dive_count") or 0,
                    "thesis_shift_count": f.get("thesis_shift_count") or 0,
                    "off_thesis_count": f.get("off_thesis_count") or 0,
                    "drift_score": f.get("drift_score"),
                    "focus_alignment": f.get("focus_alignment"),
                    "conviction_score": f.get("conviction_score"),
                    "watch_priority": f.get("watch_priority"),
                    "top_themes": f.get("top_themes") or [],
                    "top_stages": f.get("top_stages") or [],
                    "top_coinvestors": f.get("top_coinvestors") or [],
                    "last_activity_date": f.get("last_activity_date"),
                    "deals": f.get("deals") or [],
                    "recent_activity": f.get("recent_activity") or [],
                    "thesis_shifts": f.get("thesis_shifts") or [],
                    "intel_summary": f.get("intel_summary"),
                    "payload": f,
                }
                for f in peer_intel.get("firms") or []
            ],
        )
    except Exception as exc:
        # Table may not exist until 002_peer_firms.sql is applied — meta snapshot still works
        set_meta("peer_firms_error", str(exc)[:500])
    replace_table(
        "sector_calls",
        [
            {
                **s,
                "evidence": s.get("evidence") or [],
                "top_companies": s.get("top_companies") or [],
            }
            for s in sector_calls
        ],
    )
    replace_table("signals", [_signal_row(s) for s in signals])
    replace_table("alerts", [
        {
            "id": a["id"],
            "alert_type": a.get("alert_type"),
            "severity": a.get("severity"),
            "title": a.get("title"),
            "body": a.get("body"),
            "company_id": a.get("company_id"),
            "created_at": a.get("created_at"),
        }
        for a in alerts
    ])
    replace_table(
        "digests",
        [
            {
                "id": f"digest_{digest['generated_at']}",
                "subject": digest["subject"],
                "generated_at": digest["generated_at"],
                "created_at": digest["generated_at"],
                "markdown": digest["markdown"],
                "html": digest["html"],
                "payload": {
                    "deals": digest["deals"],
                    "sector_calls": digest["sector_calls"],
                    "news": digest["news"],
                    "peer_moves": digest["peer_moves"],
                },
            }
        ],
    )

    refreshed = datetime.now(timezone.utc).isoformat()
    set_meta("last_refreshed", refreshed)
    set_meta("provenance", json.dumps(seed.get("provenance") or {}))
    set_meta("live_signal_count", str(len(live_signals)))
    set_meta("discovered_companies", str(discovered))
    set_meta(
        "sourcing_mode",
        json.dumps(
            {
                "mode": sourcing_mode(),
                "signal_count": len(live_signals),
                "discovered": discovered,
                "note": (
                    "prefill = seed signals only (no Gemini). "
                    "Set SIGNAL_SOURCING_MODE=live|hybrid for network adapters."
                ),
            }
        ),
    )
    set_meta("portfolio_mix", json.dumps(mix_observed))
    set_meta(
        "pipeline_hygiene",
        json.dumps(
            {
                "at": refreshed,
                "companies": len(scored),
                "active": len(active),
                "archived": archived_count,
                "stale_pending": sum(
                    1
                    for c in scored
                    if c.get("is_stale")
                    and (c.get("review_status") or "")
                    in ("Pending Partner Review", "Refresh requested")
                ),
                "partner_reviews": len(partner_reviews),
                "db_merged": len(db_companies),
                "live_commentary": len(live_commentary),
            }
        ),
    )
    # Compact snapshot for UI / chat (full firm list can be large)
    set_meta(
        "peer_intelligence",
        json.dumps(
            {
                "generated_at": peer_intel.get("generated_at"),
                "firm_count": peer_intel.get("firm_count"),
                "active_peer_count": peer_intel.get("active_peer_count"),
                "thesis_shift_count": peer_intel.get("thesis_shift_count"),
                "top_watch": peer_intel.get("top_watch"),
                "sector_bets": peer_intel.get("sector_bets"),
                "heatmap": peer_intel.get("heatmap"),
                "matrix": peer_intel.get("matrix"),
                "comparables": peer_intel.get("comparables"),
                "firms": peer_intel.get("firms"),
                "thesis_shifts": peer_intel.get("thesis_shifts"),
                "golden": golden,
            }
        ),
    )
    (OUT_DIR / "peer_intelligence.json").write_text(
        json.dumps({**peer_intel, "golden": golden}, indent=2), encoding="utf-8"
    )
    (OUT_DIR / "golden_insights.json").write_text(json.dumps(golden, indent=2), encoding="utf-8")
    (OUT_DIR / "judgment_pack.json").write_text(json.dumps(judgment, indent=2), encoding="utf-8")
    set_meta("judgment_os", json.dumps(judgment))

    xlsx = build_workbook(
        active,
        commentary,
        news,
        peer_activity,
        sector_calls,
        meta={
            "last_refreshed": refreshed,
            "provenance": (
                f"Supabase-backed self-maintaining pipeline · seed + DB merge · "
                f"sourcing_mode={sourcing_mode()} ({len(live_signals)} signals)."
            ),
            "app_base": os.environ.get("SIGNAL_APP_BASE", "http://localhost:3000"),
            "peer_firms": peer_intel.get("firms") or [],
            "peer_matrix": peer_intel.get("matrix") or {},
            "heatmap": peer_intel.get("heatmap") or [],
            "golden_insights": golden.get("insights") or [],
            "golden_brief": golden.get("brief") or {},
            "judgment": judgment,
            "archived_count": archived_count,
            "alerts": alerts,
            "digest": digest,
            "thesis_shifts": peer_intel.get("thesis_shifts") or [],
        },
        out_path=OUT_DIR / "Thirdbase_Deal_Pipeline.xlsx",
    )
    digest_path = OUT_DIR / "digest_latest.md"
    from src.digest.emailer import send_email, write_digest_previews

    write_digest_previews(digest, OUT_DIR)
    mail_result = send_email(digest["subject"], digest["html"], digest["markdown"])
    (OUT_DIR / "alerts_latest.json").write_text(json.dumps(alerts, indent=2), encoding="utf-8")

    summary = {
        "ok": True,
        "backend": "supabase",
        "companies": len(scored),
        "active": len(active),
        "archived": archived_count,
        "deep_dive": sum(1 for c in active if c.get("recommendation") == "Deep Dive"),
        "watch": sum(1 for c in active if c.get("recommendation") == "Watch"),
        "pass": sum(1 for c in active if c.get("recommendation") == "Pass"),
        "stale": sum(1 for c in scored if c.get("is_stale")),
        "stale_pending_review": sum(
            1
            for c in scored
            if c.get("is_stale")
            and (c.get("review_status") or "") in ("Pending Partner Review", "Refresh requested")
        ),
        "partner_reviews": len(partner_reviews),
        "live_signals": len(live_signals),
        "discovered_companies": discovered,
        "live_commentary": len(live_commentary),
        "portfolio_mix": mix_observed,
        "alerts": len(alerts),
        "briefs": {
            "count": brief_pack.get("count"),
            "new_crossings": brief_pack.get("new_crossing_count"),
            "dir": str(OUT_DIR / "briefs"),
        },
        "immediate_alerts": {
            "count": alert_mail.get("immediate_count"),
            "pending": alert_mail.get("pending_count"),
            "sent_ids": alert_mail.get("sent_ids") or [],
            "enabled": alert_mail.get("enabled"),
        },
        "peer_firms": peer_intel.get("firm_count"),
        "thesis_shifts": peer_intel.get("thesis_shift_count"),
        "xlsx": str(xlsx),
        "digest": str(digest_path),
        "email": mail_result,
        "alert_email": {
            "sent": len(alert_mail.get("sent_ids") or []),
            "results": alert_mail.get("sent") or [],
        },
        "last_refreshed": refreshed,
        "verify_count": len(load_all_companies()),
    }
    (OUT_DIR / "refresh_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Refresh Thirdbase Signal → Supabase + Excel")
    parser.add_argument("--offline", action="store_true", help="Skip live ingest adapters")
    args = parser.parse_args()
    summary = run_refresh(live=not args.offline)
    print(json.dumps(summary, indent=2))
    if not summary.get("ok"):
        sys.exit(2)


if __name__ == "__main__":
    main()

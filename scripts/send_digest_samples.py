"""Generate and optionally send Mon / Wed / Fri sample partner digests.

Usage:
  python scripts/send_digest_samples.py
  python scripts/send_digest_samples.py --send   # attempt SMTP if configured
  python scripts/send_digest_samples.py --no-db  # skip Supabase upsert

Always writes HTML / Markdown / .eml under data/output/digest_samples/.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.db.supabase_store import healthcheck, load_all_companies, load_table, replace_table
from src.digest import build_digest, evaluate_alerts
from src.digest.emailer import (
    digest_enabled,
    digest_recipients,
    send_email,
    smtp_configured,
    write_digest_previews,
)
from src.digest.mail_config import public_mail_status, save_mail_config

OUT_DIR = ROOT / "data" / "output" / "digest_samples"


def _prev_weekday(as_of: date, weekday: int) -> date:
    """Most recent calendar date with weekday (Mon=0 … Fri=4) on or before as_of."""
    delta = (as_of.weekday() - weekday) % 7
    return as_of - timedelta(days=delta)


def _rotate(items: list[Any], offset: int) -> list[Any]:
    if not items:
        return []
    o = offset % len(items)
    return items[o:] + items[:o]


def sample_specs(today: date | None = None) -> list[dict[str, Any]]:
    today = today or date.today()
    monday = _prev_weekday(today, 0)
    wednesday = _prev_weekday(today, 2)
    friday = _prev_weekday(today, 4)
    # Keep chronological sample order within the current week window
    specs = [
        {
            "key": "monday",
            "day_label": "Monday",
            "as_of": monday,
            "since_label": "Friday's digest",
            "deal_limit": 3,
            "news_offset": 0,
            "peer_offset": 0,
            "sector_offset": 0,
        },
        {
            "key": "wednesday",
            "day_label": "Wednesday",
            "as_of": wednesday,
            "since_label": "Monday's digest",
            "deal_limit": 4,
            "news_offset": 1,
            "peer_offset": 1,
            "sector_offset": 1,
        },
        {
            "key": "friday",
            "day_label": "Friday",
            "as_of": friday,
            "since_label": "Wednesday's digest",
            "deal_limit": 5,
            "news_offset": 2,
            "peer_offset": 2,
            "sector_offset": 0,
        },
    ]
    return sorted(specs, key=lambda s: s["as_of"])


def build_sample_digest(
    companies: list[dict[str, Any]],
    sectors: list[dict[str, Any]],
    news: list[dict[str, Any]],
    peers: list[dict[str, Any]],
    spec: dict[str, Any],
) -> dict[str, Any]:
    return build_digest(
        companies,
        _rotate(sectors, int(spec["sector_offset"])),
        _rotate(news, int(spec["news_offset"])),
        _rotate(peers, int(spec["peer_offset"])),
        as_of=spec["as_of"],
        deal_limit=int(spec["deal_limit"]),
        day_label=spec["day_label"],
        since_label=spec["since_label"],
    )


def _normalize_to(raw: list[str] | None) -> list[str]:
    if not raw:
        return []
    out: list[str] = []
    for item in raw:
        for part in str(item).split(","):
            addr = part.strip()
            if addr and addr not in out:
                out.append(addr)
    return out


def run_samples(
    *,
    attempt_send: bool = True,
    persist_db: bool = True,
    to_addrs: list[str] | None = None,
) -> dict[str, Any]:
    if not digest_enabled():
        return {"ok": False, "error": "DIGEST_ENABLED=false"}

    recipients = _normalize_to(to_addrs) or digest_recipients()

    hc = healthcheck()
    if not hc.get("tables"):
        return {"ok": False, "error": "schema missing", "health": hc}

    companies = load_all_companies()
    sectors = load_table("sector_calls")
    news = load_table("news")
    peers = load_table("peer_activity")
    if not companies:
        return {"ok": False, "error": "no companies in store — run scripts/refresh.py first"}

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    samples: list[dict[str, Any]] = []
    digest_rows: list[dict[str, Any]] = []
    can_smtp = smtp_configured(recipients or None)

    for spec in sample_specs():
        digest = build_sample_digest(companies, sectors, news, peers, spec)
        stem = f"digest_{spec['key']}_{spec['as_of'].isoformat()}"
        paths = write_digest_previews(
            digest, OUT_DIR, stem=stem, to_addrs=recipients or None
        )
        # Also refresh the canonical latest from the most recent sample
        write_digest_previews(
            digest,
            ROOT / "data" / "output",
            stem="digest_latest",
            to_addrs=recipients or None,
        )

        mail: dict[str, Any] = {"sent": False, "skipped": True}
        if attempt_send and can_smtp:
            mail = send_email(
                digest["subject"],
                digest["html"],
                digest["markdown"],
                to_addrs=recipients or None,
            )
        elif attempt_send:
            mail = {
                "sent": False,
                "preview_only": True,
                "reason": (
                    "Add partner emails and SMTP (host / user / password) to send live mail — "
                    "wrote .eml preview"
                    if not recipients
                    else "SMTP not configured — wrote .eml preview"
                ),
                "eml": paths.get("eml"),
                "to": recipients or None,
            }

        samples.append(
            {
                "key": spec["key"],
                "day": spec["day_label"],
                "as_of": spec["as_of"].isoformat(),
                "subject": digest["subject"],
                "deals": len(digest["deals"]),
                "paths": paths,
                "email": mail,
                "workbook_url": digest["workbook_url"],
            }
        )
        digest_rows.append(
            {
                "id": f"digest_sample_{spec['key']}_{spec['as_of'].isoformat()}",
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
                    "sample": True,
                    "weekday": digest["weekday"],
                    "workbook_url": digest["workbook_url"],
                },
            }
        )

    if persist_db and digest_rows:
        # Keep latest real digests; merge sample rows by id.
        existing = load_table("digests") or []
        by_id = {r.get("id"): r for r in existing if r.get("id")}
        for row in digest_rows:
            by_id[row["id"]] = row
        merged = []
        for r in by_id.values():
            if not r.get("created_at"):
                r = {**r, "created_at": r.get("generated_at") or datetime.now(timezone.utc).isoformat()}
            merged.append(r)
        merged = sorted(
            merged,
            key=lambda r: r.get("generated_at") or "",
            reverse=True,
        )[:20]
        replace_table("digests", merged)

    # One high-severity alert sample email (preview) for demo completeness
    alerts = evaluate_alerts(companies, peers)
    alert_mail = None
    high = [a for a in alerts if a.get("severity") == "high"][:1]
    if high:
        a = high[0]
        alert_stem = "alert_sample_high"
        alert_html = (
            f"<div style=\"font-family:Georgia,serif;max-width:640px\">"
            f"<h2>[Signal ALERT] {a.get('title')}</h2>"
            f"<p><strong>Severity:</strong> {a.get('severity')}</p>"
            f"<p>{a.get('body')}</p>"
            f"<p><em>Immediate routing — do not wait for next digest.</em></p></div>"
        )
        alert_text = a.get("body") or ""
        paths = write_digest_previews(
            {
                "subject": f"[Signal ALERT] {a.get('title')}",
                "html": alert_html,
                "markdown": alert_text,
            },
            OUT_DIR,
            stem=alert_stem,
        )
        if attempt_send and can_smtp:
            alert_mail = send_email(
                f"[Signal ALERT] {a.get('title')}",
                alert_html,
                alert_text,
                to_addrs=recipients or None,
            )
        else:
            alert_mail = {
                "sent": False,
                "preview_only": True,
                "paths": paths,
                "title": a.get("title"),
            }

    sent_count = sum(1 for s in samples if (s.get("email") or {}).get("sent"))
    manifest = {
        "ok": True,
        "enabled": True,
        "smtp_configured": can_smtp,
        "recipients": recipients,
        "samples": samples,
        "alert_sample": alert_mail,
        "out_dir": str(OUT_DIR),
        "sent_count": sent_count,
        "mail": public_mail_status(),
        "hint": (
            "SMTP configured — live send attempted for each sample"
            if can_smtp
            else "Open .eml in Outlook, or add emails + SMTP in the Partner email panel and send again"
        ),
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Trigger Mon/Wed/Fri sample digests")
    parser.add_argument(
        "--send",
        action="store_true",
        help="Attempt SMTP delivery when configured (default: write previews; send if SMTP set)",
    )
    parser.add_argument(
        "--preview-only",
        action="store_true",
        help="Never attempt SMTP — write .eml / HTML only",
    )
    parser.add_argument(
        "--to",
        action="append",
        default=[],
        help="Recipient email(s); repeat or comma-separate. Saved to mail.json when used with --save-to.",
    )
    parser.add_argument(
        "--save-to",
        action="store_true",
        help="Persist --to addresses into data/config/mail.json",
    )
    parser.add_argument("--no-db", action="store_true", help="Skip writing digests table")
    parser.add_argument(
        "--status",
        action="store_true",
        help="Print mail config status JSON and exit",
    )
    args = parser.parse_args()
    if args.status:
        print(
            json.dumps(
                {
                    "ok": True,
                    "smtp_configured": smtp_configured(),
                    "recipients": digest_recipients(),
                    "mail": public_mail_status(),
                },
                indent=2,
            )
        )
        return

    to_addrs = _normalize_to(args.to)
    if args.save_to and to_addrs:
        save_mail_config({"digest_to": to_addrs})

    attempt_send = not args.preview_only
    # --send is documented; behavior already attempts when SMTP configured
    _ = args.send
    result = run_samples(
        attempt_send=attempt_send,
        persist_db=not args.no_db,
        to_addrs=to_addrs or None,
    )
    print(json.dumps(result, indent=2))
    if not result.get("ok"):
        sys.exit(2)


if __name__ == "__main__":
    main()

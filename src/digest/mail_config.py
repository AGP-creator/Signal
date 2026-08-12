"""Local mail settings (recipients + optional SMTP) stored outside git.

Env vars always win when set. File path: data/config/mail.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
MAIL_CONFIG_PATH = ROOT / "data" / "config" / "mail.json"


def _parse_addrs(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(a).strip() for a in raw if str(a).strip()]
    if isinstance(raw, str):
        return [a.strip() for a in raw.split(",") if a.strip()]
    return []


def load_mail_config() -> dict[str, Any]:
    if not MAIL_CONFIG_PATH.is_file():
        return {}
    try:
        data = json.loads(MAIL_CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def save_mail_config(patch: dict[str, Any]) -> dict[str, Any]:
    """Merge patch into mail.json. Empty strings clear optional SMTP fields."""
    current = load_mail_config()
    next_cfg = dict(current)

    if "digest_to" in patch:
        next_cfg["digest_to"] = _parse_addrs(patch.get("digest_to"))

    for key in ("smtp_host", "smtp_user", "smtp_from", "smtp_password"):
        if key in patch:
            val = patch.get(key)
            if val is None:
                continue
            text = str(val).strip()
            if text:
                next_cfg[key] = text
            else:
                next_cfg.pop(key, None)

    if "smtp_port" in patch and patch.get("smtp_port") is not None:
        try:
            next_cfg["smtp_port"] = int(patch["smtp_port"])
        except (TypeError, ValueError):
            pass

    MAIL_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    MAIL_CONFIG_PATH.write_text(json.dumps(next_cfg, indent=2) + "\n", encoding="utf-8")
    return next_cfg


def public_mail_status(cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    """Safe status for the UI (never returns the password)."""
    cfg = cfg if cfg is not None else load_mail_config()
    recipients = _parse_addrs(cfg.get("digest_to"))
    host = str(cfg.get("smtp_host") or "").strip()
    user = str(cfg.get("smtp_user") or "").strip()
    from_addr = str(cfg.get("smtp_from") or "").strip()
    port = cfg.get("smtp_port") or 587
    try:
        port = int(port)
    except (TypeError, ValueError):
        port = 587
    return {
        "recipients": recipients,
        "smtp_host": host or None,
        "smtp_port": port,
        "smtp_user": user or None,
        "smtp_from": from_addr or None,
        "smtp_password_set": bool(str(cfg.get("smtp_password") or "").strip()),
        "config_path": str(MAIL_CONFIG_PATH),
    }

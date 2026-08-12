"""Email digest / alert delivery — SMTP optional; always writes preview + .eml files."""



from __future__ import annotations



import os

import smtplib

from datetime import datetime, timezone

from email.mime.multipart import MIMEMultipart

from email.mime.text import MIMEText

from pathlib import Path

from typing import Any, Optional



from dotenv import load_dotenv



from src.digest.mail_config import load_mail_config



ROOT = Path(__file__).resolve().parents[2]





def _ensure_env() -> None:

    load_dotenv(ROOT / ".env")

    load_dotenv(ROOT / "env.txt")





def _truthy(name: str, default: str = "true") -> bool:

    _ensure_env()

    return (os.getenv(name) or default).strip().lower() in {

        "1",

        "true",

        "yes",

        "on",

    }





def digest_enabled() -> bool:

    return _truthy("DIGEST_ENABLED", "true")





def alerts_enabled() -> bool:

    """Immediate special-routing emails (independent of M/W/F digest gate)."""

    return _truthy("ALERTS_ENABLED", "true")





def _parse_addrs(raw: str) -> list[str]:

    return [a.strip() for a in (raw or "").split(",") if a.strip()]





def _file_cfg() -> dict[str, Any]:

    return load_mail_config()





def digest_recipients() -> list[str]:

    _ensure_env()

    from_env = _parse_addrs(os.getenv("DIGEST_TO") or "")

    if from_env:

        return from_env

    cfg = _file_cfg()

    raw = cfg.get("digest_to") or []

    if isinstance(raw, list):

        return [str(a).strip() for a in raw if str(a).strip()]

    return _parse_addrs(str(raw or ""))





def alert_recipients() -> list[str]:

    """ALERTS_TO if set, else DIGEST_TO."""

    _ensure_env()

    return _parse_addrs(os.getenv("ALERTS_TO") or "") or digest_recipients()





def _smtp_settings() -> dict[str, Any]:

    """Resolve SMTP from env first, then data/config/mail.json."""

    _ensure_env()

    cfg = _file_cfg()

    host = (os.getenv("SMTP_HOST") or "").strip() or str(cfg.get("smtp_host") or "").strip()

    port_raw = os.getenv("SMTP_PORT") or cfg.get("smtp_port") or "587"

    try:

        port = int(port_raw)

    except (TypeError, ValueError):

        port = 587

    user = (os.getenv("SMTP_USER") or "").strip() or str(cfg.get("smtp_user") or "").strip() or None

    password = (

        (os.getenv("SMTP_PASSWORD") or "").strip()

        or str(cfg.get("smtp_password") or "").strip()

        or None

    )

    from_addr = (

        (os.getenv("SMTP_FROM") or "").strip()

        or str(cfg.get("smtp_from") or "").strip()

        or user

        or "signal@thirdbase.local"

    )

    return {

        "host": host,

        "port": port,

        "user": user,

        "password": password,

        "from_addr": from_addr,

    }





def smtp_configured(to_addrs: Optional[list[str]] = None) -> bool:

    settings = _smtp_settings()

    recipients = to_addrs or digest_recipients() or alert_recipients()

    return bool(settings["host"] and recipients)





def build_message(

    subject: str,

    html_body: str,

    text_body: str,

    to_addrs: Optional[list[str]] = None,

) -> tuple[MIMEMultipart, list[str], str]:

    settings = _smtp_settings()

    from_addr = settings["from_addr"]

    to_addrs = to_addrs or digest_recipients()

    if not to_addrs:

        to_addrs = ["partners@thirdbase.local"]



    msg = MIMEMultipart("alternative")

    msg["Subject"] = subject

    msg["From"] = from_addr

    msg["To"] = ", ".join(to_addrs)

    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    msg.attach(MIMEText(text_body, "plain", "utf-8"))

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    return msg, to_addrs, from_addr





def write_eml(

    subject: str,

    html_body: str,

    text_body: str,

    out_path: Path,

    to_addrs: Optional[list[str]] = None,

) -> str:

    """Write a double-clickable .eml (Outlook / Apple Mail) for demos without SMTP."""

    msg, _, _ = build_message(subject, html_body, text_body, to_addrs=to_addrs)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    out_path.write_bytes(msg.as_bytes())

    return str(out_path)





def send_email(

    subject: str,

    html_body: str,

    text_body: str,

    to_addrs: Optional[list[str]] = None,

    *,

    require_digest_enabled: bool = True,

) -> dict[str, Any]:

    _ensure_env()

    if require_digest_enabled and not digest_enabled():

        return {

            "sent": False,

            "reason": "DIGEST_ENABLED=false",

            "subject": subject,

        }



    settings = _smtp_settings()

    host = settings["host"]

    port = settings["port"]

    user = settings["user"]

    password = settings["password"]

    msg, recipients, from_addr = build_message(

        subject, html_body, text_body, to_addrs=to_addrs

    )



    configured_to = bool(to_addrs) or bool(digest_recipients()) or bool(alert_recipients())

    if not host or (recipients == ["partners@thirdbase.local"] and not configured_to):

        return {

            "sent": False,

            "reason": (

                "SMTP not configured — add partner emails in the UI and set SMTP "

                "(host / user / password), or set SMTP_HOST + DIGEST_TO in .env"

            ),

            "subject": subject,

            "preview_only": True,

        }



    with smtplib.SMTP(host, port, timeout=30) as smtp:

        if port != 25:

            smtp.starttls()

        if user and password:

            smtp.login(user, password)

        smtp.sendmail(from_addr, recipients, msg.as_string())



    return {"sent": True, "to": recipients, "subject": subject}





def send_alert_email(

    subject: str,

    html_body: str,

    text_body: str,

    to_addrs: Optional[list[str]] = None,

) -> dict[str, Any]:

    """Send an immediate special-routing alert (uses ALERTS_TO / ALERTS_ENABLED)."""

    if not alerts_enabled():

        return {

            "sent": False,

            "reason": "ALERTS_ENABLED=false",

            "subject": subject,

        }

    return send_email(

        subject,

        html_body,

        text_body,

        to_addrs=to_addrs or alert_recipients() or None,

        require_digest_enabled=False,

    )





def write_digest_previews(

    digest: dict[str, Any],

    out_dir: Path,

    *,

    stem: str = "digest_latest",

    write_eml_file: bool = True,

    to_addrs: Optional[list[str]] = None,

) -> dict[str, str]:

    out_dir.mkdir(parents=True, exist_ok=True)

    md = out_dir / f"{stem}.md"

    html = out_dir / f"{stem}.html"

    md.write_text(digest["markdown"], encoding="utf-8")

    html.write_text(digest["html"], encoding="utf-8")

    paths = {"markdown": str(md), "html": str(html)}

    if write_eml_file:

        eml = out_dir / f"{stem}.eml"

        paths["eml"] = write_eml(

            digest["subject"],

            digest["html"],

            digest["markdown"],

            eml,

            to_addrs=to_addrs,

        )

    return paths





def write_alert_previews(

    alert: dict[str, Any],

    rendered: dict[str, str],

    out_dir: Path,

) -> dict[str, str]:

    """Write .md / .html / .eml for one immediate alert (demo without SMTP)."""

    out_dir.mkdir(parents=True, exist_ok=True)

    aid = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in (alert.get("id") or "alert"))

    stem = f"alert_{aid}"[:80]

    md = out_dir / f"{stem}.md"

    html = out_dir / f"{stem}.html"

    md.write_text(rendered["text"], encoding="utf-8")

    html.write_text(rendered["html"], encoding="utf-8")

    eml = out_dir / f"{stem}.eml"

    write_eml(

        rendered["subject"],

        rendered["html"],

        rendered["text"],

        eml,

        to_addrs=alert_recipients() or None,

    )

    # Also keep a rolling "latest" pointer for the most recent fire

    latest_md = out_dir / "alert_latest.md"

    latest_html = out_dir / "alert_latest.html"

    latest_md.write_text(rendered["text"], encoding="utf-8")

    latest_html.write_text(rendered["html"], encoding="utf-8")

    write_eml(

        rendered["subject"],

        rendered["html"],

        rendered["text"],

        out_dir / "alert_latest.eml",

        to_addrs=alert_recipients() or None,

    )

    return {

        "markdown": str(md),

        "html": str(html),

        "eml": str(eml),

        "latest_eml": str(out_dir / "alert_latest.eml"),

    }



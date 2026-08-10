"""Email digest / alert delivery — SMTP optional; always writes preview files."""

from __future__ import annotations

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Optional


def send_email(
    subject: str,
    html_body: str,
    text_body: str,
    to_addrs: Optional[list[str]] = None,
) -> dict[str, Any]:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_addr = os.getenv("SMTP_FROM", user or "signal@thirdbase.local")
    to_addrs = to_addrs or [a.strip() for a in (os.getenv("DIGEST_TO") or "").split(",") if a.strip()]

    if not host or not to_addrs:
        return {
            "sent": False,
            "reason": "SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, DIGEST_TO)",
            "subject": subject,
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_addrs)
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.sendmail(from_addr, to_addrs, msg.as_string())

    return {"sent": True, "to": to_addrs, "subject": subject}


def write_digest_previews(digest: dict[str, Any], out_dir: Path) -> dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    md = out_dir / "digest_latest.md"
    html = out_dir / "digest_latest.html"
    md.write_text(digest["markdown"], encoding="utf-8")
    html.write_text(digest["html"], encoding="utf-8")
    return {"markdown": str(md), "html": str(html)}

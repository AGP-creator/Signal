"""IC brief PDF export (reportlab)."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def export_brief_pdf(brief_markdown: str, company_name: str, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    safe = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in company_name)[:60]
    out_path = out_dir / f"IC_Brief_{safe}.pdf"

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except ImportError:
        # Fallback: write markdown beside expected path
        md_path = out_dir / f"IC_Brief_{safe}.md"
        md_path.write_text(brief_markdown, encoding="utf-8")
        return md_path

    doc = SimpleDocTemplate(str(out_path), pagesize=letter, title=f"IC Brief — {company_name}")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleTB",
        parent=styles["Heading1"],
        fontName="Times-Bold",
        fontSize=18,
        spaceAfter=12,
    )
    body = ParagraphStyle(
        "BodyTB",
        parent=styles["BodyText"],
        fontName="Times-Roman",
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    story: list[Any] = [Paragraph(f"IC Brief — {company_name}", title_style), Spacer(1, 8)]
    for line in brief_markdown.splitlines():
        clean = (
            line.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("**", "")
            .replace("#", "")
        )
        if not clean.strip():
            story.append(Spacer(1, 6))
            continue
        story.append(Paragraph(clean, body))
    doc.build(story)
    return out_path

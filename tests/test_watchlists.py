"""Partner watchlist Excel parse + preview."""

from __future__ import annotations

from pathlib import Path

from src.watchlists import build_template, parse_workbook, preview_rows, skeleton_from_row


def test_template_and_parse(tmp_path: Path):
    path = build_template(tmp_path / "tpl.xlsx")
    assert path.exists()
    rows = parse_workbook(path)
    assert len(rows) >= 1
    assert rows[0]["name"] == "Acme Agents"
    assert rows[0].get("domain") == "acmeagents.com"


def test_preview_match_and_create():
    existing = [
        {
            "id": "c_acme",
            "name": "Acme Agents",
            "slug": "acme-agents",
            "domain": "acmeagents.com",
        }
    ]
    rows = [
        {
            "_row": 2,
            "name": "Acme Agents",
            "domain": "acmeagents.com",
            "note": "still interesting",
        },
        {
            "_row": 3,
            "name": "Brand New Co",
            "sector_theme": "Cyber",
            "note": "demo day",
        },
    ]
    preview = preview_rows(rows, existing, "Alex Chen")
    assert preview[0]["action"] == "match"
    assert preview[0]["company_id"] == "c_acme"
    assert preview[1]["action"] == "create"
    assert preview[1]["payload"]["recommendation"] == "Watch"
    assert preview[1]["payload"]["pipeline_bucket"] == "partner_sourced"


def test_skeleton_id_stable():
    a = skeleton_from_row({"name": "Foo Bar"}, "Maya Patel")
    b = skeleton_from_row({"name": "Foo Bar"}, "Alex Chen")
    assert a["id"] == b["id"]
    assert a["slug"] == "foo-bar"

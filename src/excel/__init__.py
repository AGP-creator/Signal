from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Optional

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / "data" / "output" / "Thirdbase_Deal_Pipeline.xlsx"

HEADER_FILL = PatternFill("solid", fgColor="1B2A4A")
HEADER_FONT = Font(color="FFFFFF", bold=True, name="Calibri", size=11)
DEEP_FILL = PatternFill("solid", fgColor="C6EFCE")
WATCH_FILL = PatternFill("solid", fgColor="FFEB9C")
PASS_FILL = PatternFill("solid", fgColor="D9D9D9")
THIN = Border(
    left=Side(style="thin", color="D0D0D0"),
    right=Side(style="thin", color="D0D0D0"),
    top=Side(style="thin", color="D0D0D0"),
    bottom=Side(style="thin", color="D0D0D0"),
)


PIPELINE_COLS = [
    "company",
    "one_liner",
    "sector_theme",
    "subsector",
    "stage",
    "pipeline_bucket",
    "last_round_size_m",
    "last_round_date",
    "valuation_est_m",
    "valuation_confidence",
    "lead_investor",
    "tier1_count",
    "tier1_names",
    "headcount",
    "headcount_6m_growth_pct",
    "yoy_growth_pct",
    "runway_months_est",
    "thesis_score",
    "relative_rank",
    "theme_tag",
    "last_signal_date",
    "recommendation",
    "brief_id",
    "commentary_summary",
    "sources",
    "why_now",
]


def _style_header(ws, ncols: int) -> None:
    for col in range(1, ncols + 1):
        cell = ws.cell(1, col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(ncols)}1"


def _autosize(ws, max_width: int = 48) -> None:
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        length = 0
        for cell in col[:40]:
            length = max(length, min(len(str(cell.value or "")), max_width))
        ws.column_dimensions[letter].width = max(12, length + 2)


def _write_rows(ws, headers: list[str], rows: list[list[Any]]) -> None:
    for i, h in enumerate(headers, 1):
        ws.cell(1, i, h)
    for r_idx, row in enumerate(rows, 2):
        for c_idx, val in enumerate(row, 1):
            cell = ws.cell(r_idx, c_idx, val)
            cell.border = THIN
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    _style_header(ws, len(headers))
    _autosize(ws)


def _coinvestor_pairs(companies: list[dict[str, Any]]) -> list[list[Any]]:
    pair_data: dict[tuple[str, str], dict[str, Any]] = {}
    for c in companies:
        invs = sorted(set(c.get("investors") or []))
        for i in range(len(invs)):
            for j in range(i + 1, len(invs)):
                a, b = invs[i], invs[j]
                key = (a, b)
                rec = pair_data.setdefault(
                    key,
                    {"count": 0, "themes": set(), "last": c.get("last_round_date") or "", "deal": c.get("name")},
                )
                rec["count"] += 1
                rec["themes"].add(c.get("sector_theme") or "")
                if (c.get("last_round_date") or "") >= rec["last"]:
                    rec["last"] = c.get("last_round_date") or ""
                    rec["deal"] = c.get("name")
    rows = []
    for (a, b), rec in sorted(pair_data.items(), key=lambda x: -x[1]["count"]):
        if rec["count"] < 1:
            continue
        rows.append(
            [
                a,
                b,
                rec["count"],
                ", ".join(sorted(t for t in rec["themes"] if t)),
                rec["deal"],
                rec["last"],
            ]
        )
    return rows[:80]


def build_workbook(
    companies: list[dict[str, Any]],
    commentary: list[dict[str, Any]],
    news: list[dict[str, Any]],
    peer_activity: list[dict[str, Any]],
    sector_calls: list[dict[str, Any]],
    meta: Optional[dict[str, Any]] = None,
    out_path: Optional[Path] = None,
) -> Path:
    meta = meta or {}
    out_path = Path(out_path) if out_path else DEFAULT_OUT
    out_path.parent.mkdir(parents=True, exist_ok=True)

    as_of = date(2026, 8, 9)
    hot_cutoff_days = 30

    wb = Workbook()

    # Cover
    cover = wb.active
    cover.title = "Cover"
    cover["A1"] = "Thirdbase Signal — Deal Pipeline"
    cover["A1"].font = Font(name="Calibri", size=20, bold=True, color="1B2A4A")
    cover["A3"] = "Last refreshed"
    cover["B3"] = meta.get("last_refreshed", datetime.now(timezone.utc).isoformat())
    cover["A4"] = "Methodology"
    cover["B4"] = (
        "Companies scored against Thirdbase thesis_policy.yaml (weights transparent). "
        "Relative rank within theme × stage. Stale ≥90 days flagged for partner review — never auto-deleted."
    )
    cover["A5"] = "Data provenance"
    cover["B5"] = meta.get(
        "provenance",
        "Seed corpus (high-fidelity demo) + live adapters: SEC EDGAR Form D, Hacker News, RSS where available.",
    )
    cover["A6"] = "Portfolio mix target"
    cover["B6"] = "60% dominant tech/growth · 40% tactical sector-agnostic"
    cover["A7"] = "Company count"
    cover["B7"] = len(companies)
    cover["A8"] = "Deep Dive / Watch / Pass"
    deep = sum(1 for c in companies if c.get("recommendation") == "Deep Dive")
    watch = sum(1 for c in companies if c.get("recommendation") == "Watch")
    passed = sum(1 for c in companies if c.get("recommendation") == "Pass")
    cover["B8"] = f"{deep} / {watch} / {passed}"
    cover["A10"] = "Product"
    cover["B10"] = "Signal — Deal intelligence OS for Thirdbase"
    cover.column_dimensions["A"].width = 22
    cover.column_dimensions["B"].width = 100

    # Pipeline
    ws = wb.create_sheet("Pipeline")
    commentary_by_co = defaultdict(list)
    for cm in commentary:
        commentary_by_co[cm.get("company_id")].append(cm.get("quote_or_summary") or "")

    pipe_rows = []
    for c in sorted(companies, key=lambda x: -(x.get("thesis_score") or 0)):
        summary = c.get("commentary_summary") or "; ".join(commentary_by_co.get(c["id"], [])[:2])
        pipe_rows.append(
            [
                c.get("name"),
                c.get("one_liner"),
                c.get("sector_theme"),
                c.get("subsector"),
                c.get("stage"),
                c.get("pipeline_bucket"),
                c.get("last_round_size_m"),
                c.get("last_round_date"),
                c.get("valuation_est_m"),
                c.get("valuation_confidence"),
                c.get("lead_investor"),
                c.get("tier1_count"),
                ", ".join(c.get("tier1_names") or []),
                c.get("headcount"),
                c.get("headcount_6m_growth_pct"),
                c.get("yoy_growth_pct"),
                c.get("runway_months_est"),
                c.get("thesis_score"),
                c.get("relative_rank"),
                c.get("theme_id"),
                c.get("last_signal_date"),
                c.get("recommendation"),
                c.get("brief_id"),
                summary,
                ", ".join(c.get("sources") or []),
                c.get("why_now"),
            ]
        )
    _write_rows(ws, PIPELINE_COLS, pipe_rows)

    # Conditional formatting on recommendation column (V = 22)
    rec_col = PIPELINE_COLS.index("recommendation") + 1
    letter = get_column_letter(rec_col)
    rng = f"{letter}2:{letter}{len(pipe_rows) + 1}"
    ws.conditional_formatting.add(
        rng, CellIsRule(operator="equal", formula=['"Deep Dive"'], fill=DEEP_FILL)
    )
    ws.conditional_formatting.add(
        rng, CellIsRule(operator="equal", formula=['"Watch"'], fill=WATCH_FILL)
    )
    ws.conditional_formatting.add(
        rng, CellIsRule(operator="equal", formula=['"Pass"'], fill=PASS_FILL)
    )
    dv = DataValidation(type="list", formula1='"Deep Dive,Watch,Pass"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(rng)

    # Hot Deals
    hot = wb.create_sheet("Hot Deals")
    hot_rows = []
    for c in sorted(companies, key=lambda x: -(x.get("thesis_score") or 0)):
        try:
            d = datetime.strptime(c.get("last_signal_date", "")[:10], "%Y-%m-%d").date()
            days = (as_of - d).days
        except Exception:
            days = 999
        if days <= hot_cutoff_days and (
            c.get("recommendation") == "Deep Dive" or (c.get("thesis_score") or 0) >= 75
        ):
            hot_rows.append(
                [
                    c.get("name"),
                    c.get("thesis_score"),
                    c.get("recommendation"),
                    c.get("sector_theme"),
                    c.get("stage"),
                    c.get("tier1_count"),
                    c.get("last_signal_date"),
                    c.get("why_now"),
                ]
            )
    _write_rows(
        hot,
        ["company", "thesis_score", "recommendation", "sector_theme", "stage", "tier1_count", "last_signal_date", "why_now"],
        hot_rows,
    )

    # Watchlist
    watch_ws = wb.create_sheet("Watchlist")
    watch_rows = [
        [
            c.get("name"),
            c.get("stage"),
            c.get("sector_theme"),
            c.get("thesis_score"),
            c.get("recommendation"),
            c.get("one_liner"),
            c.get("last_signal_date"),
        ]
        for c in companies
        if c.get("recommendation") == "Watch" or (c.get("stage") or "").lower() in ("seed", "pre-seed")
    ]
    _write_rows(
        watch_ws,
        ["company", "stage", "sector_theme", "thesis_score", "recommendation", "one_liner", "last_signal_date"],
        watch_rows,
    )

    # Sector of Tomorrow
    sot = wb.create_sheet("Sector of Tomorrow")
    sot_rows = [
        [
            s.get("subsector"),
            s.get("parent_theme"),
            s.get("heat_score"),
            s.get("consensus_level"),
            " | ".join(s.get("evidence") or []),
            ", ".join(s.get("top_companies") or []),
            s.get("why_thirdbase_cares"),
        ]
        for s in sector_calls
    ]
    _write_rows(
        sot,
        ["subsector", "parent_theme", "heat_score", "consensus_level", "evidence", "top_companies", "why_thirdbase_cares"],
        sot_rows,
    )

    # Peer Set Activity
    peer = wb.create_sheet("Peer Set Activity")
    peer_rows = [
        [
            p.get("firm"),
            p.get("company_name"),
            p.get("round"),
            p.get("date"),
            p.get("theme"),
            "Y" if p.get("on_thesis_flag") else "N",
            "Y" if p.get("thesis_shift") else "N",
            p.get("notes"),
        ]
        for p in peer_activity
    ]
    _write_rows(
        peer,
        ["firm", "company", "round", "date", "theme", "on_thesis", "thesis_shift", "notes"],
        peer_rows,
    )

    # Co-investor Heatmap
    heat = wb.create_sheet("Co-investor Heatmap")
    _write_rows(
        heat,
        ["firm_a", "firm_b", "coinvest_count", "shared_themes", "last_shared_deal", "last_date"],
        _coinvestor_pairs(companies),
    )

    # News
    news_ws = wb.create_sheet("News Worth Reading")
    news_rows = [
        [
            n.get("title"),
            n.get("source"),
            n.get("url"),
            n.get("published_at"),
            n.get("why_it_matters"),
            ", ".join(n.get("related_themes") or []),
        ]
        for n in news
    ]
    _write_rows(
        news_ws,
        ["title", "source", "url", "published_at", "why_it_matters_to_thirdbase", "related_themes"],
        news_rows,
    )

    # Commentary
    com = wb.create_sheet("Investor Commentary")
    com_rows = [
        [
            c.get("company_name"),
            c.get("source"),
            c.get("quote_or_summary"),
            c.get("sentiment"),
            c.get("credibility_tier"),
            c.get("captured_at"),
        ]
        for c in commentary
    ]
    _write_rows(
        com,
        ["company", "source", "quote_or_summary", "sentiment", "credibility_tier", "captured_at"],
        com_rows,
    )

    # Stale
    stale = wb.create_sheet("Stale")
    stale_rows = [
        [
            c.get("name"),
            c.get("sector_theme"),
            c.get("stage"),
            c.get("last_signal_date"),
            c.get("thesis_score"),
            c.get("recommendation"),
            c.get("review_status") or "Pending Partner Review",
        ]
        for c in companies
        if c.get("is_stale")
    ]
    _write_rows(
        stale,
        ["company", "sector_theme", "stage", "last_signal_date", "thesis_score", "recommendation", "review_status"],
        stale_rows,
    )

    wb.save(out_path)
    return out_path

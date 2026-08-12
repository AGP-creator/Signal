"""Partner watchlist Excel — template, preview, commit.

Usage:
  python scripts/watchlist_excel.py --template
  python scripts/watchlist_excel.py --preview path.xlsx --partner "Alex Chen"
  python scripts/watchlist_excel.py --commit path.xlsx --partner "Alex Chen"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_companies():
    try:
        from src.db.supabase_store import healthcheck, load_all_companies

        hc = healthcheck()
        if hc.get("tables"):
            return load_all_companies()
    except Exception:
        pass
    seed = ROOT / "data" / "seed" / "seed_corpus.json"
    if seed.exists():
        data = json.loads(seed.read_text(encoding="utf-8"))
        return list(data.get("companies") or [])
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Partner watchlist Excel tools")
    parser.add_argument("--template", action="store_true", help="Write blank template xlsx")
    parser.add_argument("--preview", type=str, help="Preview import from xlsx path")
    parser.add_argument("--commit", type=str, help="Commit import from xlsx path")
    parser.add_argument("--partner", type=str, default="Partner")
    parser.add_argument("--out", type=str, help="Optional template output path")
    args = parser.parse_args()

    from src.watchlists import (
        TEMPLATE_PATH,
        build_template,
        commit_import,
        parse_workbook,
        preview_rows,
    )

    if args.template:
        path = build_template(Path(args.out) if args.out else None)
        print(json.dumps({"ok": True, "path": str(path), "filename": path.name}))
        return 0

    path_str = args.preview or args.commit
    if not path_str:
        parser.error("Provide --template, --preview, or --commit")
        return 2

    path = Path(path_str)
    if not path.exists():
        print(json.dumps({"ok": False, "error": f"File not found: {path}"}))
        return 1

    partner = (args.partner or "Partner").strip() or "Partner"
    rows = parse_workbook(path)
    companies = _load_companies()
    preview = preview_rows(rows, companies, partner)

    if args.preview:
        print(
            json.dumps(
                {
                    "ok": True,
                    "partner_name": partner,
                    "filename": path.name,
                    "row_count": len(rows),
                    "preview": preview,
                    "summary": {
                        "match": sum(1 for p in preview if p["action"] == "match"),
                        "create": sum(1 for p in preview if p["action"] == "create"),
                    },
                }
            )
        )
        return 0

    result = commit_import(preview, companies, partner, filename=path.name)
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())

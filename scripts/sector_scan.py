"""Partner CLI: sector / thesis scan over the live Supabase pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.agent import chat, offline_answer
from src.db.supabase_store import healthcheck, load_all_companies, load_table


def scan(thesis: str, limit: int = 10) -> dict:
    companies = load_all_companies()
    q = thesis.lower()
    hits = []
    for c in companies:
        blob = " ".join(
            [
                c.get("name") or "",
                c.get("one_liner") or "",
                c.get("sector_theme") or "",
                c.get("subsector") or "",
                c.get("moat_notes") or "",
            ]
        ).lower()
        if any(tok in blob for tok in q.split() if len(tok) > 2):
            hits.append(c)
    hits = sorted(hits, key=lambda x: -(x.get("thesis_score") or 0))[:limit]
    sectors = load_table("sector_calls")
    return {
        "query": thesis,
        "companies": [
            {
                "name": c.get("name"),
                "score": c.get("thesis_score"),
                "recommendation": c.get("recommendation"),
                "rank": c.get("relative_rank"),
                "why_now": c.get("why_now"),
            }
            for c in hits
        ],
        "sector_calls": sectors,
        "narrative": offline_answer(f"What are the best deals in {thesis} right now?"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Signal sector / thesis scan")
    parser.add_argument("thesis", nargs="?", default="defense tech")
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--chat", action="store_true", help="Use Claude if API key set")
    args = parser.parse_args()

    hc = healthcheck()
    if not hc.get("tables"):
        print("Supabase schema missing. Apply supabase/migrations/001_init.sql first.", file=sys.stderr)
        sys.exit(2)

    result = scan(args.thesis, args.limit)
    if args.chat:
        result["narrative"] = chat(f"Ranked sector scan for: {args.thesis}. Be partner-grade.")
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"# Sector scan: {args.thesis}\n")
        for c in result["companies"]:
            print(f"- {c['name']} · {c['recommendation']} · {c['score']} · {c['rank']}")
        print("\n## Narrative\n")
        print(result["narrative"])


if __name__ == "__main__":
    main()

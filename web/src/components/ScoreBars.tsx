import { SCORE_DIM_META } from "@/lib/thirdbaseCriteria";
import { cn } from "@/lib/utils";

const DIM_ORDER = [
  "thesis_fit",
  "team_quality",
  "cap_table",
  "traction",
  "moat",
  "valuation",
  "runway",
  "tam_exit",
  "timing",
];

function barTone(score: number) {
  if (score >= 80) return "ok";
  if (score >= 65) return "signal";
  if (score >= 50) return "warn";
  return "danger";
}

export function ScoreBars({ breakdown }: { breakdown?: Record<string, number> | null }) {
  const entries = Object.entries(breakdown || {});
  if (!entries.length) return null;

  const ordered = [
    ...DIM_ORDER.filter((k) => k in (breakdown || {})).map((k) => [k, breakdown![k]] as const),
    ...entries.filter(([k]) => !DIM_ORDER.includes(k)),
  ];

  return (
    <div className="space-y-4">
      {ordered.map(([k, v]) => {
        const meta = SCORE_DIM_META[k];
        const label = meta?.label || k.replaceAll("_", " ");
        const weight = meta ? Math.round(meta.weight * 100) : null;
        const score = Number(v);
        const tone = barTone(score);
        return (
          <div key={k} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[0.8125rem] font-medium text-[var(--text)]">{label}</span>
                {weight != null ? (
                  <span className="mono ml-1.5 text-[0.7rem] text-[var(--faint)]">{weight}%</span>
                ) : null}
              </div>
              <span
                className={cn(
                  "mono shrink-0 tabular-nums text-[0.9375rem] font-medium",
                  tone === "ok" && "text-[var(--ok)]",
                  tone === "signal" && "text-[var(--text)]",
                  tone === "warn" && "text-[var(--warn)]",
                  tone === "danger" && "text-[var(--danger)]",
                )}
              >
                {score.toFixed(0)}
              </span>
            </div>
            {meta?.criterion ? (
              <p className="mt-0.5 text-[0.7rem] leading-snug text-[var(--faint)]">{meta.criterion}</p>
            ) : null}
            <div className="score-bar-track mt-2">
              <div
                className={cn("score-bar-fill", `score-bar-fill--${tone}`)}
                style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

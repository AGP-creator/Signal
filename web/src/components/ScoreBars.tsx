import { SCORE_DIM_META } from "@/lib/thirdbaseCriteria";

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
        return (
          <div key={k} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[0.8125rem] font-medium text-[var(--text)]">{label}</span>
                {weight != null ? (
                  <span className="mono ml-1.5 text-[0.7rem] text-[var(--faint)]">{weight}%</span>
                ) : null}
              </div>
              <span className="mono shrink-0 tabular-nums text-[0.9375rem] font-medium text-[var(--text)]">
                {score.toFixed(0)}
              </span>
            </div>
            {meta?.criterion ? (
              <p className="mt-0.5 text-[0.7rem] leading-snug text-[var(--faint)]">{meta.criterion}</p>
            ) : null}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)] transition-[width] duration-300"
                style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

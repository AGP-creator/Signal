"use client";

export function ScoreBars({ breakdown }: { breakdown?: Record<string, number> | null }) {
  const entries = Object.entries(breakdown || {});
  if (!entries.length) return null;
  return (
    <div className="space-y-3.5">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="mb-1.5 flex justify-between text-[0.8125rem] text-[var(--muted)]">
            <span className="capitalize">{k.replaceAll("_", " ")}</span>
            <span className="mono text-[var(--text)]">{v.toFixed(0)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
              style={{ width: `${Math.max(4, Math.min(100, v))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

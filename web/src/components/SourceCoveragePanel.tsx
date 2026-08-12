import { classifySources } from "@/lib/thirdbaseCriteria";

const MAX_HITS = 5;

function formatSourceHit(raw: string, categoryId: string): string {
  let label = raw.trim().replace(/\s+/g, " ");
  if (categoryId === "technical") {
    label = label.replace(/^github\s+/i, "");
  }
  if (categoryId === "company_surface") {
    label = label.replace(/^site\s+/i, "");
  }
  return label;
}

function HitBadge({ hit }: { hit: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[2.5rem] shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
        hit
          ? "bg-[var(--ok-dim)] text-[var(--ok)]"
          : "bg-[var(--panel-2)] text-[var(--faint)]"
      }`}
    >
      {hit ? "Hit" : "—"}
    </span>
  );
}

export function SourceCoveragePanel({
  sources,
}: {
  sources?: Array<string | { provider?: string; title?: string }> | null;
}) {
  const cats = classifySources(sources);
  const hit = cats.filter((c) => c.matched.length > 0).length;
  const rawCount = (sources || []).length;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="title text-[1.2rem]">Source coverage</h2>
        <div className="mono shrink-0 text-[0.8125rem] text-[var(--muted)]">
          {hit}/{cats.length} categories
          {rawCount ? <span className="text-[var(--faint)]"> · {rawCount} hits</span> : null}
        </div>
      </div>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--muted)]">
        Matched against Thirdbase ingest taxonomy — deal DBs, Form D, GP signals, long-form,
        news, commentary, GitHub/arXiv, hiring, site, press.
      </p>
      <ul className="mt-4 divide-y divide-[var(--line)]">
        {cats.map((c) => {
          const on = c.matched.length > 0;
          const formatted = c.matched.map((m) => formatSourceHit(m, c.id));
          const visible = formatted.slice(0, MAX_HITS);
          const overflow = formatted.length - visible.length;

          return (
            <li key={c.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[0.875rem] font-medium ${on ? "text-[var(--text)]" : "text-[var(--faint)]"}`}
                >
                  {c.label}
                </div>
                {on ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {visible.map((label) => (
                      <span
                        key={label}
                        className="inline-block max-w-full truncate rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.5 font-mono text-[0.68rem] leading-snug text-[var(--muted)]"
                        title={label}
                      >
                        {label}
                      </span>
                    ))}
                    {overflow > 0 ? (
                      <span className="inline-flex items-center px-1 text-[0.68rem] text-[var(--faint)]">
                        +{overflow} more
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--faint)]">
                    {c.examples.slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
              <HitBadge hit={on} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

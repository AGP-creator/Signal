import {
  evaluateThirdbaseCriteria,
  statusLabel,
  type CriteriaCompany,
  type CriteriaStatus,
} from "@/lib/thirdbaseCriteria";

function statusClass(status: CriteriaStatus) {
  switch (status) {
    case "met":
      return "text-[var(--ok)]";
    case "partial":
      return "text-[var(--warn)]";
    case "miss":
      return "text-[var(--danger)]";
    default:
      return "text-[var(--faint)]";
  }
}

function statusDot(status: CriteriaStatus) {
  switch (status) {
    case "met":
      return "bg-[var(--ok)]";
    case "partial":
      return "bg-[var(--warn)]";
    case "miss":
      return "bg-[var(--danger)]";
    default:
      return "bg-[var(--faint)]";
  }
}

export function ThesisCriteriaPanel({
  company,
  compact,
}: {
  company: CriteriaCompany;
  compact?: boolean;
}) {
  const summary = evaluateThirdbaseCriteria(company);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`title ${compact ? "text-[1.2rem]" : "text-[1.35rem]"}`}>
          Thirdbase criteria
        </h2>
        <div className="mono text-[0.8125rem] text-[var(--muted)]">
          <span className="text-[var(--ok)]">{summary.met} met</span>
          {summary.partial ? (
            <>
              <span className="text-[var(--faint)]"> · </span>
              <span className="text-[var(--warn)]">{summary.partial} partial</span>
            </>
          ) : null}
          {summary.miss ? (
            <>
              <span className="text-[var(--faint)]"> · </span>
              <span className="text-[var(--danger)]">{summary.miss} miss</span>
            </>
          ) : null}
          <span className="text-[var(--faint)]"> · </span>
          <span>{summary.fit_pct}% fit</span>
        </div>
      </div>
      <p className="mt-1.5 text-[0.8125rem] text-[var(--muted)]">
        Scored against policy: 60/40 mix, stage-aware valuation, 40%+ YoY, ~3yr runway, 3–4
        Tier-1, moat, TAM &gt;$1B, 3–5yr exit.
      </p>
      <ul className="mt-4 space-y-3.5">
        {summary.items.map((item) => (
          <li key={item.id} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${statusDot(item.status)}`}
                    aria-hidden
                  />
                  <span className="text-[0.9375rem] font-medium text-[var(--text)]">
                    {item.label}
                  </span>
                </div>
                <div className="mt-1 pl-3.5 text-[0.75rem] text-[var(--faint)]">{item.target}</div>
                <p className="mt-1 pl-3.5 text-[0.8125rem] leading-snug text-[var(--muted)]">
                  {item.evidence}
                </p>
              </div>
              <span
                className={`mono shrink-0 text-[0.75rem] uppercase tracking-wide ${statusClass(item.status)}`}
              >
                {statusLabel(item.status)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact chip row for cards / pipeline previews. */
export function CriteriaFitChips({ company }: { company: CriteriaCompany }) {
  const summary = evaluateThirdbaseCriteria(company);
  const tone =
    summary.fit_pct >= 75
      ? "chip-ok"
      : summary.fit_pct >= 50
        ? "chip-signal"
        : "chip";

  return (
    <span className={`chip ${tone}`} title="Thirdbase criteria fit">
      Criteria {summary.met}/{summary.items.length}
      {summary.miss ? ` · ${summary.miss} miss` : ""}
    </span>
  );
}

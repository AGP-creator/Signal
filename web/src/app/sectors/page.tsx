import { fetchSectors } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SectorsPage() {
  const sectors = await fetchSectors();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl font-bold md:text-5xl">Sector of Tomorrow</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Emerging sub-sectors before consensus — evidence from GP chatter, hiring, research
          velocity, and fund formation.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {sectors.map((s, i) => (
          <article key={s.id} className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {s.consensus_level} · {s.parent_theme}
                </div>
                <h2 className="display mt-2 text-2xl font-bold">{s.subsector}</h2>
              </div>
              <div className="mono text-3xl text-[var(--signal)]">{s.heat_score}</div>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{s.why_thirdbase_cares}</p>
            <div className="mt-5 space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Evidence</div>
              {(s.evidence || []).map((e) => (
                <div key={e} className="border-l-2 border-[var(--deep)] pl-3 text-sm text-[var(--muted)]">
                  {e}
                </div>
              ))}
            </div>
            <div className="mt-5 text-sm">
              <span className="text-[var(--muted)]">Best companies: </span>
              {(s.top_companies || []).join(" · ")}
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
                style={{ width: `${Math.min(100, s.heat_score || 0)}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-[var(--faint)]">Heat rank #{i + 1}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

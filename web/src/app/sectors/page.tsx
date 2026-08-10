import { Eyebrow, PageHeader, Panel } from "@/components/ui";
import { fetchSectors } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SectorsPage() {
  const sectors = await fetchSectors();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Emerging themes"
        title="Sector of Tomorrow"
        description="Emerging sub-sectors before consensus — evidence from GP chatter, hiring, research velocity, and fund formation."
      />
      <div className="grid gap-5 md:grid-cols-2 stagger">
        {sectors.map((s, i) => (
          <article key={s.id} className="panel p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow>
                  {s.consensus_level} · {s.parent_theme}
                </Eyebrow>
                <h2 className="title mt-2.5 text-[1.45rem] md:text-[1.6rem]">{s.subsector}</h2>
              </div>
              <div className="mono text-[1.75rem] text-[var(--signal)]">{s.heat_score}</div>
            </div>
            <p className="mt-4 text-[0.975rem] leading-relaxed text-[var(--text)]/90">{s.why_thirdbase_cares}</p>
            <div className="mt-5 space-y-2">
              <div className="label-caps">Evidence</div>
              {(s.evidence || []).map((e) => (
                <div
                  key={e}
                  className="border-l-2 border-[var(--deep)] pl-3 text-[0.9375rem] leading-relaxed text-[var(--muted)]"
                >
                  {e}
                </div>
              ))}
            </div>
            <div className="mt-5 text-[0.9375rem]">
              <span className="text-[var(--muted)]">Best companies: </span>
              {(s.top_companies || []).join(" · ")}
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-md bg-[var(--panel-2)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"
                style={{ width: `${Math.min(100, s.heat_score || 0)}%` }}
              />
            </div>
            <div className="mt-2 text-[0.75rem] text-[var(--faint)]">Heat rank #{i + 1}</div>
          </article>
        ))}
        {!sectors.length && (
          <Panel>
            <p className="body-muted">No sector calls yet.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

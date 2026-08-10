import { fetchCompanies, fetchPeers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PeersPage() {
  const [peers, companies] = await Promise.all([fetchPeers(), fetchCompanies()]);

  const pairCounts = new Map<string, { a: string; b: string; count: number; themes: Set<string> }>();
  for (const c of companies) {
    const invs = [...new Set(c.investors || [])].sort();
    for (let i = 0; i < invs.length; i++) {
      for (let j = i + 1; j < invs.length; j++) {
        const key = `${invs[i]}||${invs[j]}`;
        const cur = pairCounts.get(key) || {
          a: invs[i],
          b: invs[j],
          count: 0,
          themes: new Set<string>(),
        };
        cur.count += 1;
        if (c.sector_theme) cur.themes.add(c.sector_theme);
        pairCounts.set(key, cur);
      }
    }
  }
  const heatmap = [...pairCounts.values()].sort((a, b) => b.count - a.count).slice(0, 24);
  const shifts = peers.filter((p) => p.thesis_shift);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl font-bold md:text-5xl">Peer set</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          What Tier-1 and watched firms are buying — plus co-investor pairs for syndicate building.
        </p>
      </div>

      {!!shifts.length && (
        <section className="panel border-[rgba(255,176,32,0.35)] p-5">
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--warn)]">Thesis shifts</div>
          <div className="mt-3 space-y-2">
            {shifts.map((p) => (
              <div key={p.id} className="text-sm">
                <span className="font-semibold">{p.firm}</span> → {p.company_name}
                <span className="text-[var(--muted)]"> — {p.notes}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="display text-2xl font-bold">Recent activity</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {peers.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <div className="font-semibold">{p.firm}</div>
                  <div className="text-[var(--muted)]">
                    {p.company_name} · {p.round} · {p.theme}
                  </div>
                </div>
                <div className="mono shrink-0 text-xs text-[var(--faint)]">{p.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="display text-2xl font-bold">Co-investor heatmap</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {heatmap.map((row) => (
              <div key={`${row.a}-${row.b}`} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="mono flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold"
                  style={{
                    background: `rgba(214,255,60,${Math.min(0.55, 0.12 + row.count * 0.12)})`,
                    color: "#0b1a08",
                  }}
                >
                  {row.count}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {row.a} <span className="text-[var(--faint)]">×</span> {row.b}
                  </div>
                  <div className="truncate text-xs text-[var(--muted)]">
                    {[...row.themes].slice(0, 2).join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

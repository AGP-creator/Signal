import { fetchDashboard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const { digest, companies, sectors, news, peers } = await fetchDashboard();
  const hot = companies.filter((c) => c.recommendation === "Deep Dive").slice(0, 5);
  const shifts = peers.filter((p) => p.thesis_shift).slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-4xl font-bold md:text-5xl">Digest</h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Monday / Wednesday / Friday partner email — hard-capped, scannable, only what matters.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="panel overflow-hidden shadow-2xl">
          <div className="border-b border-[var(--line)] bg-[var(--panel-2)] px-6 py-4">
            <div className="text-xs text-[var(--muted)]">Subject</div>
            <div className="mt-1 font-semibold">
              {digest?.subject ||
                `Thirdbase Signal — ${new Date().toISOString().slice(0, 10)} — ${hot.length} deals worth your time`}
            </div>
          </div>
          <div className="space-y-8 px-6 py-8">
            <section>
              <h2 className="display text-xl font-bold">Top deals</h2>
              <div className="mt-4 space-y-5">
                {hot.map((c) => (
                  <div key={c.id}>
                    <div className="font-semibold">
                      {c.name} · {c.recommendation} · {c.thesis_score}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{c.why_now}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="display text-xl font-bold">Sector calls</h2>
              <div className="mt-3 space-y-3">
                {sectors.slice(0, 2).map((s) => (
                  <div key={s.id} className="text-sm">
                    <span className="font-semibold">{s.subsector}</span>
                    <span className="text-[var(--muted)]"> ({s.consensus_level}) — {s.why_thirdbase_cares}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="display text-xl font-bold">News worth reading</h2>
              <div className="mt-3 space-y-2">
                {news.slice(0, 5).map((n) => (
                  <div key={n.id} className="text-sm">
                    <span className="font-medium">{n.title}</span>
                    <span className="text-[var(--muted)]"> — {n.why_it_matters}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="display text-xl font-bold">Peer-set moves</h2>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {(shifts.length ? shifts : peers.slice(0, 4)).map((p) => (
                  <div key={p.id}>
                    {p.firm} → {p.company_name}
                    {p.thesis_shift ? " · THESIS SHIFT" : ""}: {p.notes}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

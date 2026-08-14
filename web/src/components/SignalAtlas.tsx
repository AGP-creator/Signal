"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { CompanyLink } from "@/components/EntityLink";
import {
  EmptyState,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import {
  PRESET_MAP_QUERIES,
  buildAtlasPack,
  buildMarketMap,
  formatAtlasBriefMarkdown,
  recomputeOwnership,
  type BandPlacement,
  type MapNode,
  type MarketMap,
  type OwnershipScenario,
  type PortfolioPulseItem,
  type RaiseWindow,
  type TalentNode,
  type WarmPath,
} from "@/lib/atlas";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab =
  | "brief"
  | "map"
  | "warm"
  | "pulse"
  | "bands"
  | "talent"
  | "raise"
  | "ownership";

const TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "Market map" },
  { id: "warm", label: "Warm paths" },
  { id: "pulse", label: "Pulse" },
  { id: "bands", label: "Growth bands" },
  { id: "talent", label: "Talent" },
  { id: "raise", label: "Raise windows" },
  { id: "ownership", label: "Ownership" },
  { id: "brief", label: "Brief" },
];

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost text-[0.75rem]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

function CoLink({
  id,
  slug,
  name,
}: {
  id: string;
  slug?: string | null;
  name: string;
}) {
  return <CompanyLink id={id} slug={slug} name={name} className="font-medium" />;
}

function tagClass(t: MapNode["tag"]) {
  if (t === "leader") return "text-[var(--signal)]";
  if (t === "challenger") return "text-[var(--deep)]";
  if (t === "emerging") return "text-[var(--ok)]";
  return "text-[var(--muted)]";
}

function gradeClass(g: WarmPath["grade"]) {
  if (g === "A") return "text-[var(--ok)]";
  if (g === "B") return "text-[var(--signal)]";
  return "text-[var(--muted)]";
}

function sevClass(s: PortfolioPulseItem["severity"]) {
  if (s === "critical") return "text-[var(--danger)]";
  if (s === "high") return "text-[var(--warn)]";
  if (s === "medium") return "text-[var(--deep)]";
  return "text-[var(--faint)]";
}

function postureClass(p: BandPlacement["posture"]) {
  if (p === "above_top" || p === "above_median") return "text-[var(--ok)]";
  if (p === "below_floor") return "text-[var(--danger)]";
  if (p === "on_band") return "text-[var(--signal)]";
  return "text-[var(--muted)]";
}

function windowClass(w: RaiseWindow["window"]) {
  if (w === "open_now") return "text-[var(--danger)]";
  if (w === "oversubscribed") return "text-[var(--warn)]";
  if (w === "30_60d") return "text-[var(--signal)]";
  if (w === "60_120d") return "text-[var(--deep)]";
  return "text-[var(--muted)]";
}

export function SignalAtlas({
  companies,
  peers,
  commentary,
  sectors,
  alerts,
  news,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  sectors: SectorCall[];
  alerts: AlertItem[];
  news: NewsItem[];
}) {
  const [tab, setTab] = useState<Tab>("map");
  const [mapQuery, setMapQuery] = useState(PRESET_MAP_QUERIES[0]);
  const [checkM, setCheckM] = useState(15);
  const [targetOwn, setTargetOwn] = useState(8);

  const pack = useMemo(
    () =>
      buildAtlasPack({
        companies,
        peers,
        commentary,
        alerts,
        news,
        sectors,
        mapQuery,
      }),
    [companies, peers, commentary, alerts, news, sectors, mapQuery],
  );

  const liveMap: MarketMap = useMemo(
    () => buildMarketMap(mapQuery, companies, peers, sectors),
    [mapQuery, companies, peers, sectors],
  );

  const ownership = useMemo(
    () => pack.ownership.map((o) => recomputeOwnership(o, checkM, targetOwn)),
    [pack.ownership, checkM, targetOwn],
  );

  return (
    <div className="space-y-5">
      <Segmented aria-label="Signal Atlas sections" className="seg-scroll">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </SegItem>
        ))}
      </Segmented>

      {tab === "brief" && <BriefTab pack={pack} onJump={setTab} />}
      {tab === "map" && (
        <MapTab
          map={liveMap}
          query={mapQuery}
          setQuery={setMapQuery}
          briefMarkdown={formatAtlasBriefMarkdown(pack)}
        />
      )}
      {tab === "warm" && <WarmTab rows={pack.warm_paths} />}
      {tab === "pulse" && <PulseTab rows={pack.pulse} />}
      {tab === "bands" && <BandsTab rows={pack.bands} />}
      {tab === "talent" && <TalentTab rows={pack.talent} />}
      {tab === "raise" && <RaiseTab rows={pack.raise_windows} />}
      {tab === "ownership" && (
        <OwnershipTab
          rows={ownership}
          checkM={checkM}
          setCheckM={setCheckM}
          targetOwn={targetOwn}
          setTargetOwn={setTargetOwn}
        />
      )}
    </div>
  );
}

function BriefTab({
  pack,
  onJump,
}: {
  pack: ReturnType<typeof buildAtlasPack>;
  onJump: (t: Tab) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <Eyebrow>Competitive response</Eyebrow>
        <h3 className="title mt-2 text-[1.15rem]">What Atlas closes</h3>
        <ul className="mt-4 space-y-3 text-[0.875rem] text-[var(--muted)]">
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("map")}>
              Market map
            </button>
            {" — "}Harmonic Scout NL maps + Affinity Market Map skill
          </li>
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("warm")}>
              Warm paths
            </button>
            {" — "}Affinity Ascend ranked intros + draft ask (never auto-send)
          </li>
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("pulse")}>
              Portfolio pulse
            </button>
            {" — "}Meridia / VCOS board-prep signal stream
          </li>
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("bands")}>
              Growth bands
            </button>
            {" — "}Bessemer Atlas–style stage benchmarks
          </li>
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("talent")}>
              Talent graph
            </button>
            {" — "}Harmonic operator → newco radar
          </li>
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("raise")}>
              Raise windows
            </button>
            {" — "}Fundraising timing before bake-off
          </li>
          <li>
            <button type="button" className="link-quiet font-semibold text-[var(--text)]" onClick={() => onJump("ownership")}>
              Ownership desk
            </button>
            {" — "}Check / ownership / dilution stress for IC
          </li>
        </ul>
      </Panel>

      <Panel>
        <Eyebrow>Shortlist from live map</Eyebrow>
        <div className="mt-4 space-y-3">
          {pack.default_map.shortlist.slice(0, 5).map((n) => (
            <div key={n.company_id} className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0">
              <div>
                <CoLink id={n.company_id} slug={n.slug} name={n.name} />
                <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{n.why.slice(0, 110)}</p>
              </div>
              <div className="text-right">
                <div className={cn("label-caps", tagClass(n.tag))}>{n.tag}</div>
                <div className="mono mt-1 text-[0.85rem]">{n.thesis_score}</div>
              </div>
            </div>
          ))}
          {!pack.default_map.shortlist.length && (
            <EmptyState>No map nodes — Refresh pipeline or widen query.</EmptyState>
          )}
        </div>
      </Panel>

      <Panel className="lg:col-span-2">
        <Eyebrow live>Partner talking points</Eyebrow>
        <p className="body-muted mt-3 text-[0.9rem]">
          CRMs track relationships. Coverage tools track volume. Atlas is how Thirdbase{" "}
          <em>forms a market thesis in under a minute</em>, finds the warmest path, and walks into IC
          knowing raise timing, growth band posture, and ownership math — without pretending Affinity
          is already synced.
        </p>
      </Panel>
    </div>
  );
}

function MapTab({
  map,
  query,
  setQuery,
  briefMarkdown,
}: {
  map: MarketMap;
  query: string;
  setQuery: (q: string) => void;
  briefMarkdown: string;
}) {
  const [draft, setDraft] = useState(query);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(query);
  }, [query]);

  function applyQuery(next: string) {
    const q = next.trim() || PRESET_MAP_QUERIES[0];
    setDraft(q);
    startTransition(() => setQuery(q));
  }

  const byCluster = useMemo(() => {
    const groups = new Map<string, MapNode[]>();
    for (const n of map.nodes) {
      const key = n.subsector || "General";
      const list = groups.get(key) || [];
      list.push(n);
      groups.set(key, list);
    }
    return map.clusters.map((cl) => ({
      ...cl,
      nodes: (groups.get(cl.label) || []).sort((a, b) => b.thesis_score - a.thesis_score),
    }));
  }, [map.clusters, map.nodes]);

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow live>NL market map</Eyebrow>
            <p className="mt-2 text-[0.85rem] text-[var(--muted)]">
              Ask the way Harmonic Scout does — thesis language in, ranked landscape out.
            </p>
          </div>
          <CopyBtn text={briefMarkdown} label="Copy brief" />
        </div>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            applyQuery(draft);
          }}
        >
          <input
            className="field flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Map AI infra with hiring velocity…"
            aria-label="Market map query"
          />
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} aria-hidden />
                Mapping…
              </>
            ) : (
              "Map market"
            )}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_MAP_QUERIES.map((p) => (
            <button
              key={p}
              type="button"
              className={cn(
                "btn btn-ghost text-[0.7rem]",
                query === p && "bg-[var(--soft)] text-[var(--text)]",
              )}
              disabled={pending}
              onClick={() => applyQuery(p)}
            >
              {p.length > 42 ? `${p.slice(0, 40)}…` : p}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.85fr]">
        <Panel className="!p-0 overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-3">
            <div className="label-caps text-[var(--signal)]">{map.interpreted_as}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem] text-[var(--muted)]">
              {map.filters.map((f) => (
                <span key={f} className="rounded-[var(--radius)] bg-[var(--soft)] px-2 py-0.5">
                  {f}
                </span>
              ))}
            </div>
          </div>
                    <div className={cn("max-h-[28rem] overflow-y-auto scrollbar-thin", pending && "opacity-60")}>

            {byCluster.map((cl) => (

              <div key={cl.id} className="border-b border-[var(--line)] px-5 py-4 last:border-0">

                <div className="flex flex-wrap items-baseline justify-between gap-2">

                  <div>

                    <div className="text-[0.875rem] font-semibold">{cl.label}</div>

                    <p className="mt-0.5 text-[0.75rem] text-[var(--muted)]">{cl.note}</p>

                  </div>

                  <div className="flex items-center gap-2 text-[0.7rem] text-[var(--faint)]">

                    <span className="mono">{cl.count}</span>

                    <span>avg {Math.round(cl.avg_score)}</span>

                    {cl.white_space ? (

                      <span className="label-caps text-[var(--signal)]">white space</span>

                    ) : null}

                  </div>

                </div>

                <div className="mt-3 space-y-2.5">

                  {cl.nodes.map((n) => (

                    <div key={n.company_id} className="flex gap-3">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center justify-between gap-2">

                          <CoLink id={n.company_id} slug={n.slug} name={n.name} />

                          <RecBadge rec={n.recommendation} />

                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem] text-[var(--muted)]">

                          <span className={tagClass(n.tag)}>{n.tag}</span>

                          <span>{n.stage}</span>

                          <span className="mono">score {n.thesis_score}</span>

                          {n.hiring_velocity > 0 && <span>+{n.hiring_velocity}% hire</span>}

                          {n.peer_heat > 0 && <span>{n.peer_heat} peers</span>}

                        </div>

                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--panel-2)]">

                          <div

                            className="h-full rounded-full bg-gradient-to-r from-[var(--deep)] to-[var(--signal)]"

                            style={{ width: `${Math.max(4, Math.min(100, n.thesis_score))}%` }}

                          />

                        </div>

                      </div>

                    </div>

                  ))}

                  {!cl.nodes.length && (

                    <p className="text-[0.8rem] text-[var(--faint)]">No named companies in this cluster.</p>

                  )}

                </div>

              </div>

            ))}

            {!map.nodes.length && (

              <div className="flex min-h-[12rem] items-center justify-center px-5 py-8">

                <EmptyState>Empty map — try another query or Refresh.</EmptyState>

              </div>

            )}

          </div>

          <p className="border-t border-[var(--line)] px-5 py-3 text-[0.8rem] text-[var(--muted)]">
            {map.counsel}
          </p>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <Eyebrow>Ranked shortlist</Eyebrow>
            <div className="mt-3 space-y-3">
              {map.shortlist.map((n, i) => (
                <div key={n.company_id} className="flex gap-3">
                  <span className="mono text-[0.75rem] text-[var(--faint)]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <CoLink id={n.company_id} slug={n.slug} name={n.name} />
                      <RecBadge rec={n.recommendation} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem] text-[var(--muted)]">
                      <span className={tagClass(n.tag)}>{n.tag}</span>
                      <span>{n.stage}</span>
                      <span className="mono">{n.thesis_score}</span>
                      {n.hiring_velocity > 0 && <span>+{n.hiring_velocity}% hire</span>}
                      {n.peer_heat > 0 && <span>{n.peer_heat} peers</span>}
                    </div>
                  </div>
                </div>
              ))}
              {!map.shortlist.length && (
                <EmptyState>No shortlist for this query.</EmptyState>
              )}
            </div>
          </Panel>
          <Panel>
            <Eyebrow>Clusters / white space</Eyebrow>
            <div className="mt-3 space-y-2">
              {map.clusters.map((cl) => (
                <div key={cl.id} className="flex items-center justify-between gap-2 text-[0.8rem]">
                  <span>
                    {cl.label}{" "}
                    <span className="text-[var(--faint)]">({cl.count})</span>
                  </span>
                  <span className={cl.white_space ? "text-[var(--signal)]" : "text-[var(--muted)]"}>
                    {cl.white_space ? "white space" : cl.note}
                  </span>
                </div>
              ))}
              {!map.clusters.length && <p className="text-[0.8rem] text-[var(--muted)]">No clusters.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function WarmTab({ rows }: { rows: WarmPath[] }) {
  const [active, setActive] = useState(rows[0]?.company_id || "");
  const row = rows.find((r) => r.company_id === active) || rows[0];

  if (!rows.length) {
    return <EmptyState>No warm paths — need Deep Dive / high-score names.</EmptyState>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.2fr]">
      <Panel>
        <Eyebrow>Ranked paths</Eyebrow>
        <div className="mt-3 space-y-1">
          {rows.map((r) => (
            <button
              key={r.company_id}
              type="button"
              onClick={() => setActive(r.company_id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-[var(--radius)] px-3 py-2.5 text-left text-[0.85rem] transition",
                active === r.company_id ? "bg-[var(--soft)]" : "hover:bg-[var(--soft)]/60",
              )}
            >
              <span className="font-medium">{r.company_name}</span>
              <span className={cn("mono text-[0.75rem]", gradeClass(r.grade))}>
                {r.grade} · {r.strength}
              </span>
            </button>
          ))}
        </div>
      </Panel>

      {row && (
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow live>Warm intro · Affinity Ascend response</Eyebrow>
              <h3 className="title mt-2 text-[1.25rem]">
                <CoLink id={row.company_id} slug={row.slug} name={row.company_name} />
              </h3>
              <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{row.provenance}</p>
            </div>
            <div className={cn("mono text-[1.4rem]", gradeClass(row.grade))}>{row.grade}</div>
          </div>

          <div className="mt-6 flex flex-col gap-0">
            {row.hops.map((h, i) => (
              <div key={`${h.person}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                {i < row.hops.length - 1 && (
                  <div className="absolute left-[0.7rem] top-7 h-[calc(100%-1.25rem)] w-px bg-[var(--line)]" />
                )}
                <div className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal)] text-[0.65rem] font-bold text-[var(--signal-ink)]">
                  {i + 1}
                </div>
                <div>
                  <div className="font-medium">{h.person}</div>
                  <div className="text-[0.75rem] text-[var(--muted)]">
                    {h.role} · {h.firm} · strength {h.strength}
                  </div>
                  <p className="mt-1 text-[0.8rem] text-[var(--muted)]">{h.why}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--soft)]/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>Draft ask · never auto-send</Eyebrow>
              <CopyBtn text={row.draft_ask} label="Copy draft" />
            </div>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[0.8rem] leading-relaxed text-[var(--text)]">
              {row.draft_ask}
            </pre>
          </div>
        </Panel>
      )}
    </div>
  );
}

function PulseTab({ rows }: { rows: PortfolioPulseItem[] }) {
  if (!rows.length) {
    return <EmptyState>Pulse clear — no board-prep signals on the demo book.</EmptyState>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Panel key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("label-caps", sevClass(r.severity))}>{r.severity}</span>
                <span className="label-caps text-[var(--faint)]">{r.kind}</span>
                <span className="text-[0.7rem] text-[var(--faint)]">{r.age_label}</span>
              </div>
              <h3 className="title mt-2 text-[1.05rem]">{r.title}</h3>
              <p className="mt-1.5 text-[0.85rem] text-[var(--muted)]">{r.body}</p>
            </div>
            <CoLink id={r.company_id} slug={r.slug} name={r.company_name} />
          </div>
          <p className="mt-3 border-t border-[var(--line)] pt-3 text-[0.8rem]">
            <span className="font-semibold text-[var(--text)]">Board ask: </span>
            <span className="text-[var(--muted)]">{r.board_ask}</span>
          </p>
        </Panel>
      ))}
    </div>
  );
}

function BandsTab({ rows }: { rows: BandPlacement[] }) {
  if (!rows.length) {
    return <EmptyState>No band placements — need scored Deep Dive / high Watch names.</EmptyState>;
  }
  return (
    <div className="space-y-5">
      <Panel>
        <Eyebrow>Bessemer-style growth bands</Eyebrow>
        <p className="mt-2 text-[0.85rem] text-[var(--muted)]">
          Stage floors / medians / tops for YoY — shared language with founders, not fake precision.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Seed", "Series A", "Series B", "Growth"].map((st) => {
            const sample = rows.find((r) => r.stage === st);
            const b = sample?.band;
            if (!b) return null;
            return (
              <div key={st} className="rounded-[var(--radius)] border border-[var(--line)] p-3">
                <div className="label-caps text-[var(--signal)]">{b.label}</div>
                <div className="mono mt-2 text-[0.8rem] text-[var(--muted)]">
                  floor {b.yoy_floor}% · med {b.yoy_median}% · top {b.yoy_top}%
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Panel key={r.company_id}>
            <div className="flex items-start justify-between gap-2">
              <CoLink id={r.company_id} slug={r.slug} name={r.company_name} />
              <span className={cn("label-caps", postureClass(r.posture))}>
                {r.posture.replace(/_/g, " ")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[0.8rem] text-[var(--muted)]">
              <span>{r.stage}</span>
              <span className="mono">
                YoY {r.yoy != null ? `${r.yoy}%` : "—"}
              </span>
              {r.pct_of_median != null && (
                <span className="mono">{r.pct_of_median}% of median</span>
              )}
              {r.headcount != null && <span>HC {r.headcount}</span>}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--soft)]">
              <div
                className="h-full rounded-full bg-[var(--signal)] transition-all duration-500"
                style={{
                  width: `${clampBar(r.yoy, r.band.yoy_floor, r.band.yoy_top)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-[0.8rem] text-[var(--muted)]">{r.counsel}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function clampBar(yoy: number | null, floor: number, top: number) {
  if (yoy == null) return 8;
  const pct = ((yoy - floor * 0.5) / (top * 1.1 - floor * 0.5)) * 100;
  return Math.max(6, Math.min(100, pct));
}

function TalentTab({ rows }: { rows: TalentNode[] }) {
  if (!rows.length) {
    return <EmptyState>No talent nodes — team notes / hiring signals feed this graph.</EmptyState>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((t) => (
        <Panel key={t.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="label-caps text-[var(--signal)]">via {t.prior}</div>
              <h3 className="title mt-1.5 text-[1.05rem]">{t.name}</h3>
            </div>
            <span className="mono text-[1.1rem] text-[var(--text)]">{t.heat}</span>
          </div>
          <p className="mt-2 text-[0.85rem] text-[var(--muted)]">{t.signal}</p>
          {t.company_id && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-[0.8rem]">
              <CoLink id={t.company_id} slug={t.slug} name={t.company_name || "Company"} />
              <span className="text-[var(--muted)]">{t.action}</span>
            </div>
          )}
        </Panel>
      ))}
    </div>
  );
}

function RaiseTab({ rows }: { rows: RaiseWindow[] }) {
  if (!rows.length) {
    return <EmptyState>No raise windows — need scored companies with runway / round dates.</EmptyState>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Panel key={r.company_id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CoLink id={r.company_id} slug={r.slug} name={r.company_name} />
              <div className="mt-2 flex flex-wrap gap-2 text-[0.75rem] text-[var(--muted)]">
                <span className={cn("label-caps", windowClass(r.window))}>
                  {r.window.replace(/_/g, " ")}
                </span>
                <span className="mono">score {r.score}</span>
                {r.runway_months != null && <span>~{r.runway_months} mo runway</span>}
                {r.months_since_round != null && <span>{r.months_since_round} mo since round</span>}
              </div>
            </div>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.8rem] text-[var(--muted)]">
            {r.drivers.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="mt-3 text-[0.85rem] font-medium text-[var(--text)]">{r.counsel}</p>
        </Panel>
      ))}
    </div>
  );
}

function OwnershipTab({
  rows,
  checkM,
  setCheckM,
  targetOwn,
  setTargetOwn,
}: {
  rows: OwnershipScenario[];
  checkM: number;
  setCheckM: (n: number) => void;
  targetOwn: number;
  setTargetOwn: (n: number) => void;
}) {
  if (!rows.length) {
    return <EmptyState>No ownership scenarios — need Deep Dive names with valuation context.</EmptyState>;
  }
  return (
    <div className="space-y-5">
      <Panel>
        <Eyebrow live>IC ownership desk</Eyebrow>
        <p className="mt-2 text-[0.85rem] text-[var(--muted)]">
          Live recompute from pipeline valuation estimates — blanks stay blank.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-[0.8rem]">
            <span className="label-caps">Check size ($M)</span>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={checkM}
              onChange={(e) => setCheckM(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <span className="mono mt-1 block text-[var(--text)]">${checkM}M</span>
          </label>
          <label className="block text-[0.8rem]">
            <span className="label-caps">Target ownership %</span>
            <input
              type="range"
              min={3}
              max={15}
              step={0.5}
              value={targetOwn}
              onChange={(e) => setTargetOwn(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <span className="mono mt-1 block text-[var(--text)]">{targetOwn}%</span>
          </label>
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <Panel key={r.company_id}>
            <div className="flex items-start justify-between gap-2">
              <CoLink id={r.company_id} slug={r.slug} name={r.company_name} />
              <span className="mono text-[1.2rem] text-[var(--signal)]">
                {r.pre_money_m != null ? `${r.ownership_pct}%` : "—"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[0.75rem] text-[var(--muted)]">
              <span>Pre {r.pre_money_m != null ? `$${r.pre_money_m}M` : "blank"}</span>
              <span>Post {r.post_money_m != null ? `$${r.post_money_m}M` : "—"}</span>
              <span>Check ${r.check_m}M</span>
              <span>Next ~{r.diluted_next_round_pct}%</span>
              <span className={r.gap_to_target > 1 ? "text-[var(--warn)]" : "text-[var(--ok)]"}>
                Gap to {r.target_ownership}%: {r.gap_to_target > 0 ? "+" : ""}
                {r.gap_to_target}pp
              </span>
            </div>
            <p className="mt-3 text-[0.8rem] text-[var(--text)]">{r.counsel}</p>
            <ul className="mt-2 space-y-1 text-[0.7rem] text-[var(--faint)]">
              {r.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}

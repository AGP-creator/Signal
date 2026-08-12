import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import { Eyebrow, Panel } from "@/components/ui";
import { GP_WATCHLIST, type GpVoice } from "@/lib/gpWatchlist";
import { buildVoiceUpdates, pagesToFollow, peopleToFollow, type VoiceUpdate } from "@/lib/voices";
import type { AlertItem, Commentary, NewsItem } from "@/lib/types";

function VoiceCard({ voice }: { voice: GpVoice }) {
  return (
    <ExternalLink
      href={voice.url}
      kind="source"
      className="group block rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] px-3.5 py-3 transition hover:border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] hover:bg-[var(--panel-2)]"
    >
      <div className="font-semibold text-[var(--text)] group-hover:text-[var(--signal)]">{voice.name}</div>
      <div className="mono mt-0.5 text-[0.75rem] text-[var(--faint)]">@{voice.handle}</div>
    </ExternalLink>
  );
}

function UpdateCard({ u }: { u: VoiceUpdate }) {
  return (
    <article className="panel p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Eyebrow>
          {u.voice.name} · @{u.voice.handle}
          {u.captured_at ? ` · ${u.captured_at}` : ""}
        </Eyebrow>
        <ExternalLink
          href={u.voice.url}
          kind="source"
          className="text-[0.75rem] font-medium text-[var(--signal)] hover:underline"
        >
          Open on X
        </ExternalLink>
        {u.company_name && u.company_id ? (
          <Link
            href={`/company/${u.company_id}`}
            className="text-[0.8125rem] font-medium text-[var(--signal)] hover:underline"
          >
            {u.company_name}
          </Link>
        ) : null}
      </div>
      <p className="mt-3 text-[0.975rem] leading-relaxed text-[var(--text)]/90">{u.text}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.75rem] text-[var(--faint)]">
        <span className="rounded-[var(--radius-sm)] border border-[var(--line)] px-2 py-0.5">
          {u.source}
        </span>
        {u.sentiment ? (
          <span className="rounded-[var(--radius-sm)] border border-[var(--line)] px-2 py-0.5">
            {u.sentiment}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function VoicesDesk({
  commentary,
  news,
  alerts,
}: {
  commentary: Commentary[];
  news: NewsItem[];
  alerts?: AlertItem[];
}) {
  const updates = buildVoiceUpdates({ commentary, news, alerts, limit: 20 });
  const people = peopleToFollow();
  const pages = pagesToFollow();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="title text-[1.25rem]">Latest updates from these folks</h2>
          <p className="body-muted mt-1.5 max-w-2xl text-[0.9rem]">
            Captured commentary, news, and alerts that mention people and pages on the GP watchlist.
            For the full qualitative desk (posture, themes, source mix), open{" "}
            <Link href="/library?tab=commentary" className="text-[var(--signal)] hover:underline">
              Investor Commentary
            </Link>
            . Live X ingest is Phase 2 — this surface joins what Signal already captured.
          </p>
        </div>
        <div className="space-y-4 stagger">
          {updates.map((u) => (
            <UpdateCard key={u.id} u={u} />
          ))}
          {!updates.length && (
            <Panel>
              <p className="body-muted">
                No watchlist hits in commentary yet — run Refresh pipeline, or open profiles below.
              </p>
            </Panel>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="title text-[1.25rem]">People to follow</h2>
          <p className="body-muted mt-1.5 text-[0.9rem]">
            {people.length} GPs, operators, and writers Signal routes as special-alert sources.
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((v) => (
            <VoiceCard key={v.handle} voice={v} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="title text-[1.25rem]">Pages to follow</h2>
          <p className="body-muted mt-1.5 text-[0.9rem]">
            Publications, shows, and orgs on the same watchlist ({pages.length}).
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pages.map((v) => (
            <VoiceCard key={v.handle} voice={v} />
          ))}
        </div>
      </section>

      <p className="text-[0.8125rem] text-[var(--faint)]">
        Source of truth: <span className="mono">config/watchlists.yaml</span> · {GP_WATCHLIST.length}{" "}
        total handles · mirrored in web for partner UI.
      </p>
    </div>
  );
}

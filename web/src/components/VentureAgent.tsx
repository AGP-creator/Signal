"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AiOs } from "@/components/AiOs";
import { CommentaryDesk } from "@/components/CommentaryDesk";
import { GreatDealDesk } from "@/components/GreatDealDesk";
import { NewsWorthReadingDesk } from "@/components/NewsWorthReading";
import { SectorScanner } from "@/components/SectorScanner";
import {
  BulletList,
  Eyebrow,
  Panel,
  RecBadge,
  SegItem,
  Segmented,
} from "@/components/ui";
import {
  buildVentureAgentPack,
  type PartnerWhy,
} from "@/lib/ventureAgent";
import type {
  AlertItem,
  Commentary,
  Company,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "great" | "sectors" | "news" | "commentary" | "partner" | "fleet";

/** Exact / near-exact Core Intelligence Expectation headings from the brief. */
const TABS: { id: Tab; label: string; short: string }[] = [
  { id: "great", label: "Knows what a great deal looks like", short: "Great deal" },
  { id: "sectors", label: "Knows the sector of tomorrow", short: "Sector of tomorrow" },
  { id: "news", label: "Surfaces news worth reading", short: "News worth reading" },
  {
    id: "commentary",
    label: "Captures investor and operator commentary",
    short: "Commentary",
  },
  { id: "partner", label: "Holds its own with a partner", short: "Partner conversation" },
  { id: "fleet", label: "Agent fleet", short: "Fleet" },
];

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !py-1.5 !text-[0.75rem]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

function PartnerConversation({ whys }: { whys: PartnerWhy[] }) {
  const [id, setId] = useState(whys[0]?.company.id || "");
  const active = whys.find((w) => w.company.id === id) || whys[0];

  if (!whys.length) {
    return (
      <Panel>
        <p className="body-muted">Score the pipeline to unlock partner-ready arguments.</p>
      </Panel>
    );
  }

  const script = active
    ? [
        active.opening,
        "",
        ...active.bullets.map((b) => `• ${b}`),
        "",
        `Kill risk: ${active.kill_risk}`,
        "",
        `Ask: ${active.next_question}`,
      ].join("\n")
    : "";

  return (
    <div className="space-y-5">
      <Panel className="border-[var(--signal)]/20">
        <Eyebrow live>Conversational interface</Eyebrow>
        <h3 className="title mt-2 text-[1.35rem]">Why a particular company matters</h3>
        <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-[var(--muted)]">
          Opening line, evidence, kill risk, and the next question — then continue in grounded
          chat. Same store as Excel and digests; no ungrounded theater.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "What are the best deals in defense tech right now?",
            "What are three AI infra sub-sectors nobody is talking about?",
            "Who's quietly investing in robotics?",
          ].map((q) => (
            <Link
              key={q}
              href={`/chat?q=${encodeURIComponent(q)}`}
              className="rounded-[8px] border border-[var(--line)] px-3 py-1.5 text-[0.75rem] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--text)]"
            >
              {q}
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.4fr]">
        <div className="space-y-2">
          {whys.map((w, i) => (
            <motion.button
              key={w.company.id}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setId(w.company.id)}
              className={cn(
                "w-full rounded-[10px] border px-4 py-3 text-left transition",
                active?.company.id === w.company.id
                  ? "border-[var(--line-hover)] bg-[var(--signal-dim)]"
                  : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{w.company.name}</span>
                <RecBadge rec={w.company.recommendation} />
              </div>
              <p className="mt-1 line-clamp-2 text-[0.75rem] text-[var(--faint)]">{w.opening}</p>
            </motion.button>
          ))}
        </div>

        {active ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={active.company.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <Panel>
                <h3 className="display text-[1.85rem]">{active.company.name}</h3>
                <p className="mt-3 text-[1rem] leading-relaxed text-[var(--text)]">{active.opening}</p>
                <div className="mt-5">
                  <BulletList items={active.bullets} />
                </div>
                <div className="mt-5 rounded-[8px] border border-[var(--warn)]/25 bg-[var(--warn-dim)] px-4 py-3">
                  <div className="label-caps text-[var(--warn)]">Kill risk</div>
                  <p className="mt-1.5 text-[0.875rem]">{active.kill_risk}</p>
                </div>
                <p className="mt-4 text-[0.875rem] text-[var(--muted)]">
                  <span className="text-[var(--text)]">Next question:</span> {active.next_question}
                </p>
              </Panel>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/chat?q=${encodeURIComponent(active.chat_prompt)}`}
                  className="btn btn-primary"
                >
                  Continue in chat
                </Link>
                <Link
                  href={`/company/${active.company.slug || active.company.id}`}
                  className="btn btn-ghost"
                >
                  Open brief
                </Link>
                <Link href="/deals" className="btn btn-ghost">
                  Great deal desk
                </Link>
                <CopyBtn text={script} label="Copy IC script" />
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}

export function VentureAgent({
  companies,
  peers,
  commentary,
  news,
  alerts,
  sectors,
  initialTab,
}: {
  companies: Company[];
  peers: PeerActivity[];
  commentary: Commentary[];
  news: NewsItem[];
  alerts: AlertItem[];
  sectors: SectorCall[];
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab || "great");
  const pack = useMemo(
    () => buildVentureAgentPack({ companies, sectors, news, commentary, peers }),
    [companies, sectors, news, commentary, peers],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {[
            ["Outstanding", pack.stats.outstanding_deals],
            ["Sectors", pack.stats.horizon_sectors],
            ["News", pack.stats.news_items],
            ["Commentary", pack.stats.commentary_clusters],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline gap-1.5">
              <span className="mono text-[1.05rem] font-semibold text-[var(--text)]">{value}</span>
              <span className="label-caps text-[var(--faint)]">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyBtn text={pack.markdown} label="Copy brief" />
          <Link href="/chat" className="btn btn-soft btn-sm">
            Open chat
          </Link>
        </div>
      </div>

      <Segmented aria-label="Core intelligence expectations" className="seg-scroll">
        {TABS.map((t) => (
          <SegItem key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            <span className="hidden xl:inline">{t.label}</span>
            <span className="xl:hidden">{t.short}</span>
          </SegItem>
        ))}
      </Segmented>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "great" ? (
            <div className="space-y-4">
              <p className="max-w-2xl text-[0.9rem] leading-relaxed text-[var(--muted)]">
                Separates noisy funding announcements from outstanding opportunities. Articulates
                why on founder, market, investors, traction, and entry — ranked relative to the same
                sector × stage, not in isolation.
              </p>
              <GreatDealDesk companies={companies} compact />
            </div>
          ) : null}

          {tab === "sectors" ? (
            <div className="space-y-4">
              <p className="max-w-2xl text-[0.9rem] leading-relaxed text-[var(--muted)]">
                Tracks where capital, talent, and founder attention flow — and surfaces emerging
                sub-sectors before consensus, with evidence from GP commentary, hiring, founder
                migration, fund formation, and research velocity.
              </p>
              <SectorScanner
                companies={companies}
                peers={peers}
                commentary={commentary}
                sectors={sectors}
                compact
              />
            </div>
          ) : null}

          {tab === "news" ? (
            <div className="space-y-4">
              <p className="max-w-2xl text-[0.9rem] leading-relaxed text-[var(--muted)]">
                Not a news firehose. A curated 3–5 with a one-line explanation of why each matters
                to Thirdbase specifically.
              </p>
              <NewsWorthReadingDesk news={news} companies={companies} />
            </div>
          ) : null}

          {tab === "commentary" ? (
            <div className="space-y-4">
              <p className="max-w-2xl text-[0.9rem] leading-relaxed text-[var(--muted)]">
                Qualitative signal from investors, operators, customers, and engineers — beloved by
                builders, churn risk, private skepticism — often more important than the funding
                number.
              </p>
              <CommentaryDesk commentary={commentary} mode="library" embedded />
            </div>
          ) : null}

          {tab === "partner" ? <PartnerConversation whys={pack.partner_whys} /> : null}

          {tab === "fleet" ? (
            <AiOs
              companies={companies}
              peers={peers}
              commentary={commentary}
              news={news}
              alerts={alerts}
              sectors={sectors}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

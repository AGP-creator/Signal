"use client";

import { useMemo, useState } from "react";
import {
  buildDiligencePack,
  companyToSubject,
  briefToSubject,
  type BearCase,
  type DeckAnalysis,
  type DiligencePack,
  type DiligencePlan,
  type DiligenceSubject,
  type MeetingPrep,
} from "@/lib/diligence";
import type { CompanyBrief } from "@/lib/research";
import type { Commentary, Company, PeerActivity } from "@/lib/types";
import { EmptyState, Panel } from "@/components/ui";

function SeverityChip({ s }: { s: "high" | "medium" | "low" }) {
  const color =
    s === "high" ? "var(--danger)" : s === "medium" ? "var(--warn)" : "var(--faint)";
  return (
    <span className="label-caps" style={{ color }}>
      {s}
    </span>
  );
}

function BearPanel({ bear }: { bear: BearCase }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.04)]">
        <div className="label-caps text-[var(--danger)]">Bear case · counterfactual</div>
        <h3 className="display mt-2 text-2xl font-bold">{bear.headline}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{bear.conviction_gate}</p>
        <div className="mt-5 space-y-4">
          {bear.kill_arguments.map((k) => (
            <div key={k.title} className="border-b border-[var(--line)] pb-3 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{k.title}</span>
                <SeverityChip s={k.severity} />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text)]/90">{k.argument}</p>
              <p className="mt-1 text-[11px] text-[var(--faint)]">Evidence: {k.evidence}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="label-caps text-[var(--ok)]">Bull counters · fair</div>
        <h3 className="display mt-2 text-2xl font-bold">What still argues for the deal</h3>
        <ul className="mt-4 space-y-2.5 text-sm">
          {bear.bull_counterpoints.length === 0 && <EmptyState>No strong bull counters on file.</EmptyState>}
          {bear.bull_counterpoints.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-[var(--signal)]">›</span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
        <h4 className="mt-6 text-sm font-semibold">What would have to be true</h4>
        <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
          {bear.what_would_have_to_be_true.map((w) => (
            <li key={w} className="flex gap-2">
              <span className="text-[var(--warn)]">›</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-[var(--faint)]">
          {bear.provenance} · confidence {bear.confidence}
        </p>
      </Panel>
    </div>
  );
}

function PlanPanel({ plan }: { plan: DiligencePlan }) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    await navigator.clipboard.writeText(plan.founder_email_draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="label-caps text-[var(--deep)]">Diligence plan</div>
            <h3 className="display mt-2 text-2xl font-bold">Work orders</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(plan.area_risk) as [string, string][]).map(([a, r]) => (
              <span key={a} className="chip text-[11px]">
                {a} · {r}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {plan.tasks.map((t) => (
            <div key={t.id} className="border-b border-[var(--line)] pb-3.5 last:border-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="label-caps text-[var(--faint)]">{t.area}</span>
                {t.required_before_close && (
                  <span className="label-caps text-[var(--warn)]">required</span>
                )}
                <SeverityChip s={t.risk_if_open} />
              </div>
              <div className="mt-1 font-semibold">{t.title}</div>
              <p className="mt-1 text-sm text-[var(--muted)]">{t.procedure}</p>
              <p className="mt-1 text-[12px] text-[var(--faint)]">
                Docs: {t.documents.join(", ")} · Closes when: {t.closes_when}
              </p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label-caps">Founder-only questions</div>
            <h3 className="display mt-1 text-xl font-bold">Ask draft — never auto-send</h3>
          </div>
          <button type="button" onClick={copyEmail} className="btn btn-ghost !py-1.5 !text-xs">
            {copied ? "Copied ✓" : "Copy email draft"}
          </button>
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          {plan.founder_only_questions.map((q) => (
            <li key={q} className="leading-relaxed">
              {q}
            </li>
          ))}
        </ol>
        <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-[var(--line)] bg-black/20 p-3 text-[11px] leading-relaxed text-[var(--muted)] whitespace-pre-wrap">
          {plan.founder_email_draft}
        </pre>
      </Panel>
    </div>
  );
}

function MeetingPanel({ prep }: { prep: MeetingPrep }) {
  return (
    <Panel>
      <div className="label-caps text-[var(--signal)]">Meeting prep</div>
      <h3 className="display mt-2 text-2xl font-bold">{prep.headline}</h3>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="label-caps">Context</div>
          <ul className="mt-2 space-y-2 text-sm">
            {prep.context_bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <div className="label-caps mt-4">Relationship / peer tape</div>
          <ul className="mt-2 space-y-2 text-sm text-[var(--muted)]">
            {prep.relationship_notes.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="label-caps text-[var(--warn)]">Landmines</div>
          <ul className="mt-2 space-y-2 text-sm">
            {prep.landmines.map((l) => (
              <li key={l} className="leading-relaxed">
                {l}
              </li>
            ))}
          </ul>
          <div className="label-caps mt-4">Must ask</div>
          <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm">
            {prep.must_ask.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="label-caps">Listen for</div>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
            {prep.listen_for.map((l) => (
              <li key={l}>› {l}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="label-caps">After the call</div>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--muted)]">
            {prep.post_call_actions.map((a) => (
              <li key={a}>› {a}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-[var(--faint)]">{prep.provenance}</p>
    </Panel>
  );
}

function DeckPanel({
  deck,
  onAnalyze,
  busy,
}: {
  deck: DeckAnalysis | null;
  onAnalyze: (text: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");

  return (
    <Panel>
      <div className="label-caps text-[var(--deep)]">Deck ingest</div>
      <h3 className="display mt-2 text-2xl font-bold">Claims + red flags</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Paste pitch-deck text. Signal extracts metrics it can see and leaves blanks blank — never invents.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Paste deck text or slide notes…"
        className="field mt-4 !min-h-[120px] !py-3 font-mono text-[12px]"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || text.trim().length < 20}
          className="btn btn-primary !py-1.5 !text-xs"
          onClick={() => onAnalyze(text)}
        >
          {busy ? "Analyzing…" : "Analyze deck"}
        </button>
      </div>

      {deck && (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <div className="label-caps">Extracted claims</div>
            <div className="mt-2 space-y-2">
              {deck.claims.length === 0 && <EmptyState>No metrics extracted.</EmptyState>}
              {deck.claims.map((c) => (
                <div key={`${c.field}-${c.value}`} className="text-sm">
                  <span className="font-medium">{c.field}</span>
                  <span className="text-[var(--muted)]"> · {c.value}</span>
                  <div className="text-[11px] text-[var(--faint)]">{c.source} · {c.origin}</div>
                </div>
              ))}
            </div>
            {!!deck.missing_fields.length && (
              <>
                <div className="label-caps mt-4">Left blank</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {deck.missing_fields.map((m) => (
                    <span key={m} className="chip">
                      {m}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div>
            <div className="label-caps text-[var(--danger)]">Red flags</div>
            <div className="mt-2 space-y-3">
              {deck.red_flags.length === 0 && <EmptyState>No flags triggered.</EmptyState>}
              {deck.red_flags.map((f) => (
                <div key={f.id} className="border-b border-[var(--line)] pb-2 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{f.title}</span>
                    <SeverityChip s={f.severity} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{f.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {deck && <p className="mt-4 text-[11px] text-[var(--faint)]">{deck.provenance}</p>}
    </Panel>
  );
}

type Tab = "bear" | "plan" | "meeting" | "deck";

export function DiligenceStressPack({
  subject,
  commentary,
  peers,
  initialDeck,
}: {
  subject: DiligenceSubject;
  commentary?: Commentary[];
  peers?: PeerActivity[];
  initialDeck?: DeckAnalysis | null;
}) {
  const [deck, setDeck] = useState<DeckAnalysis | null>(initialDeck || null);
  const [deckText, setDeckText] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("bear");

  const pack: DiligencePack = useMemo(
    () =>
      buildDiligencePack(subject, {
        deckText,
        commentary,
        peers,
      }),
    [subject, deckText, commentary, peers],
  );

  const effectiveDeck = deck || pack.deck;

  async function onAnalyze(text: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, company_name: subject.name }),
      });
      const data = await res.json();
      if (res.ok && data.analysis) {
        setDeck(data.analysis);
        setDeckText(text);
        setTab("deck");
      } else {
        // local fallback
        setDeckText(text);
        setTab("deck");
      }
    } catch {
      setDeckText(text);
      setTab("deck");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "bear", label: "Bull vs Bear" },
    { id: "plan", label: "Diligence plan" },
    { id: "meeting", label: "Meeting prep" },
    { id: "deck", label: "Deck flags" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-caps text-[var(--signal)]">Diligence Stress Pack</div>
          <h2 className="display mt-1 text-3xl font-bold">Pressure-test before conviction</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
            Counterfactual bear case, work orders, founder-only asks, and deck red flags — judgment
            agents, not another coverage dashboard.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`chip !cursor-pointer ${tab === t.id ? "!border-[var(--signal)] !text-[var(--signal)]" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "bear" && <BearPanel bear={pack.bear} />}
      {tab === "plan" && <PlanPanel plan={pack.plan} />}
      {tab === "meeting" && <MeetingPanel prep={pack.meeting} />}
      {tab === "deck" && (
        <DeckPanel deck={effectiveDeck || null} onAnalyze={onAnalyze} busy={busy} />
      )}
    </div>
  );
}

export function DiligenceStressPackFromCompany({
  company,
  commentary,
  peers,
}: {
  company: Company;
  commentary?: Commentary[];
  peers?: PeerActivity[];
}) {
  return (
    <DiligenceStressPack
      subject={companyToSubject(company)}
      commentary={commentary}
      peers={peers}
    />
  );
}

export function DiligenceStressPackFromBrief({
  brief,
  commentary,
  peers,
}: {
  brief: CompanyBrief;
  commentary?: Commentary[];
  peers?: PeerActivity[];
}) {
  return (
    <DiligenceStressPack
      subject={briefToSubject(brief)}
      commentary={commentary}
      peers={peers}
    />
  );
}

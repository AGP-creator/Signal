"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CompanyBriefView } from "@/components/CompanyBriefView";
import { Eyebrow, HeroSurface, Panel } from "@/components/ui";
import { DEMO_SHOWCASE, hasDemoFinancials } from "@/lib/demoFinancials";
import type { CompanyBrief } from "@/lib/research";
import type { ScoutStep } from "@/lib/agenticScout";

type Suggestion = {
  id: string;
  slug?: string;
  name: string;
  recommendation?: string | null;
  thesis_score?: number | null;
  sector_theme?: string | null;
  in_pipeline?: boolean;
};

const EXAMPLES = ["AgentGate", "LatticeEval", "SwarmGuard", "SynthForge", "VectorLoom"];

function stepIcon(status: ScoutStep["status"]) {
  if (status === "running") return "◉";
  if (status === "done") return "✓";
  if (status === "skip") return "–";
  if (status === "error") return "!";
  return "○";
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [canResearch, setCanResearch] = useState(false);
  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [steps, setSteps] = useState<ScoutStep[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (bootstrapped.current || typeof window === "undefined") return;
    const prefill = new URLSearchParams(window.location.search).get("q")?.trim();
    if (!prefill) return;
    bootstrapped.current = true;
    setQ(prefill);
    void runResearch(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    const seq = ++suggestSeq.current;

    debounceRef.current = setTimeout(async () => {
      if (!trimmed) {
        if (seq !== suggestSeq.current) return;
        setSuggestions([]);
        setCanResearch(false);
        return;
      }
      try {
        const res = await fetch(`/api/companies/suggest?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json().catch(() => ({}));
        if (seq !== suggestSeq.current) return;
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        const allow =
          Boolean(data.can_research) ||
          (!res.ok && trimmed.length >= 2) ||
          (trimmed.length >= 2 &&
            !(data.suggestions || []).some(
              (s: Suggestion) => s.name.toLowerCase() === trimmed.toLowerCase(),
            ));
        setCanResearch(allow);
      } catch {
        if (seq !== suggestSeq.current) return;
        setSuggestions([]);
        setCanResearch(trimmed.length >= 2);
      }
    }, 180);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  function upsertStep(step: ScoutStep) {
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.id === step.id);
      if (i < 0) return [...prev, step];
      const next = [...prev];
      next[i] = step;
      return next;
    });
  }

  async function runResearch(name: string) {
    const query = name.trim();
    if (!query || busy) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setQ(query);
    setOpenSuggest(false);
    setBusy(true);
    setError(null);
    setHint(null);
    setBrief(null);
    setSteps([]);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({ query, stream: true }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Research failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (evt.type === "meta") {
            if (typeof evt.ai_enabled === "boolean") setAiEnabled(evt.ai_enabled);
            if (evt.pipeline_warning) {
              setHint(`Pipeline lookup degraded (${String(evt.pipeline_warning)}). Showing best-effort brief.`);
            }
          } else if (evt.type === "step" && evt.step) {
            upsertStep(evt.step as ScoutStep);
          } else if (evt.type === "brief" && evt.brief) {
            setBrief(evt.brief as CompanyBrief);
            if (typeof evt.ai_enabled === "boolean") setAiEnabled(evt.ai_enabled);
            const b = evt.brief as CompanyBrief;
            if (evt.ai_enabled === false && !b.in_pipeline) {
              setHint(
                "AI synthesis is off — set GEMINI_API_KEY in web/.env.local. Agentic web gather still ran on free public sources.",
              );
            } else if (evt.ai_enabled && !b.in_pipeline) {
              const bud = evt.gemini_budget as
                | { used?: number; cap?: number; remaining?: number }
                | undefined;
              const budgetNote =
                bud && typeof bud.remaining === "number"
                  ? ` Gemini budget today: ${bud.used}/${bud.cap}.`
                  : "";
              setHint(
                `Agentic scout via ${String(evt.ai_provider || "AI")} · ${b.sources?.length || 0} sources.${budgetNote}`,
              );
            } else if (b.in_pipeline) {
              setHint("Grounded IC brief from Signal pipeline.");
            }
          } else if (evt.type === "error") {
            throw new Error(String(evt.error || "Research failed"));
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <HeroSurface>
        <Eyebrow>Agentic research agent</Eyebrow>
        <h1 className="display mt-3.5 text-[2.6rem] md:text-[3.5rem]">Search any company</h1>
        <p className="body-muted mt-3.5 max-w-2xl text-[1.05rem]">
          Hear a new name — type it here. Pipeline hits return grounded IC briefs; showcase
          names open full analytics + a dedicated financials desk for demos.
        </p>

        <form
          className="relative mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            runResearch(q);
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpenSuggest(true);
                }}
                onFocus={() => setOpenSuggest(true)}
                placeholder="e.g. AgentGate, LatticeEval, SwarmGuard…"
                className="field !px-5 !py-3.5 !text-[1.1rem]"
                autoComplete="off"
              />
              <AnimatePresence>
                {openSuggest && (suggestions.length > 0 || canResearch) && !busy && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="panel absolute left-0 right-0 z-20 mt-2 overflow-hidden !p-0 shadow-[var(--shadow-float)]"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--panel-2)]"
                        onClick={() => runResearch(s.name)}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[0.975rem] font-semibold">{s.name}</span>
                            {hasDemoFinancials(s.slug || s.id) ? (
                              <span className="label-caps text-[var(--signal)]">Full financials</span>
                            ) : null}
                          </div>
                          <div className="text-[0.8125rem] text-[var(--muted)]">{s.sector_theme}</div>
                        </div>
                        <div className="text-right text-[0.8125rem] text-[var(--muted)]">
                          <div className="text-[var(--signal)]">{s.recommendation}</div>
                          <div className="mono">{s.thesis_score}</div>
                        </div>
                      </button>
                    ))}
                    {canResearch && (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-t border-[var(--line)] px-4 py-3 text-left text-[0.9375rem] text-[var(--deep)] transition hover:bg-[var(--panel-2)]"
                        onClick={() => runResearch(q)}
                      >
                        <span className="text-[var(--signal)]">◈</span>
                        Agentic research “{q.trim()}” across the web →
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="submit" disabled={busy || !q.trim()} className="btn btn-primary sm:!px-7 sm:!py-3.5">
              {busy ? "Scouting…" : "Research"}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="label-caps text-[var(--faint)]">Demo showcase · complete packs</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_SHOWCASE.map((d) => (
              <div
                key={d.slug}
                className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)]/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[var(--text)]">{d.name}</div>
                    <div className="mt-0.5 text-[0.75rem] text-[var(--muted)]">
                      {d.stage} · {d.blurb}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="chip !text-[var(--deep)]"
                    onClick={() => runResearch(d.name)}
                  >
                    Research
                  </button>
                  <Link href={`/company/${d.slug}`} className="chip">
                    Company →
                  </Link>
                  <Link href={`/company/${d.slug}/financials`} className="chip !border-[var(--signal)]/40 !text-[var(--signal)]">
                    Financials →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => runResearch(ex)} className="chip">
              {ex}
            </button>
          ))}
        </div>
        {aiEnabled === false && (
          <p className="mt-4 text-[0.8125rem] text-[var(--muted)]">
            New-company AI briefs need <span className="mono">GEMINI_API_KEY</span> (or{" "}
            <span className="mono">ANTHROPIC_API_KEY</span>) in{" "}
            <span className="mono">web/.env.local</span>. Without it, the agent still scrapes public
            sources and builds a heuristic brief.
          </p>
        )}
      </HeroSurface>

      {(busy || steps.length > 0) && !brief && (
        <Panel className="!p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="title text-[1.15rem]">Agent run</h2>
            {busy && <div className="loading-bar w-28" />}
          </div>
          <p className="body-muted mt-2 text-[0.9rem]">
            Multi-wave scout: identity → public indexes → site crawl → partner synthesis.
          </p>
          <ul className="mt-5 space-y-3">
            {steps.map((s) => (
              <li key={s.id} className="flex gap-3 text-[0.9375rem]">
                <span
                  className={
                    s.status === "running"
                      ? "text-[var(--signal)]"
                      : s.status === "done"
                        ? "text-[var(--signal)]"
                        : "text-[var(--faint)]"
                  }
                >
                  {stepIcon(s.status)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text)]">{s.label}</div>
                  {s.detail && (
                    <div className="mt-0.5 text-[0.8125rem] text-[var(--muted)]">{s.detail}</div>
                  )}
                </div>
              </li>
            ))}
            {busy && steps.length === 0 && (
              <li className="text-[0.9375rem] text-[var(--muted)]">Starting agent…</li>
            )}
          </ul>
        </Panel>
      )}

      {error && (
        <Panel className="border-[var(--danger)]/40 bg-[var(--danger-dim)] !p-5 text-[0.9375rem] text-[var(--danger)]">
          {error}
        </Panel>
      )}

      {hint && !error && (
        <Panel className="!p-4 text-[0.875rem] text-[var(--muted)]">{hint}</Panel>
      )}

      {brief && !busy && <CompanyBriefView brief={brief} />}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CompanyBriefView } from "@/components/CompanyBriefView";
import { Eyebrow, HeroSurface } from "@/components/ui";
import type { CompanyBrief } from "@/lib/research";

type Suggestion = {
  id: string;
  slug?: string;
  name: string;
  recommendation?: string | null;
  thesis_score?: number | null;
  sector_theme?: string | null;
  in_pipeline?: boolean;
};

const EXAMPLES = ["AgentGate", "SwarmGuard", "LatticeEval", "Anthropic", "Anduril", "Stripe"];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [canResearch, setCanResearch] = useState(false);
  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSuggest, setOpenSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies/suggest?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setCanResearch(Boolean(data.can_research) && q.trim().length >= 2);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  async function runResearch(name: string) {
    const query = name.trim();
    if (!query || busy) return;
    setQ(query);
    setOpenSuggest(false);
    setBusy(true);
    setError(null);
    setBrief(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");
      setBrief(data.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HeroSurface>
        <Eyebrow>Partner research agent</Eyebrow>
        <h1 className="display mt-3 text-[2.5rem] md:text-[3.5rem]">Search any company</h1>
        <p className="body-muted mt-3 max-w-2xl text-[1.05rem]">
          Type a pipeline name for a grounded IC brief — or a new company and Signal researches
          funding, cap table, team, traction, thesis fit, and commentary like a sourcing associate.
        </p>

        <form
          className="relative mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            runResearch(q);
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpenSuggest(true);
                }}
                onFocus={() => setOpenSuggest(true)}
                placeholder="e.g. AgentGate, Anthropic, Anduril…"
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
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]"
                        onClick={() => runResearch(s.name)}
                      >
                        <div>
                          <div className="text-[0.975rem] font-semibold">{s.name}</div>
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
                        className="flex w-full items-center gap-2 border-t border-[var(--line)] px-4 py-3 text-left text-[0.9375rem] text-[var(--deep)] transition hover:bg-white/[0.035]"
                        onClick={() => runResearch(q)}
                      >
                        <span className="text-[var(--signal)]">◈</span>
                        Research “{q.trim()}” as a new company →
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="submit" disabled={busy || !q.trim()} className="btn btn-primary !px-7 !py-3.5">
              {busy ? "Researching…" : "Research"}
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => runResearch(ex)} className="chip">
              {ex}
            </button>
          ))}
        </div>
      </HeroSurface>

      {busy && (
        <div className="panel p-8 text-center">
          <div className="loading-bar mx-auto w-40" />
          <p className="body-muted mt-4">Scanning pipeline, then public signals — building IC-style brief…</p>
        </div>
      )}

      {error && (
        <div className="panel border-[rgba(255,107,107,0.28)] bg-[var(--danger-dim)] p-5 text-[0.9375rem] text-[var(--danger)]">
          {error}
        </div>
      )}

      {brief && !busy && <CompanyBriefView brief={brief} />}
    </div>
  );
}

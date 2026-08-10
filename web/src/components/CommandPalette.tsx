"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "Build Monday partner meeting agenda",
  "LP process one-pager",
  "What's on IC this week?",
  "Research AgentGate",
  "Bear case for AgentGate",
  "Diligence plan for SwarmGuard",
  "Prep me for a call with LatticeEval",
  "What should Judgment OS flag this week?",
  "Show founder radar hits",
  "Are we overweight tactical vs 60/40?",
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("signal:open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("signal:open-command", onOpen);
    };
  }, []);

  async function ask(prompt: string) {
    setBusy(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      const data = await res.json();
      setAnswer(data.answer || "No answer");
    } catch {
      setAnswer("Chat failed — check API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 px-4 pt-[11vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="panel w-full max-w-2xl overflow-hidden !p-0 shadow-[var(--shadow-float)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--line)] px-5 py-4">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) ask(q.trim());
                }}
                placeholder="Ask Signal — or type a company to research…"
                className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--faint)]"
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2.5 scrollbar-thin">
              {!answer && (
                <div className="space-y-0.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full rounded-[10px] px-3.5 py-2.5 text-left text-[0.9375rem] text-[var(--muted)] transition hover:bg-white/[0.035] hover:text-[var(--text)]"
                      onClick={() => {
                        setQ(s);
                        ask(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <div className="my-2 h-px bg-[var(--line)]" />
                  <button
                    type="button"
                    className="block w-full rounded-[10px] px-3.5 py-2.5 text-left text-sm text-[var(--deep)] transition hover:bg-white/[0.035]"
                    onClick={() => {
                      setOpen(false);
                      router.push("/search");
                    }}
                  >
                    Open company search →
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-[10px] px-3.5 py-2.5 text-left text-sm text-[var(--deep)] transition hover:bg-white/[0.035]"
                    onClick={() => {
                      setOpen(false);
                      router.push("/chat");
                    }}
                  >
                    Open full chat →
                  </button>
                </div>
              )}
              {busy && (
                <div className="px-3.5 py-6">
                  <div className="loading-bar w-36" />
                  <p className="mt-3 text-[0.9375rem] text-[var(--muted)]">Grounding in pipeline…</p>
                </div>
              )}
              {answer && (
                <div className="space-y-3 px-3 py-3">
                  <pre className="whitespace-pre-wrap font-[var(--font-source)] text-[0.975rem] leading-relaxed text-[var(--text)]">
                    {answer}
                  </pre>
                  <button type="button" className="text-[0.8125rem] text-[var(--signal)]" onClick={() => setAnswer(null)}>
                    Ask another
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

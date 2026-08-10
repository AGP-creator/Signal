"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "What are the best deals in defense tech right now?",
  "Three AI infra sub-sectors nobody is talking about yet",
  "Are we overweight tactical vs 60/40?",
  "Who's quietly investing in robotics?",
  "Show off-thesis bets from Sequoia",
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="panel w-full max-w-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--line)] px-4 py-3">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) ask(q.trim());
                }}
                placeholder="Ask Signal like a partner…"
                className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--faint)]"
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-3 scrollbar-thin">
              {!answer && (
                <div className="space-y-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                      onClick={() => {
                        setQ(s);
                        ask(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="mt-2 block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--deep)] hover:bg-[var(--panel-2)]"
                    onClick={() => {
                      setOpen(false);
                      router.push("/chat");
                    }}
                  >
                    Open full chat →
                  </button>
                </div>
              )}
              {busy && <p className="px-3 py-4 text-sm text-[var(--muted)]">Grounding in pipeline…</p>}
              {answer && (
                <div className="space-y-3 px-2 py-2">
                  <pre className="whitespace-pre-wrap font-[var(--font-plex)] text-sm leading-relaxed text-[var(--text)]">
                    {answer}
                  </pre>
                  <button
                    type="button"
                    className="text-xs text-[var(--signal)]"
                    onClick={() => setAnswer(null)}
                  >
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

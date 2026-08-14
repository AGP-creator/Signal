"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import {
  createChatSession,
  newChatMessage,
  upsertChatSession,
} from "@/lib/chatStore";

const SUGGESTIONS = [
  "Are we overweight tactical vs 60/40?",
  "What are three AI infrastructure sub-sectors nobody is talking about yet?",
  "Top Deep Dive deals",
  "What did we miss?",
  "News worth reading",
  "Where should partner attention go this week",
  "Open deal pipeline workbook",
  "Knows what a great deal looks like",
  "Sector of tomorrow",
  "Peer thesis shifts",
  "Anti-consensus names on Partner Edge",
  "Map AI infra market",
  "Partner meeting agenda",
];

const NAV_JUMPS = [
  { label: "Desk", href: "/", aliases: ["home", "desk"] },
  { label: "Meeting", href: "/meeting", aliases: ["agenda", "monday"] },
  { label: "Pipeline", href: "/pipeline", aliases: ["book", "deals"] },
  { label: "Workbook", href: "/workbook", aliases: ["excel"] },
  { label: "Chat", href: "/chat", aliases: ["ask"] },
  { label: "Digest", href: "/digest", aliases: ["email"] },
  { label: "Research", href: "/search", aliases: ["scout", "search"] },
  { label: "Compare", href: "/compare", aliases: ["vs"] },
  { label: "GP Desk", href: "/gp", aliases: ["gp", "partner desk"] },
  { label: "Partner Log", href: "/log", aliases: ["notes", "log", "threads"] },
  { label: "Interest Desk", href: "/interest", aliases: ["likes", "demo day"] },
  { label: "Judgment", href: "/judgment", aliases: ["overrides"] },
  { label: "Work queue", href: "/work", aliases: ["diligence", "queue"] },
  { label: "Library", href: "/library", aliases: ["news", "stale"] },
  { label: "Sectors", href: "/sectors", aliases: ["sector", "tomorrow"] },
  { label: "Competitors", href: "/competitors", aliases: ["peers", "peer"] },
  { label: "Find", href: "/find", aliases: ["omni"] },
  { label: "Venture agent", href: "/os", aliases: ["agent", "os"] },
  { label: "Great deals", href: "/deals", aliases: ["outstanding", "noise"] },
  { label: "Discovery", href: "/source", aliases: ["sourcing", "source"] },
  { label: "Launch", href: "/launch", aliases: ["newco", "product hunt"] },
  { label: "Forge", href: "/forge", aliases: ["win", "attention", "monday moves"] },
  { label: "Atlas", href: "/atlas", aliases: ["market map", "warm path", "bands"] },
  { label: "Edge", href: "/edge", aliases: ["anti-consensus", "conviction", "twin"] },
];

type SearchTrail = { name: string; display: string };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [searches, setSearches] = useState<SearchTrail[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingAsk, setPendingAsk] = useState<string | null>(null);
  const router = useRouter();

  const navHits = (() => {
    const needle = q.trim().toLowerCase();
    if (!needle || needle.length < 1) return NAV_JUMPS.slice(0, 6);
    return NAV_JUMPS.filter(
      (n) =>
        n.label.toLowerCase().includes(needle) ||
        n.aliases.some((a) => a.includes(needle) || needle.includes(a)),
    ).slice(0, 8);
  })();

  function close() {
    setOpen(false);
  }

  function resetAndClose() {
    setQ("");
    setAnswer(null);
    setSearches([]);
    setPendingAsk(null);
    setBusy(false);
    setOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ q?: string }>).detail;
      if (detail?.q) {
        setQ(detail.q);
        setAnswer(null);
        setSearches([]);
        setPendingAsk(detail.q);
      }
      setOpen(true);
    };
    const onToggle = () => setOpen((v) => !v);
    const onClose = () => resetAndClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("signal:open-command", onOpen);
    window.addEventListener("signal:toggle-command", onToggle);
    window.addEventListener("signal:close-command", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("signal:open-command", onOpen);
      window.removeEventListener("signal:toggle-command", onToggle);
      window.removeEventListener("signal:close-command", onClose);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !pendingAsk || busy) return;
    const prompt = pendingAsk;
    setPendingAsk(null);
    void ask(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingAsk]);

  async function ask(prompt: string) {
    setBusy(true);
    setAnswer(null);
    setSearches([]);
    const question = prompt.trim();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = (data as { error?: string }).error || `Chat failed (${res.status})`;
        setAnswer(err);
        const userMsg = newChatMessage("user", question);
        const assistantMsg = newChatMessage("assistant", err);
        const session = createChatSession([userMsg, assistantMsg]);
        upsertChatSession(session);
        return;
      }
      const text = data.answer || "No answer";
      const trails = (data as { searches?: SearchTrail[] }).searches;
      const trailList = Array.isArray(trails) ? trails : [];
      setAnswer(text);
      setSearches(trailList);
      const userMsg = newChatMessage("user", question);
      const assistantMsg = newChatMessage("assistant", text, {
        searches: trailList.map((t) => ({
          name: t.name,
          query: t.display,
          display: t.display,
        })),
        mode: (data as { mode?: string }).mode,
      });
      const session = createChatSession([userMsg, assistantMsg]);
      upsertChatSession(session);
    } catch {
      const err = "Network error — could not reach chat.";
      setAnswer(err);
      const userMsg = newChatMessage("user", question);
      const assistantMsg = newChatMessage("assistant", err);
      const session = createChatSession([userMsg, assistantMsg]);
      upsertChatSession(session);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[max(4.5rem,12dvh)] backdrop-blur-md sm:px-4"
          style={{ background: "var(--overlay)", paddingBottom: "var(--safe-bottom)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Ask Signal"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="panel w-full max-w-xl overflow-hidden !rounded-[var(--radius-xl)] !p-0 shadow-[var(--shadow-float)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) ask(q.trim());
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    close();
                  }
                }}
                placeholder="Ask Signal or jump to a desk…"
                className="min-w-0 flex-1 bg-transparent text-[1.05rem] font-medium outline-none placeholder:font-normal placeholder:text-[var(--faint)]"
                aria-label="Ask Signal"
              />
              {q.trim() ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm shrink-0"
                  disabled={busy}
                  onClick={() => ask(q.trim())}
                >
                  Ask
                </button>
              ) : (
                <kbd className="mono hidden shrink-0 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-[0.6rem] text-[var(--faint)] sm:inline">
                  Esc
                </kbd>
              )}
              <button
                type="button"
                className="shrink-0 rounded-[var(--radius)] p-2 text-[var(--muted)] transition hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                onClick={close}
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="max-h-[min(56dvh,32rem)] overflow-y-auto p-2 scrollbar-thin sm:max-h-[50vh]">
              {!answer && (
                <div className="space-y-0.5">
                  {q.trim() && navHits.length > 0 ? (
                    <>
                      <div className="px-3.5 pb-1 pt-2 label-caps">Jump</div>
                      {navHits.map((n) => (
                        <button
                          key={n.href}
                          type="button"
                          className="block w-full rounded-[var(--radius)] px-3.5 py-2.5 text-left text-[0.875rem] font-medium text-[var(--text)] transition hover:bg-[var(--panel-2)]"
                          onClick={() => {
                            close();
                            router.push(n.href);
                          }}
                        >
                          {n.label}
                          <span className="ml-2 mono text-[0.7rem] text-[var(--faint)]">{n.href}</span>
                        </button>
                      ))}
                      <div className="my-2 mx-3 h-px bg-[var(--line)]" />
                    </>
                  ) : null}
                  {!q.trim() ? (
                    <div className="px-3.5 pb-1 pt-2 label-caps">Try asking</div>
                  ) : null}
                  {SUGGESTIONS.filter(
                    (s) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase()),
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full rounded-[var(--radius)] px-3.5 py-2.5 text-left text-[0.875rem] text-[var(--muted)] transition hover:bg-[var(--panel-2)] hover:text-[var(--text)]"
                      onClick={() => {
                        setQ(s);
                        ask(s);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                  <div className="my-2 mx-3 h-px bg-[var(--line)]" />
                  <button
                    type="button"
                    className="block w-full rounded-[var(--radius)] px-3.5 py-2.5 text-left text-[0.8125rem] font-medium text-[var(--deep)] transition hover:bg-[var(--panel-2)]"
                    onClick={() => {
                      close();
                      router.push("/os");
                    }}
                  >
                    Venture agent (Core intelligence) →
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-[var(--radius)] px-3.5 py-2.5 text-left text-[0.8125rem] font-medium text-[var(--deep)] transition hover:bg-[var(--panel-2)]"
                    onClick={() => {
                      close();
                      router.push("/find");
                    }}
                  >
                    Omnisearch (Find) →
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-[var(--radius)] px-3.5 py-2.5 text-left text-[0.8125rem] font-medium text-[var(--deep)] transition hover:bg-[var(--panel-2)]"
                    onClick={() => {
                      close();
                      router.push("/search");
                    }}
                  >
                    Research a company →
                  </button>
                </div>
              )}
              {busy && (
                <div className="flex flex-col items-start gap-3 px-3.5 py-6">
                  <div className="loading-mark !h-5 !w-5 !rounded-md" />
                  <div className="loading-bar w-36" />
                  <p className="text-[0.875rem] text-[var(--muted)]">Grounding answer…</p>
                </div>
              )}
              {answer && (
                <div className="space-y-3 px-3 py-3">
                  <div className="palette-answer">
                    <ChatMarkdown content={answer} />
                  </div>
                  {searches.length > 0 ? (
                    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2">
                      <div className="label-caps mb-1">Searched</div>
                      <ul className="space-y-0.5 text-[0.75rem] text-[var(--muted)]">
                        {searches.map((s, i) => (
                          <li key={`${s.name}-${i}`}>
                            <span className="mono text-[var(--signal)]">{s.name}</span>
                            {" — "}
                            {s.display}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 px-1">
                    <button
                      type="button"
                      className="text-[0.8125rem] font-medium text-[var(--signal)] transition hover:underline"
                      onClick={() => {
                        setAnswer(null);
                        setSearches([]);
                      }}
                    >
                      Ask another
                    </button>
                    <button
                      type="button"
                      className="text-[0.8125rem] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
                      onClick={() => {
                        close();
                        router.push(`/chat?q=${encodeURIComponent(q.trim())}`);
                      }}
                    >
                      Open in Chat →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

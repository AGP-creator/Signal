"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "⌘ / Ctrl K", action: "Open command palette" },
  { keys: "?", action: "Show keyboard shortcuts" },
  { keys: "Esc", action: "Close overlays" },
  { keys: "G then D", action: "Go to Desk" },
  { keys: "G then M", action: "Go to Meeting" },
  { keys: "G then P", action: "Go to Pipeline" },
  { keys: "G then W", action: "Go to Workbook" },
  { keys: "G then C", action: "Go to Chat" },
  { keys: "G then R", action: "Go to Research" },
  { keys: "G then I", action: "Go to Digest" },
];

const GO_MAP: Record<string, string> = {
  d: "/",
  m: "/meeting",
  p: "/pipeline",
  w: "/workbook",
  c: "/chat",
  r: "/search",
  i: "/digest",
};

export function ShortcutsHelp() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modKey, setModKey] = useState("Ctrl");
  const [awaitingGo, setAwaitingGo] = useState(false);

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    setModKey(isMac ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    let goTimer: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "Escape") {
        setOpen(false);
        setAwaitingGo(false);
        return;
      }

      if (typing) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (awaitingGo) {
        const href = GO_MAP[e.key.toLowerCase()];
        setAwaitingGo(false);
        if (goTimer) clearTimeout(goTimer);
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setAwaitingGo(true);
        if (goTimer) clearTimeout(goTimer);
        goTimer = setTimeout(() => setAwaitingGo(false), 1200);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (goTimer) clearTimeout(goTimer);
    };
  }, [awaitingGo, router]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const rows = SHORTCUTS.map((s) => ({
    ...s,
    keys: s.keys.replace("⌘ / Ctrl", modKey),
  }));

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-label="Keyboard shortcuts"
        aria-expanded={open}
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="size-3.5" strokeWidth={1.75} />
        <span className="sr-only xl:not-sr-only xl:inline">Keys</span>
      </button>

      {awaitingGo ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[0.75rem] text-[var(--muted)] shadow-lg">
          Go to… <span className="mono text-[var(--signal)]">D M P W C R I</span>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
            style={{ background: "var(--overlay)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
              className="flex max-h-[min(85dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <div className="label-caps">Keyboard</div>
                  <div className="mt-0.5 text-[0.9375rem] font-semibold">Partner shortcuts</div>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel-2)] px-2.5 py-1.5 text-[0.75rem] font-medium text-[var(--text)] transition hover:border-[var(--signal)] hover:text-[var(--signal)]"
                  onClick={close}
                  aria-label="Close shortcuts"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                  Close
                </button>
              </div>
              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
                {rows.map((row) => (
                  <li
                    key={row.action}
                    className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[0.8125rem]"
                  >
                    <span className="text-[var(--muted)]">{row.action}</span>
                    <kbd className="mono shrink-0 rounded border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.5 text-[0.7rem] text-[var(--text)]">
                      {row.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-2.5">
                <p className="text-[0.7rem] text-[var(--faint)]">
                  Esc or click outside to dismiss. Press ? anytime.
                </p>
                <button
                  type="button"
                  className="btn btn-soft btn-sm shrink-0"
                  onClick={close}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

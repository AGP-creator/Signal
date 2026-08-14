"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Never dump Python tracebacks / scripts into the header tip. */
function friendlyRefreshMessage(raw: string | undefined, fallback: string): string {
  const text = (raw || "").trim();
  if (!text) return fallback;
  if (
    /Traceback \(most recent call last\)/i.test(text) ||
    /File ".*", line \d+/i.test(text) ||
    /scripts[/\\]refresh\.py/i.test(text) ||
    text.includes("\n") ||
    text.length > 80
  ) {
    return fallback;
  }
  return text;
}

export function RefreshButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    window.dispatchEvent(new Event("signal:close-command"));
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          friendlyRefreshMessage(
            data.error || data.hint,
            "Refresh failed — check pipeline",
          ),
        );
      }
      const n = typeof data.companies === "number" ? data.companies : null;
      setMsg(n != null ? `${n} cos · workbook ready` : "Workbook ready");
      setTimeout(() => window.location.reload(), 700);
      // Keep busy until reload so the spinner stays visible.
    } catch (e) {
      setMsg(
        friendlyRefreshMessage(
          e instanceof Error ? e.message : undefined,
          "Refresh failed — check pipeline",
        ),
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span
          className="hidden max-w-[14rem] truncate text-[0.75rem] text-[var(--muted)] lg:inline"
          title={msg}
        >
          {msg}
        </span>
      )}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={cn("btn btn-soft btn-sm", busy && "opacity-60")}
        aria-busy={busy}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} aria-hidden />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        )}
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

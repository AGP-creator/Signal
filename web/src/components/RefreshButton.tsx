"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.hint || "Refresh failed");
      setMsg(`${data.companies} cos · ${data.live_signals} signals`);
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && (
        <span className="hidden max-w-[12rem] truncate text-[0.75rem] text-[var(--muted)] lg:inline">{msg}</span>
      )}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={cn("btn btn-soft !py-1.5 !text-[0.8125rem]", busy && "opacity-60")}
      >
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

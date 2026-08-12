"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rebuild Excel only (no live ingest). Full pipeline still uses header Refresh. */
export function ExcelRebuildButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/workbook", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.hint || "Export failed");
      setMsg(`${data.companies ?? "—"} cos · ready`);
      // Kick download of the fresh file
      window.location.href = "/api/workbook";
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {msg ? (
        <span className="hidden max-w-[14rem] truncate text-[0.75rem] text-[var(--muted)] lg:inline">
          {msg}
        </span>
      ) : null}
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={cn("btn btn-soft btn-sm", busy && "opacity-60")}
        title="Regenerate Excel from current pipeline (no live ingest)"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        {busy ? "Rebuilding…" : "Rebuild Excel"}
      </button>
    </div>
  );
}

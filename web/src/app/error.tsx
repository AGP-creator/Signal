"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const clockHint =
    error.message.includes("JWT") || error.message.includes("PGRST303")
      ? "Your Windows clock may be out of sync (common cause). Settings → Time & language → Sync now."
      : null;

  return (
    <div className="mx-auto max-w-lg py-16 text-center animate-in">
      <div className="display text-[1.85rem]">Something broke</div>
      <p className="mt-3 text-[0.975rem] leading-relaxed text-[var(--muted)]">{error.message}</p>
      {clockHint && <p className="mt-3 text-sm text-[var(--warn)]">{clockHint}</p>}
      <button type="button" onClick={reset} className="btn btn-primary mt-7">
        Try again
      </button>
    </div>
  );
}

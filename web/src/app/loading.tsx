export default function Loading() {
  return (
    <div className="flex min-h-[42vh] flex-col items-center justify-center gap-4 px-4">
      <div className="loading-mark" aria-hidden />
      <div className="loading-bar w-48" />
      <p className="text-[0.875rem] text-[var(--muted)]">Loading desk…</p>
    </div>
  );
}

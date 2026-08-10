"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/CommandPalette";
import { RefreshButton } from "@/components/RefreshButton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Command" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/sectors", label: "Sectors" },
  { href: "/peers", label: "Peers" },
  { href: "/digest", label: "Digest" },
  { href: "/chat", label: "Chat" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(7,10,15,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-3 md:px-8">
          <Link href="/" className="display text-xl font-bold tracking-tight">
            Signal
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Thirdbase</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("signal:open-command"))}
              className="hidden items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] md:flex"
            >
              <span>Ask Signal</span>
              <kbd className="mono rounded bg-[var(--panel-2)] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <RefreshButton />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs",
                pathname === item.href
                  ? "bg-[var(--signal)] text-black"
                  : "border border-[var(--line)] text-[var(--muted)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-8 md:px-8">{children}</main>
      <CommandPalette />
    </div>
  );
}

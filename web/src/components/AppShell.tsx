"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/CommandPalette";
import { RefreshButton } from "@/components/RefreshButton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Command" },
  { href: "/meeting", label: "Meeting" },
  { href: "/search", label: "Search" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/ic", label: "IC" },
  { href: "/sectors", label: "Sectors" },
  { href: "/peers", label: "Competitors" },
  { href: "/judgment", label: "Judgment" },
  { href: "/lp", label: "LP" },
  { href: "/library", label: "Library" },
  { href: "/digest", label: "Digest" },
  { href: "/chat", label: "Chat" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative z-10 min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(7,10,16,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--header-h)] max-w-[1400px] items-center gap-4 px-5 md:gap-5 md:px-8">
          <Link href="/" className="group flex shrink-0 items-baseline gap-2.5">
            <span className="display text-[1.4rem] transition group-hover:text-[var(--signal)]">Signal</span>
            <span className="hidden text-[0.7rem] font-semibold tracking-[0.12em] text-[var(--faint)] sm:inline">
              THIRDBASE
            </span>
          </Link>

          <nav className="ml-1 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[8px] px-2.5 py-1.5 text-[0.8125rem] font-medium transition",
                    active
                      ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                      : "text-[var(--muted)] hover:bg-white/[0.03] hover:text-[var(--text)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("signal:open-command"))}
              className="btn btn-ghost hidden !py-1.5 !text-[0.8125rem] md:inline-flex"
            >
              <span>Ask Signal</span>
              <kbd className="mono rounded-md bg-[var(--panel-2)] px-1.5 py-0.5 text-[0.65rem] text-[var(--faint)]">
                ⌘K
              </kbd>
            </button>
            <RefreshButton />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 scrollbar-thin lg:hidden" aria-label="Mobile">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-[8px] px-3 py-1.5 text-[0.8125rem] font-semibold transition",
                  active
                    ? "bg-[var(--signal)] text-[var(--signal-ink)]"
                    : "border border-[var(--line)] text-[var(--muted)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      <CommandPalette />
    </div>
  );
}

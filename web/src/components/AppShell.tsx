"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";
import { RefreshButton } from "@/components/RefreshButton";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/** High-traffic Monday path — unique intel first; keep short so the bar never wraps. */
const PRIMARY = [
  { href: "/", label: "Desk" },
  { href: "/meeting", label: "Meeting" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/workbook", label: "Workbook" },
  { href: "/chat", label: "Chat" },
  { href: "/digest", label: "Digest" },
  { href: "/search", label: "Research" },
];

const MORE = [
  { href: "/deals", label: "Great deals", group: "Partner", blurb: "Noise vs outstanding" },
  { href: "/compare", label: "Compare", group: "Partner", blurb: "Side-by-side conviction" },
  { href: "/log", label: "Partner Log", group: "Partner", blurb: "Shared notes & threads" },
  { href: "/judgment", label: "Judgment", group: "Partner", blurb: "Overrides & misses" },
  { href: "/gp", label: "GP Desk", group: "Partner", blurb: "Partner operating view" },
  { href: "/ic", label: "IC Trail", group: "Partner", blurb: "Stage & checklist" },
  { href: "/work", label: "Work queue", group: "Partner", blurb: "Diligence handoffs" },
  { href: "/interest", label: "Interest Desk", group: "Partner", blurb: "Partner watchlists + Excel" },
  { href: "/competitors", label: "Competitors", group: "Intel", blurb: "Firm list & analytics" },
  { href: "/peers", label: "Competitor OS", group: "Intel", blurb: "Peer heat & syndicates" },
  { href: "/firms", label: "VC Firms", group: "Intel", blurb: "Firm watchlist tracker" },
  { href: "/sectors", label: "Sectors", group: "Intel", blurb: "Sector of tomorrow" },
  { href: "/library", label: "Library", group: "Intel", blurb: "Voices, news & playbooks" },
  { href: "/launch", label: "Launch Feed", group: "Intel", blurb: "New signals" },
  { href: "/directory", label: "Directory", group: "Intel", blurb: "Firm book" },
  { href: "/find", label: "Find", group: "Intel", blurb: "Cross-corpus search" },
  { href: "/source", label: "Discovery", group: "Intel", blurb: "Deal sourcing agent" },
  { href: "/os", label: "Venture agent", group: "Labs", blurb: "Core intelligence pillars" },
  { href: "/forge", label: "Forge", group: "Labs", blurb: "Win reality × attention" },
  { href: "/edge", label: "Partner Edge", group: "Labs", blurb: "Anti-consensus radar" },
  { href: "/atlas", label: "Atlas", group: "Labs", blurb: "Market map vs Harmonic/Affinity" },
  { href: "/lp", label: "LP Desk", group: "External", blurb: "LP narrative" },
] as const;

const GROUPS = ["Partner", "Intel", "Labs", "External"] as const;

const PRIMARY_HREFS = new Set(PRIMARY.map((p) => p.href));

/** Mobile strip: primary first, then more — no duplicate hrefs. */
const MOBILE_NAV = [
  ...PRIMARY,
  ...MORE.filter((m) => !PRIMARY_HREFS.has(m.href)).map((m) => ({
    href: m.href,
    label: m.label.replace(/ Desk$/, "").replace(/^Venture agent$/, "Agent"),
  })),
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [modKey, setModKey] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const moreActive = MORE.some(
    (item) => !PRIMARY_HREFS.has(item.href) && isActive(pathname, item.href),
  );

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    setModKey(isMac ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const strip = mobileNavRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    const target =
      active.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative z-10 min-h-screen min-h-[100dvh]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header-bg)] shadow-[0_1px_0_color-mix(in_srgb,var(--signal)_12%,transparent)] backdrop-blur-2xl"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="shell-rail flex h-[var(--header-h)] items-center gap-3 md:gap-5">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="brand-mark transition group-hover:brightness-110" aria-hidden>
              S
            </span>
            <span className="flex items-baseline gap-2">
              <span className="display text-[1.15rem] leading-tight tracking-tight sm:text-[1.2rem]">
                Signal
              </span>
              <span className="hidden text-[0.6rem] font-semibold tracking-[0.18em] text-[var(--faint)] sm:inline">
                THIRDBASE
              </span>
            </span>
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center gap-0.5 xl:flex"
            aria-label="Primary"
          >
            {PRIMARY.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  data-active={active ? "true" : "false"}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="relative ml-0.5" ref={moreRef}>
              <button
                type="button"
                className="nav-link gap-1"
                data-active={moreActive ? "true" : "false"}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More
                <ChevronDown
                  className={cn("h-3 w-3 opacity-60 transition", moreOpen && "rotate-180")}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+0.55rem)] z-50 max-h-[min(32rem,calc(100dvh-var(--header-h)-1.25rem))] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--panel-elevated)] shadow-[var(--shadow-float)] animate-in scrollbar-thin"
                >
                  <div className="grid gap-0 sm:grid-cols-2">
                    {GROUPS.map((group) => {
                      const items = MORE.filter((m) => m.group === group);
                      if (!items.length) return null;
                      return (
                        <div
                          key={group}
                          className="border-b border-[var(--line)] p-2.5 last:border-b-0 sm:border-b-0 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
                        >
                          <div className="px-2 pb-1.5 pt-1 label-caps">{group}</div>
                          <div className="space-y-0.5">
                            {items.map((item) => {
                              const active = isActive(pathname, item.href);
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  role="menuitem"
                                  className={cn(
                                    "block rounded-[var(--radius)] px-2.5 py-1.5 transition",
                                    active
                                      ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                                      : "text-[var(--text)] hover:bg-[var(--panel-2)]",
                                  )}
                                >
                                  <div className="text-[0.8125rem] font-medium leading-snug">
                                    {item.label}
                                  </div>
                                  <div className="mt-0.5 text-[0.65rem] leading-snug text-[var(--muted)]">
                                    {item.blurb}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("signal:open-command"))}
              className="btn btn-ghost btn-sm inline-flex"
              aria-label="Ask Signal"
            >
              <Search className="h-3.5 w-3.5 sm:hidden" strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">Ask</span>
              {modKey ? (
                <kbd className="mono hidden rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-[0.6rem] text-[var(--faint)] sm:inline">
                  {modKey}K
                </kbd>
              ) : null}
            </button>
            <ShortcutsHelp />
            <ThemeToggle />
            <RefreshButton />
          </div>
        </div>

        <div
          ref={mobileNavRef}
          className="nav-strip flex shell-rail scrollbar-thin xl:hidden"
          aria-label="Sections"
        >
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                data-active={active ? "true" : "false"}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="shell-main">{children}</main>
      <CommandPalette />
    </div>
  );
}

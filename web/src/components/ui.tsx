import Link from "next/link";
import { cleanProse } from "@/lib/digestFormat";
import { cn } from "@/lib/utils";

export function Eyebrow({
  children,
  live,
  className,
}: {
  children: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("eyebrow flex items-center gap-2", className)}>
      {live ? <span className="live-dot" aria-hidden /> : null}
      {children}
    </div>
  );
}

export function Page({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className={cn("space-y-9", narrow && "mx-auto max-w-3xl", className)}>{children}</div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  live,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("animate-in border-b border-[var(--line)] pb-8", className)}>
      {eyebrow ? <Eyebrow live={live}>{eyebrow}</Eyebrow> : null}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <h1 className={cn("title text-[1.9rem] md:text-[2.25rem]", eyebrow && "mt-2.5")}>
            {title}
          </h1>
          {description ? <p className="body-muted mt-3 max-w-xl text-[0.95rem]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function HeroSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-hero animate-in pb-9", className)}>
      <div className="relative">{children}</div>
    </section>
  );
}

export function SectionTitle({
  title,
  href,
  hrefLabel = "View all →",
  className,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <h2 className="title text-[1.15rem] md:text-[1.25rem]">{title}</h2>
      {href ? (
        <Link href={href} className="link-quiet shrink-0 text-[0.8125rem] font-semibold">
          {hrefLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  interactive,
  padded = true,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  padded?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("panel", interactive && "panel-interactive", padded && "p-5 md:p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHead({
  title,
  action,
  description,
}: {
  title: string;
  action?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--line)] px-5 py-4 md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="title text-[1.1rem]">{title}</h2>
          {description ? <p className="body-muted mt-1 text-[0.8125rem]">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function OsBanner({
  eyebrow,
  title,
  description,
  tone = "signal",
  live,
  stats,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "signal" | "deep" | "ok" | "warn";
  live?: boolean;
  stats?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const eyebrowTone =
    tone === "deep"
      ? "!text-[var(--deep)]"
      : tone === "ok"
        ? "!text-[var(--ok)]"
        : tone === "warn"
          ? "!text-[var(--warn)]"
          : "!text-[var(--signal)]";

  const shellTone =
    tone === "deep"
      ? "os-banner-deep"
      : tone === "ok"
        ? "os-banner-ok"
        : tone === "warn"
          ? "os-banner-warn"
          : "";

  return (
    <div className={cn("os-banner", shellTone, className)}>
      <Eyebrow live={live} className={eyebrowTone}>
        {eyebrow}
      </Eyebrow>
      <h2 className="title mt-2.5 text-[1.55rem] md:text-[1.85rem]">{title}</h2>
      {description ? (
        <div className="mt-2.5 max-w-xl text-[0.925rem] leading-relaxed text-[var(--muted)]">
          {description}
        </div>
      ) : null}
      {stats ? <div className="mt-6 flex flex-wrap gap-7">{stats}</div> : null}
      {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
      {children}
    </div>
  );
}

export function Segmented({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("seg", className)} role="tablist" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function SegItem({
  active,
  onClick,
  href,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn("seg-item", className);
  if (href) {
    return (
      <Link href={href} className={classes} data-active={active ? "true" : "false"}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={classes}
      data-active={active ? "true" : "false"}
    >
      {children}
    </button>
  );
}

export function Meta({
  label,
  value,
  strip,
}: {
  label: string;
  value: React.ReactNode;
  strip?: boolean;
}) {
  if (strip) {
    return (
      <div className="kpi-strip-item">
        <div className="label-caps">{label}</div>
        <div className="kpi-strip-value">{value}</div>
      </div>
    );
  }
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="mt-1.5 text-[0.9375rem] font-medium leading-snug">{value}</div>
    </div>
  );
}

export function KpiStrip({
  items,
  cols = 8,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  cols?: 4 | 6 | 8;
  className?: string;
}) {
  const grid =
    cols === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : cols === 6
        ? "sm:grid-cols-3 lg:grid-cols-6"
        : "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8";
  return (
    <div className={cn("kpi-strip", grid, className)}>
      {items.map((item) => (
        <Meta key={item.label} label={item.label} value={item.value} strip />
      ))}
    </div>
  );
}

export function HeroMetric({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-right", className)}>
      <div className="hero-metric">{value}</div>
      {label ? <div className="mt-2 text-[0.8125rem] text-[var(--muted)]">{label}</div> : null}
    </div>
  );
}

export function Block({ title, body }: { title: string; body?: string | null }) {
  const text = cleanProse(body);
  return (
    <div className="min-w-0">
      <div className="label-caps">{title}</div>
      <p className="mt-2.5 text-[0.9375rem] leading-[1.65] text-[var(--text)]/92 [overflow-wrap:break-word] [word-break:normal] [hyphens:none]">
        {text || "—"}
      </p>
    </div>
  );
}

export function Stat({
  value,
  label,
  tone = "signal",
}: {
  value: React.ReactNode;
  label: string;
  tone?: "signal" | "deep" | "warn" | "text";
}) {
  const color =
    tone === "deep"
      ? "text-[var(--deep)]"
      : tone === "warn"
        ? "text-[var(--warn)]"
        : tone === "text"
          ? "text-[var(--text)]"
          : "text-[var(--signal)]";
  return (
    <div>
      <div className={cn("mono text-[1.45rem] leading-none tracking-tight", color)}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone = "signal",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "signal" | "deep" | "warn" | "ok" | "danger" | "text";
}) {
  const color =
    tone === "deep"
      ? "text-[var(--deep)]"
      : tone === "warn"
        ? "text-[var(--warn)]"
        : tone === "ok"
          ? "text-[var(--ok)]"
          : tone === "danger"
            ? "text-[var(--danger)]"
            : tone === "text"
              ? "text-[var(--text)]"
              : "text-[var(--signal)]";
  return (
    <div className="mini-stat">
      <div className="label-caps">{label}</div>
      <div className={cn("mono mt-1 text-[0.9375rem] font-semibold", color)}>{value}</div>
    </div>
  );
}

export function ToneBadge({
  tone,
  children,
}: {
  tone: "now" | "this_week" | "monitor" | "block";
  children: React.ReactNode;
}) {
  const cls =
    tone === "now"
      ? "tone-badge-now"
      : tone === "this_week"
        ? "tone-badge-week"
        : tone === "block"
          ? "tone-badge-block"
          : "tone-badge-monitor";
  return <span className={cn("tone-badge", cls)}>{children}</span>;
}

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("body-muted", className)}>{children}</p>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
    >
      <span aria-hidden className="text-[var(--faint)]">
        ←
      </span>
      {children}
    </Link>
  );
}

export function RecBadge({
  rec,
  className,
}: {
  rec?: string | null;
  className?: string;
}) {
  const cls =
    rec === "Deep Dive" ? "rec-deep" : rec === "Watch" ? "rec-watch" : "rec-pass";
  return <span className={cn("badge-rec", cls, className)}>{rec || "—"}</span>;
}

export function BulletList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2.5 text-[0.875rem] leading-snug">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
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
    <header className={cn("animate-in max-w-3xl", className)}>
      {eyebrow ? <Eyebrow live={live}>{eyebrow}</Eyebrow> : null}
      <h1 className={cn("display text-[2.25rem] md:text-[2.75rem]", eyebrow && "mt-3")}>{title}</h1>
      {description ? <p className="body-muted mt-3 max-w-2xl text-[1.05rem]">{description}</p> : null}
      {actions ? <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div> : null}
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
    <section className={cn("surface-hero animate-in", className)}>
      <div className="grid-fade absolute inset-0 opacity-50" aria-hidden />
      <div className="relative px-6 py-9 md:px-10 md:py-11">{children}</div>
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
      <h2 className="title text-[1.5rem] md:text-[1.75rem]">{title}</h2>
      {href ? (
        <Link href={href} className="link-quiet shrink-0 text-[0.9375rem] font-medium">
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
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  padded?: boolean;
}) {
  return (
    <div className={cn("panel", interactive && "panel-interactive", padded && "p-5 md:p-6", className)}>
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
          <h2 className="title text-[1.25rem] md:text-[1.4rem]">{title}</h2>
          {description ? <p className="body-muted mt-1.5">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="mt-1.5 text-[0.975rem] font-medium leading-snug">{value}</div>
    </div>
  );
}

export function Block({ title, body }: { title: string; body?: string | null }) {
  return (
    <div>
      <div className="label-caps">{title}</div>
      <p className="mt-2 text-[0.975rem] leading-relaxed text-[var(--text)]/92">{body || "—"}</p>
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
      <div className={cn("mono text-[1.65rem] leading-none tracking-tight", color)}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="body-muted">{children}</p>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
    >
      <span aria-hidden className="text-[var(--faint)]">
        ←
      </span>
      {children}
    </Link>
  );
}

export function RecBadge({ rec }: { rec?: string | null }) {
  const cls =
    rec === "Deep Dive" ? "rec-deep" : rec === "Watch" ? "rec-watch" : "rec-pass";
  return <span className={cn("badge-rec", cls)}>{rec || "—"}</span>;
}

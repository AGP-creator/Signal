import Link from "next/link";
import type { ReactNode } from "react";
import { companyPath, competitorPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

type CompanyLinkProps = {
  id?: string | null;
  slug?: string | null;
  name: string;
  className?: string;
  children?: ReactNode;
};

/** Clickable company name → `/company/[slug|id]`. Falls back to slugifying `name`. */
export function CompanyLink({ id, slug, name, className, children }: CompanyLinkProps) {
  const href =
    companyPath({ id, slug }) ||
    (name ? companyPath({ slug: name }) : null);
  const label = children ?? name;
  if (!href) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link href={href} className={cn("entity-link", className)}>
      {label}
    </Link>
  );
}

type CompetitorLinkProps = {
  slug?: string | null;
  name: string;
  className?: string;
  children?: ReactNode;
};

/** Clickable firm / competitor name → `/competitors/[slug]`. */
export function CompetitorLink({ slug, name, className, children }: CompetitorLinkProps) {
  const href = competitorPath(slug || name);
  const label = children ?? name;
  if (!href) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link href={href} className={cn("entity-link", className)}>
      {label}
    </Link>
  );
}

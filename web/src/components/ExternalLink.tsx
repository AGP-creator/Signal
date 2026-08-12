import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { companySiteUrl, sanitizeExternalUrl, sanitizeSourceUrl } from "@/lib/externalLinks";

type ExternalLinkProps = {
  href?: string | null;
  children: ReactNode;
  className?: string;
  companyName?: string | null;
  inPipeline?: boolean;
  kind?: "source" | "site" | "generic";
};

export function ExternalLink({
  href,
  children,
  className,
  companyName,
  inPipeline,
  kind = "generic",
}: ExternalLinkProps) {
  const safe =
    kind === "site"
      ? companySiteUrl(href, companyName, { inPipeline })
      : kind === "source"
        ? sanitizeSourceUrl(href)
        : sanitizeExternalUrl(href, { allowNonCompanyHosts: true });

  if (!safe) {
    return <span className={className}>{children}</span>;
  }

  return (
    <a href={safe} target="_blank" rel="noreferrer noopener" className={cn(className)}>
      {children}
    </a>
  );
}

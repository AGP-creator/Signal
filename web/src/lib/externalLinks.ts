/** Block adult/spam hosts and validate external URLs before rendering or storing. */

const BLOCKED_HOST_RE =
  /\b(porn|xxx|nude|adult|sex|hentai|xnxx|xvideos|redtube|youporn|onlyfans|aznude|chaturbate|brazzers|pornhub|xhamster)\b/i;

const NON_COMPANY_HOSTS = new Set([
  "wikipedia.org",
  "facebook.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "instagram.com",
  "youtube.com",
  "google.com",
  "duckduckgo.com",
  "reddit.com",
  "github.com",
  "crunchbase.com",
  "pitchbook.com",
  "bloomberg.com",
  "techcrunch.com",
  "yahoo.com",
  "bing.com",
  "amazon.com",
  "medium.com",
  "substack.com",
]);

function compactAlpha(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//i, "").replace(/^www\./, "");
  d = d.split("/")[0]?.split("?")[0]?.split("#")[0] || "";
  if (!d || d.length > 253 || d.includes("..")) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(d)) {
    return null;
  }
  return d;
}

export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (!h) return true;
  if (BLOCKED_HOST_RE.test(h)) return true;
  if (/\.(xxx|adult|porn|sex)$/i.test(h)) return true;
  return false;
}

export function isNonCompanyHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return [...NON_COMPANY_HOSTS].some((blocked) => h === blocked || h.endsWith(`.${blocked}`));
}

/** True when the domain label plausibly belongs to the company name. */
export function domainMatchesCompany(domain: string, companyName: string): boolean {
  const host = normalizeDomain(domain);
  const name = compactAlpha(companyName);
  if (!host || !name || name.length < 2) return false;

  const label = compactAlpha(host.split(".")[0] || "");
  if (!label) return false;
  if (label === name) return true;

  const shorter = label.length <= name.length ? label : name;
  const longer = label.length <= name.length ? name : label;
  if (shorter.length >= 3 && (longer.startsWith(shorter) || longer.includes(shorter))) return true;

  return false;
}

type SanitizeDomainOpts = {
  companyName?: string | null;
  /** Pipeline / curated records may use domains that do not fuzzy-match the name. */
  requireCompanyMatch?: boolean;
};

export function sanitizeDomain(
  raw: string | null | undefined,
  opts: SanitizeDomainOpts = {},
): string | null {
  const domain = normalizeDomain(raw);
  if (!domain || isBlockedHost(domain)) return null;
  if (isNonCompanyHost(domain)) return null;
  if (opts.requireCompanyMatch !== false && opts.companyName) {
    if (!domainMatchesCompany(domain, opts.companyName)) return null;
  }
  return domain;
}

export function companySiteUrl(
  domain: string | null | undefined,
  companyName?: string | null,
  opts?: { inPipeline?: boolean },
): string | null {
  const clean = sanitizeDomain(domain, {
    companyName,
    requireCompanyMatch: !opts?.inPipeline,
  });
  return clean ? `https://${clean}` : null;
}

type SanitizeUrlOpts = {
  companyName?: string | null;
  allowNonCompanyHosts?: boolean;
};

export function sanitizeExternalUrl(
  raw: string | null | undefined,
  opts: SanitizeUrlOpts = {},
): string | null {
  if (!raw?.trim()) return null;
  let candidate = raw.trim();
  if (/^(javascript|data|vbscript|blob):/i.test(candidate)) return null;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(candidate)) candidate = `https://${candidate}`;
    else return null;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^www\./, "");
    if (isBlockedHost(host)) return null;
    if (!opts.allowNonCompanyHosts && isNonCompanyHost(host)) return null;
    if (opts.companyName && !opts.allowNonCompanyHosts) {
      if (!domainMatchesCompany(host, opts.companyName)) return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** News / source links — allow reputable hosts, still block spam/adult. */
export function sanitizeSourceUrl(raw: string | null | undefined): string | null {
  return sanitizeExternalUrl(raw, { allowNonCompanyHosts: true });
}

export function sanitizeBriefDomain(
  domain: string | null | undefined,
  companyName: string,
  inPipeline?: boolean,
): string | null {
  return sanitizeDomain(domain, {
    companyName,
    requireCompanyMatch: !inPipeline,
  });
}

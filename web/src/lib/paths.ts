/** Canonical in-app routes for companies and competitor firms. */

export function firmSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function asCompanyKey(raw: string) {
  const key = raw.trim();
  if (!key) return null;
  // Already a slug or opaque id (e.g. c_agentgate, agentgate)
  if (!/[^a-z0-9_-]/.test(key)) return key;
  // Display name → slug
  return firmSlug(key) || null;
}

export function companyPath(ref: {
  id?: string | null;
  slug?: string | null;
}): string | null {
  const id = (ref.id || "").trim();
  if (id.startsWith("sector_")) return null;
  const slug = (ref.slug || "").trim();
  const key = asCompanyKey(slug) || asCompanyKey(id);
  if (!key) return null;
  return `/company/${key}`;
}

export function competitorPath(slugOrName?: string | null): string | null {
  const raw = (slugOrName || "").trim();
  if (!raw) return null;
  return `/competitors/${firmSlug(raw)}`;
}

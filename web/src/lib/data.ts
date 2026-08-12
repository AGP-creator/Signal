import { restSelect } from "@/lib/rest";
import type {
  AlertItem,
  Commentary,
  Company,
  DigestRow,
  NewsItem,
  PeerActivity,
  SectorCall,
  SignalItem,
} from "@/lib/types";

/**
 * Mirror Python `row_to_company`: merge JSON `payload` into flat columns so
 * funding_rounds, product_notes, tier2/3 names, discovery_origin, etc. survive PostgREST reads.
 * Flat columns win when non-null (fresher stamps from PATCH / refresh).
 */
export function rowToCompany(row: Record<string, unknown> | Company | null | undefined): Company | null {
  if (!row || typeof row !== "object") return null;
  const payload = (row as { payload?: unknown }).payload;
  if (payload && typeof payload === "object" && (payload as { id?: string }).id) {
    const flat: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === "payload" || k === "created_at" || k === "updated_at") continue;
      if (v !== null && v !== undefined) flat[k] = v;
    }
    return { ...(payload as Company), ...flat } as Company;
  }
  const { payload: _drop, created_at: _c, updated_at: _u, ...rest } = row as Record<
    string,
    unknown
  > & { payload?: unknown; created_at?: unknown; updated_at?: unknown };
  return rest as Company;
}

function rowsToCompanies(rows: unknown): Company[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => rowToCompany(r as Record<string, unknown>))
    .filter((c): c is Company => Boolean(c?.id));
}

export async function fetchCompanies(): Promise<Company[]> {
  const rows = await restSelect<Record<string, unknown>[]>("companies", {
    order: "thesis_score.desc.nullslast",
  });
  return rowsToCompanies(rows);
}

export async function fetchCompany(idOrSlug: string): Promise<Company | null> {
  const byId = await restSelect<Record<string, unknown>[]>("companies", {
    eq: { id: idOrSlug },
    limit: 1,
  });
  const fromId = rowToCompany(byId?.[0]);
  if (fromId) return fromId;
  const bySlug = await restSelect<Record<string, unknown>[]>("companies", {
    eq: { slug: idOrSlug },
    limit: 1,
  });
  return rowToCompany(bySlug?.[0]);
}

export async function fetchCommentary(companyId?: string): Promise<Commentary[]> {
  return restSelect<Commentary[]>("commentary", {
    eq: companyId ? { company_id: companyId } : undefined,
  });
}

export async function fetchNews(): Promise<NewsItem[]> {
  return restSelect<NewsItem[]>("news");
}

export async function fetchPeers(): Promise<PeerActivity[]> {
  return restSelect<PeerActivity[]>("peer_activity");
}

export async function fetchSectors(): Promise<SectorCall[]> {
  return restSelect<SectorCall[]>("sector_calls", {
    order: "heat_score.desc.nullslast",
  });
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  return restSelect<AlertItem[]>("alerts");
}

export async function fetchSignals(): Promise<SignalItem[]> {
  return restSelect<SignalItem[]>("signals", {
    order: "observed_at.desc",
  });
}

export async function fetchLatestDigest(): Promise<DigestRow | null> {
  const rows = await restSelect<DigestRow[]>("digests", {
    order: "created_at.desc",
    limit: 1,
  });
  return rows?.[0] || null;
}

export async function fetchMeta(key: string): Promise<string> {
  const rows = await restSelect<{ value: string }[]>("meta", {
    eq: { key },
    limit: 1,
  });
  return rows?.[0]?.value || "";
}

export async function fetchDashboard() {
  const [companies, sectors, alerts, news, peers, digest, lastRefreshed, liveSignals] =
    await Promise.all([
      fetchCompanies(),
      fetchSectors(),
      fetchAlerts(),
      fetchNews(),
      fetchPeers(),
      fetchLatestDigest(),
      fetchMeta("last_refreshed"),
      fetchMeta("live_signal_count"),
    ]);
  return { companies, sectors, alerts, news, peers, digest, lastRefreshed, liveSignals };
}

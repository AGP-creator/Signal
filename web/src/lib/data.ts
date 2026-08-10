import { restSelect } from "@/lib/rest";
import type {
  AlertItem,
  Commentary,
  Company,
  DigestRow,
  NewsItem,
  PeerActivity,
  SectorCall,
} from "@/lib/types";

export async function fetchCompanies(): Promise<Company[]> {
  return restSelect<Company[]>("companies", {
    order: "thesis_score.desc.nullslast",
  });
}

export async function fetchCompany(idOrSlug: string): Promise<Company | null> {
  const byId = await restSelect<Company[]>("companies", {
    eq: { id: idOrSlug },
    limit: 1,
  });
  if (byId?.[0]) return byId[0];
  const bySlug = await restSelect<Company[]>("companies", {
    eq: { slug: idOrSlug },
    limit: 1,
  });
  return bySlug?.[0] || null;
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

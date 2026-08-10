import { getSupabaseServer } from "@/lib/supabase";
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
  const { data, error } = await getSupabaseServer()
    .from("companies")
    .select("*")
    .order("thesis_score", { ascending: false });
  if (error) throw error;
  return (data || []) as Company[];
}

export async function fetchCompany(idOrSlug: string): Promise<Company | null> {
  const sb = getSupabaseServer();
  const byId = await sb.from("companies").select("*").eq("id", idOrSlug).maybeSingle();
  if (byId.data) return byId.data as Company;
  const bySlug = await sb.from("companies").select("*").eq("slug", idOrSlug).maybeSingle();
  return (bySlug.data as Company) || null;
}

export async function fetchCommentary(companyId?: string): Promise<Commentary[]> {
  let q = getSupabaseServer().from("commentary").select("*");
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Commentary[];
}

export async function fetchNews(): Promise<NewsItem[]> {
  const { data, error } = await getSupabaseServer().from("news").select("*");
  if (error) throw error;
  return (data || []) as NewsItem[];
}

export async function fetchPeers(): Promise<PeerActivity[]> {
  const { data, error } = await getSupabaseServer().from("peer_activity").select("*");
  if (error) throw error;
  return (data || []) as PeerActivity[];
}

export async function fetchSectors(): Promise<SectorCall[]> {
  const { data, error } = await getSupabaseServer()
    .from("sector_calls")
    .select("*")
    .order("heat_score", { ascending: false });
  if (error) throw error;
  return (data || []) as SectorCall[];
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const { data, error } = await getSupabaseServer().from("alerts").select("*");
  if (error) throw error;
  return (data || []) as AlertItem[];
}

export async function fetchLatestDigest(): Promise<DigestRow | null> {
  const { data, error } = await getSupabaseServer()
    .from("digests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as DigestRow) || null;
}

export async function fetchMeta(key: string): Promise<string> {
  const { data } = await getSupabaseServer().from("meta").select("value").eq("key", key).maybeSingle();
  return data?.value || "";
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

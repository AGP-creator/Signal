export type Company = {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  one_liner?: string | null;
  sector_theme?: string | null;
  theme_id?: string | null;
  subsector?: string | null;
  stage?: string | null;
  pipeline_bucket?: string | null;
  last_round_size_m?: number | null;
  last_round_date?: string | null;
  valuation_est_m?: number | null;
  valuation_confidence?: string | null;
  lead_investor?: string | null;
  investors?: string[];
  tier1_count?: number | null;
  tier1_names?: string[];
  tier2_count?: number | null;
  tier2_names?: string[];
  tier3_count?: number | null;
  tier3_names?: string[];
  headcount?: number | null;
  headcount_6m_growth_pct?: number | null;
  yoy_growth_pct?: number | null;
  runway_months_est?: number | null;
  tam_usd_b?: number | null;
  moat_notes?: string | null;
  team_notes?: string | null;
  traction_notes?: string | null;
  last_signal_date?: string | null;
  sources?: string[];
  is_stale?: boolean;
  review_status?: string | null;
  thesis_score?: number | null;
  score_breakdown?: Record<string, number>;
  relative_rank?: string | null;
  recommendation?: "Deep Dive" | "Watch" | "Pass" | string | null;
  why_now?: string | null;
  commentary_summary?: string | null;
  brief_id?: string | null;
};

export type Commentary = {
  id: string;
  company_id: string;
  company_name?: string;
  source?: string;
  quote_or_summary?: string;
  sentiment?: string;
  credibility_tier?: string;
  captured_at?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  source?: string;
  url?: string | null;
  published_at?: string;
  why_it_matters?: string;
  related_themes?: string[];
};

export type PeerActivity = {
  id: string;
  firm: string;
  company_id?: string;
  company_name?: string;
  round?: string;
  date?: string;
  theme?: string;
  on_thesis_flag?: boolean;
  thesis_shift?: boolean;
  notes?: string;
};

export type SectorCall = {
  id: string;
  subsector: string;
  parent_theme?: string;
  evidence?: string[];
  heat_score?: number;
  consensus_level?: string;
  top_companies?: string[];
  why_thirdbase_cares?: string;
};

export type AlertItem = {
  id: string;
  alert_type?: string;
  severity?: string;
  title?: string;
  body?: string;
  company_id?: string | null;
  created_at?: string;
};

export type DigestDeal = {
  name: string;
  score?: number | null;
  recommendation?: string | null;
  rationale?: string | null;
  brief_id?: string | null;
  brief_url?: string | null;
  slug?: string | null;
  sector?: string | null;
};

export type DigestSectorCall = {
  subsector?: string;
  consensus_level?: string;
  why?: string;
  top_companies?: string[];
  parent_theme?: string;
};

export type DigestNewsItem = {
  title?: string;
  source?: string;
  why?: string;
  url?: string | null;
};

export type DigestPeerMove = {
  firm?: string;
  company?: string;
  notes?: string;
  thesis_shift?: boolean;
};

export type DigestRow = {
  id: string;
  subject?: string;
  generated_at?: string;
  markdown?: string;
  html?: string;
  payload?: {
    deals?: DigestDeal[];
    sector_calls?: DigestSectorCall[];
    news?: DigestNewsItem[];
    peer_moves?: DigestPeerMove[];
  };
};

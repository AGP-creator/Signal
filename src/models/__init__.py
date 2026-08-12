from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class PipelineBucket(str, Enum):
    DOMINANT = "dominant_tech_growth"
    TACTICAL = "tactical_sector_agnostic"


class Recommendation(str, Enum):
    DEEP_DIVE = "Deep Dive"
    WATCH = "Watch"
    PASS = "Pass"


class FundingRound(BaseModel):
    round: str
    date: Optional[str] = None
    amount_m: Optional[float] = None
    post_m: Optional[float] = None
    lead: Optional[str] = None
    confidence: str = "estimated"


class Company(BaseModel):
    id: str
    name: str
    slug: str
    domain: Optional[str] = None
    one_liner: str
    sector_theme: str
    theme_id: str
    subsector: str
    stage: str
    pipeline_bucket: PipelineBucket
    last_round_size_m: Optional[float] = None
    last_round_date: Optional[str] = None
    valuation_est_m: Optional[float] = None
    valuation_confidence: str = "estimated"
    lead_investor: Optional[str] = None
    investors: list[str] = Field(default_factory=list)
    tier1_count: int = 0
    tier1_names: list[str] = Field(default_factory=list)
    tier2_count: int = 0
    tier2_names: list[str] = Field(default_factory=list)
    tier3_count: int = 0
    tier3_names: list[str] = Field(default_factory=list)
    headcount: Optional[int] = None
    headcount_6m_growth_pct: Optional[float] = None
    yoy_growth_pct: Optional[float] = None
    runway_months_est: Optional[int] = None
    tam_usd_b: Optional[float] = None
    moat_notes: str = ""
    team_notes: str = ""
    traction_notes: str = ""
    product_notes: str = ""
    funding_rounds: list[FundingRound] = Field(default_factory=list)
    last_signal_date: str
    sources: list[str] = Field(default_factory=list)
    is_stale: bool = False
    review_status: Optional[str] = None
    # Filled by scorer
    thesis_score: Optional[float] = None
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    relative_rank: Optional[str] = None
    recommendation: Optional[Recommendation] = None
    why_now: Optional[str] = None
    commentary_summary: Optional[str] = None
    brief_id: Optional[str] = None


class Signal(BaseModel):
    id: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    source: str
    signal_type: str
    title: str
    summary: str
    url: Optional[str] = None
    observed_at: str
    raw: dict[str, Any] = Field(default_factory=dict)


class Commentary(BaseModel):
    id: str
    company_id: str
    company_name: str
    source: str
    quote_or_summary: str
    sentiment: str
    credibility_tier: str
    captured_at: str


class NewsItem(BaseModel):
    id: str
    title: str
    source: str
    url: Optional[str] = None
    published_at: str
    why_it_matters: str
    related_themes: list[str] = Field(default_factory=list)


class PeerActivity(BaseModel):
    id: str
    firm: str
    company_id: str
    company_name: str
    round: str
    date: str
    theme: str
    on_thesis_flag: bool = True
    thesis_shift: bool = False
    notes: str = ""


class SectorCall(BaseModel):
    id: str
    subsector: str
    parent_theme: str
    evidence: list[str]
    heat_score: float
    consensus_level: str
    top_companies: list[str]
    why_thirdbase_cares: str


class Alert(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    body: str
    company_id: Optional[str] = None
    created_at: str


class Digest(BaseModel):
    subject: str
    generated_at: str
    deals: list[dict[str, Any]]
    sector_calls: list[dict[str, Any]]
    news: list[dict[str, Any]]
    peer_moves: list[dict[str, Any]]
    html: str
    markdown: str

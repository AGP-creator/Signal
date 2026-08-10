from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.agent import chat, get_brief
from src.db.supabase_store import get_meta, healthcheck, load_all_companies, load_table
from src.digest import build_digest, evaluate_alerts, render_alert_email
from scripts.refresh import run_refresh

st.set_page_config(
    page_title="Signal · Thirdbase",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;700&family=Source+Sans+3:wght@400;600;700&display=swap');
    .stApp {
      background:
        radial-gradient(1200px 600px at 10% -10%, #d7e4f5 0%, transparent 55%),
        radial-gradient(900px 500px at 100% 0%, #efe6d6 0%, transparent 50%),
        linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%);
      font-family: "Source Sans 3", sans-serif;
    }
    h1, h2, h3, .brand {
      font-family: "Fraunces", Georgia, serif !important;
      color: #15233b !important;
      letter-spacing: -0.02em;
    }
    .hero {
      padding: 0.4rem 0 1rem 0;
      border-bottom: 1px solid rgba(21,35,59,0.12);
      margin-bottom: 1rem;
    }
    .hero p { color: #3d4b63; font-size: 1.05rem; max-width: 46rem; }
    .pill {
      display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px;
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .pill-dd { background: #d9f2e3; color: #0f5c38; }
    .pill-w { background: #ffe8b5; color: #7a4d00; }
    .pill-p { background: #e6e6e6; color: #444; }
    .deal-card {
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(21,35,59,0.08);
      border-radius: 14px;
      padding: 1rem 1.1rem;
      margin-bottom: 0.75rem;
      box-shadow: 0 8px 24px rgba(21,35,59,0.04);
    }
    .muted { color: #5b6b84; font-size: 0.92rem; }
    div[data-testid="stMetricValue"] { font-family: Fraunces, Georgia, serif; }
    </style>
    """,
    unsafe_allow_html=True,
)

with st.sidebar:
    st.markdown("### ◈ Signal")
    st.caption("Thirdbase deal intelligence OS")
    hc = healthcheck()
    if hc.get("tables"):
        st.success("Supabase connected")
    else:
        st.error("Schema missing — run SQL migration")
        st.markdown(
            "[Open SQL Editor](https://supabase.com/dashboard/project/ixnenoiggoijvawoykto/sql/new)"
        )
        st.code("supabase/migrations/001_init.sql", language="text")

    offline = st.checkbox("Offline refresh (no live ingest)", value=False)
    if st.button("Refresh pipeline", type="primary", use_container_width=True):
        with st.spinner("Ingest → score → Supabase → Excel…"):
            summary = run_refresh(live=not offline)
        if summary.get("ok"):
            st.success(
                f"{summary['companies']} companies · {summary['deep_dive']} Deep Dive · "
                f"{summary['live_signals']} live signals"
            )
            st.cache_data.clear()
        else:
            st.error(summary.get("hint") or summary.get("error"))

    xlsx = ROOT / "data" / "output" / "Thirdbase_Deal_Pipeline.xlsx"
    if xlsx.exists():
        st.download_button(
            "Download Excel workbook",
            data=xlsx.read_bytes(),
            file_name="Thirdbase_Deal_Pipeline.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True,
        )

    st.markdown("---")
    st.markdown("**Partner prompts**")
    demos = [
        "What are the best deals in defense tech right now?",
        "What are three AI infrastructure sub-sectors nobody is talking about yet?",
        "Summarize what people are saying about AgentGate",
        "Who's quietly investing in robotics?",
        "Show me off-thesis bets from Sequoia",
        "Rebalance: are we overweight tactical vs 60/40?",
        "Draft an IC one-pager for SwarmGuard",
    ]
    for d in demos:
        if st.button(d, key=f"d_{hash(d)}", use_container_width=True):
            st.session_state["question"] = d


@st.cache_data(ttl=20)
def load_state():
    companies = load_all_companies()
    commentary = load_table("commentary")
    news = load_table("news")
    peers = load_table("peer_activity")
    sectors = load_table("sector_calls")
    alerts = load_table("alerts")
    meta = {
        "last_refreshed": get_meta("last_refreshed", "never"),
        "live_signal_count": get_meta("live_signal_count", "0"),
    }
    return companies, commentary, news, peers, sectors, alerts, meta


st.markdown(
    """
    <div class="hero">
      <div class="brand" style="font-size:2.4rem;font-weight:700;">Signal</div>
      <p>Self-maintaining deal pipeline for Thirdbase — scored against thesis, ranked vs peers,
      with partner chat, digests, and a living Excel workbook.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

if not hc.get("tables"):
    st.warning(
        "Apply the Supabase schema once, then click **Refresh pipeline**. "
        "SQL file: `supabase/migrations/001_init.sql`"
    )
    st.stop()

try:
    companies, commentary, news, peers, sectors, alerts, meta = load_state()
except Exception as exc:
    st.error(f"Could not load from Supabase: {exc}")
    st.info("Click **Refresh pipeline** after schema is applied.")
    st.stop()

if not companies:
    st.info("Pipeline empty — click **Refresh pipeline** in the sidebar to seed Supabase.")
else:
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Companies", len(companies))
    c2.metric("Deep Dive", sum(1 for c in companies if c.get("recommendation") == "Deep Dive"))
    c3.metric("Watch", sum(1 for c in companies if c.get("recommendation") == "Watch"))
    c4.metric("Pass", sum(1 for c in companies if c.get("recommendation") == "Pass"))
    c5.metric("Stale", sum(1 for c in companies if c.get("is_stale")))
    st.caption(
        f"Supabase · last refreshed {meta.get('last_refreshed')} · "
        f"live signals {meta.get('live_signal_count')}"
    )

tab_home, tab_chat, tab_pipe, tab_digest, tab_alerts, tab_brief = st.tabs(
    ["Hot Deals", "Chat", "Pipeline", "Digest", "Alerts", "IC Brief"]
)

with tab_home:
    hot = [
        c
        for c in companies
        if c.get("recommendation") == "Deep Dive" or (c.get("thesis_score") or 0) >= 78
    ][:8]
    if not hot:
        st.write("No hot deals yet.")
    for c in hot:
        rec = c.get("recommendation") or "Watch"
        pill = "pill-dd" if rec == "Deep Dive" else "pill-w" if rec == "Watch" else "pill-p"
        st.markdown(
            f"""
            <div class="deal-card">
              <div style="display:flex;justify-content:space-between;gap:1rem;align-items:baseline;">
                <div style="font-family:Fraunces,serif;font-size:1.25rem;font-weight:700;">{c.get('name')}</div>
                <div><span class="pill {pill}">{rec}</span> · score {c.get('thesis_score')}</div>
              </div>
              <div class="muted">{c.get('sector_theme')} · {c.get('stage')} · {c.get('relative_rank')}</div>
              <p style="margin:0.6rem 0 0 0;">{c.get('why_now') or c.get('one_liner')}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    st.subheader("Sector of Tomorrow")
    for s in sorted(sectors, key=lambda x: -(x.get("heat_score") or 0))[:3]:
        tops = s.get("top_companies") or []
        if isinstance(tops, list):
            tops_s = ", ".join(tops)
        else:
            tops_s = str(tops)
        st.markdown(
            f"**{s.get('subsector')}** · {s.get('consensus_level')} · heat {s.get('heat_score')}  \n"
            f"{s.get('why_thirdbase_cares')}  \n"
            f"<span class='muted'>Companies: {tops_s}</span>",
            unsafe_allow_html=True,
        )

with tab_chat:
    q = st.text_area(
        "Ask Signal",
        value=st.session_state.get(
            "question", "What are the best deals in defense tech right now?"
        ),
        height=110,
    )
    if st.button("Ask partner agent", type="primary"):
        with st.spinner("Grounding in Supabase pipeline…"):
            st.markdown(chat(q))

with tab_pipe:
    import pandas as pd

    rows = [
        {
            "company": c.get("name"),
            "score": c.get("thesis_score"),
            "rec": c.get("recommendation"),
            "sector": c.get("sector_theme"),
            "stage": c.get("stage"),
            "tier1": c.get("tier1_count"),
            "rank": c.get("relative_rank"),
            "last_signal": c.get("last_signal_date"),
        }
        for c in companies
    ]
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

with tab_digest:
    if companies:
        digest = build_digest(companies, sectors, news, peers)
        st.markdown(f"**{digest['subject']}**")
        st.markdown(digest["markdown"])
    else:
        st.info("Refresh first.")

with tab_alerts:
    items = alerts or (evaluate_alerts(companies, peers) if companies else [])
    for a in items[:20]:
        with st.expander(f"{(a.get('severity') or '').upper()} · {a.get('title')}"):
            st.code(render_alert_email(a))

with tab_brief:
    names = [c.get("name") for c in companies]
    pick = st.selectbox("Company", names) if names else None
    if pick and st.button("Generate IC brief"):
        st.markdown(get_brief(pick))

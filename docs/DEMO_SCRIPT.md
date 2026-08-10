# Signal — Interview Demo Script (10–12 minutes)

Practice out loud. Keep Hot Deals and digest **short**. Show one deliberate **Pass**.

## 0. Setup (before they sit down)

- [ ] `python scripts/refresh.py` already run; Excel exists in `data/output/`
- [ ] Streamlit up: `streamlit run app.py`
- [ ] Offline fallback ready if Wi‑Fi dies (seed DB still answers chat)
- [ ] Excel open on second screen / ready to share

---

## 1. Hook (60s)

> Partners don’t need another Crunchbase. They need an associate that never sleeps — and never wastes Monday morning.
>
> Signal turns noisy funding announcements into a self-maintaining pipeline scored the way Thirdbase invests: thesis fit, Tier-1 quality, growth, moat, valuation — ranked **relative** to peers in the same sector and stage.

Show PRODUCT one-liner slide if using a deck; otherwise go straight to Excel.

---

## 2. Excel walkthrough (90s)

Open `Thirdbase_Deal_Pipeline.xlsx`:

1. **Cover** — last refreshed, methodology, seed vs live provenance  
2. **Pipeline** — point at `why_now`, `thesis_score`, `relative_rank`, conditional formatting (Deep Dive / Watch / Pass)  
3. **Hot Deals** — last 30 days, highest conviction only  
4. **Peer Firm Dossiers / Co-investor Heatmap** — competitor intelligence  
5. **Stale** — “We never auto-delete. Partners decide.”  
6. **Judgment OS** — override fuel, miss retros, founder radar, freshness SLA, digest A/B  

Line to use: *“Excel is intentional. Partners debate in sheets.”*

Optional: open **Competitors** + **Judgment** in the Next.js UI — firm radar, thesis drift, and the X-factor judgment loop.

---

## 3. Refresh loop (60s)

In Streamlit, click **Run pipeline refresh**.

Narrate: ingest (EDGAR / HN / RSS) → dedupe → re-score → Excel rewrite.  
Call out any new signal or score movement.

---

## 4. Live chat (4 min) — ask these in order

1. *“What are the best deals in defense tech right now?”*  
2. *“What are three AI infrastructure sub-sectors nobody is talking about yet?”*  
3. *“Summarize what people are saying about [pick a Deep Dive company].”*  
4. *“Who’s quietly investing in robotics?”*  
5. Optional stretch: *“Are we overweight tactical vs 60/40?”* or *“Draft an IC one-pager for [company].”*

If Claude API key missing: offline retrieval mode still answers from DB with templated synthesis — say so transparently.

---

## 4b. Diligence Stress Pack (90s) — judgment edge vs coverage tools

Open a **Deep Dive** company page (or `/search` → pipeline name). Scroll to **Diligence Stress Pack**:

1. **Bull vs Bear** — show the counterfactual kill arguments side-by-side with fair bull counters  
   > “Coverage tools summarize. We argue against ourselves before IC.”
2. **Diligence plan** — work orders with close conditions + copy founder-only email (never auto-send)  
3. **Meeting prep** — pre-call sheet with landmines from the bear case  
4. Optional: **Deck flags** — paste sample deck text; show extracted claims vs blanks + red flags  
5. **Copy IC packet** — packet now includes bear + required work orders + founder questions

Chat demos:
- *“Bear case for [Deep Dive company]”*  
- *“Diligence plan for [company]”*  
- *“Prep me for a call with [company]”*

---

## 5. Digest preview (60s)

Open **Digest** tab in Streamlit.

Show subject line + hard caps: 3–5 deals, 1–2 sector calls, 3–5 reads, peer moves.  
> “If they won’t forward it, we failed.”

---

## 6. Alert (30s)

Trigger / show sample alert: **2+ Tier-1 co-invest** or off-thesis peer move.  
> “Special routing doesn’t wait for Wednesday.”

---

## 7. Close (2 min)

Roadmap: PitchBook / Coresignal connectors, SharePoint sync, Affinity writeback, always-on workers.

Ask them:
1. Affinity today — write back or Excel-first?  
2. Exact stage sweet spot for the 60% bucket?  
3. True peer set vs aspirational watch?  
4. Hard Pass rules?  
5. Who owns Stale review?

Close line:  
> **Signal is the associate that never sleeps — and never wastes a partner’s Monday.**

---

## Wow details checklist

- [ ] Use Thirdbase language (60/40, Tier-1, 40%+ YoY, ~3yr runway)  
- [ ] Include recognizable peer firms (a16z, Sequoia, Lux, etc.)  
- [ ] Show a sharp **Pass** with real reasoning  
- [ ] Show **Bear case** on a Deep Dive (counterfactual agent)  
- [ ] Never invent private valuations — say “estimated / reported”  
- [ ] Separate judgment OS vs data connectors clearly  
- [ ] Mention competitive landscape note: [`AGENTIC_VC_LANDSCAPE.md`](AGENTIC_VC_LANDSCAPE.md)  

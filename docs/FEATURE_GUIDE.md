# Signal — Complete Feature Guide for Partner Explanation Calls

**Audience:** You (walking GPs / principals / associates through Signal)  
**Goal:** Explain every module by *job to be done*, not by UI novelty  
**Companion docs:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md) (timed walkthrough) · [PRODUCT.md](PRODUCT.md) · [PARTNER_CONVICTION_BRIEF.md](PARTNER_CONVICTION_BRIEF.md)

---

## How to use this on the call

| Time | Do this |
|------|---------|
| First 60s | Hook + one idea (Coverage vs Judgment) |
| Next 8–10 min | Walk **Monday path** modules only (Sections A–B) |
| If they lean in | Add Judgment, Competitors, Diligence (Section C) |
| If LP in the room | LP Desk (Section D) |
| Only if asked | Labs — Atlas / Edge; Venture agent `/os` for Core Intelligence (Section E) |
| Close | Honest boundary + “databases plug in as connectors” |

**Rule:** Never tour every screen. Partners remember *one ritual* and *one Pass*.  
**Default path:** Desk → Meeting → Excel → one company brief → Chat or Search → Digest.

---

## Opening (memorize)

> Partners don’t need another Crunchbase. They need an associate that never sleeps — and never wastes Monday morning.
>
> Most tools optimize for **coverage**. Thirdbase doesn’t have a coverage problem — it has an **attention allocation** problem. Signal spends partner attention like capital: concentrated, thesis-aligned, and explainable.

**One-liner:** Always-on deal intelligence OS that turns market noise into a self-maintaining pipeline, ranked the way Thirdbase actually invests.

---

## Mental model (draw this once)

```
  Market noise (funding, peers, news, commentary)
              │
              ▼
     Thesis policy (config, not a prompt)
              │
              ▼
     Score → Relative rank → Deep Dive / Watch / Pass
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
   Excel    Digest   Partner OS (web)
     │        │        │
     └────────┴────────┘
         Monday ritual
```

**Recommendations:**

| Rec | Meaning for partners |
|-----|----------------------|
| **Deep Dive** | Worth IC-grade attention this cycle |
| **Watch** | Interesting; not yet outstanding vs cohort |
| **Pass** | Explicit no — with spine (show one on purpose) |

Scores are **relative within theme × stage** (“#2 of 7 AI infra Series A”), not fake absolute precision.

**Thesis encoded in config** (`config/thesis_policy.yaml`):

- 60% dominant tech/growth · 40% tactical  
- 40%+ YoY at growth stage · ~3yr runway · 3–4 Tier-1 preferred  
- Moat / TAM > $1B · 3–5yr exit · attractive entry vs comps  

---

# A. Core engine (invisible — explain once)

These are not pages. They are why the pages mean something.

### A1. Ingest + dedupe + refresh

| | |
|--|--|
| **What** | Pulls public signals (EDGAR / HN / RSS / arXiv), dedupes companies, re-scores, rewrites Excel + DB |
| **Partner use** | “The pipeline maintains itself. Partners review; they don’t data-enter.” |
| **Where** | Header **Refresh** · `python scripts/refresh.py` |
| **Say** | “Ingest → dedupe → score against thesis → Excel rewrite. Live connectors plug in later; judgment layer is already here.” |

### A2. Thesis scoring + why_now

| | |
|--|--|
| **What** | Weighted dimensions: thesis fit, team, cap table, traction, moat, valuation, runway, TAM/exit, timing |
| **Partner use** | Every score is explainable; overrides become policy fuel |
| **Where** | Company page score bars · Excel Pipeline columns · Chat |
| **Say** | “Thesis is version-controlled config — not a system prompt that drifts.” |

### A3. Alerts

| | |
|--|--|
| **What** | Immediate flags: 2+ Tier-1 on a name, off-thesis peer moves, watched-founder / GP watchlist hits |
| **Partner use** | Don’t wait for Wednesday digest when something is time-sensitive |
| **Where** | Desk sidebar · Meeting agenda · Digest |
| **Say** | “Selectivity on email; urgency on alerts.” |

---

# B. Monday path (default explanation order)

These five are the product. Everything else is depth.

---

## B1. Desk — `/`

**Module job:** Answer “What deserves my hour *today*?” in one screen.

| Element | Use |
|---------|-----|
| Hot Deals (top 5) | Highest-conviction names — Deep Dive / high score |
| 60/40 mix gauge | Are we overweight tactical vs policy? |
| High-severity alerts | What can’t wait for the digest |
| Sectors + worth reading | Light context, not a second dashboard |
| **Open Monday agenda** | One click into Meeting OS |
| **Download Excel** | Shared debate object |

**Partner use:** Morning open. Not a feature directory.  
**What to say:**  
> “This is the attention surface. Five deals. Not fifty. If Hot Deals is long, Signal failed.”

**Click:** Open Monday agenda → Meeting.

---

## B2. Partner Meeting OS — `/meeting`

**Module job:** Auto-build a ~90-minute Monday partner agenda so the meeting has a spine.

| Pulls from | Why it’s on the agenda |
|------------|------------------------|
| Hot Deals | Debate candidates |
| IC trails | Deals already in motion |
| Alerts | Time-sensitive |
| Peer shifts | Competitive pressure |
| Mix drift | Portfolio posture |
| Stale queue | Memory / cleanup decisions |

**Partner use:** Facilitator opens this instead of a blank Google Doc.  
**What to say:**  
> “Associates shouldn’t rebuild the Monday doc from Slack. Signal assembles the agenda from the same store as Excel and digest.”

**Click:** Pick one Hot Deal → company page (or stay and export agenda if shown).

---

## B3. Excel workbook — `Thirdbase_Deal_Pipeline.xlsx`

**Module job:** System of record for partner *debate* (not for looking pretty).

| Tab | Use |
|-----|-----|
| Pipeline | Full scored book: why_now, thesis_score, relative_rank, Rec |
| Hot Deals | Last ~30 days, high conviction only |
| Watchlist | Parked but alive |
| Sector of Tomorrow | Emerging / contrarian subsectors |
| Peer Set Activity | What peer firms are doing |
| Co-investor Heatmap | Who co-invests with whom |
| Golden Insights | Proprietary windows, crowding, white space, call lists |
| Peer Firm Dossiers | Firm-level battle cards |
| Judgment OS | Overrides, misses, founder radar, digest A/B |
| News Worth Reading | Curated + why Thirdbase cares |
| Investor Commentary | Operator / GP chatter with posture, themes, source mix |
| Stale | ≥90 days quiet — partner review, never auto-delete |

**Partner use:** Second screen in IC / partner meeting; SharePoint later.  
**What to say:**  
> “Excel is intentional. Partners already debate in sheets. We regenerate the shared object of argument — we don’t fight culture.”

**Click:** Download Excel from Desk (or open from `data/output/`).

---

## B4. Pipeline — `/pipeline`

**Module job:** Filterable table of the whole scored book when Hot Deals isn’t enough.

**Partner use:** “Show me all Watch in defence” / sort by score / find a Pass.  
**What to say:**  
> “Desk is for attention. Pipeline is for search and debate prep.”

---

## B5. Company brief — `/company/[id]`

**Module job:** IC-style one-pager for a single name — a **decision object**, not a dump.

On demand via company page, `/search`, `/chat`, or `GET /api/briefs/[id]`.  
**Auto-triggered** on every refresh when a deal scores **Watch** or **Deep Dive** → markdown + JSON under `data/output/briefs/`, plus a `brief_ready` alert with link.

| Block | Use |
|-------|-----|
| Rec + thesis score + relative rank | Pass / Watch / Deep Dive posture |
| Funding history | Multi-round ladder (stored or synthesized from last raise) |
| Cap table T1 / T2 / T3 counts | Syndicate quality |
| Team & hiring | Notes + headcount / 6m growth signal |
| Product traction | Product notes + traction + YoY / runway / TAM |
| Thesis fit | Theme · bucket · moat · why now · score bars |
| Comparable companies | Relative peers in theme × stage |
| Investor & operator commentary | Qualitative desk — beloved / contested / skeptical, channel mix, filterable voices |
| Override panel | Partner disagrees → Judgment fuel |
| **Diligence Stress Pack** | Bear case, work orders, meeting prep, deck flags |
| **IC packet export** | Copy/download markdown for IC |

**Partner use:** Before a call, before IC, when someone asks “why this score?”  
**What to say:**  
> “Coverage tools summarize. We argue against ourselves before IC.”

### Diligence Stress Pack (on the company page)

| Sub-module | Partner use |
|------------|-------------|
| Bull vs Bear | Kill arguments + fair counters |
| Diligence plan | Work orders with close conditions |
| Founder-only email draft | Copyable; **never auto-send** |
| Meeting prep | Pre-call landmines from bear case |
| Deck flags | Paste deck text → claims vs blanks + red flags |
| IC packet | Packet includes bear + required work orders |

---

## B6. Search / research agent — `/search`

**Module job:** Type any company → brief. Honesty split matters.

| Input | Output | Partner use |
|-------|--------|-------------|
| Name **in** pipeline | Full IC-grade brief (high confidence) | Fast path to company truth |
| Name **outside** pipeline | **Scout brief** — Watch-capped, `est.` score, banner “not IC-ready” | Rough look without fake conviction |

**What to say:**  
> “Coverage tools fake IC readiness on Wikipedia. We separate scout from conviction. Deep Dive is earned inside the maintained pipeline.”

**Demo:** AgentGate (pipeline) → then an external name → show scout banner.

---

## B7. Partner chat + ⌘K — `/chat`

**Module job:** Ask in English over the *same* store as Excel / Desk.

| Works well | Does not |
|------------|----------|
| Monday agenda, top Deep Dives, 60/40, sectors, bear case, peers, judgment | Ungrounded trivia — **refuses** with starters |

**Partner use:** Lazy query path for GPs who won’t open five tabs.  
**What to say:**  
> “Grounded answers or a refusal. We don’t hallucinate a briefing from thin air.”

**Starter prompts to demo:**

1. Monday partner agenda  
2. Three AI infra sub-sectors nobody is talking about  
3. Summarize commentary on [Deep Dive]  
4. Are we overweight tactical vs 60/40?  
5. Bear case for [Deep Dive]

---

## B8. Digest — `/digest`

**Module job:** M/W/F email preview — hard-capped selectivity.

| Cap | Content |
|-----|---------|
| 3–5 | Deals only (not the whole book) |
| 1–2 | Sector calls |
| 3–5 | News worth reading |
| Few | Peer moves |

**Partner use:** The ritual that lands in inbox without chasing. Preview in UI; production send via SMTP.  
**What to say:**  
> “If they won’t forward it, we failed. Expanding to eight deals is coverage creep — we refuse it as default.”

---

## B9. Library — `/library`

**Module job:** Excel “reading room” tabs as UI.

| Tab | Use |
|-----|-----|
| News Worth Reading | Curated + Thirdbase why |
| Investor Commentary | Qualitative desk (posture · themes · source mix · filters) |
| Watchlist | Parked names |
| **Stale (90d+)** | Partner actions: **Keep / Archive / Request refresh** — never auto-delete |

**What to say:**  
> “Stale is a decision, not a garbage collector. Institutional memory stays until a partner says otherwise.”

---

# C. Partner depth (show if they lean in)

---

## C1. GP Desk — `/gp`

**Module job:** Partner cockpit — attention queue, KPIs, analytics, IC pressure, competitive pulse, exportable GP brief.

**Partner use:** When Desk isn’t enough and someone wants “how is the book and process health?”  
**What to say:**  
> “Desk answers today. GP Desk answers ‘are we operating like a firm?’”

*Don’t open this as the first screen — it looks like a dashboard tour.*

---

## C2. IC Decision Trail — `/ic`

**Module job:** Governance object LPs ask for and GPs forget to keep.

| Tracks | Use |
|--------|-----|
| Stages | Sourced → Screened → Deep Dive → Diligence → Partner meeting → IC vote → Term sheet / Pass / Watch |
| Diligence checklist | Team, product, market, traction, refs, legal, terms |
| Votes + event log | Paper trail |
| Documented Passes | Spine — we can say no |

**Partner use:** Before IC; when LP asks “show me a decision trail.”  
**What to say:**  
> “Process without theater. A Pass with a note is a feature.”

---

## C3. Judgment OS — `/judgment`

**Module job:** The X-factor — hard to copy. Turns partner disagreement into firm learning.

| Sub-module | Partner use |
|------------|-------------|
| Override ledger | Disagree with Signal; reason tagged to a scoring dimension |
| Policy fuel | Raise/lower bars by dimension (not silent fine-tunes) |
| Miss retrospective | Blameless postmortem when FOMO arrived after we stayed cool |
| Mix drift alarm | Soft (±6) / hard (±12) bands vs 60/40 |
| Evidence freshness SLA | Stale fields → confidence haircut |
| Founder radar | Watched operators / stealth newcos — don’t wait for Wednesday |
| Digest selectivity preview | 3 vs 5 vs 8 caps (avg score preview — **not** measured outcome precision yet) |

**What to say:**  
> “Chatbots get smarter by accident. We get smarter when partners disagree in public and we change policy on purpose.”

---

## C4. Competitors / Peer intelligence — `/peers` · `/peers/[slug]`

**Module job:** Competitive awareness — not voyeurism.

| Capability | Partner use |
|------------|-------------|
| Firm radar / dossiers | How a peer wins, weak spots, when to call vs compete |
| Thesis-drift | Off-stated-focus bets (e.g. peer drifts into your lane) |
| Investor × company matrix | Who’s on which caps |
| Co-investor heatmap | Syndicate unlocks |
| Golden insights | Proprietary quiet windows, crowding alerts, white space vs flood |
| Circling competitors on company briefs | Race risk on Deep Dives |

**What to say:**  
> “Peer OS is alpha-adjacent: syndicate mapping, crowding risk, and white space — not gossip.”

**Chat demos:** “Who’s quietly investing in robotics?” · “What should I do Monday?” · firm name thesis shift.

---

## C5. Sector Scanner — `/sectors`

**Module job:** **Knows the sector of tomorrow** — foresight board that tracks capital / talent / founder attention and the five evidence channels (GP commentary, frontier hiring, founder migration, fund formation, research/OSS), then answers the partner question with ranked companies. Plus on-demand thesis scans, proactive momentum, contrarian edges, and the classic Sector of Tomorrow board.

| Mode | Partner job |
|------|-------------|
| **Sector of Tomorrow** | Canonical foresight: three pre-consensus AI infra sub-sectors + best companies + attention flows + evidence matrix |
| **On-demand thesis** | Describe a thesis in natural language → blueprint pillars, relevance constellation, coverage radar, match funnel, ranked emerging companies |
| **Momentum** | Sectors gaining heat (evidence + hiring + peer tape) with best deals inside each |
| **Contrarian** | Sector calls + quiet Deep Dives against consensus; crowd traps called out |
| **Sector board** | Heat-ranked Sector of Tomorrow cards with evidence |

**Partner use:** Theme discovery before consensus; feed into digest sector calls; Monday “what should we look at in X?” in under a minute.
**What to say:**
> “Knows the sector of tomorrow — not ‘AI is hot.’ It tracks capital, talent, and founder attention, then names the three AI infra sub-sectors nobody is talking about yet and the best companies inside them.”

---

# D. External narrative — `/lp`

## LP Process Desk

**Module job:** Story LPs diligence: how AI sits *inside* the investment process — not a science fair.

| Shows | Why LPs care |
|-------|--------------|
| Pipeline analytics + thesis adherence | Process discipline |
| IC governance samples | Paper trail |
| Selectivity / controls | Risk of model theater |
| Value-add narrative | How Signal changes partner time |
| One-pager export | LP meeting leave-behind |

**What to say:**  
> “LPs don’t buy chatbots. They buy a firm that can show decision process, Pass spine, and controls on hallucination.”

---

# D2. YC-pattern desks — More → Intel / Partner

Useful Bookface / Demo Day / Launch YC mechanics adapted for investors (not a founder social network).

| Surface | YC analog | Partner job |
|---------|-----------|-------------|
| `/directory` | Startup Directory | Facet cycle × theme × stage × hiring; Like; CSV |
| `/interest` | Demo Day like + Investor Day match | Stack-rank likes → mutual meeting schedule |
| `/launch` | Launch YC | Fresh newco / founder-radar / launch spikes |
| `/find` | Bookface typed search | Omnisearch + type filter + CSV |
| Chat / ⌘K **Searched** | Ask YC Agent tool trails | Show what corpora grounded the answer |
| Library → Playbooks | Startup Library / KB | Operating guides (Monday, IC, kind-no, …) |

**What to say:**  
> “We didn’t copy Bookface’s forum. We took the investor-useful parts — directory facets, like-and-rank, launch discovery, grounded ask — and wired them to thesis score.”

---

# E. Labs (only if asked) — More → Labs

These are powerful demos. They are **not** the Monday default. Say that out loud.

---

## E0. Signal Atlas — `/atlas` *(lead Lab if they ask “what about Harmonic / Affinity?”)*

| Sub-module | Competitor response | Use |
|------------|---------------------|-----|
| NL market map | Harmonic Scout · Affinity Market Map | Type thesis language → visual map + ranked shortlist + white space |
| Warm paths | Affinity Ascend Warm Intro | Ranked hops + draft ask (demo graph; never auto-send) |
| Portfolio pulse | Meridia / VCOS Pulse | Board-prep signals on the active book |
| Growth bands | Bessemer Atlas | Stage YoY floor / median / top posture |
| Talent graph | Harmonic talent flows | Operator prior → newco / stealth orbit |
| Raise windows | Timing / Alpha engines | open_now · 30–60d · oversubscribed counsel |
| Ownership desk | IC ownership math | Live check → % vs target (blanks stay blank) |

**What to say:**  
> “Affinity owns the inbox graph. Harmonic owns the people database. Atlas is how Thirdbase forms a market thesis in under a minute and walks into IC with timing, band posture, and ownership — without becoming another CRM.”

---

## E1. Partner Edge — `/edge`

| Sub-module | Use |
|------------|-----|
| Anti-consensus radar | Proprietary quiet tape vs consensus traps (peer FOMO > thesis) |
| Conviction clocks | FOMO vs patience-α → act / race / patience / cool-off |
| Partner twin | Judgment DNA from overrides → lean-in / push-back / hard-pass |
| Reference-call factory | Scripts from weak score dims + bear landmines (never auto-send) |
| Thesis what-if | Reweight dims → who enters/exits Deep Dive |
| Pass autopsy | Passes with peer/Tier-1 tension worth reopening |
| Velocity board | Accelerating names (signal × hiring × commentary) |
| Pre-mortem | “Assume we invested and lost” failure modes for IC |

**What to say:**  
> “Coverage tools amplify FOMO. Edge separates proprietary windows from peer-bait — and forces pre-mortems before IC romance.”

---

## E2. Venture agent (Core Intelligence) — `/os`

| Sub-module (brief heading) | Use |
|----------------------------|-----|
| Knows what a great deal looks like | Outstanding vs noisy · five pillars · cohort rank (`/deals`) |
| Knows the sector of tomorrow | 12–36m horizons · evidence mix · best companies (`/sectors`) |
| Surfaces news worth reading | Curated 3–5 with Thirdbase why (Library · Digest) |
| Captures investor and operator commentary | Qualitative posture · channels · red flags |
| Holds its own with a partner | Why-a-company-matters scripts → grounded `/chat` |
| Agent fleet | War rooms, alpha feed, conviction, autopilot (labs depth) |

**What to say:**  
> “This is the intelligent agent they asked for — same headings as the brief. Production habit is still Desk + Digest + Excel; `/os` is where you prove judgment, foresight, and partner conversation in one place.”

---

# F. Cross-cutting features (mention when relevant)

| Feature | Where | Partner use |
|---------|-------|-------------|
| Command palette ⌘K / Ctrl+K | Global | Ask without leaving page |
| Theme toggle | Header | Personal preference |
| Refresh pipeline | Header | Re-ingest + re-score + Excel |
| Workbook download | Desk · `/api/workbook` | Debate surface |
| Relative rank | Everywhere scored | Cohort debate, not fake precision |
| Provenance / confidence | Briefs · research | Estimated vs reported; scout vs IC |
| Human-in-the-loop | Stale · emails · overrides | Never auto-delete, never auto-send founder mail |
| Watchlists | `config/watchlists.yaml` | GP people + peer firms |

---

# G. Recommended 12-minute explanation flow

| Min | Module | One line |
|-----|--------|----------|
| 0–1 | Hook | Coverage vs Judgment |
| 1–2 | Desk `/` | Five Hot Deals + Monday CTA |
| 2–3 | Meeting `/meeting` | Auto 90m agenda |
| 3–4 | Excel download | Debate in sheets |
| 4–5 | One **Pass** | Selectivity is the product |
| 5–6 | Company + Diligence | Bear case before IC |
| 6–7 | Search scout honesty | Scout ≠ IC |
| 7–9 | Chat (2–3 prompts) | Grounded or refuse |
| 9–10 | Digest + Stale | Ritual + partner review |
| 10–11 | Optional: Judgment *or* Peers | X-factor *or* competitive edge |
| 11–12 | Close | Judgment first; connectors later |

**Close line:**  
> We built the judgment layer and Monday ritual first. PitchBook and Crunchbase plug in as connectors. If partners won’t open the digest without being chased — we failed.

---

# H. Honest boundaries (say these before they ask)

| Shipped as judgment / ritual | Phase 2 / purchase order |
|------------------------------|---------------------------|
| Thesis score, relative rank, Pass spine | PitchBook / Crunchbase / Harmonic / Dealroom |
| Excel + digest selectivity + alerts | Production SMTP/SendGrid to partner inboxes |
| Peer OS, Judgment, Diligence, Meeting | Coresignal hiring graphs, Affinity writeback |
| Scout research (Wiki/DDG/HN ± Claude) | Continuous cloud workers, SharePoint live workbook |
| Public EDGAR / HN / RSS / arXiv | Authenticated X / Blind / LinkedIn without vendors |

**Interview / partner line:**  
> Databases are connectors. Attention allocation is the product.

---

# I. Quick reference — every surface

| Route | Module | Primary user job |
|-------|--------|------------------|
| `/` | Desk | What deserves my hour today |
| `/meeting` | Partner Meeting OS | Run Monday with a spine |
| `/pipeline` | Pipeline table | Filter/sort the full book |
| `/deals` | Great deals | Knows what a great deal looks like — noise vs outstanding · pillar articulate · cohort rank |
| `/search` | Research agent | Brief any company (scout vs IC) |
| `/chat` | Partner chat | Ask grounded questions |
| `/company/[id]` | Company + Diligence + IC packet | Prep call / IC |
| `/digest` | Digest preview | M/W/F selectivity ritual |
| `/library` | Library + Playbooks + Stale | Reads, watch, partner cleanup |
| `/directory` | Directory | YC-style faceted browse + Like |
| `/interest` | Interest Desk | Demo Day like → match schedule |
| `/source` | Deal Sourcing & Discovery | One tool — funding / hiring / launch / founder / customer; early-first; multi-source consolidate; Claude agent prompts |
| `/launch` | Launch Feed | Newco / founder-radar discovery |
| `/find` | Find | Omnisearch + CSV |
| `/gp` | GP Desk | Operating cockpit |
| `/ic` | IC Decision Trail | Governance paper trail |
| `/judgment` | Judgment OS | Learn from overrides & misses |
| `/peers` | Competitor intel | Crowding, syndicate, drift |
| `/peers/[slug]` | Firm dossier | Battle card for one peer |
| `/sectors` | Sector Scanner | Thesis scan · momentum · contrarian |
| `/lp` | LP Process Desk | LP diligence narrative |
| `/atlas` | Atlas (Labs) | Market maps, warm paths, bands, pulse |
| `/edge` | Partner Edge (Labs) | Anti-consensus & conviction tools |
| `/os` | Venture agent | Core intelligence · great deals · sectors · news · commentary · partner chat |
| Excel | Workbook | Shared object of argument |

---

# J. Cheat sheet — questions partners ask → where to go

| They say… | Open… |
|-----------|--------|
| “What should I look at Monday?” | Desk → Meeting |
| “Show me the intelligent agent / core intelligence.” | `/os` Venture agent |
| “Knows what a great deal looks like?” | `/deals` or `/os` → Great deal |
| “Show me the latest batch / who’s hiring.” | `/directory` |
| “Build Demo Day–style meeting slots.” | `/interest` |
| “What’s newly launching?” | `/launch` |
| “Search commentary + playbooks.” | `/find` |
| “Map AI infra for me.” | `/atlas` → Market map · Chat “map AI infra” |
| “Who can intro us?” | `/atlas` → Warm paths |
| “Where are they vs growth bands?” | `/atlas` → Growth bands |
| “When do they raise?” | `/atlas` → Raise windows |
| “Why is this a Deep Dive?” | Company brief + score bars |
| “Argue the other side.” | Diligence Stress Pack |
| “Are we off 60/40?” | Desk mix · Chat · Judgment mix drift |
| “What are peers doing?” | `/peers` · firm dossier |
| “What’s emerging before consensus?” | `/sectors` · Chat AI infra prompt |
| “Show me process for LPs.” | `/lp` · `/ic` |
| “We disagree with the model.” | Override on company · `/judgment` |
| “Is this name even real / funded?” | `/search` (watch for scout banner) |
| “Where do we debate?” | Excel download |

---

**Print / share:** This file · [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for timed beats · Excel on second screen if possible.

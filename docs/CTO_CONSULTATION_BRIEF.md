# Signal — CTO & AI Architecture Brief for Thirdbase

**Audience:** Partners, Principals, Operating Partners, and non-technical decision makers  
**Author posture:** Head of AI Technology / future CTO & AI Architect  
**Product:** Signal — Thirdbase Deal Intelligence OS  
**Purpose of this document:** Give you everything you need to decide budget, database, tech stack, AI models, build vs buy, and whether Signal should stay internal or become a product you sell — without needing to become engineers yourselves.

---

## How to use this document

Read it once end-to-end before the meeting. In the room, you do **not** read the whole thing. You walk the **Decision Agenda** (Section 1), then open only the sections they dig into.

| If they ask… | Go to… |
|---|---|
| “What is this in plain English?” | Section 2 |
| “Why not just use PitchBook / Affinity / ChatGPT?” | Section 3 |
| “What should we build / buy?” | Sections 4–5 |
| “Which database?” | Section 6 |
| “Which tech stack?” | Section 7 |
| “Which AI model?” | Section 8 |
| “What does this cost?” | Section 9 |
| “Should we sell this to other funds?” | Section 10 |
| “What can go wrong?” | Section 11 |
| “What do you need from us to decide?” | Section 12 |
| “Give me the 90-second pitch” | Appendix A |

---

## 1. Decision Agenda (what you need them to decide)

These are the only decisions that matter in the first meeting. Everything else is detail.

### Decision 1 — Mission
**Approve Signal as Thirdbase’s internal deal judgment layer** (not a generic research chatbot).

**Recommendation:** Yes. Signal’s job is *judgment + workflow*, not raw coverage.

### Decision 2 — Operating mode (first 12 months)
Pick one:

| Option | Meaning | When to choose |
|---|---|---|
| **A. Internal OS only** | Built for Thirdbase, thesis-locked, Excel + email + chat | Default. Fastest value. Lowest legal risk. |
| **B. Internal first, product later** | Same as A, with clean architecture so a spin-out is possible in 12–24 months | If partners want upside optionality without distraction |
| **C. Build to sell now** | Multi-tenant SaaS from day one | **Not recommended yet.** Slows internal value, creates compliance burden, dilutes thesis edge |

**Recommendation:** **Option B** — ship for Thirdbase first; keep the door open.

### Decision 3 — Data posture
Pick one for Year 1:

| Option | Annual data spend (order of magnitude) | Coverage quality |
|---|---|---|
| **Lean** | $15k–$40k | Strong free/public + light paid (Crunchbase / Harmonic lite) |
| **Institutional** | $60k–$150k | PitchBook (or equivalent) + hiring signals + news |
| **Full stack** | $150k–$300k+ | PitchBook + Harmonic/Coresignal + premium news + CRM writeback |

**Recommendation:** Start **Lean → Institutional** in 90 days once partners feel the workflow is sticky. Do not buy every database before the judgment layer is trusted.

### Decision 4 — Budget envelope (Year 1 all-in)
See Section 9. Headline recommendation:

> **Approve $180k–$320k Year 1** for a serious production internal OS (people + infra + models + core data).  
> **Approve $80k–$140k** if they want a disciplined MVP year with one builder and lean data.  
> **Do not** approve a $1M “AI platform” fantasy before partners use the digest weekly.

### Decision 5 — Ownership
Name:

1. **Product owner** (partner-level sponsor)  
2. **Day-to-day operator** (associate / principal who owns Stale review + thesis edits)  
3. **Technical owner** (you / future AI architect)

Without these three names, Signal becomes shelfware.

---

## 2. What Signal is (plain English)

### The one-sentence version
**Signal is an always-on associate that finds companies, scores them the way Thirdbase invests, keeps a living Excel pipeline, emails only the best deals three times a week, and answers partner questions with evidence — not vibes.**

### What it is *not*
- Not another Crunchbase login  
- Not a chatbot that “knows venture” from the internet and invents numbers  
- Not a dashboard partners will open once and forget  
- Not a replacement for partner judgment or IC debate  

### What partners actually get every week

1. **A living workbook** (`Thirdbase_Deal_Pipeline.xlsx`) — Pipeline, Hot Deals, Watchlist, Sector of Tomorrow, Peer Activity, Co-investor Heatmap, News Worth Reading, Investor Commentary, Stale  
2. **M/W/F digests** — hard-capped: 3–5 deals, 1–2 sector calls, 3–5 reads, notable peer moves  
3. **Instant alerts** — 2+ Tier-1 co-invests, off-thesis peer bets, watched founders  
4. **Company research agent** — type any company → Pass / Watch / Deep Dive brief  
5. **Peer intelligence** — what a16z / Sequoia / Lux / etc. appear to be buying; thesis drift; syndicate map  
6. **Conversational Q&A** — “best defense deals right now?” answered from *our* store, with provenance  

### The philosophical bet (say this out loud)

> Coverage tools optimize for *volume*. Thirdbase needs *judgment*.  
> Databases are commodities. **Thesis-encoded ranking + partner workflow is the moat.**  
> We built the judgment layer first. Databases plug in as connectors.

That line is the spine of every technical recommendation below.

---

## 3. Why existing tools are not enough

Partners will ask: “We already have PitchBook / Affinity / ChatGPT. Why build?”

| Tool | What it does well | What it does *not* do for Thirdbase |
|---|---|---|
| **PitchBook / Crunchbase** | Structured rounds, comps, coverage | Does not score against *your* 60/40 thesis, does not curate a selective digest, does not rank relatively inside your themes |
| **Affinity / Attio** | Relationship CRM, intros, notes | Does not continuously source the market or explain *why now* |
| **ChatGPT / Claude alone** | Fast prose, brainstorming | Hallucinates funding rounds; has no living pipeline; forgets firm policy; cannot maintain Excel + email ops |
| **Newsletters / Twitter lists** | Serendipity | No memory, no scoring, no stale hygiene, no peer matrix |
| **Associates manually** | Real judgment | Does not scale 24/7; burns weekends; inconsistent coverage |

**Signal’s position:** sit *above* databases and *beside* CRM.

```
Internet + deal DBs + filings + commentary
              ↓
     Signal judgment layer
   (thesis policy + scoring + dedupe + memory)
              ↓
   Excel · Email · Chat · IC briefs · Peer OS
              ↓
     Partners decide  →  Affinity / IC memo
```

PitchBook without Signal = raw ore.  
Signal without PitchBook = sharp judgment on thinner data.  
**Together** = institutional advantage.

---

## 4. What we have already proven (MVP truth)

Be honest in the room. Credibility > hype.

### Working today
- Thesis encoded as **config** (`thesis_policy.yaml`) — not buried in code  
- Scoring across thesis fit, team, cap table, traction, moat, valuation, runway, TAM/exit, timing  
- Recommendations: **Deep Dive / Watch / Pass** with relative rank in theme × stage  
- Self-maintaining pipeline loop: ingest → dedupe → score → Excel regen → digest preview  
- Partner UI (Next.js) + Python intelligence pipeline + Supabase Postgres  
- Company research agent, peer dossiers, co-investor heatmap, chat grounded in pipeline  
- Human-in-the-loop on destructive actions (stale = flag for review, never silent delete)  

### Intentionally *not* finished (and that is correct for MVP)
- Full PitchBook / Harmonic / Coresignal production connectors  
- SharePoint live workbook sync  
- Affinity writeback  
- Always-on cloud workers (today: batch refresh)  
- Authenticated scraping of Blind / LinkedIn / X (we refuse shady scraping; use vendors)  

**Interview / board line:**  
> We refused to fake completeness. We proved the judgment OS. Data vendors are purchase orders, not science projects.

---

## 5. Build vs buy — the consultant answer

### Buy (do not rebuild)
- Deal databases (PitchBook, Crunchbase, Harmonic, Dealroom)  
- People / hiring graphs (Coresignal or equivalent)  
- Email delivery (SendGrid / Amazon SES / Google Workspace)  
- Auth / SSO (Clerk, Auth0, or Microsoft Entra)  
- Cloud hosting (Vercel + Supabase / AWS)  
- LLM APIs (Anthropic / OpenAI) — do **not** train your own foundation model  

### Build (this is the proprietary layer)
- Thesis policy engine and scoring  
- Relative ranking and portfolio mix guardrails (60/40)  
- Deduplication and company identity resolution  
- Digest selectivity and alert routing  
- Peer-set intelligence & co-investor graph logic  
- Partner UX that matches how Thirdbase debates deals  
- Provenance, confidence, and “why now” explanations  
- Excel as a first-class product surface  

### Never build
- A general-purpose LLM from scratch  
- A full CRM to replace Affinity  
- Illegal scraping of paywalled / authenticated social platforms  

**Rule of thumb you can say:**  
> If Bloomberg already sells it, buy it. If it encodes how *we* invest, build it.

---

## 6. Database recommendation (what to store where)

Non-technical translation: “database” here means **where Signal remembers the world**.

### Recommendation (clear)

| Layer | Choice | Why |
|---|---|---|
| **Primary system of record** | **Supabase (Postgres)** | Relational, audit-friendly, excellent for companies / rounds / investors / scores / provenance; easy auth later; partners can export; industry-standard SQL |
| **Partner debate surface** | **Excel workbook** (generated from Postgres) | Partners already live in sheets; Excel is a feature, not a bug |
| **Files / PDFs / digests** | Object storage (Supabase Storage or S3) | Briefs, email archives, IC PDFs |
| **Optional search index (Year 2)** | Postgres full-text → later OpenSearch / Typesense if needed | Don’t buy Elasticsearch on day one |
| **Optional vectors (selective)** | pgvector on Supabase **only** for commentary / essay retrieval | Not for “replace scoring with vibes” |
| **CRM** | Affinity / Attio (external) | Relationships stay in CRM; Signal writes *recommendations*, not ownership of intros |

### Why not the alternatives (say briefly if asked)

| Alternative | Verdict |
|---|---|
| **Only Excel / Google Sheets** | Collapses at multi-source ingest, history, audit, chat grounding |
| **Only Notion** | Soft wiki, weak relational integrity, bad for scoring history |
| **MongoDB as primary** | Fine for dumps; worse for investor graphs, mix constraints, audit joins |
| **Snowflake / BigQuery first** | Overkill for a fund OS; analytics warehouse later if LP reporting needs it |
| **Airtable as core** | Good prototype; not an institutional system of record |
| **Local SQLite forever** | Fine for demo laptop; wrong for multi-partner production |

### Data model partners should understand (no jargon)

We store five kinds of truth:

1. **Companies** — identity, stage, sector, scores, recommendation  
2. **Signals** — every funding event, hire spike, filing, article (with source link + timestamp)  
3. **Investors & relationships** — who is on the cap table; who co-invests with whom  
4. **Judgments** — thesis scores, why_now text, confidence, who/what produced them  
5. **Partner actions** — watched, deep-dived, passed, stale reviewed (human decisions)

**Critical principle:** every important field carries **confidence + provenance** (“reported,” “estimated,” “partner-entered”). We never invent private valuations as fact.

---

## 7. Recommended tech stack (and why)

Presented as a menu with a clear default.

### Default stack (recommended) — what Signal already uses / extends

| Layer | Technology | Plain-English reason |
|---|---|---|
| Partner app | **Next.js (React)** | Fast, modern web UI partners can use on laptop; easy to host |
| Intelligence / scoring / Excel | **Python** | Best ecosystem for data, scoring, Excel generation, research scripts |
| Database | **Supabase Postgres** | Managed, secure-enough for a fund start, SQL everyone can hire for |
| AI models | **Anthropic Claude** (primary) + optional OpenAI fallback | Best writing + reasoning for partner-grade prose today; see Section 8 |
| Config / thesis | **YAML policy files** | Partners can change thesis without rewriting the product |
| Email | SendGrid or SES | Boring, reliable |
| Hosting | Vercel (UI) + small cloud worker (Python jobs) | Low ops burden |
| Secrets | Environment vault / cloud secret manager | API keys never in Excel or Slack |

### Why this stack for a VC firm specifically
- **Two languages is intentional:** Python for judgment math & ingest; TypeScript/React for partner experience  
- **Thesis as config** means the firm can evolve 60/40, themes, Tier-1 lists without a 3-month rewrite  
- **Excel generation from a real database** keeps the cultural workflow while gaining institutional memory  
- **Avoids lock-in to a no-code AI builder** that cannot express relative ranking, mix constraints, or audit trails  

### Stacks I would *not* recommend as the core
- Pure Zapier / Make “AI agent” glue — fragile, untestable, no real scoring history  
- Fine-tuned tiny model as the scorer — opaque, drifts, hard to explain in IC  
- Heavy Java enterprise stack — slow iteration for a 5–15 person fund  
- Fully custom GPU training cluster — irrelevant to deal sourcing  

### Architecture picture (speak this)

```
Sources (RSS, EDGAR, HN, paid APIs, watchlists)
        → Ingest adapters (Python)
        → Dedupe / company resolution
        → Thesis scoring engine (weights in YAML)
        → Postgres (truth)
        → Excel regen + Digest + Alerts + Chat/Research UI
        → Partner decisions → (later) Affinity writeback
```

---

## 8. Which AI model(s) — recommendation

### Short answer
**Primary: Anthropic Claude Sonnet-class for day-to-day partner synthesis.**  
**Escalation: Claude Opus-class (or equivalent top-tier) for hard IC briefs and ambiguous thesis calls.**  
**Do not** make GPT / Gemini / Claude a religious war — design for **model swappability**.

Signal already follows this pattern (`SIGNAL_MODEL`, Anthropic API).

### How models should be used (critical for non-engineers)

| Job | Model role | Rule |
|---|---|---|
| Extract facts from a source | Cheaper / faster model OK | Must cite source URL / filing |
| Score against thesis | **Mostly deterministic code + policy**, LLM assists explanations | Partners must be able to audit a score |
| Write digest paragraphs / briefs | Claude Sonnet | Grounded only on retrieved evidence |
| Hard judgment / long brief | Opus-class when needed | Still grounded; still show confidence |
| Chat with partners | Sonnet + retrieval from Postgres | If evidence missing → say “unknown,” don’t invent |

### Why Claude as default for Thirdbase
- Excellent long-context synthesis for commentary + briefs  
- Strong at careful, hedge-aware writing (important for IC)  
- Already wired in the MVP  
- Easy to swap if pricing / quality shifts  

### Why not “one model does everything”
- Expensive models for every RSS parse = burned money  
- Letting the LLM *be* the score = unexplained black box in IC  
- Training your own model on 500 deals = false comfort; sample too small  

### Model budget intuition (order of magnitude)
For an active fund OS (digests + research + chat + refreshes):

| Usage intensity | Monthly LLM spend |
|---|---|
| Light (MVP, few partners) | $150–$600 |
| Production internal | $800–$3,000 |
| Heavy multi-partner + constant research | $3,000–$8,000 |

If LLM spend exceeds ~$10k/month for a single fund’s sourcing OS, you are probably over-calling Opus or re-processing the whole corpus too often — fix architecture, don’t just buy more tokens.

### Policy you should enforce
1. **No silent invention of round sizes / valuations**  
2. Every AI paragraph must be tied to stored evidence IDs or links  
3. Offline / retrieval fallback when API is down (demo already supports this idea)  
4. Log prompts/outputs for audit (access-controlled)  
5. Partners can override any recommendation; overrides become training *signal for policy*, not blind fine-tuning fuel  

---

## 9. Budget — what to ask for (and how to defend it)

All figures are **planning ranges for a US/EU-facing VC fund**, not vendor quotes. Treat as board envelopes; actual contracts will be negotiated.

### 9.1 Three budget packages

#### Package L — Lean MVP year (~$80k–$140k)
**Goal:** Partners use digest + Excel weekly; prove judgment quality.

| Line item | Annual |
|---|---|
| Technical owner (fractional / junior + your oversight) | $40k–$80k |
| Cloud + Supabase + email | $1.5k–$4k |
| LLM APIs | $2k–$6k |
| Light data (Crunchbase Pro / similar) | $1k–$8k |
| Misc tools, domains, contingency | $3k–$8k |
| **Total** | **~$80k–$140k** |

**Includes:** current Signal path, polish, reliability, light connectors.  
**Excludes:** PitchBook-class coverage, Affinity writeback, multi-fund productization.

#### Package I — Institutional internal OS (recommended) (~$180k–$320k)
**Goal:** Signal becomes default Monday operating system for the partnership.

| Line item | Annual |
|---|---|
| AI engineer / architect (0.5–1.0 FTE) | $90k–$180k (comp varies wildly by market; use local reality) |
| PitchBook or equivalent (team seats; API may be extra) | $25k–$80k |
| Harmonic / Dealroom / Coresignal (pick 1–2) | $15k–$60k |
| Premium news / research where needed | $5k–$20k |
| Cloud, security, SSO, email | $4k–$12k |
| LLM APIs | $8k–$30k |
| Contingency / legal review of data licenses | $10k–$20k |
| **Total** | **~$180k–$320k** |

#### Package P — Productize / sell to other funds (~$500k–$1.2M Year 1)
**Goal:** Multi-tenant SaaS. Only if Decision 2 = C (not recommended immediately).

Adds: security certifications path, multi-tenant isolation, sales, support, legal (ToS, DPAs), separate roadmap from Thirdbase thesis, customer success.  
**This is a company, not a feature.** See Section 10.

### 9.2 Where the money actually goes (teach them this)
For most funds, the surprise is not GPUs — it is:

1. **People** (largest)  
2. **Data licenses** (second)  
3. **Models** (third, if architecture is sane)  
4. **Cloud** (usually small)

If someone proposes a $400k “AI infrastructure” line with no data plan and no owner, push back.

### 9.3 ROI framing (partner language)
You do not sell Signal as “AI.” You sell:

- **Hours returned:** 10–20 associate hours/week of noisy sourcing → selective digest  
- **Miss reduction:** fewer “we saw that late” moments on Tier-1 rounds in thesis themes  
- **IC quality:** every Deep Dive arrives with comps, commentary, peer context  
- **Consistency:** thesis applied the same way on Monday and on Friday  

Even **one** incremental good deal insight, or avoiding one wasted deep dive, pays for Package I.

### 9.4 Phased spend (smart capital allocation)

| Phase | Time | Spend focus | Exit criteria |
|---|---|---|---|
| **0. Prove** | Now–30 days | People time + lean infra | Partners open digest without being chased |
| **1. Trust** | 30–90 days | Scoring quality, peer OS, research agent | Partners argue with scores (good sign) and accept Passes |
| **2. Enrich** | 90–180 days | Buy PitchBook/Harmonic-class data | Coverage gaps close; fewer “unknowns” |
| **3. Integrate** | 180–365 days | Affinity + SharePoint + SSO | Signal is in the deal process, not beside it |
| **4. Optional spin** | Year 2+ | Productization only if pull exists | External funds ask to buy *before* you sell |

---

## 10. Should we sell this to other VC firms?

### Short recommendation
**Not in the next 6–12 months as a primary goal.**  
**Yes as a Year 2+ option** if (and only if) Signal becomes non-negotiable inside Thirdbase and other funds pull for it.

### Why “sell now” is usually a trap for a fund-built tool

| Selling now | Reality |
|---|---|
| Feels like extra upside | Becomes a SaaS company competing with Affinity, Harmonic, Hebbia, etc. |
| “Our thesis is the product” | Other funds need *their* thesis — you must generalize and lose edge, or fork forever |
| Data licenses | PitchBook / news contracts often **forbid** resale / multi-tenant redistribution |
| Compliance | Customer data isolation, SOC2, DPAs, incident response — real cost |
| Attention | Partners want deals, not churn dashboards |

### When selling *does* make sense
All of the following should be true:

1. Thirdbase partners say they would be angry if Signal disappeared  
2. 3+ peer funds ask unsolicited to license it  
3. Legal confirms data vendor redistribution rights (or you sell only the judgment software, customers bring their own data licenses)  
4. You are willing to staff support + roadmap separate from Thirdbase’s proprietary edge  
5. You productize **configuration** (thesis YAML, peer sets, digest rules) — not a single frozen Thirdbase brain  

### Three commercialization shapes (if ever)

| Shape | What you sell | Pros | Cons |
|---|---|---|---|
| **1. Internal forever** | Nothing external | Max edge, simplest | No software upside |
| **2. Soft license** | Hosted OS for friendly funds; they bring data licenses | Revenue without full SaaS theater | Still support burden |
| **3. True SaaS** | Multi-tenant product | Venture-scale software outcome | You are now a startup; fund focus dilutes |

**Architect recommendation:** choose **Shape 1 now**, design code for **Shape 2 later** (multi-tenant-ready boundaries, thesis as config, no hard-coded secrets). Do not staff Shape 3 until pull is undeniable.

### Strategic framing for the partnership
> Our edge is *how Thirdbase invests*. If we sell the exact same brain to 50 funds, we sold the edge.  
> If we sell the *machine that encodes a firm’s brain*, we might have a business — later.

---

## 11. Risks, ethics, and “what keeps the CTO up at night”

### Risk register (plain language)

| Risk | Severity | Mitigation |
|---|---|---|
| Hallucinated facts in digests | High | Retrieval grounding; confidence labels; human skim before send in early months |
| Partners ignore the tool | High | Excel + email first; ruthless selectivity; partner sponsor |
| Data license violations | High | Buy proper APIs; no grey scraping; legal review before productization |
| Over-automation of Pass/Remove | Medium | Never auto-delete; Stale = review queue |
| Thesis drift in code | Medium | Thesis in YAML; change log; partner approval on weight changes |
| Key-person risk | Medium | Documented runbooks; you as architect + one operator |
| Security / leak of pipeline | High | SSO, least privilege, no Slack-pasting of full DB, audit logs |
| Vendor lock-in to one LLM | Low–Med | Model router; store evidence independently of model |
| Buying too much data too early | Med | Phase 2 enrichment only after workflow adoption |

### Non-negotiable ethics
- Do not scrape authenticated Blind / LinkedIn / X in violation of terms  
- Do not present estimated valuations as audited truth  
- Do not email LPs or founders from Signal without human approval workflows  
- Do not train public models on confidential deal notes without a deliberate policy  

---

## 12. Operating model — how the firm should run Signal

### Roles

| Role | Who | Responsibility |
|---|---|---|
| **Sponsor** | Partner | Protects the project; unblocks budget; uses the digest publicly |
| **Operator** | Principal / Associate | Owns Stale review, thesis edits, watchlist hygiene, “was this useful?” loop |
| **Architect** | You | Stack, models, connectors, quality bar, roadmap |
| **Users** | All investing team | Read digest; challenge scores; ask chat; deep dive |

### Cadence
- **Daily:** alerts only when special routing fires  
- **M/W/F:** digest is the product  
- **Weekly:** 15-min “Signal standup” — false positives, missed deals, thesis tweaks  
- **Monthly:** scorecard — precision of Hot Deals, partner satisfaction, time saved  
- **Quarterly:** vendor & model review  

### Success metrics (keep few)

1. % of Deep Dives that partners agree were worth time  
2. Number of “we would have missed this” saves per quarter  
3. Digest open → click → workbook engagement  
4. Time from first signal → partner awareness  
5. False-positive rate on Hot Deals (should fall over time)  

Vanity metric to ignore: “number of companies in the database.”

---

## 13. 12-month roadmap (decision-ready)

### Now → 30 days
- Harden refresh reliability  
- Partner onboarding: thesis confirmation workshop (60/40, stage sweet spot, hard Pass rules)  
- Digest goes to real inboxes  
- Capture override reasons when partners disagree with scores  

### 30 → 90 days
- First serious paid connector (usually Crunchbase/Harmonic **or** PitchBook — pick based on what firm already pays for)  
- Peer OS becomes weekly habit  
- Company research agent used in live deal process  
- SSO if multi-user friction appears  

### 90 → 180 days
- Affinity/Attio writeback for Deep Dive / Watch  
- SharePoint/OneDrive hosted live workbook  
- Continuous workers (not only manual refresh)  
- Formal IC one-pager PDF export  

### 180 → 365 days
- Coresignal-class hiring velocity  
- Podcast / long-form commentary expansion (licensed)  
- Audit log + permissions mature  
- Revisit commercialization only if pull exists  

### Explicit non-goals (say proudly)
- Replacing partner taste  
- Boiling the ocean of every startup on earth  
- Building a foundation model  
- Scraping our way into legal risk  

---

## 14. Competitive landscape (so you sound informed)

| Category | Examples | Relation to Signal |
|---|---|---|
| Deal databases | PitchBook, Crunchbase, Dealroom | **Inputs** |
| People / company graphs | Harmonic, Coresignal | **Inputs** |
| VC CRMs | Affinity, Attio | **Downstream workflow** |
| AI research copilots | ChatGPT Enterprise, Claude, Hebbia-like tools | **Horizontal** — great prose, weak firm-specific pipeline memory |
| Internal knowledge tools | Notion AI, Glean | Good for docs; not thesis-coded sourcing |

**Positioning line:**  
> Signal is the firm-specific judgment OS. Vendors supply atoms. We supply the molecule.

---

## 15. What I need from the partnership (your ask)

Come to the meeting with this list. Get answers on paper.

1. Confirm **60/40** still correct; define stage sweet spot for the 60% bucket  
2. Confirm **true peer set** vs aspirational watchlist  
3. List **hard Pass rules** (e.g., no consumer social, no pure crypto casino, geo constraints)  
4. Who owns **Stale review** every month?  
5. Affinity today: **write back** or Excel-first for 6 months?  
6. Budget package: **L / I / P**?  
7. Commercialization: **internal only** vs **optional later**?  
8. Approve **data buying policy**: no grey scraping; vendors only  
9. Name the **sponsor partner**  

---

## Appendix A — 90-second spoken pitch

> Partners don’t need another database login. They need an associate that never sleeps — and never wastes Monday morning.  
>  
> Signal continuously ingests market noise, deduplicates companies, and scores them against *our* thesis: dominant tech and growth at 60%, tactical opportunities at 40%, Tier-1 quality, growth, moat, valuation, runway. It maintains a living Excel pipeline, emails only the highest-priority items Monday, Wednesday, and Friday, alerts instantly on special situations, and answers partner questions with grounded evidence.  
>  
> We are not trying to out-PitchBook PitchBook. Databases are connectors. The proprietary layer is judgment, selectivity, and workflow.  
>  
> My recommendation as your AI architect: approve Signal as an internal OS, fund an institutional Year-1 envelope in the low-to-mid hundreds of thousands including data, keep Claude-class models behind a retrieval architecture, keep Postgres as system of record with Excel as the debate surface, and defer selling to other funds until we would be angry to lose this ourselves.  
>  
> Signal is the associate that never sleeps — and never wastes a partner’s Monday.

---

## Appendix B — Objection handling cheat sheet

**“Just use ChatGPT.”**  
> ChatGPT doesn’t maintain our pipeline, enforce 60/40, or remember yesterday’s Pass with provenance.

**“Just buy PitchBook.”**  
> Buy it — as fuel. Without a judgment layer, it’s a library, not an associate.

**“Can the AI pick winners?”**  
> No. It ranks and explains. Partners pick winners. That’s a feature.

**“Why Excel?”**  
> Because that’s where partners already argue. Software that fights culture loses.

**“Why not build our own model?”**  
> Our dataset is tiny compared to foundation labs. We win on *policy + process + proprietary workflow*, not on training GPUs.

**“This will be outdated in 6 months.”**  
> Models will change; that’s why we swap models behind interfaces. Thesis config and Postgres memory endure.

**“Should we sell it?”**  
> Not before it’s air for us. Optionality yes; distraction no.

**“What’s the smallest test?”**  
> 30 days of real M/W/F digests to the partnership. If they don’t forward them, we failed — cheaply.

---

## Appendix C — Recommended decisions (one-page summary)

| Topic | CTO recommendation |
|---|---|
| Mission | Internal deal judgment OS for Thirdbase |
| Year-1 mode | Internal first, architecture ready for soft-license later |
| System of record | Supabase Postgres |
| Partner surface | Excel + email digest + web OS + chat |
| Tech stack | Next.js + Python + Postgres + Claude |
| AI models | Claude Sonnet default; Opus for hard briefs; deterministic scoring core |
| Data buying | Lean now → institutional within 90 days of adoption |
| Year-1 budget | **$180k–$320k** institutional (or $80k–$140k lean) |
| Sell to others? | **Not yet.** Revisit Year 2 on pull |
| Do not do | Train foundation models; grey scraping; multi-tenant SaaS before internal love |
| First success test | Partners use M/W/F digest without being chased |

---

## Appendix D — Glossary for non-technical partners

| Term | Meaning |
|---|---|
| **Ingest** | Automatically bringing in new articles, filings, and deal events |
| **Dedupe** | Recognizing that “AcmeAI” and “Acme AI Inc.” are the same company |
| **Thesis policy** | Written rules for what Thirdbase wants to own |
| **Scoring** | Turning those rules into a number + recommendation |
| **Provenance** | Where a fact came from |
| **Grounding** | Forcing the AI to answer from stored evidence, not memory |
| **Connector** | A paid bridge to PitchBook/etc. |
| **Writeback** | Pushing a Signal recommendation into Affinity |
| **Multi-tenant** | One software serving many unrelated funds (SaaS) |
| **SSO** | Login with the firm’s Microsoft/Google accounts |

---

## Appendix E — Meeting leave-behind (copy onto a slide)

**Signal = judgment OS, not coverage tool**  
**Buy data. Build taste. Swap models. Keep Excel.**  
**Budget for people + data first.**  
**Internal air → maybe product. Not the reverse.**  
**Human decides removal. AI proposes priority.**

---

*Document version: 1.0 — aligned to the Signal MVP in this repository (Next.js partner OS, Python scoring/ingest, Supabase Postgres, Claude synthesis, thesis_policy.yaml).*  
*Update this brief when Package L/I spend is approved or when the first paid connector is chosen.*

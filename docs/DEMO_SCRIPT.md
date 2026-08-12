# Signal — Interview Demo Script (10–12 minutes)

Practice out loud. Keep Hot Deals and digest **short**. Show one deliberate **Pass**. One Monday path: **Desk → Meeting → Excel**.

## 0. Setup (before they sit down)

- [ ] `python scripts/refresh.py` already run; Excel exists in `data/output/`
- [ ] Next.js up: `cd web && npm run dev` → http://localhost:3000
- [ ] Offline fallback ready if Wi‑Fi dies (seed DB still answers chat)
- [ ] Optional: Excel open on second screen / or use **Download Excel** on Desk

---

## 1. Hook (60s)

> Partners don’t need another Crunchbase. They need an associate that never sleeps — and never wastes Monday morning.
>
> Signal turns noisy funding announcements into a self-maintaining pipeline scored the way Thirdbase invests: thesis fit, Tier-1 quality, growth, moat, valuation — ranked **relative** to peers in the same sector and stage.

Show PRODUCT one-liner slide if using a deck; otherwise go straight to **Desk** (`/`).

---

## 2. Monday path (90s)

1. **Desk (`/`)** — Hot Deals (5), high alerts, 60/40 mix. Click **Open Monday agenda**.
2. **Meeting (`/meeting`)** — ~90m partner agenda auto-built from Hot Deals, IC, alerts, stale.
3. **Download Excel** — `Thirdbase_Deal_Pipeline.xlsx` is the debate surface:
   - Pipeline · Hot Deals · Peer dossiers · Stale · Judgment OS
4. Show one **Pass** (e.g. TokenTide / PipelineCloud) — “Selectivity is the product.”

Line: *“Excel is intentional. Partners debate in sheets. The OS allocates attention.”*

Skip `/atlas`, `/edge` and `/os` unless asked — they live under **More → Labs**.

**If they ask “what about Harmonic / Affinity / Bessemer?”** (90s): open `/atlas` → Market map (“Map AI infra…”) → Warm paths → Growth bands. Line: *“They own databases and inbox graphs. Atlas is how Thirdbase forms a thesis and walks into IC — without becoming another CRM.”*

---

## 3. Refresh loop (60s)

In the header, click **Refresh**.

Narrate: ingest (EDGAR / HN / RSS) → dedupe → re-score → Excel rewrite.  
Call out any new signal or score movement. Download workbook again if needed.

---

## 4. Live chat (3 min) — ask these in order

1. *“Monday partner agenda”*  
2. *“What are three AI infrastructure sub-sectors nobody is talking about yet?”*  
3. *“Summarize what people are saying about [pick a Deep Dive company].”*  
4. *“Are we overweight tactical vs 60/40?”*  
5. Optional: *“Bear case for [Deep Dive company].”*

If Claude API key missing: grounded retrieval still answers from the store — say so transparently.  
Ungrounded questions should **refuse with starters**, not dump random Deep Dives.

---

## 4b. Search honesty (45s)

`/search` → type a **pipeline** name (AgentGate) → full IC brief.  
Then type an **external** name → show the **Scout brief — not IC-ready** banner. Recommendation capped at Watch. Score marked `est.`

> “Coverage tools fake IC readiness. We separate scout from conviction.”

---

## 4c. Diligence Stress Pack (60s)

Open a **Deep Dive** company page. Scroll to **Diligence Stress Pack**:

1. **Bull vs Bear** — counterfactual kill arguments  
2. **Diligence plan** — work orders + founder-only email (never auto-send)  
3. **Copy IC packet**

---

## 5. Digest + Stale (60s)

- `/digest` — M/W/F preview (3–5 deals). Say: production sends email when SMTP is set.  
- `/library?tab=stale` — **Keep / Archive / Request refresh**. Never auto-delete.

---

## 6. Close (60s)

> We built the judgment layer and Monday ritual first. Databases plug in as connectors.  
> If partners won’t open the digest without being chased — we failed.

Optional stretch (only if time): Judgment OS, Competitors, LP Desk — not the core path.

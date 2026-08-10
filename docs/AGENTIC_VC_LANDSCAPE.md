# Agentic VC Competitive Landscape

Research note for Signal (Thirdbase). Catalog of AI-native funds and agentic VC platforms, their features/use cases, and how Signal should respond.

**Verdict:** The market splits into (1) AI-native funds that market themselves as agent-run, and (2) agentic platforms that sell the OS funds run on. Signal already owns the **judgment / attention-allocation** wedge. Highest-leverage gaps to close: diligence stress-testing, deck→memo with citations, meeting prep — not LP portals or fund accounting.

---

## A. AI-native / agent-operated funds

### Quadro VC — [quadro.vc](https://quadro.vc/)
- Deal flow agents scanning networks, signals, niche communities
- Investment intelligence: market signals, scenario modeling, high-conviction surfacing
- Fund ops agents: schedules, repetitive tasks, capital deployment speed
- Portfolio support agents: GTM / product / recruiting playbooks for founders

### Cybertronic Ventures — [vc.cybertronic.com](https://vc.cybertronic.com/)
- Fully AI-executive firm (CEO/CMO/CLO as agents; human board oversight)
- End-to-end autonomous: sourcing → diligence → terms → portfolio monitoring
- Thesis: AI infra, autonomy, deep tech; seed / Series A

### AI Native Capital — [ainative.capital](https://ainative.capital/)
- Multi-agent committee: sourcing, diligence, portfolio
- Scouts on 10k+ daily signals (GitHub, patents, hiring, sentiment)
- Diligence in hours; AI term sheets / legal workflows
- Post-invest ops: talent match, customer intros, pivot analysis
- Human partners = governance only

### Moonfire (bionic VC pattern)
- In-house ML/LLM pipelines across sourcing, screening, evaluation
- Human + quant blend; speed/scale positioning

---

## B. Full-lifecycle agent platforms

### Meridia — [meridia.cloud](https://meridia.cloud/) — “4 analyst jobs, 24/7”

| Job | Features / use cases |
|-----|----------------------|
| Sourcing | Continuous scan: Crunchbase, YC, GitHub, Product Hunt, TechCrunch, LinkedIn |
| Screening | Thesis as live filter (stage/sector/geo/check); AI score + summary |
| Memos | 9-section IC memo in ~3 min; PDF + source attribution |
| Portfolio | Hiring/revenue/competitive threats; MOIC/IRR; multi-fund |

### Auryn — [auryn.vc](https://www.auryn.vc/) — most complete deal→LP chain

| Module | Features / use cases |
|--------|----------------------|
| Dealflow | Outbound scout autopilot; Scout Inbox inbound triage; public apply form; thesis screen + background checks |
| Analysis | Deck→structured fields (never invent blanks); multi-judge contested scores; gap→founder questions only; probability-weighted MOIC exit buckets; diligence work orders with close conditions; bear-case memo; Word export |
| Portfolio | Founder KPI portal; runway alerts; cap table from transaction facts; fair value / TVPI / IRR |
| Fund/LP | Commitments, capital calls, distributions, PCAP statements |

### VCOS — [vcosai.com](https://www.vcosai.com/) — Flow / Clarity / Pulse / Vista

| Module | Features / use cases |
|--------|----------------------|
| Flow | Thesis score inbound decks; Slack ping + calendar for hot; auto kind-no for cold; warm-path memory resurface; “lookalike” outbound from a deal you wish you’d seen |
| Clarity | Memo in fund voice/template; red flags with confidence; citations to slide/transcript/row; call→memo live synthesis |
| Pulse | One email for founder updates; human-confirm before ledger; append-only KPI time series; Monday brief (runway/burn/silent) |
| Vista | Live MOIC/IRR/TVPI; 1-click LP letter PDF; LP portal |

### Decile Hub / VC Lab — [govclab.com](https://govclab.com/2026/04/21/agentic-vc-leading-the-ai-revolution/)
- Email deck in → extract CEO/metrics → thesis score (1–5★) → queue
- Outbound: LinkedIn network scan → warm paths → draft outreach
- Diligence memo + **counterfactual agent that argues against the deal**
- LP discovery, pitch-rehearsal simulator, cadence follow-ups
- Portfolio anomaly flags + drafted founder check-ins
- Quarterly LP report agent; chat agents via Telegram/WhatsApp/iMessage

### Kruncher — [kruncher.ai](https://kruncher.ai/solutions/venture-capital/)
- 30+ specialized VC agents; up to **300 deal-score params**
- Screen match/no-match before opening deck; polite decline trail
- Unified knowledge layer (email, CRM, transcripts, Drive)
- IC memos in fund template (Word/PPT/PDF) with citations
- **Signal Feed**: ~450 signals (People / Liquidity / M&A / Business); route to right partner
- Alpha Engine: universe heatmaps, fundraising timing, white-space
- Overrides learn per-tenant (no cross-customer leak)

---

## C. Point solutions / CRM agents

### Harmonic Scout — [harmonic.ai](https://harmonic.ai/solutions/vc)
- NL market maps; momentum eval; diligence reports
- Early company discovery (claimed 6–12 months ahead)
- Talent movement; warm intro via network sync
- Draft outreach; Chrome extension; API/MCP/warehouse

### Affinity Ascend (Jul 2026)
- Meeting Prep (background brief before external meetings)
- Warm Intro (ranked paths + draft ask; never auto-send)
- Data Update (meeting notes → suggested CRM fields; approve-only)
- MCP skills into Claude/ChatGPT; Document Synthesis (decks) coming

### SignalRank / Specter / Aviato
- Quantitative investor-behavior / engineering-velocity / collaboration-network signals for early discovery

### Industry pattern (GoingVC 2026)
- Sourcing = signal velocity (GitHub, papers, lab exits, hiring)
- Diligence = multi-agent contradiction maps (internal consistency × external constraints × call sentiment)
- Portfolio = AI systems architecture for tiny teams
- LP = structured self-serve data, not static PDFs

---

## Gap analysis vs Signal

| Capability | Signal | Best-in-class elsewhere |
|------------|--------|-------------------------|
| Thesis scoring + relative rank | Strong | Meridia / Kruncher / Auryn |
| Selectivity digests + Excel | Strong (differentiator) | Rare |
| Peer / competitor OS | Strong (differentiator) | Weak elsewhere |
| Company research → IC brief | Strong | Meridia 9-section |
| Bear-case / counterfactual | **Diligence Stress Pack** | Decile counterfactual |
| Deck upload → memo + red flags + citations | **Diligence Stress Pack** | VCOS Clarity / Auryn / Kruncher |
| Diligence work orders / founder-only Qs | **Diligence Stress Pack** | Auryn Ask + Verify |
| Meeting prep brief | **Diligence Stress Pack** | Affinity Ascend |
| Warm intro paths | Out of scope (no CRM graph) | Affinity / Harmonic |
| Configurable signal feed | Partial (alerts, watchlists) | Kruncher 450 signals |
| pwMOIC exit modeling | Out of scope this tranche | Auryn |
| Portfolio KPI ledger / LP letters | Out of scope for sourcing role | VCOS Pulse/Vista |

---

## Signal response — Diligence Stress Pack

Built into the partner UI (not a second CRM):

1. **BearCaseAgent** — Decile-style counterfactual on every brief
2. **DeckRedFlagAgent** — paste/upload deck → claims + red flags with citations (never invent blanks)
3. **DiligencePlanAgent** — Auryn-style work orders + founder-only question email draft
4. **MeetingPrepAgent** — Affinity Ascend-lite pre-call one-pager

Principles preserved: thesis as config, provenance + confidence, human-in-the-loop, Excel/digest remain system of record.

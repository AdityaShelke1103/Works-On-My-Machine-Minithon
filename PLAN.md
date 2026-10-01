# Information Guardian — Plan (TechNext Minithon 4.0)

> The system doesn't simply collect information. It decides how much of the user's attention each piece deserves.

Optimizes three things: **Understanding** (what is this?), **Relevance** (how much does it matter to *this* user?), **Attention** (how much of the user's limited time should it get?).

## Stack (decided)
- **Next.js 15 (App Router) + TypeScript + Tailwind**, single app, `npm run dev`.
- **SQLite** via Node 24 built-in `node:sqlite` (zero install, no native build). File `data/guardian.db`, schema auto-created on boot, seed auto-loaded when empty. Schema is plain SQL, portable to PostgreSQL/MySQL.
- TF-IDF + cosine in TypeScript for dedupe/clustering/topic similarity (embeddings = future swap).
- Optional LLM (`ANTHROPIC_API_KEY` / `GEMINI_API_KEY`) for summaries/topics/entities; extractive fallback, always labeled. Works fully with no key.
- Demo never depends on internet: seed dataset (~180 items: news, Reddit/social, YouTube, Gmail/messages, articles, notifications, calendar). Live sources (HN/RSS) behind a toggle with fallback.

## Pipeline
```
SOURCES (seed | live) → INGEST → NORMALIZE (one Information shape) → EXTRACT + DEDUPLICATE
→ SUMMARY + TOPICS + ENTITIES (LLM or extractive) → CLUSTER → RELEVANCE ENGINE
   ↑ preferences + reading behaviour + ⭐ + Important + calendar + recency + urgency
→ RELEVANCE SCORE 0–100 → HIGH: read now / notify · MEDIUM: summarize + digest · LOW: bury quietly (Later)
→ DASHBOARD → user reads / stars / dismisses → reading_sessions + interactions → learning
TRENDING runs separately: Global (volume/velocity) vs For You (trend × relevance)
```

## Relevance engine (explainable)
Components, each shown as a "why" chip with its contribution:
`topic_score, preference_score, reading_score, star_score, interaction_score, recency_score, context_score (calendar + context mode), urgency_score` (+ penalties: muted, low credibility, dismissed).
Engagement counts (likes/shares) are stored but deliberately **not** used — viral noise is shown being deprioritized.
Decision: HIGH (relevance ≥ 75 or urgency ≥ 85 with relevance ≥ 50) / MEDIUM / LOW.

## Attention system (unique core)
- Attention budget per card: normal 2 min · important 5 min · ⭐ 10 min. Live countdown while reading.
- On expiry: content isn't removed → "Time's up — key points" + "Continue reading".
- Reading sessions tracked (start/end/duration) → reading_score. Signals: open +small, 30s +, most-read ++, ⭐ +++, Important ++++, dismiss −−−, repeatedly ignored −−.
- Notification engine: HIGH → toast now (breaks through quiet hours); MEDIUM → "N relevant updates" batched into next digest; LOW → Later/Quiet, never deleted.
- Quiet hours + digest schedule + simulated clock slider; "Breaking update" injector (e.g. professor moved tomorrow's exam).
- Calendar context: seeded events (e.g. ML exam tomorrow) boost related items.
- Context modes: Work / Study / Commute / Evening / Focus.

## UI (briefing, not a feed)
Tabs: **Today (Dashboard) · Important · Notifications · Trending · Later · Preferences**.
Today: 🔥 Needs your attention → ⭐ Important for you (cluster cards) → 📚 Your updates → 🕐 Later (N, collapsed).
Card: category, headline, summary, key facts, Sources (N) with credibility + links, conflict banner, Relevance %, why chips, Attention budget, actions [Read Original] [⭐] [Important] [Later] [Dismiss].
Stat bar: "187 items → 24 stories → 4 need you".

## Database schema (SQLite)
users, sources, information, topics, clusters, notifications, interactions (view/star/important/dismiss/ignore/save/later), reading_sessions (user_id, information_id, started_at, ended_at, duration), preferences, calendar_events, trends.

## Time-boxed plan
| Time | Milestone |
|---|---|
| 0:00–0:20 | M0 Scaffold Next.js/Tailwind/SQLite, schema SQL, types |
| 0:20–0:55 | M1 Seed generator (~180 items + calendar + notifications) |
| 0:55–1:40 | M2 Thin slice: DB → normalize → dedupe → cluster → score → summary → Today view |
| 1:40–2:20 | M3 Interactions: ⭐/Important/Later/Dismiss, reading sessions, attention budget, learning |
| 2:20–2:55 | M4 Notification engine, quiet hours, digest, clock sim, breaking injector, calendar context, context modes |
| 2:55–3:20 | M5 Trending (Global vs For You), sources/conflicts, optional LLM, live toggle |
| 3:20–3:40 | M6 Polish + browser verification |
| 3:40–4:00 | M7 README, DEMO.md, limitations |

## Scope
- **MUST:** SQLite schema + seed, normalize/dedupe/cluster, explainable relevance, HIGH/MED/LOW with Later, summary + sources, ⭐/Important/Later/Dismiss learning, reading sessions + attention budget, notifications + quiet hours + digest + breaking injector, README/demo.
- **SHOULD:** calendar context, trending Global vs For You, context modes, conflict flag, LLM summaries.
- **NICE:** live HN/RSS, browser extension stub, dark mode.

## Risks
Database: zero-setup SQLite, `npm run db:reset` to restore demo state · TF-IDF cluster quality (seed with consistent entities, tuned threshold) · time (cut NICE → SHOULD).

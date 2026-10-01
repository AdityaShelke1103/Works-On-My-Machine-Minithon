# Information Guardian

**TechNext Minithon 4.0: Information Overload.**

> The system doesn't just collect information. It decides how much of your attention each piece deserves.

Information Guardian merges news, social posts, Reddit, YouTube, email, chat messages and app notifications into a single **briefing**, not a feed. It groups duplicates into stories, summarizes each story while keeping links to every source, and scores how important each story is *to you*. Every point of that score is explained. It then decides whether a story **interrupts you now**, **waits for your next digest**, or gets **buried quietly** (never deleted).

## Run it (2 commands, no keys, no internet)

```bash
npm install
npm run dev        # http://localhost:3000
```

For the live demo, use `npm run demo`. It runs a production build and is faster, with no on-the-fly compiles.

- Requires Node 22.13+ (uses the built-in `node:sqlite`, so there are no native builds and no DB server).
- The SQLite DB (`data/guardian.db`) is created and seeded automatically on first request.
- Optional: set `ANTHROPIC_API_KEY` (or `GEMINI_API_KEY`) to get LLM cluster summaries. Without a key, a local extractive summarizer is used and labelled as such.
- **Preferences → Reset demo** (or `POST /api/reset`) restores a clean state.

## What's in the box

| Requirement | Where to see it |
|---|---|
| 1. Multi-source aggregation | 152 seed items across 8 source types (news, articles, X/Instagram, Reddit, YouTube, Gmail, WhatsApp, app notifications), normalized into one `Information` shape (`lib/types.ts`). Optional live Hacker News source (Preferences → Live sources) with silent fallback. |
| 2. Personalized importance | Explainable relevance engine (`lib/score.ts`). Every card shows **Why** chips with point values. Learns from ⭐ / Important / Later / Dismiss / 👍👎 / reading time. |
| 3. Clustering & summarization | Near-duplicate merge, then TF-IDF centroid clustering (`lib/cluster.ts`). Each story gets a headline, a 2-sentence summary from credible sources, and key points (`lib/summarize.ts`). |
| 4. Attention management | Interrupt / Digest / Later tiers, quiet hours, digest schedule, a **simulated clock** to replay a whole day, a **breaking-update simulator**, and an **attention budget** per story (2 / 5 / 10 min) that shows key points when time runs out. |
| 5. Source awareness | Source chips with credibility (official / high / medium / low / unverified), "View original sources" with links, syndicated duplicates listed, and a **"Sources disagree"** banner for conflicting reports. |
| 6. Intelligent organization | Context modes (Auto by time of day / Study / Commute / Evening / Deep Focus) re-weight topics. A calendar boosts related items, an emerging-event detector catches spikes, and Trending (Global vs For You) is kept separate from relevance. |

## Architecture

```
 SOURCES (seed.json | Hacker News)            app/api/*  (Next.js route handlers)
        │                                                  ▲
        ▼                                                  │ JSON
 INGEST → NORMALIZE ──► SQLite (node:sqlite) ──► lib/service.ts ──► lib/pipeline.ts (pure function)
                         users, sources, information,              │
                         preferences, calendar_events,             ├─ visible = items with timestamp ≤ simulated clock
                         interactions, reading_sessions,           ├─ DEDUPE   cosine ≥ 0.88 → merged as extra sources
                         clusters, notifications, trends,          ├─ CLUSTER  greedy centroid (≥ 0.30) + merge pass;
                         summaries (LLM cache)                     │           DMs stay standalone, chat/app noise batched
                                                                   ├─ SUMMARIZE extractive (or cached LLM) + conflict check
                                                                   ├─ LEARN    interactions → topic/source adjustments
                                                                   ├─ SCORE    additive, explainable relevance 0–100
                                                                   ├─ ATTEND   tier + delivery slot (interrupt/digest/held/later)
                                                                   └─ TREND    global (volume+velocity+popularity) vs for-you
```

The whole engine is a pure function of *(items, calendar, preferences, your interactions, simulated time)*. That's why moving the clock slider replays the day deterministically, and why every decision can be explained.

### Data model

`Information`: `id, sourceType, source, sourceDomain, credibility, author, title, content, url, timestamp, metadata{likes, shares, views, isDirect, isPromo, group}`

`Preferences`: `topics[{label, keywords, weight}], people[{name, match, relation, weight}], muted[], quietHours, digestTimes[], contextMode, useLLM, liveSources`

`Story` (output): `headline, summary, keyPoints, sources[] (with credibility + duplicates), conflict?, relevance, urgency, reasons[], components{topic_score, preference_score, context_score, urgency_score, recency_score, source_score, star_score, interaction_score, reading_score, penalty}, tier, delivery, attentionBudgetSec, isEmerging`

## How scoring works

Relevance is a **transparent additive model**. Each term becomes a "why" chip with its exact contribution:

| Component | Signal | Points |
|---|---|---|
| baseline | | +12 |
| `topic_score` | whole-phrase keyword matches × topic weight × context-mode multiplier (best topic + 30% of second) | up to +32 (×1.3 in Study) |
| `preference_score` | sender is one of your people / mentions them | +28 × weight / +10 × weight |
| `context_score` | related to a calendar event in the next 72h (closer = more), emerging story, mode effects | up to +22, +8, ±15 |
| `urgency_score` | lexicon ("action required", "deadline today", "moved", "outage"…), ×1.2 if addressed to you; **promotions discounted 80%**; "nothing urgent" negates | 0.22 × urgency |
| `recency_score` | exponential decay vs simulated clock | up to +8 |
| `source_score` | corroborated by N credible sources, official source present; only-unverified penalty | up to +10, +4, −8 |
| `star_score` | ⭐ starred / marked Important | +12 / +20 |
| `interaction_score` | 👍 / 👎 / dismissed; **learned** topic & source affinities from your behaviour | +8 / −15 / −50; ±(32 × learned) |
| `reading_score` | time actually spent reading (reading_sessions) | up to +8 |
| `penalty` | muted topic, promotional, group-chat chatter, routine app notification | −45, −20, −25, −10 |
| popularity | likes/shares/views | **0, shown but ignored by design** |

**Interrupt rule.** Interrupting costs attention, so relevance alone isn't enough. A story interrupts only if it is *urgent and relevant* (urgency ≥ 40 and relevance ≥ 50) or *from your people with very high relevance* (≥ 80). Everything else relevant (≥ 35) is batched into the next digest outside quiet hours. Below 35 it goes to Later.

**Learning.** Each interaction yields a signal (⭐ +0.08, Important +0.12, 👍 +0.06, 👎 −0.08, dismiss −0.10, 60s read +0.02…). The signal is spread over the story's matched topics (and, for single-source items such as app promos, the source), then clamped to ±0.3 / ±0.2. The sidebar "What I've learned" shows these weights live.

**Why this beats engagement ranking.** Engagement measures what's popular with everyone, and popularity is exactly what floods you. In the seed data a 2.4M-like celebrity post and a 120k-like crypto post are buried, while a professor's email with zero likes interrupts you. The model works from day one using only what you declared (cold start). It improves from very few signals, because each one is attributed to topics and sources rather than needing thousands of clicks. Every decision can be audited.

## Project layout

```
app/page.tsx                 briefing UI (Today, Important, Notifications, Trending, Later, Preferences)
app/api/*/route.ts           briefing, interact, reading, preferences, inject, summarize, live, reset
components/                  StoryCard, Reader (attention budget), PreferencesPanel, ui
lib/pipeline.ts              orchestration (pure)
lib/cluster.ts               dedupe + clustering
lib/score.ts                 relevance engine + context modes + urgency lexicon
lib/summarize.ts             extractive summary + conflict detection
lib/llm.ts                   optional Anthropic / Gemini summaries (cached)
lib/db.ts                    SQLite schema, seed loading, queries
scripts/gen-seed.ts          deterministic seed generator (fictional outlets/people)
scripts/check-pipeline.ts    `npm run check -- 14:30 -v`: print the briefing in the terminal
```

## Known limitations

- TF-IDF similarity, not semantic embeddings: paraphrases with no shared entities won't cluster. The `Vec` interface is ready for embeddings.
- Conflict detection is heuristic: it compares disjoint figures (€80m vs €65m, 2% vs 10%) and looks for denials from higher-credibility sources. It is not claim-level fact checking.
- Credibility labels are static per outlet. A real system would use a maintained source-reputation dataset.
- Single user, no auth. Seed connectors stand in for Gmail/WhatsApp/Calendar APIs.
- Weights are hand-tuned for the demo persona rather than fitted on real data.

## Future work

- Sentence embeddings (local model) for clustering and topic matching. Per-user learned weights fitted with logistic regression on interaction logs.
- Real connectors: Gmail, Google Calendar, RSS/OPML import, a browser extension for articles and time-on-page.
- Push notifications (web push) honoring the interrupt tier. A daily "what you missed" digest email.
- Claim-level cross-source verification with the LLM, plus a source-reputation service.
- Port the schema to PostgreSQL (plain SQL, drop-in) for multi-user deployment.

// Glue between the database and the pure pipeline. Persists a snapshot of derived state
// (clusters, notifications, trends) so the DB reflects what the engine decided.
import { buildBriefing } from "./pipeline";
import { db, loadCalendar, loadInteractions, loadItems, loadPreferences, loadReading, USER_ID } from "./db";
import { DEMO_DEFAULT_NOW } from "./time";
import { llmStatus, loadSummaryCache } from "./llm";
import type { Briefing } from "./types";

export function getBriefing(now?: string | null): Briefing {
  const prefs = loadPreferences();
  const status = llmStatus();
  const b = buildBriefing({
    items: loadItems(),
    calendar: loadCalendar(),
    prefs,
    interactions: loadInteractions(),
    reading: loadReading(),
    now: now || DEMO_DEFAULT_NOW,
    llmSummaries: prefs.useLLM ? loadSummaryCache() : undefined,
    llm: { available: status.available, provider: status.provider, used: false },
  });
  b.llm.used = b.stories.some((s) => s.summaryMode === "llm");
  persistSnapshot(b);
  return b;
}

function persistSnapshot(b: Briefing) {
  const d = db();
  const ts = new Date().toISOString();
  d.exec("BEGIN");
  try {
    d.exec("DELETE FROM clusters; DELETE FROM trends;");
    const c = d.prepare("INSERT INTO clusters (id, headline, summary, item_ids, relevance, tier, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const s of b.stories) c.run(s.id, s.headline, s.summary, JSON.stringify(s.sources.map((x) => x.id)), s.relevance, s.tier, ts);
    const n = d.prepare("INSERT OR IGNORE INTO notifications (id, user_id, story_id, kind, title, reason, at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const x of b.notifications.filter((x) => x.kind === "interrupt")) n.run(x.id, USER_ID, x.storyIds[0], x.kind, x.title, x.reason, x.at);
    const t = d.prepare("INSERT OR REPLACE INTO trends (story_id, label, volume, velocity, score, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
    for (const x of b.trends.global) t.run(x.storyId, x.label, x.volume, x.velocity, x.score, ts);
    d.exec("COMMIT");
  } catch {
    d.exec("ROLLBACK");
  }
}

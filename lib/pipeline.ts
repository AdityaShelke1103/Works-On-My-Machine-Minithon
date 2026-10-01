// SOURCES → NORMALIZE → DEDUPE → CLUSTER → SUMMARIZE → RELEVANCE → ATTENTION (tier + delivery) → BRIEFING
// Pure function: everything is derived from (items, calendar, preferences, user signals, simulated clock).
import type { Briefing, CalendarEvent, Information, InteractionKind, NotificationEntry, Preferences, Story, TrendEntry } from "./types";
import { clusterItems, CRED_RANK, primarySource, type RawStory } from "./cluster";
import { detectConflict, summarize, type Summary } from "./summarize";
import { autoMode, scoreStory, type Learned, type Mode, type UserStoryState } from "./score";
import { dayStart, fmtHM, inWindow, minutesOfDay, ms, parseHM, toISO } from "./time";
import { wordCount } from "./text";

export interface InteractionRow { information_id: string; kind: InteractionKind; created_at: string }
export interface ReadingRow { information_id: string; duration: number }

export interface PipelineInput {
  items: Information[];
  calendar: CalendarEvent[];
  prefs: Preferences;
  interactions: InteractionRow[];
  reading: ReadingRow[];
  now: string;
  llmSummaries?: Map<string, Summary>;
  llm?: Briefing["llm"];
}

export const summaryKey = (raw: RawStory) => `${raw.id}:${raw.members.map((m) => m.item.id).join(",")}`;

function userStates(interactions: InteractionRow[], reading: ReadingRow[]) {
  const map = new Map<string, UserStoryState>();
  const get = (id: string) => {
    let s = map.get(id);
    if (!s) map.set(id, (s = { starred: false, important: false, later: false, dismissed: false, readSec: 0, views: 0 }));
    return s;
  };
  for (const it of interactions) {
    const s = get(it.information_id);
    switch (it.kind) {
      case "star": s.starred = true; break;
      case "unstar": s.starred = false; break;
      case "important": s.important = true; break;
      case "unimportant": s.important = false; break;
      case "dismiss": s.dismissed = true; s.later = false; break;
      case "later": s.later = !s.later; break;
      case "useful": s.feedback = "useful"; break;
      case "not_useful": s.feedback = "not_useful"; break;
      case "view": s.views++; break;
      case "restore": s.dismissed = false; s.later = false; break;
    }
  }
  for (const r of reading) get(r.information_id).readSec += r.duration;
  return map;
}

function signalStrength(s: UserStoryState) {
  let v = 0;
  if (s.starred) v += 0.08;
  if (s.important) v += 0.12;
  if (s.feedback === "useful") v += 0.06;
  if (s.feedback === "not_useful") v -= 0.08;
  if (s.dismissed) v -= 0.1;
  if (s.later) v -= 0.02;
  v += Math.min(0.03, s.views * 0.01);
  v += Math.min(0.08, (s.readSec / 60) * 0.02);
  return v;
}

export function nextDigest(afterMs: number, prefs: Preferences): number | null {
  const times = [...prefs.digestTimes].map(parseHM).sort((a, b) => a - b);
  for (let d = 0; d < 3; d++)
    for (const m of times) {
      const t = dayStart(afterMs) + d * 86400000 + m * 60000;
      if (t < afterMs) continue;
      if (prefs.quietHours.enabled && inWindow(m, prefs.quietHours.start, prefs.quietHours.end)) continue;
      return t;
    }
  return null;
}

export function buildBriefing(input: PipelineInput): Briefing {
  const { prefs, calendar } = input;
  const nowMs = ms(input.now);
  const nowMin = minutesOfDay(nowMs);
  const mode: Mode = prefs.contextMode === "auto" ? autoMode(nowMin) : prefs.contextMode;
  const inQuiet = prefs.quietHours.enabled && inWindow(nowMin, prefs.quietHours.start, prefs.quietHours.end);

  // INGEST: only what has "arrived" by the simulated clock
  const visible = input.items.filter((i) => ms(i.timestamp) <= nowMs);
  const { stories: raws, tfidf, duplicatesMerged } = clusterItems(visible);
  const states = userStates(input.interactions, input.reading);
  const blank: UserStoryState = { starred: false, important: false, later: false, dismissed: false, readSec: 0, views: 0 };

  // Pass 1: topic profile of each story (needed for learning), with neutral learning
  const neutral: Learned = { topic: {}, source: {} };
  const pre = raws.map((raw) => ({
    raw,
    s: scoreStory(raw, { prefs, calendar, nowMs, mode, user: blank, learned: neutral, isEmerging: false, emergingNote: "" }),
  }));

  // LEARNING: aggregate explicit + implicit signals into topic/source adjustments
  const learned: Learned = { topic: {}, source: {} };
  for (const { raw, s } of pre) {
    const st = states.get(raw.id);
    if (!st) continue;
    const sig = signalStrength(st);
    if (!sig) continue;
    for (const t of s.topicIds) learned.topic[t.id] = (learned.topic[t.id] ?? 0) + sig * t.strength;
    const src = primarySource(raw);
    learned.source[src] = (learned.source[src] ?? 0) + sig * 0.6;
  }
  for (const k in learned.topic) learned.topic[k] = Math.max(-0.3, Math.min(0.3, learned.topic[k]));
  for (const k in learned.source) learned.source[k] = Math.max(-0.2, Math.min(0.2, learned.source[k]));

  const stories: Story[] = [];
  for (const raw of raws) {
    const items = raw.members.map((m) => m.item);
    const all = raw.members.flatMap((m) => [m.item, ...m.duplicates]);
    const times = all.map((i) => ms(i.timestamp));
    const first = Math.min(...times);
    const last = Math.max(...times);

    // Emerging: a new multi-source story spiking right now
    const recent = times.filter((t) => nowMs - t <= 90 * 60000).length;
    const isEmerging = raw.kind === "story" && recent >= 3 && nowMs - first <= 3 * 3600000;

    const user = states.get(raw.id) ?? blank;
    const sc = scoreStory(raw, {
      prefs, calendar, nowMs, mode, user, learned, isEmerging,
      emergingNote: `${recent} reports in the last 90 min`,
    });

    let sum: Summary = summarize(raw, tfidf);
    const llmSum = input.llmSummaries?.get(summaryKey(raw));
    if (llmSum && raw.kind === "story" && items.length > 1) sum = llmSum;

    // ATTENTION: tier + delivery
    // Interrupting costs attention, so relevance alone isn't enough: it must also be urgent or from your people.
    const interrupt = (sc.isUrgentSignal && sc.relevance >= 50) || (sc.relevance >= 80 && sc.personHit && sc.urgency > 0) || user.important && sc.urgency >= 25;
    let tier: Story["tier"] = interrupt ? "high" : sc.relevance < 35 ? "low" : "medium";
    if (user.dismissed) tier = "low";
    if (mode === "focus" && tier === "high" && !sc.personHit && sc.urgency < 40) tier = "medium";

    let delivery: Story["delivery"];
    const lastMin = minutesOfDay(last);
    const arrivedInQuiet = prefs.quietHours.enabled && inWindow(lastMin, prefs.quietHours.start, prefs.quietHours.end);
    if (user.later) delivery = { state: "later", at: toISO(last), note: "You saved this for later" };
    else if (tier === "high")
      delivery = {
        state: "interrupt",
        at: toISO(last),
        note: arrivedInQuiet ? `Broke through quiet hours at ${fmtHM(toISO(last))}` : `Notified immediately at ${fmtHM(toISO(last))}`,
      };
    else if (tier === "medium") {
      const d = nextDigest(last, prefs);
      if (d === null) delivery = { state: "digest", at: toISO(last), note: "In your briefing" };
      else if (d > nowMs) delivery = { state: "held", at: toISO(d), note: `Batched for the ${fmtHM(toISO(d))} digest${arrivedInQuiet ? " (arrived during quiet hours)" : ""}` };
      else delivery = { state: "digest", at: toISO(d), note: `Delivered in the ${fmtHM(toISO(d))} digest` };
    } else delivery = { state: "later", at: toISO(last), note: user.dismissed ? "Dismissed — still searchable here" : "Buried quietly — never deleted" };

    const budget = user.starred ? 600 : user.important || tier === "high" ? 300 : 120;

    stories.push({
      id: raw.id,
      kind: raw.kind,
      headline: sum.headline,
      summary: sum.summary,
      keyPoints: sum.keyPoints,
      summaryMode: sum.summaryMode,
      category: sc.category,
      sources: raw.members
        .map((m) => ({
          id: m.item.id,
          title: m.item.title,
          source: m.item.source,
          sourceType: m.item.sourceType,
          credibility: m.item.credibility,
          author: m.item.author,
          url: m.item.url,
          timestamp: m.item.timestamp,
          snippet: m.item.content.slice(0, 220),
          content: m.item.content,
          duplicates: m.duplicates.map((d) => `${d.source}`),
        }))
        .sort((a, b) => CRED_RANK[b.credibility] - CRED_RANK[a.credibility] || ms(a.timestamp) - ms(b.timestamp)),
      itemCount: all.length,
      conflict: raw.kind === "story" ? detectConflict(items) : undefined,
      relevance: sc.relevance,
      urgency: sc.urgency,
      components: sc.components,
      reasons: sc.reasons,
      tier,
      delivery,
      attentionBudgetSec: budget,
      readSec: user.readSec,
      firstSeen: toISO(first),
      lastUpdate: toISO(last),
      isEmerging,
      isUrgentSignal: sc.isUrgentSignal,
      user: { starred: user.starred, important: user.important, later: user.later, dismissed: user.dismissed, seen: user.views > 0 || user.readSec > 0, feedback: user.feedback },
    });
  }
  stories.sort((a, b) => b.relevance - a.relevance || ms(b.lastUpdate) - ms(a.lastUpdate));

  // NOTIFICATION ENGINE
  const notifications: NotificationEntry[] = [];
  for (const s of stories.filter((s) => s.delivery.state === "interrupt"))
    notifications.push({
      id: `n-${s.id}`, kind: "interrupt", at: s.delivery.at, title: s.headline,
      body: s.reasons.slice(0, 2).map((r) => r.label).join(" · "),
      storyIds: [s.id], reason: s.delivery.note, brokeQuietHours: s.delivery.note.startsWith("Broke"),
    });
  const byDigest = new Map<string, Story[]>();
  for (const s of stories.filter((s) => s.delivery.state === "digest" || s.delivery.state === "held"))
    byDigest.set(s.delivery.at, [...(byDigest.get(s.delivery.at) ?? []), s]);
  for (const [at, ss] of byDigest) {
    const pending = ms(at) > nowMs;
    notifications.push({
      id: `d-${at}`, kind: pending ? "held" : "digest", at,
      title: pending ? `${ss.length} updates waiting for your ${fmtHM(at)} digest` : `${fmtHM(at)} digest: ${ss.length} relevant updates`,
      body: ss.slice(0, 4).map((s) => s.headline).join(" · "),
      storyIds: ss.map((s) => s.id),
      reason: pending ? "Not urgent enough to interrupt — batched" : "Batched delivery",
    });
  }
  notifications.sort((a, b) => ms(b.at) - ms(a.at));

  // TRENDING (separate from personal relevance)
  const trendPool = stories.filter((s) => s.kind === "story" && s.itemCount >= 2);
  const trendEntries: TrendEntry[] = trendPool.map((s) => {
    const raw = raws.find((r) => r.id === s.id)!;
    const all = raw.members.flatMap((m) => [m.item, ...m.duplicates]);
    const velocity = all.filter((i) => nowMs - ms(i.timestamp) <= 3 * 3600000).length;
    const pop = all.reduce((x, i) => x + (i.metadata.likes ?? 0) + (i.metadata.shares ?? 0) + (i.metadata.views ?? 0) / 10, 0);
    const score = Math.round((s.itemCount + velocity * 2 + Math.log10(1 + pop) * 1.5) * 10) / 10;
    return { storyId: s.id, label: s.headline, volume: s.itemCount, velocity, score, relevance: s.relevance, forYouScore: Math.round(score * s.relevance) / 100, category: s.category };
  });
  const global = [...trendEntries].sort((a, b) => b.score - a.score).slice(0, 6);
  const forYou = trendEntries.filter((t) => t.relevance >= 40).sort((a, b) => b.forYouScore - a.forYouScore).slice(0, 5);

  // STATS
  const words = (ss: Information[]) => ss.reduce((n, i) => n + wordCount(i.content) + wordCount(i.title), 0);
  const briefWords = stories.filter((s) => s.tier !== "low").reduce((n, s) => n + wordCount(s.summary) + wordCount(s.headline), 0);
  const nd = nextDigest(nowMs, prefs);

  const topicLabel = (id: string) => prefs.topics.find((t) => t.id === id)?.label ?? id;
  const learnedList = [
    ...Object.entries(learned.topic).map(([k, v]) => ({ label: `Topic · ${topicLabel(k)}`, delta: Math.round(v * 100) / 100 })),
    ...Object.entries(learned.source).map(([k, v]) => ({ label: `Source · ${k}`, delta: Math.round(v * 100) / 100 })),
  ].filter((x) => Math.abs(x.delta) >= 0.01).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    now: input.now,
    mode,
    modeWasAuto: prefs.contextMode === "auto",
    inQuietHours: inQuiet,
    nextDigest: nd ? toISO(nd) : null,
    stats: {
      totalItems: visible.length,
      duplicatesMerged,
      stories: stories.length,
      needYou: stories.filter((s) => s.delivery.state === "interrupt").length,
      important: stories.filter((s) => s.tier === "medium" && s.relevance >= 55 && s.delivery.state !== "later").length,
      updates: stories.filter((s) => s.tier === "medium" && s.relevance < 55 && s.delivery.state !== "later").length,
      held: stories.filter((s) => s.delivery.state === "held").length,
      later: stories.filter((s) => s.delivery.state === "later").length,
      estMinutesSaved: Math.max(0, Math.round((words(visible) - briefWords) / 220)),
    },
    stories,
    notifications,
    trends: { global, forYou },
    calendar,
    learned: learnedList,
    llm: input.llm ?? { available: false, provider: null, used: false },
  };
}

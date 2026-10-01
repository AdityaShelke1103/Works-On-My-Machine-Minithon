// The Relevance Engine: a transparent, additive model. Every point of a score is a visible Reason.
// Popularity (likes/shares/views) is deliberately NOT a component — it's shown as a 0-point chip.
import type { CalendarEvent, ContextMode, Information, Preferences, Reason, Topic } from "./types";
import { CRED_RANK, primarySource, type RawStory } from "./cluster";
import { hasPhrase } from "./text";
import { ago, ms, relDay } from "./time";

export type Mode = Exclude<ContextMode, "auto">;

export interface UserStoryState {
  starred: boolean;
  important: boolean;
  later: boolean;
  dismissed: boolean;
  feedback?: "useful" | "not_useful";
  readSec: number;
  views: number;
}

export interface Learned {
  topic: Record<string, number>; // -0.3..0.3
  source: Record<string, number>; // -0.2..0.2
}

export interface ScoreCtx {
  prefs: Preferences;
  calendar: CalendarEvent[];
  nowMs: number;
  mode: Mode;
  user: UserStoryState;
  learned: Learned;
  isEmerging: boolean;
  emergingNote: string;
}

const W = {
  base: 12,
  topic: 32,
  personAuthor: 28,
  personMention: 10,
  calendar: 22,
  urgency: 0.22,
  recency: 8,
  corroboration: 2.5,
  official: 4,
  unverifiedOnly: -8,
  muted: -45,
  promo: -20,
  star: 12,
  important: 20,
  dismiss: -50,
  useful: 8,
  notUseful: -15,
  learnedTopic: 32,
  learnedSource: 20,
  emerging: 8,
};

// Topic multipliers per context mode (Intelligent Organization).
export const MODE_EFFECTS: Record<Mode, { label: string; topics: Record<string, number>; note: string }> = {
  study: { label: "Study", topics: { ml: 1.3, campus: 1.2, ai: 1.1, career: 1.0, football: 0.5, startups: 0.7 }, note: "boosts coursework, mutes leisure" },
  commute: { label: "Commute", topics: {}, note: "favours quick multi-source briefings" },
  evening: { label: "Evening", topics: { football: 1.4, startups: 1.2, ai: 1.1, campus: 0.8, career: 0.9 }, note: "leisure & long reads welcome" },
  focus: { label: "Deep Focus", topics: {}, note: "only people + urgent break through" },
};

export function autoMode(minuteOfDay: number): Mode {
  if (minuteOfDay >= 6 * 60 && minuteOfDay < 9 * 60) return "commute";
  if (minuteOfDay >= 9 * 60 && minuteOfDay < 17 * 60) return "study";
  return "evening";
}

const URGENCY_TERMS: [RegExp, number, string][] = [
  [/\baction required\b/i, 35, "action required"],
  [/\bdeadline today\b|\bby \d{1,2}(:\d\d)? ?(am|pm) today\b/i, 40, "deadline today"],
  [/\bdeadline\b/i, 20, "deadline"],
  [/\burgent\b/i, 35, "urgent"],
  [/\basap\b|\bimmediately\b/i, 30, "asap"],
  [/\b(moved|changed|rescheduled|postponed|cancel+ed|preponed)\b/i, 25, "schedule change"],
  [/\b(outage|is down|are down|unavailable)\b/i, 25, "outage"],
  [/\bbreaking\b/i, 25, "breaking"],
  [/\balert\b/i, 12, "alert"],
  [/\bextended\b/i, 12, "extended"],
  [/\b(last chance|hurry|act fast|limited time|ends in|don't miss|flash sale)\b/i, 30, "hurry"],
  [/\btonight\b|\btoday\b/i, 8, "today"],
  [/\btomorrow\b/i, 8, "tomorrow"],
];
const NOT_URGENT = /\b(nothing urgent|not urgent|no rush|whenever you can)\b/i;

export function urgencyOf(i: Information): { score: number; terms: string[]; promo: boolean; negated: boolean } {
  const text = `${i.title}. ${i.content}`;
  const promo = !!i.metadata.isPromo;
  if (NOT_URGENT.test(text)) return { score: 0, terms: [], promo, negated: true };
  let s = 0;
  const terms: string[] = [];
  for (const [re, w, label] of URGENCY_TERMS) if (re.test(text)) { s += w; terms.push(label); }
  if (i.metadata.isDirect && s > 0) s *= 1.2;
  return { score: Math.min(100, Math.round(s)), terms, promo, negated: false };
}

export function topicMatches(textLower: string, topics: Topic[]) {
  return topics
    .map((t) => {
      const hits = t.keywords.filter((k) => hasPhrase(textLower, k));
      return { topic: t, hits, strength: Math.min(1, hits.length / 2) };
    })
    .filter((m) => m.hits.length > 0)
    .sort((a, b) => b.strength * b.topic.weight - a.strength * a.topic.weight);
}

export function storyText(raw: RawStory) {
  return raw.members.map((m) => `${m.item.author} ${m.item.title} ${m.item.content}`).join(" \n ").toLowerCase();
}

const r = (n: number) => Math.round(n * 10) / 10;

export function scoreStory(raw: RawStory, ctx: ScoreCtx) {
  const items = raw.members.map((m) => m.item);
  const textLower = storyText(raw);
  const reasons: Reason[] = [];
  const comp: Record<string, number> = {
    topic_score: 0, preference_score: 0, context_score: 0, urgency_score: 0, recency_score: 0,
    source_score: 0, star_score: 0, interaction_score: 0, reading_score: 0, penalty: 0,
  };
  const push = (key: string, label: string, delta: number) => {
    const d = r(delta);
    comp[key] = r((comp[key] ?? 0) + d);
    reasons.push({ key, label, delta: d });
  };

  push("base", "baseline", W.base);
  const modeFx = MODE_EFFECTS[ctx.mode];

  // ── Topic match (declared interests) ──
  const tms = topicMatches(textLower, ctx.prefs.topics);
  tms.slice(0, 2).forEach((tm, idx) => {
    const mult = modeFx.topics[tm.topic.id] ?? 1;
    const share = idx === 0 ? 1 : 0.3;
    const pts = W.topic * tm.topic.weight * tm.strength * mult * share;
    if (pts >= 1)
      push("topic_score", `matches your topic "${tm.topic.label}" (${tm.hits.slice(0, 3).join(", ")})${mult !== 1 ? ` ×${mult} ${modeFx.label}` : ""}`, pts);
    const adj = ctx.learned.topic[tm.topic.id] ?? 0;
    if (Math.abs(adj) >= 0.02)
      push("interaction_score", adj > 0 ? `you engage with "${tm.topic.label}"` : `you often skip "${tm.topic.label}"`, W.learnedTopic * adj * tm.strength * share);
  });

  // ── People (VIP senders / mentions) ──
  let personHit = false;
  for (const p of ctx.prefs.people) {
    const fromThem = items.some((i) => p.match.some((m) => hasPhrase(i.author.toLowerCase(), m)));
    if (fromThem) {
      push("preference_score", `from ${p.name} (${p.relation})`, W.personAuthor * p.weight);
      personHit = true;
      break;
    }
    const mentioned = p.match.some((m) => m.length > 3 && hasPhrase(textLower, m));
    if (mentioned) {
      push("preference_score", `mentions ${p.name}`, W.personMention * p.weight);
      personHit = true;
      break;
    }
  }

  // ── Calendar context ──
  let bestCal: { e: CalendarEvent; f: number; hit: string; score: number } | null = null;
  for (const e of ctx.calendar) {
    const startH = (ms(e.start) - ctx.nowMs) / 3600000;
    const endH = (ms(e.end) - ctx.nowMs) / 3600000;
    if (endH < 0 || startH > 72) continue;
    const f = startH <= 36 ? 1 : startH <= 60 ? 0.7 : 0.5;
    const hits = e.keywords.filter((k) => hasPhrase(textLower, k));
    const score = f * (1 + 0.2 * hits.length); // prefer the most specific event
    if (hits.length && (!bestCal || score > bestCal.score)) bestCal = { e, f, hit: hits[0], score };
  }
  if (bestCal)
    push("context_score", `related to your calendar: ${bestCal.e.title} (${relDay(bestCal.e.start, ctx.nowMs)})`, W.calendar * bestCal.f);

  // ── Urgency ──
  const urg = items.map(urgencyOf).sort((a, b) => b.score - a.score)[0];
  const allPromo = items.every((i) => i.metadata.isPromo);
  if (urg.negated) reasons.push({ key: "urgency_score", label: "sender says it's not urgent", delta: 0 });
  else if (urg.score > 0) {
    if (allPromo) push("urgency_score", `urgency words in a promotion ("${urg.terms[0]}") — discounted 80%`, W.urgency * urg.score * 0.2);
    else push("urgency_score", `urgency signal: ${urg.terms.slice(0, 2).map((t) => `"${t}"`).join(", ")}`, W.urgency * urg.score);
  }
  const urgency = allPromo ? Math.round(urg.score * 0.2) : urg.score;

  // ── Recency ──
  const last = Math.max(...items.map((i) => ms(i.timestamp)));
  const ageH = Math.max(0, (ctx.nowMs - last) / 3600000);
  const rec = W.recency * Math.exp(-ageH / 8);
  if (rec >= 1) push("recency_score", `fresh (${ago(last, ctx.nowMs)})`, rec);

  // ── Source credibility & corroboration ──
  const distinct = new Map<string, number>();
  for (const m of raw.members) for (const i of [m.item, ...m.duplicates]) distinct.set(i.source, Math.max(distinct.get(i.source) ?? 0, CRED_RANK[i.credibility]));
  const credible = [...distinct.values()].filter((c) => c >= 2).length;
  if (raw.kind === "story" && credible >= 2)
    push("source_score", `corroborated by ${credible} credible sources`, Math.min(10, W.corroboration * credible));
  if (raw.kind === "story" && [...distinct.values()].some((c) => c === 4)) push("source_score", "includes an official source", W.official);
  if (raw.kind === "story" && [...distinct.values()].every((c) => c <= 1)) push("source_score", "only low-credibility / unverified sources", W.unverifiedOnly);
  const primary = primarySource(raw);
  const srcAdj = ctx.learned.source[primary] ?? 0;
  if (Math.abs(srcAdj) >= 0.02)
    push("interaction_score", srcAdj > 0 ? `you value ${primary}` : `you skip ${primary}`, W.learnedSource * srcAdj);

  // ── Context mode ──
  if (ctx.mode === "commute" && raw.kind === "story" && credible >= 2) push("context_score", "Commute mode: quick multi-source briefing", 5);
  if (ctx.mode === "focus" && !personHit && urgency < 40) push("context_score", "Deep Focus: non-urgent, not from your people", -15);
  if (ctx.isEmerging) push("context_score", `emerging story: ${ctx.emergingNote}`, W.emerging);

  // ── Penalties ──
  const muted = ctx.prefs.muted.find((m) => hasPhrase(textLower, m));
  if (muted) push("penalty", `muted topic "${muted}"`, W.muted);
  if (allPromo) push("penalty", "promotional content", W.promo);
  else if (raw.kind === "bucket" && items.some((i) => i.metadata.group)) push("penalty", "group-chat chatter (batched)", -25);
  else if (raw.kind === "bucket") push("penalty", "routine app notification", -10);

  // ── Explicit user signals ──
  const u = ctx.user;
  if (u.starred) push("star_score", "you starred this ⭐", W.star);
  if (u.important) push("star_score", "you marked it Important", W.important);
  if (u.feedback === "useful") push("interaction_score", "you said this was useful", W.useful);
  if (u.feedback === "not_useful") push("interaction_score", "you said this wasn't useful", W.notUseful);
  if (u.dismissed) push("interaction_score", "you dismissed this", W.dismiss);
  if (u.readSec > 0) push("reading_score", `you read it for ${Math.round(u.readSec)}s`, Math.min(8, (u.readSec / 30) * 2));

  // ── Popularity: shown, never counted ──
  const pop = items.reduce((s, i) => s + (i.metadata.likes ?? 0) + (i.metadata.shares ?? 0) + (i.metadata.views ?? 0) / 10, 0);
  if (pop >= 10000) reasons.push({ key: "engagement", label: `${fmtK(pop)} likes/shares — popularity ignored by design`, delta: 0 });

  const relevance = Math.max(0, Math.min(100, Math.round(reasons.reduce((s, x) => s + x.delta, 0))));
  const category = tms[0]?.topic.label ?? (items[0].metadata.isDirect ? "Personal" : allPromo ? "Promotions" : raw.kind === "bucket" ? "Notifications" : "General");

  return {
    relevance,
    urgency,
    isUrgentSignal: urgency >= 40 && !allPromo,
    reasons: reasons.filter((x) => x.key !== "base").sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    components: comp,
    category,
    personHit,
    topicIds: tms.map((t) => ({ id: t.topic.id, strength: t.strength })),
  };
}

export function fmtK(n: number) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(Math.round(n));
}

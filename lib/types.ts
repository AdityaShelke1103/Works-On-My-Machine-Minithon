// Core domain types shared by the pipeline, API routes and UI.

export type SourceType =
  | "news"
  | "article"
  | "social"
  | "reddit"
  | "youtube"
  | "email"
  | "message"
  | "notification";

export type Credibility = "official" | "high" | "medium" | "low" | "unverified";

/** The one normalized shape every source is converted into. */
export interface Information {
  id: string;
  sourceType: SourceType;
  source: string; // outlet / app / channel name
  sourceDomain: string;
  credibility: Credibility;
  author: string;
  title: string;
  content: string;
  url: string;
  timestamp: string; // ISO with offset
  metadata: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
    isDirect?: boolean; // addressed to the user personally
    isPromo?: boolean;
    group?: string; // chat group name
    injected?: boolean;
    live?: boolean;
  };
}

export interface Topic {
  id: string;
  label: string;
  keywords: string[];
  weight: number; // 0..1
}

export interface Person {
  name: string;
  match: string[]; // substrings matched against author / content
  relation: string;
  weight: number; // 0..1
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  keywords: string[];
}

export type ContextMode = "auto" | "study" | "commute" | "evening" | "focus";

export interface Preferences {
  userName: string;
  topics: Topic[];
  people: Person[];
  muted: string[];
  quietHours: { enabled: boolean; start: string; end: string };
  digestTimes: string[];
  contextMode: ContextMode;
  useLLM: boolean;
  liveSources: boolean;
}

export type InteractionKind =
  | "view"
  | "star"
  | "unstar"
  | "important"
  | "unimportant"
  | "dismiss"
  | "later"
  | "useful"
  | "not_useful"
  | "restore";

export type Tier = "high" | "medium" | "low";

export interface Reason {
  key: string; // component name, e.g. topic_score
  label: string;
  delta: number; // contribution in relevance points (can be negative)
}

export interface StorySource {
  id: string;
  title: string;
  source: string;
  sourceType: SourceType;
  credibility: Credibility;
  author: string;
  url: string;
  timestamp: string;
  snippet: string;
  content: string;
  duplicates: string[]; // near-identical copies merged into this one
}

export interface Story {
  id: string; // stable: id of the earliest item
  headline: string;
  summary: string;
  keyPoints: string[];
  summaryMode: "llm" | "extractive" | "original";
  category: string;
  sources: StorySource[];
  itemCount: number;
  conflict?: { note: string; sides: { source: string; credibility: Credibility; claim: string }[] };
  relevance: number; // 0..100
  urgency: number; // 0..100
  components: Record<string, number>;
  reasons: Reason[];
  tier: Tier;
  delivery: {
    state: "interrupt" | "digest" | "held" | "later";
    at: string; // ISO of when it was / will be delivered
    note: string;
  };
  attentionBudgetSec: number;
  readSec: number;
  firstSeen: string;
  lastUpdate: string;
  isEmerging: boolean;
  isUrgentSignal: boolean;
  user: { starred: boolean; important: boolean; later: boolean; dismissed: boolean; seen: boolean; feedback?: "useful" | "not_useful" };
}

export interface TrendEntry {
  storyId: string;
  label: string;
  volume: number;
  velocity: number; // items in last 3h
  score: number;
  forYouScore: number;
  relevance: number;
  category: string;
}

export interface NotificationEntry {
  id: string;
  kind: "interrupt" | "digest" | "held";
  at: string;
  title: string;
  body: string;
  storyIds: string[];
  reason: string;
  brokeQuietHours?: boolean;
}

export interface Briefing {
  now: string;
  mode: Exclude<ContextMode, "auto">;
  modeWasAuto: boolean;
  inQuietHours: boolean;
  nextDigest: string | null;
  stats: {
    totalItems: number;
    duplicatesMerged: number;
    stories: number;
    needYou: number;
    important: number;
    updates: number;
    held: number;
    later: number;
    estMinutesSaved: number;
  };
  stories: Story[];
  notifications: NotificationEntry[];
  trends: { global: TrendEntry[]; forYou: TrendEntry[] };
  calendar: CalendarEvent[];
  learned: { label: string; delta: number }[];
  llm: { available: boolean; provider: string | null; used: boolean };
}

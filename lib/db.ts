// SQLite persistence via Node's built-in node:sqlite (no native build). Schema mirrors the
// architecture's PostgreSQL tables and is plain SQL, portable to Postgres/MySQL.
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CalendarEvent, Information, InteractionKind, Preferences } from "./types";
import { DEFAULT_PREFERENCES } from "./defaults";

const DB_PATH = path.join(process.cwd(), "data", "guardian.db");
const SEED_PATH = path.join(process.cwd(), "data", "seed.json");
export const USER_ID = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources (name TEXT PRIMARY KEY, domain TEXT, source_type TEXT, credibility TEXT);
CREATE TABLE IF NOT EXISTS information (
  id TEXT PRIMARY KEY, source_type TEXT NOT NULL, source TEXT NOT NULL REFERENCES sources(name), source_domain TEXT,
  credibility TEXT, author TEXT, title TEXT NOT NULL, content TEXT, url TEXT, timestamp TEXT NOT NULL, metadata TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_information_ts ON information(timestamp);
CREATE TABLE IF NOT EXISTS preferences (user_id INTEGER PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS calendar_events (id TEXT PRIMARY KEY, user_id INTEGER, title TEXT, start_at TEXT, end_at TEXT, keywords TEXT);
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, information_id TEXT, kind TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS reading_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, information_id TEXT, started_at TEXT, ended_at TEXT, duration REAL
);
CREATE TABLE IF NOT EXISTS clusters (
  id TEXT PRIMARY KEY, headline TEXT, summary TEXT, item_ids TEXT, relevance INTEGER, tier TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id INTEGER, story_id TEXT, kind TEXT, title TEXT, reason TEXT, at TEXT
);
CREATE TABLE IF NOT EXISTS trends (story_id TEXT PRIMARY KEY, label TEXT, volume INTEGER, velocity INTEGER, score REAL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS summaries (key TEXT PRIMARY KEY, data TEXT, provider TEXT, created_at TEXT);
`;

const g = globalThis as unknown as { __guardianDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (g.__guardianDb) return g.__guardianDb;
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const d = new DatabaseSync(DB_PATH);
  d.exec("PRAGMA journal_mode = WAL;");
  d.exec(SCHEMA);
  const n = d.prepare("SELECT COUNT(*) AS n FROM information").get() as { n: number };
  if (!n.n) seed(d);
  g.__guardianDb = d;
  return d;
}

function seed(d: DatabaseSync) {
  if (!existsSync(SEED_PATH)) throw new Error("data/seed.json missing — run `npm run seed`");
  const { items, calendar } = JSON.parse(readFileSync(SEED_PATH, "utf8")) as { items: Information[]; calendar: CalendarEvent[] };
  const now = new Date().toISOString();
  d.exec("BEGIN");
  d.prepare("INSERT OR IGNORE INTO users (id, name, created_at) VALUES (?, ?, ?)").run(USER_ID, DEFAULT_PREFERENCES.userName, now);
  d.prepare("INSERT OR REPLACE INTO preferences (user_id, data, updated_at) VALUES (?, ?, ?)").run(USER_ID, JSON.stringify(DEFAULT_PREFERENCES), now);
  for (const i of items) insertInformation(d, i);
  const ce = d.prepare("INSERT OR REPLACE INTO calendar_events (id, user_id, title, start_at, end_at, keywords) VALUES (?, ?, ?, ?, ?, ?)");
  for (const c of calendar) ce.run(c.id, USER_ID, c.title, c.start, c.end, JSON.stringify(c.keywords));
  d.exec("COMMIT");
}

export function insertInformation(d: DatabaseSync, i: Information) {
  d.prepare("INSERT OR IGNORE INTO sources (name, domain, source_type, credibility) VALUES (?, ?, ?, ?)").run(i.source, i.sourceDomain, i.sourceType, i.credibility);
  d.prepare(
    `INSERT OR REPLACE INTO information (id, source_type, source, source_domain, credibility, author, title, content, url, timestamp, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(i.id, i.sourceType, i.source, i.sourceDomain, i.credibility, i.author, i.title, i.content, i.url, i.timestamp, JSON.stringify(i.metadata));
}

type Row = Record<string, string | number | null>;

export function loadItems(): Information[] {
  return (db().prepare("SELECT * FROM information ORDER BY timestamp").all() as Row[]).map((r) => ({
    id: String(r.id),
    sourceType: r.source_type as Information["sourceType"],
    source: String(r.source),
    sourceDomain: String(r.source_domain ?? ""),
    credibility: r.credibility as Information["credibility"],
    author: String(r.author ?? ""),
    title: String(r.title),
    content: String(r.content ?? ""),
    url: String(r.url ?? ""),
    timestamp: String(r.timestamp),
    metadata: JSON.parse(String(r.metadata ?? "{}")),
  }));
}

export function loadCalendar(): CalendarEvent[] {
  return (db().prepare("SELECT * FROM calendar_events ORDER BY start_at").all() as Row[]).map((r) => ({
    id: String(r.id),
    title: String(r.title),
    start: String(r.start_at),
    end: String(r.end_at),
    keywords: JSON.parse(String(r.keywords)),
  }));
}

export function loadPreferences(): Preferences {
  const r = db().prepare("SELECT data FROM preferences WHERE user_id = ?").get(USER_ID) as Row | undefined;
  return r ? { ...DEFAULT_PREFERENCES, ...JSON.parse(String(r.data)) } : DEFAULT_PREFERENCES;
}

export function savePreferences(p: Preferences) {
  db().prepare("INSERT OR REPLACE INTO preferences (user_id, data, updated_at) VALUES (?, ?, ?)").run(USER_ID, JSON.stringify(p), new Date().toISOString());
}

export function loadInteractions() {
  return db().prepare("SELECT information_id, kind, created_at FROM interactions WHERE user_id = ? ORDER BY id").all(USER_ID) as unknown as {
    information_id: string; kind: InteractionKind; created_at: string;
  }[];
}

export function addInteraction(storyId: string, kind: InteractionKind) {
  db().prepare("INSERT INTO interactions (user_id, information_id, kind, created_at) VALUES (?, ?, ?, ?)").run(USER_ID, storyId, kind, new Date().toISOString());
}

export function loadReading() {
  return db().prepare("SELECT information_id, SUM(duration) AS duration FROM reading_sessions WHERE user_id = ? GROUP BY information_id").all(USER_ID) as unknown as {
    information_id: string; duration: number;
  }[];
}

export function addReadingSession(storyId: string, startedAt: string, endedAt: string, duration: number) {
  db().prepare("INSERT INTO reading_sessions (user_id, information_id, started_at, ended_at, duration) VALUES (?, ?, ?, ?, ?)").run(USER_ID, storyId, startedAt, endedAt, duration);
}

/** Restore the demo to a clean state (keeps seed, clears user behaviour + injected items). */
export function resetDemo() {
  const d = db();
  d.exec("DELETE FROM interactions; DELETE FROM reading_sessions; DELETE FROM notifications; DELETE FROM clusters; DELETE FROM trends;");
  d.exec("DELETE FROM information WHERE json_extract(metadata, '$.injected') = 1 OR json_extract(metadata, '$.live') = 1;");
  savePreferences(DEFAULT_PREFERENCES);
}

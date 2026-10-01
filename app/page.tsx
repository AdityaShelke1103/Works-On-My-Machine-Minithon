"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Briefing, InteractionKind, NotificationEntry, Preferences, Story, ContextMode } from "@/lib/types";
import { DEMO_DEFAULT_NOW, dayStart, minutesOfDay, ms, toISO } from "@/lib/time";
import { StoryCard, CompactRow } from "@/components/StoryCard";
import { Reader } from "@/components/Reader";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { SectionTitle, fmtTime, ReasonChip } from "@/components/ui";
import {
  Shield, Moon, Sun, Play, Pause, Flame, Star, BookMarked, Clock3, Inbox, ChevronDown, Bell, CalendarDays, Brain, Zap, TrendingUp, Layers, Settings2, Megaphone, Newspaper, Mail, Sparkles,
} from "lucide-react";

type Tab = "today" | "important" | "notifications" | "trending" | "later" | "preferences";
const DAY0 = dayStart(ms(DEMO_DEFAULT_NOW));
const MODES: { id: ContextMode; label: string }[] = [
  { id: "auto", label: "Auto" }, { id: "study", label: "Study" }, { id: "commute", label: "Commute" }, { id: "evening", label: "Evening" }, { id: "focus", label: "Deep Focus" },
];
const JUMPS = [
  { m: 6 * 60 + 30, label: "06:30", hint: "quiet hours" },
  { m: 8 * 60 + 30, label: "08:30", hint: "after digest" },
  { m: 14 * 60 + 30, label: "14:30", hint: "emerging event" },
  { m: 19 * 60 + 30, label: "19:30", hint: "evening" },
];

interface Toast { id: string; n: NotificationEntry }

export default function Home() {
  const [minute, setMinute] = useState(minutesOfDay(ms(DEMO_DEFAULT_NOW)));
  const now = useMemo(() => toISO(DAY0 + minute * 60000), [minute]);
  const [b, setB] = useState<Briefing | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [reading, setReading] = useState<Story | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  const nowRef = useRef(now);
  nowRef.current = now;

  const ingest = useCallback((next: Briefing, forceToastFor?: string | null) => {
    const interrupts = next.notifications.filter((n) => n.kind === "interrupt");
    if (known.current) {
      const fresh = interrupts.filter((n) => !known.current!.has(n.id) && (ms(next.now) - ms(n.at) <= 45 * 60000 || n.storyIds[0] === forceToastFor));
      if (fresh.length) setToasts((t) => [...fresh.map((n) => ({ id: `${n.id}-${Date.now()}`, n })), ...t].slice(0, 4));
    }
    known.current = new Set(interrupts.map((n) => n.id));
    setB(next);
    setError(null);
  }, []);

  const load = useCallback(async (at: string) => {
    try {
      const r = await fetch(`/api/briefing?now=${encodeURIComponent(at)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: Briefing = await r.json();
      if (j.now === nowRef.current) ingest(j);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [ingest]);

  useEffect(() => {
    const t = setTimeout(() => load(now), 90);
    return () => clearTimeout(t);
  }, [now, load]);

  useEffect(() => { fetch("/api/preferences").then((r) => r.json()).then(setPrefs); }, []);

  // Ask the server to fill LLM summaries in the background (no-op without a key), then refresh.
  useEffect(() => {
    if (!b?.llm.available || !prefs?.useLLM) return;
    const t = setTimeout(async () => {
      const r = await fetch("/api/summarize", { method: "POST", body: JSON.stringify({ now }) }).then((x) => x.json()).catch(() => null);
      if (r?.updated) load(now);
    }, 600);
    return () => clearTimeout(t);
  }, [now, b?.llm.available, prefs?.useLLM, load]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setMinute((m) => (m + 10 >= 1440 ? (setPlaying(false), m) : m + 10)), 700);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(0, -1)), 9000);
    return () => clearTimeout(t);
  }, [toasts]);

  const act = useCallback(async (storyId: string, kind: InteractionKind) => {
    const r = await fetch("/api/interact", { method: "POST", body: JSON.stringify({ storyId, kind, now }) });
    ingest(await r.json());
  }, [now, ingest]);

  const savePrefs = useCallback(async (patch: Partial<Preferences>) => {
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    const r = await fetch("/api/preferences", { method: "PUT", body: JSON.stringify(patch) });
    setPrefs(await r.json());
    if (patch.liveSources) await fetch("/api/live", { method: "POST", body: JSON.stringify({ now }) }).catch(() => null);
    load(now);
  }, [now, load]);

  const inject = async (scenario: string) => {
    const r = await fetch("/api/inject", { method: "POST", body: JSON.stringify({ scenario, now }) });
    const j = await r.json();
    ingest(j.briefing, j.injectedStoryId);
    if (j.injectedStoryId) {
      const s: Story | undefined = j.briefing.stories.find((x: Story) => x.id === j.injectedStoryId);
      if (s && s.delivery.state !== "interrupt")
        setToasts((t) => [{ id: `q-${Date.now()}`, n: { id: "q", kind: "held", at: now, title: s.headline, body: `${s.delivery.note}. ${s.reasons.slice(0, 2).map((r) => r.label).join(" · ")}`, storyIds: [s.id], reason: "Not urgent enough to interrupt you" } }, ...t]);
    }
  };

  const reset = async () => {
    await fetch("/api/reset", { method: "POST" });
    known.current = null;
    setPrefs(await fetch("/api/preferences").then((r) => r.json()));
    load(now);
  };

  const openStory = (s: Story) => {
    setReading(s);
    act(s.id, "view");
  };
  const closeReader = async (secs: number) => {
    const s = reading;
    setReading(null);
    if (!s || secs < 1) return;
    const end = Date.now();
    await fetch("/api/reading", { method: "POST", body: JSON.stringify({ storyId: s.id, startedAt: new Date(end - secs * 1000).toISOString(), endedAt: new Date(end).toISOString(), duration: secs }) });
    load(now);
  };

  if (!b || !prefs)
    return (
      <main className="grid min-h-screen place-items-center text-muted">
        {error ? <p>Couldn&apos;t load the briefing ({error}). Is the server running?</p> : <p className="animate-pulse">Preparing your briefing…</p>}
      </main>
    );

  const S = b.stories;
  const needs = S.filter((s) => s.delivery.state === "interrupt" && !s.user.seen);
  const handled = S.filter((s) => s.delivery.state === "interrupt" && s.user.seen);
  const important = [...handled, ...S.filter((s) => s.delivery.state === "digest" && s.relevance >= 55)];
  const updates = S.filter((s) => s.delivery.state === "digest" && s.relevance < 55);
  const held = S.filter((s) => s.delivery.state === "held");
  const later = S.filter((s) => s.delivery.state === "later");
  const emerging = S.filter((s) => s.isEmerging);
  const saved = S.filter((s) => s.user.starred || s.user.important);
  const hour = Math.floor(minute / 60);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen">
      {/* Top bar: identity, simulated clock, context mode */}
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white"><Shield className="h-4 w-4" /></span>
            <div className="leading-tight">
              <p className="font-serif text-lg">Information Guardian</p>
              <p className="text-[11px] text-muted">decides how much attention each piece deserves</p>
            </div>
          </div>

          <div className="flex min-w-[320px] flex-1 items-center gap-3 rounded-xl border border-line bg-white px-3 py-2">
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause clock" : "Play clock"} className="rounded-md bg-ink p-1.5 text-white">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <div className="w-24">
              <p className="font-mono text-xl leading-none tabular-nums">{fmtTime(now)}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">Thu 1 Oct · simulated</p>
            </div>
            <input type="range" min={0} max={1430} step={10} value={minute} onChange={(e) => setMinute(Number(e.target.value))} aria-label="Simulated time" className="flex-1" />
            <div className="hidden gap-1 xl:flex">
              {JUMPS.map((j) => (
                <button key={j.label} onClick={() => setMinute(j.m)} title={j.hint} className={`rounded px-1.5 py-0.5 text-[11px] ${minute === j.m ? "bg-ink text-white" : "text-muted hover:bg-stone-100"}`}>{j.label}</button>
              ))}
            </div>
            {b.inQuietHours ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-950 px-2 py-0.5 text-xs text-indigo-100"><Moon className="h-3 w-3" /> Quiet hours</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200"><Sun className="h-3 w-3" /> Active</span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1" role="radiogroup" aria-label="Context mode">
            {MODES.map((m) => {
              const active = prefs.contextMode === m.id;
              return (
                <button key={m.id} role="radio" aria-checked={active} onClick={() => savePrefs({ contextMode: m.id })}
                  className={`rounded-lg px-2.5 py-1 text-xs ${active ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
                  {m.label}{m.id === "auto" && active ? ` · ${b.mode}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Overload reduced */}
        <section className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{greeting}, {prefs.userName}. Here&apos;s what you should know.</p>
            <h1 className="mt-1 font-serif text-3xl leading-tight sm:text-4xl">
              <span className="tabular-nums">{b.stats.totalItems}</span> items <span className="text-muted">→</span> <span className="tabular-nums">{b.stats.stories}</span> stories <span className="text-muted">→</span>{" "}
              <span className="text-attn tabular-nums">{needs.length}</span> need you
            </h1>
          </div>
          <dl className="flex flex-wrap gap-2 text-xs">
            <Stat icon={<Layers className="h-3.5 w-3.5" />} k={`${b.stats.duplicatesMerged}`} v="duplicates merged" />
            <Stat icon={<Clock3 className="h-3.5 w-3.5" />} k={`${b.stats.held}`} v={b.nextDigest ? `held for ${fmtTime(b.nextDigest)} digest` : "held"} />
            <Stat icon={<Inbox className="h-3.5 w-3.5" />} k={`${b.stats.later}`} v="buried quietly" />
            <Stat icon={<Zap className="h-3.5 w-3.5" />} k={`~${b.stats.estMinutesSaved} min`} v="reading saved" />
          </dl>
        </section>

        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
          {([
            ["today", "Today", null],
            ["important", "Important", saved.length],
            ["notifications", "Notifications", b.notifications.length],
            ["trending", "Trending", null],
            ["later", "Later", later.length],
            ["preferences", "Preferences", null],
          ] as [Tab, string, number | null][]).map(([id, label, n]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === id ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}>
              {label}{n ? <span className="ml-1.5 rounded-full bg-stone-200 px-1.5 text-[11px] tabular-nums">{n}</span> : null}
            </button>
          ))}
        </nav>

        <div className="mt-6 grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-10">
            {tab === "today" && (
              <>
                <section>
                  <SectionTitle tone="text-attn" icon={<Flame className="h-4 w-4" />} title="Needs your attention" count={needs.length}
                    hint="Urgent and from your people. These interrupt you, even in quiet hours." />
                  {needs.length ? (
                    <div className="space-y-3">{needs.map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="attn" />)}</div>
                  ) : (
                    <Empty text="Nothing needs you right now. Everything else is batched below." />
                  )}
                </section>

                {emerging.length > 0 && emerging.some((e) => !needs.includes(e)) && (
                  <section>
                    <SectionTitle tone="text-rose-700" icon={<TrendingUp className="h-4 w-4" />} title="Emerging now" hint="A sudden spike of reports about something new." />
                    <div className="space-y-3">{emerging.filter((e) => !needs.includes(e)).map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="imp" />)}</div>
                  </section>
                )}

                <section>
                  <SectionTitle tone="text-imp" icon={<Star className="h-4 w-4" />} title="Important for you" count={important.filter((s) => !s.isEmerging).length}
                    hint="Relevant to your topics, people and calendar. Delivered in your digests." />
                  <div className="space-y-3">
                    {important.filter((s) => !s.isEmerging).map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="imp" />)}
                  </div>
                </section>

                <section>
                  <SectionTitle tone="text-upd" icon={<BookMarked className="h-4 w-4" />} title="Your updates" count={updates.length} hint="Worth knowing, not worth much time." />
                  <div className="space-y-3">{updates.map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="upd" compact />)}</div>
                </section>

                <Collapsible icon={<Clock3 className="h-4 w-4" />} title={`Held for your ${b.nextDigest ? fmtTime(b.nextDigest) : "next"} digest`} count={held.length}
                  hint="Arrived since your last digest or during quiet hours. Batched, not hidden." defaultOpen={b.inQuietHours}>
                  <div className="space-y-3">{held.map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="upd" compact />)}</div>
                </Collapsible>

                <Collapsible icon={<Inbox className="h-4 w-4" />} title="Later · buried quietly" count={later.length} hint="Low relevance, muted, promotions and dismissed items. Always one click away.">
                  <ul className="divide-y divide-line rounded-xl border border-line bg-white">{later.map((s) => <CompactRow key={s.id} s={s} now={now} act={act} onRead={openStory} />)}</ul>
                </Collapsible>
              </>
            )}

            {tab === "important" && (
              <section>
                <SectionTitle tone="text-imp" icon={<Star className="h-4 w-4" />} title="Starred & important" count={saved.length} hint="Starred items get a 10-minute attention budget; important ones get 5." />
                {saved.length ? <div className="space-y-3">{saved.map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="imp" />)}</div>
                  : <Empty text="Star ⭐ or flag stories and they'll live here. Each one teaches the relevance engine." />}
              </section>
            )}

            {tab === "notifications" && <NotificationsView b={b} openById={(id) => { const s = S.find((x) => x.id === id); if (s) openStory(s); }} />}

            {tab === "trending" && <TrendingView b={b} openById={(id) => { const s = S.find((x) => x.id === id); if (s) openStory(s); }} />}

            {tab === "later" && (
              <section>
                <SectionTitle tone="text-later" icon={<Inbox className="h-4 w-4" />} title="Later" count={later.length} hint="Nothing is deleted. Each row shows why it was deprioritized." />
                <div className="space-y-3">{later.map((s) => <StoryCard key={s.id} s={s} now={now} act={act} onRead={openStory} tone="later" compact />)}</div>
              </section>
            )}

            {tab === "preferences" && <PreferencesPanel prefs={prefs} save={savePrefs} onReset={reset} llm={b.llm} />}
          </main>

          <Sidebar b={b} now={now} inject={inject} />
        </div>
      </div>

      {/* Toasts: interrupts that break through */}
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="assertive">
        {toasts.map(({ id, n }) => (
          <div key={id} className={`pointer-events-auto animate-slide-in rounded-xl border p-3 shadow-xl ${n.kind === "interrupt" ? "border-attn/40 bg-white pulse-ring" : "border-line bg-white"}`}>
            <div className="flex items-start gap-2">
              <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.kind === "interrupt" ? "text-attn" : "text-muted"}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${n.kind === "interrupt" ? "text-attn" : "text-muted"}`}>
                  {n.kind === "interrupt" ? (n.brokeQuietHours ? "Broke through quiet hours" : "Needs you now") : "Not interrupting you"}
                </p>
                <p className="mt-0.5 font-medium leading-snug">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted">{n.kind === "interrupt" ? n.body : n.body}</p>
              </div>
              <button onClick={() => setToasts((t) => t.filter((x) => x.id !== id))} className="text-muted hover:text-ink" aria-label="Dismiss notification">×</button>
            </div>
            {n.kind === "interrupt" && (
              <button onClick={() => { const s = S.find((x) => x.id === n.storyIds[0]); if (s) openStory(s); setToasts((t) => t.filter((x) => x.id !== id)); }}
                className="mt-2 w-full rounded-md bg-attn py-1 text-xs font-medium text-white">Open</button>
            )}
          </div>
        ))}
      </div>

      {reading && <Reader key={reading.id} story={S.find((s) => s.id === reading.id) ?? reading} onClose={closeReader} />}
    </div>
  );
}

function Stat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5">
      <span className="text-muted">{icon}</span>
      <dt className="font-semibold tabular-nums">{k}</dt>
      <dd className="text-muted">{v}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line bg-white/50 px-4 py-6 text-center text-sm text-muted">{text}</p>;
}

function Collapsible({ icon, title, count, hint, children, defaultOpen = false }: { icon: React.ReactNode; title: string; count: number; hint: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  return (
    <section>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left hover:bg-stone-50">
        <span className="text-muted">{icon}</span>
        <span className="font-medium">{title}</span>
        <span className="rounded-full bg-stone-200 px-2 text-xs tabular-nums">{count}</span>
        <span className="hidden text-xs text-muted md:inline">{hint}</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

function Sidebar({ b, now, inject }: { b: Briefing; now: string; inject: (s: string) => void }) {
  const upcoming = b.calendar.filter((e) => ms(e.end) >= ms(now)).slice(0, 4);
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <Panel icon={<Megaphone className="h-4 w-4" />} title="Breaking-update simulator">
        <p className="mb-2 text-xs text-muted">Drop a new item into the stream at {fmtTime(now)} and watch the attention engine decide.</p>
        <div className="grid gap-1.5">
          <SimBtn onClick={() => inject("exam")} icon={<Mail className="h-3.5 w-3.5" />} label="Professor moves tomorrow's exam" sub="VIP + urgent + calendar → breaks through" />
          <SimBtn onClick={() => inject("news")} icon={<Newspaper className="h-3.5 w-3.5" />} label="AI news: Orion-4 free tier paused" sub="relevant, not urgent → batched" />
          <SimBtn onClick={() => inject("promo")} icon={<Zap className="h-3.5 w-3.5" />} label="'URGENT' 70% off promo" sub="shouting ≠ urgent → buried" />
        </div>
      </Panel>

      <Panel icon={<CalendarDays className="h-4 w-4" />} title="Calendar context">
        <ul className="space-y-2 text-sm">
          {upcoming.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-24 shrink-0 text-xs tabular-nums text-muted">{relDayLabel(e.start, now)}</span>
              <span className="leading-snug">{e.title}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Items related to events in the next 72h get a context boost.</p>
      </Panel>

      <Panel icon={<Brain className="h-4 w-4" />} title="What I've learned">
        {b.learned.length ? (
          <ul className="space-y-1.5">
            {b.learned.slice(0, 8).map((l) => (
              <li key={l.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{l.label}</span>
                <span className={`tabular-nums text-xs font-semibold ${l.delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>{l.delta > 0 ? "+" : ""}{l.delta.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">Nothing yet. Read, ⭐, flag, dismiss or 👍/👎 stories. Weights update live and are shown here.</p>
        )}
      </Panel>

      <Panel icon={<Settings2 className="h-4 w-4" />} title="Attention engine">
        <ul className="space-y-1 text-xs text-muted">
          <li><b className="text-ink">Interrupt</b>: urgent and relevant ≥ 50, or VIP with relevance ≥ 80</li>
          <li><b className="text-ink">Digest</b>: relevant, batched at {b.nextDigest ? `next ${fmtTime(b.nextDigest)}` : "digest times"}</li>
          <li><b className="text-ink">Later</b>: relevance &lt; 35, muted or dismissed, never deleted</li>
          <li><b className="text-ink">Mode</b>: {b.mode}{b.modeWasAuto ? " (auto by time of day)" : ""}</li>
          <li className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> {b.llm.available ? `LLM: ${b.llm.provider}` : "Summaries: local extractive (no API key)"}</li>
        </ul>
      </Panel>
    </aside>
  );
}

function relDayLabel(iso: string, now: string) {
  const d = Math.round((dayStart(ms(iso)) - dayStart(ms(now))) / 86400000);
  const day = d === 0 ? "Today" : d === 1 ? "Tomorrow" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(ms(iso) + 330 * 60000).getUTCDay()];
  return `${day} ${fmtTime(iso)}`;
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3>
      {children}
    </section>
  );
}

function SimBtn({ onClick, icon, label, sub }: { onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button onClick={onClick} className="flex items-start gap-2 rounded-lg border border-line px-2.5 py-2 text-left hover:border-ink/40 hover:bg-stone-50">
      <span className="mt-0.5 text-muted">{icon}</span>
      <span><span className="block text-sm leading-tight">{label}</span><span className="text-[11px] text-muted">{sub}</span></span>
    </button>
  );
}

function NotificationsView({ b, openById }: { b: Briefing; openById: (id: string) => void }) {
  const style = { interrupt: "border-l-attn", digest: "border-l-imp", held: "border-l-stone-300" };
  const label = { interrupt: "Interrupted you", digest: "Digest delivered", held: "Waiting for digest" };
  return (
    <section>
      <SectionTitle tone="text-ink" icon={<Bell className="h-4 w-4" />} title="Notification engine" hint="HIGH notifies now. MEDIUM is batched into digests. LOW is never pushed." />
      <ol className="space-y-2">
        {b.notifications.map((n) => (
          <li key={n.id} className={`rounded-xl border border-line border-l-4 ${style[n.kind]} bg-white p-3`}>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-mono tabular-nums text-ink">{fmtTime(n.at)}</span>
              <span className="font-semibold uppercase tracking-wider">{label[n.kind]}</span>
              {n.brokeQuietHours && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-950 px-2 py-0.5 text-indigo-100"><Moon className="h-3 w-3" /> during quiet hours</span>}
              <span className="ml-auto">{n.reason}</span>
            </div>
            <button onClick={() => openById(n.storyIds[0])} className="mt-1 text-left font-medium hover:underline">{n.title}</button>
            <p className="text-xs text-muted">{n.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">{b.stats.later} low-priority stories were never pushed. They&apos;re in Later.</p>
    </section>
  );
}

function TrendingView({ b, openById }: { b: Briefing; openById: (id: string) => void }) {
  return (
    <section>
      <SectionTitle tone="text-ink" icon={<TrendingUp className="h-4 w-4" />} title="Trending" hint="Trending tells you what's happening. Relevance tells you what matters to you." />
      <div className="grid gap-4 md:grid-cols-2">
        {([["Global", b.trends.global, "volume + velocity + popularity"], ["For you", b.trends.forYou, "trend × your relevance"]] as const).map(([title, list, how]) => (
          <div key={title} className="rounded-xl border border-line bg-white p-4">
            <h3 className="font-serif text-lg">{title}</h3>
            <p className="mb-3 text-xs text-muted">Ranked by {how}</p>
            <ol className="space-y-2.5">
              {list.map((t, i) => (
                <li key={t.storyId} className="flex gap-3">
                  <span className="w-5 font-serif text-lg text-muted">{i + 1}</span>
                  <div className="min-w-0">
                    <button onClick={() => openById(t.storyId)} className="text-left text-sm font-medium leading-snug hover:underline">{t.label}</button>
                    <p className="text-xs text-muted">{t.volume} reports · {t.velocity} in last 3h · {title === "Global" ? `score ${t.score}` : `relevance ${t.relevance}%`}</p>
                  </div>
                </li>
              ))}
              {!list.length && <li className="text-sm text-muted">Nothing trending yet at this time.</li>}
            </ol>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-line bg-white p-4 text-sm">
        <p className="mb-2 font-medium">Notice what&apos;s missing from “For you”</p>
        <div className="flex flex-wrap gap-1.5">
          {b.trends.global.filter((g) => !b.trends.forYou.some((f) => f.storyId === g.storyId)).map((g) => (
            <ReasonChip key={g.storyId} r={{ key: "x", label: `${g.label.slice(0, 48)}${g.label.length > 48 ? "…" : ""} · relevance ${g.relevance}%`, delta: 0 }} />
          ))}
        </div>
      </div>
    </section>
  );
}

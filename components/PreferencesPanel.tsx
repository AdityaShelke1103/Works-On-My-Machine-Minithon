"use client";
import { useState } from "react";
import type { Preferences, Topic, Person } from "@/lib/types";
import { Plus, Trash2, RotateCcw } from "lucide-react";

export function PreferencesPanel({ prefs, save, onReset, llm }: {
  prefs: Preferences; save: (p: Partial<Preferences>) => void; onReset: () => void; llm: { available: boolean; provider: string | null };
}) {
  const [newTopic, setNewTopic] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [newMute, setNewMute] = useState("");

  const setTopic = (i: number, patch: Partial<Topic>) => save({ topics: prefs.topics.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setPerson = (i: number, patch: Partial<Person>) => save({ people: prefs.people.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Topics you care about" hint="Weights drive topic_score. Keywords are matched as whole phrases.">
        <ul className="space-y-3">
          {prefs.topics.map((t, i) => (
            <li key={t.id} className="rounded-lg border border-line p-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 font-medium">{t.label}</span>
                <input type="range" min={0} max={1} step={0.05} value={t.weight} aria-label={`${t.label} weight`}
                  onChange={(e) => setTopic(i, { weight: Number(e.target.value) })} className="w-32" />
                <span className="w-10 text-right text-sm tabular-nums">{t.weight.toFixed(2)}</span>
                <button aria-label={`Remove ${t.label}`} onClick={() => save({ topics: prefs.topics.filter((_, j) => j !== i) })} className="text-muted hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <input defaultValue={t.keywords.join(", ")} aria-label={`${t.label} keywords`}
                onBlur={(e) => setTopic(i, { keywords: e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) })}
                className="mt-2 w-full rounded border border-line bg-paper/50 px-2 py-1 text-xs text-ink/80" />
            </li>
          ))}
        </ul>
        <form className="mt-3 flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          if (!newTopic.trim()) return;
          const label = newTopic.trim();
          save({ topics: [...prefs.topics, { id: `t${Date.now()}`, label, keywords: [label.toLowerCase()], weight: 0.7 }] });
          setNewTopic("");
        }}>
          <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Add a topic, e.g. Cricket" className="flex-1 rounded border border-line px-2 py-1 text-sm" />
          <button className="inline-flex items-center gap-1 rounded bg-ink px-3 py-1 text-sm text-white"><Plus className="h-4 w-4" />Add</button>
        </form>
      </Card>

      <div className="space-y-5">
        <Card title="Your people" hint="Messages from these senders get preference_score.">
          <ul className="space-y-2">
            {prefs.people.map((p, i) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="flex-1"><span className="font-medium">{p.name}</span> <span className="text-xs text-muted">· {p.relation}</span></span>
                <input type="range" min={0} max={1} step={0.05} value={p.weight} aria-label={`${p.name} weight`} onChange={(e) => setPerson(i, { weight: Number(e.target.value) })} className="w-28" />
                <span className="w-10 text-right text-sm tabular-nums">{p.weight.toFixed(2)}</span>
                <button aria-label={`Remove ${p.name}`} onClick={() => save({ people: prefs.people.filter((_, j) => j !== i) })} className="text-muted hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const n = newPerson.trim();
            if (!n) return;
            save({ people: [...prefs.people, { name: n, match: [n.toLowerCase()], relation: "added by you", weight: 0.8 }] });
            setNewPerson("");
          }}>
            <input value={newPerson} onChange={(e) => setNewPerson(e.target.value)} placeholder="Add a person (name as it appears)" className="flex-1 rounded border border-line px-2 py-1 text-sm" />
            <button className="inline-flex items-center gap-1 rounded bg-ink px-3 py-1 text-sm text-white"><Plus className="h-4 w-4" />Add</button>
          </form>
        </Card>

        <Card title="Muted" hint="Matching stories get −45 and sink to Later. Never deleted.">
          <div className="flex flex-wrap gap-2">
            {prefs.muted.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-sm">
                {m}
                <button aria-label={`Unmute ${m}`} onClick={() => save({ muted: prefs.muted.filter((x) => x !== m) })} className="text-muted hover:text-ink">×</button>
              </span>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const m = newMute.trim().toLowerCase();
            if (m && !prefs.muted.includes(m)) save({ muted: [...prefs.muted, m] });
            setNewMute("");
          }}>
            <input value={newMute} onChange={(e) => setNewMute(e.target.value)} placeholder="Mute a word, e.g. cricket" className="flex-1 rounded border border-line px-2 py-1 text-sm" />
            <button className="rounded border border-line px-3 py-1 text-sm">Mute</button>
          </form>
        </Card>

        <Card title="Attention schedule" hint="Urgent items always break through. Everything else is batched.">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.quietHours.enabled} onChange={(e) => save({ quietHours: { ...prefs.quietHours, enabled: e.target.checked } })} />
            Quiet hours
            <input type="time" value={prefs.quietHours.start} onChange={(e) => save({ quietHours: { ...prefs.quietHours, start: e.target.value } })} className="rounded border border-line px-1" />
            to
            <input type="time" value={prefs.quietHours.end} onChange={(e) => save({ quietHours: { ...prefs.quietHours, end: e.target.value } })} className="rounded border border-line px-1" />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            Digests at
            {prefs.digestTimes.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <input type="time" value={d} onChange={(e) => save({ digestTimes: prefs.digestTimes.map((x, j) => (j === i ? e.target.value : x)) })} className="rounded border border-line px-1" />
                <button aria-label="Remove digest" onClick={() => save({ digestTimes: prefs.digestTimes.filter((_, j) => j !== i) })} className="text-muted hover:text-ink">×</button>
              </span>
            ))}
            <button onClick={() => save({ digestTimes: [...prefs.digestTimes, "17:00"] })} className="rounded border border-line px-2 py-0.5 text-xs">+ digest</button>
          </div>
        </Card>

        <Card title="Intelligence" hint="">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.useLLM} onChange={(e) => save({ useLLM: e.target.checked })} />
            Use LLM summaries when available
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${llm.available ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>
              {llm.available ? llm.provider : "no API key: local extractive summaries"}
            </span>
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.liveSources} onChange={(e) => save({ liveSources: e.target.checked })} />
            Live sources (Hacker News), falls back to seed data offline
          </label>
          <button onClick={onReset} className="mt-4 inline-flex items-center gap-1.5 rounded border border-line px-3 py-1.5 text-sm hover:bg-stone-50">
            <RotateCcw className="h-4 w-4" /> Reset demo (clear stars, reads, injected items)
          </button>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h3 className="font-serif text-lg">{title}</h3>
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  );
}

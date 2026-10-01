"use client";
import { useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/types";
import { CRED_STYLE, SourceChip, SourceIcon, fmtTime } from "./ui";
import { Hourglass, X, ExternalLink, FastForward } from "lucide-react";

/** Reading view with an attention budget: when time is up, key points are shown and reading continues only by choice. */
export function Reader({ story, onClose }: { story: Story; onClose: (secondsRead: number) => void }) {
  const [budget, setBudget] = useState(story.attentionBudgetSec);
  const [elapsed, setElapsed] = useState(0);
  const [expired, setExpired] = useState(false);
  const started = useRef(Date.now());
  const offset = useRef(0); // demo fast-forward

  useEffect(() => {
    const t = setInterval(() => {
      const e = (Date.now() - started.current) / 1000 + offset.current;
      setElapsed(e);
      if (e >= budget) setExpired(true);
    }, 250);
    return () => clearInterval(t);
  }, [budget]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const close = () => onClose((Date.now() - started.current) / 1000);
  const remaining = Math.max(0, budget - elapsed);
  const pct = Math.min(100, (elapsed / budget) * 100);
  const mm = `${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, "0")}`;
  const kind = story.user.starred ? "⭐ starred: 10 min" : story.user.important || story.tier === "high" ? "important: 5 min" : "normal: 2 min";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30 backdrop-blur-[2px]" onClick={close}>
      <aside className="animate-slide-in flex h-full w-full max-w-2xl flex-col bg-paper shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={story.headline}>
        <div className="border-b border-line bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <Hourglass className={`h-4 w-4 ${expired ? "text-attn" : "text-muted"}`} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span>Attention budget ({kind})</span>
                <span className={`font-mono text-sm tabular-nums ${remaining < 20 ? "text-attn" : "text-ink"}`}>{mm} remaining</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
                <div className={`h-full transition-all ${pct > 85 ? "bg-attn" : "bg-ink"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button title="Demo: fast-forward 30s" onClick={() => (offset.current += 30)} className="rounded p-1 text-muted hover:bg-stone-100 hover:text-ink"><FastForward className="h-4 w-4" /></button>
            <button onClick={close} aria-label="Close" className="rounded p-1 text-muted hover:bg-stone-100 hover:text-ink"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs uppercase tracking-wider text-muted">{story.category}</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight">{story.headline}</h2>
          <p className="mt-3 leading-relaxed text-ink/90">{story.summary}</p>
          {story.keyPoints.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{story.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
          )}

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Original sources</h3>
          <div className="mt-2 space-y-4">
            {story.sources.map((x) => (
              <section key={x.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <SourceChip source={x.source} credibility={x.credibility} type={x.sourceType} />
                  <span>{x.author}</span>
                  <span>· {fmtTime(x.timestamp)}</span>
                  <span className={CRED_STYLE[x.credibility].text}>· {CRED_STYLE[x.credibility].label}</span>
                  <a href={x.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 hover:text-ink">Read original <ExternalLink className="h-3 w-3" /></a>
                </div>
                <h4 className="mt-2 flex items-center gap-1.5 font-medium"><SourceIcon type={x.sourceType} />{x.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-ink/85">{x.content}</p>
              </section>
            ))}
          </div>

          {expired && (
            <div className="absolute inset-0 flex items-start justify-center bg-paper/95 p-8 backdrop-blur-sm">
              <div className="animate-slide-in mt-10 max-w-md rounded-xl border border-line bg-white p-6 shadow-lg">
                <p className="flex items-center gap-2 text-sm font-semibold text-attn"><Hourglass className="h-4 w-4" /> Time&apos;s up for this one</p>
                <p className="mt-1 text-xs text-muted">You&apos;ve spent the attention this story was worth. Nothing is removed; here&apos;s what matters:</p>
                <h3 className="mt-3 font-serif text-lg">{story.headline}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {(story.keyPoints.length ? story.keyPoints : [story.summary]).map((k, i) => <li key={i}>{k}</li>)}
                </ul>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => { setBudget((b) => b + 120); setExpired(false); }} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-stone-50">Continue reading (+2 min)</button>
                  <button onClick={close} className="rounded-md bg-ink px-3 py-1.5 text-sm text-white">Done</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

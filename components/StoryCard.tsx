"use client";
import { useState } from "react";
import type { InteractionKind, Story } from "@/lib/types";
import { CRED_STYLE, Meter, ReasonChip, SourceChip, SourceIcon, fmtAgo, fmtTime } from "./ui";
import { AlertTriangle, BookOpen, Clock, ChevronDown, Star, Flag, Archive, X, ThumbsUp, ThumbsDown, TrendingUp, ExternalLink, Sparkles, Info } from "lucide-react";

export type Act = (storyId: string, kind: InteractionKind) => void;

const TIER_STYLE = {
  attn: "border-l-attn bg-white",
  imp: "border-l-imp bg-white",
  upd: "border-l-upd bg-white",
  later: "border-l-stone-300 bg-white/70",
};

export function StoryCard({ s, now, act, onRead, tone, compact = false }: {
  s: Story; now: string; act: Act; onRead: (s: Story) => void; tone: keyof typeof TIER_STYLE; compact?: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const positive = s.reasons.filter((r) => r.delta > 0.5);
  const other = s.reasons.filter((r) => r.delta <= 0.5);
  const chips = showWhy ? s.reasons : [...positive.slice(0, 3), ...other.filter((r) => r.delta < 0).slice(0, 1), ...other.filter((r) => r.key === "engagement")];
  const meterTone = tone === "later" ? "ink" : tone;
  const distinctSources = Array.from(new Map(s.sources.map((x) => [x.source, x])).values());

  return (
    <article id={`story-${s.id}`} className={`group rounded-xl border border-line border-l-4 ${TIER_STYLE[tone]} p-4 shadow-[0_1px_0_rgba(0,0,0,.03)] transition hover:shadow-md`}>
      <header className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium text-ink/80">{s.category}</span>
        <span aria-hidden>·</span>
        <span>{fmtAgo(s.lastUpdate, now)}</span>
        {s.itemCount > 1 && (<><span aria-hidden>·</span><span>{s.itemCount} reports</span></>)}
        {s.isEmerging && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 font-semibold text-white">
            <TrendingUp className="h-3 w-3" /> Emerging
          </span>
        )}
        {s.summaryMode === "llm" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 ring-1 ring-violet-200"><Sparkles className="h-3 w-3" /> AI summary</span>
        )}
        {s.summaryMode === "extractive" && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">extractive summary</span>}
        <span className="ml-auto inline-flex items-center gap-1" title={s.delivery.note}>
          <Clock className="h-3 w-3" /> {s.delivery.note}
        </span>
      </header>

      <h3 className="font-serif text-[1.18rem] leading-snug text-ink">{s.headline}</h3>

      {!compact && <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink/85">{s.summary}</p>}
      {!compact && s.keyPoints.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-ink/80">
          {s.keyPoints.map((k, i) => (
            <li key={i} className="flex gap-2"><span className="text-muted">–</span><span>{k}</span></li>
          ))}
        </ul>
      )}

      {s.conflict && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" /> Sources disagree</p>
          <p className="mt-0.5 text-amber-900/90">{s.conflict.note}</p>
          <ul className="mt-1.5 space-y-1">
            {s.conflict.sides.map((x, i) => (
              <li key={i} className="text-xs text-amber-950/80">
                <span className={`font-semibold ${CRED_STYLE[x.credibility].text}`}>{x.source} ({x.credibility}):</span> “{x.claim}”
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why this matters to you */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted"><Info className="h-3 w-3" />Why</span>
        {chips.map((r, i) => <ReasonChip key={i} r={r} />)}
        {s.reasons.length > chips.length && (
          <button onClick={() => setShowWhy(true)} className="text-xs text-muted underline-offset-2 hover:underline">+{s.reasons.length - chips.length} more</button>
        )}
      </div>

      {/* Sources */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Sources ({distinctSources.length + s.sources.reduce((n, x) => n + x.duplicates.length, 0)})</span>
        {distinctSources.slice(0, 5).map((x) => <SourceChip key={x.id} source={x.source} credibility={x.credibility} type={x.sourceType} />)}
        {distinctSources.length > 5 && <span className="text-xs text-muted">+{distinctSources.length - 5}</span>}
        <button onClick={() => setShowSources((v) => !v)} className="inline-flex items-center gap-0.5 text-xs font-medium text-ink/70 hover:text-ink">
          {showSources ? "Hide" : "View"} original sources <ChevronDown className={`h-3 w-3 transition ${showSources ? "rotate-180" : ""}`} />
        </button>
      </div>

      {showSources && (
        <ol className="mt-2 divide-y divide-line rounded-lg border border-line bg-paper/60">
          {s.sources.map((x) => (
            <li key={x.id} className="p-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <SourceIcon type={x.sourceType} />
                <span className="font-medium text-ink">{x.source}</span>
                <span className={CRED_STYLE[x.credibility].text}>{CRED_STYLE[x.credibility].label}</span>
                <span>· {x.author}</span>
                <span>· {fmtTime(x.timestamp)}</span>
                <a href={x.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-ink/70 hover:text-ink">open <ExternalLink className="h-3 w-3" /></a>
              </div>
              <p className="mt-0.5 font-medium">{x.title}</p>
              <p className="text-xs text-ink/70">{x.snippet}{x.snippet.length >= 220 ? "…" : ""}</p>
              {x.duplicates.length > 0 && <p className="mt-0.5 text-xs text-muted">Same text also syndicated by: {x.duplicates.join(", ")} (merged as duplicate)</p>}
            </li>
          ))}
        </ol>
      )}

      {/* Footer: scores + actions */}
      <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
        <Meter value={s.relevance} tone={meterTone} label="Relevance" />
        {s.urgency > 0 && <Meter value={s.urgency} tone="attn" label="Urgency" />}
        <span className="text-xs text-muted">Attention budget {Math.round(s.attentionBudgetSec / 60)} min{s.readSec > 0 ? ` · read ${Math.round(s.readSec)}s` : ""}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => onRead(s)} className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-white hover:bg-ink/85">
            <BookOpen className="h-3.5 w-3.5" /> Read
          </button>
          <IconBtn on={s.user.starred} label={s.user.starred ? "Unstar" : "Star"} onClick={() => act(s.id, s.user.starred ? "unstar" : "star")}>
            <Star className={`h-4 w-4 ${s.user.starred ? "fill-amber-400 text-amber-500" : ""}`} />
          </IconBtn>
          <IconBtn on={s.user.important} label={s.user.important ? "Unmark important" : "Mark important"} onClick={() => act(s.id, s.user.important ? "unimportant" : "important")}>
            <Flag className={`h-4 w-4 ${s.user.important ? "fill-imp text-imp" : ""}`} />
          </IconBtn>
          <IconBtn on={s.user.later} label={s.user.later ? "Back to briefing" : "Save for later"} onClick={() => act(s.id, "later")}>
            <Archive className="h-4 w-4" />
          </IconBtn>
          {!s.user.dismissed && (
            <IconBtn label="Dismiss" onClick={() => act(s.id, "dismiss")}><X className="h-4 w-4" /></IconBtn>
          )}
          <span className="mx-1 h-4 w-px bg-line" />
          <IconBtn on={s.user.feedback === "useful"} label="Useful" onClick={() => act(s.id, "useful")}><ThumbsUp className="h-4 w-4" /></IconBtn>
          <IconBtn on={s.user.feedback === "not_useful"} label="Not useful" onClick={() => act(s.id, "not_useful")}><ThumbsDown className="h-4 w-4" /></IconBtn>
        </div>
      </footer>
    </article>
  );
}

function IconBtn({ children, label, onClick, on }: { children: React.ReactNode; label: string; onClick: () => void; on?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={on}
      className={`rounded-md p-1.5 text-muted transition hover:bg-stone-100 hover:text-ink ${on ? "bg-stone-100 text-ink" : ""}`}>
      {children}
    </button>
  );
}

export function CompactRow({ s, now, act, onRead }: { s: Story; now: string; act: Act; onRead: (s: Story) => void }) {
  const top = s.reasons.slice(0, 2);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
      <span className="w-10 tabular-nums text-xs text-muted">{s.relevance}%</span>
      <button onClick={() => onRead(s)} className="min-w-0 flex-1 truncate text-left text-ink hover:underline">{s.headline}</button>
      <span className="hidden gap-1 md:flex">{top.map((r, i) => <ReasonChip key={i} r={r} />)}</span>
      <span className="text-xs text-muted">{fmtAgo(s.lastUpdate, now)}</span>
      {s.user.later || s.user.dismissed ? (
        <button onClick={() => act(s.id, "restore")} className="text-xs text-ink/70 hover:text-ink">restore</button>
      ) : null}
    </li>
  );
}

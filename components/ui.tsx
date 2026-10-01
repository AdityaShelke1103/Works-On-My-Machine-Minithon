"use client";
import type { Credibility, Reason, SourceType } from "@/lib/types";
import { BadgeCheck, Mail, MessageCircle, Newspaper, FileText, Bell, MonitorPlay, AtSign, MessagesSquare } from "lucide-react";

export const CRED_STYLE: Record<Credibility, { dot: string; label: string; text: string }> = {
  official: { dot: "bg-blue-600", label: "official", text: "text-blue-700" },
  high: { dot: "bg-emerald-600", label: "high credibility", text: "text-emerald-700" },
  medium: { dot: "bg-amber-500", label: "medium", text: "text-amber-700" },
  low: { dot: "bg-orange-600", label: "low credibility", text: "text-orange-700" },
  unverified: { dot: "bg-stone-400", label: "unverified", text: "text-stone-500" },
};

export function SourceIcon({ type, className = "h-3.5 w-3.5" }: { type: SourceType; className?: string }) {
  const I = { news: Newspaper, article: FileText, social: AtSign, reddit: MessagesSquare, youtube: MonitorPlay, email: Mail, message: MessageCircle, notification: Bell }[type];
  return <I className={className} aria-hidden />;
}

export function SourceChip({ source, credibility, type }: { source: string; credibility: Credibility; type: SourceType }) {
  const c = CRED_STYLE[credibility];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2 py-0.5 text-xs text-ink" title={`${source} — ${c.label}`}>
      <SourceIcon type={type} className="h-3 w-3 text-muted" />
      {source}
      {credibility === "official" ? <BadgeCheck className="h-3.5 w-3.5 text-blue-600" aria-label="official source" /> : <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-label={c.label} />}
    </span>
  );
}

export function ReasonChip({ r }: { r: Reason }) {
  const tone =
    r.delta > 0.5 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : r.delta < -0.5 ? "border-rose-200 bg-rose-50 text-rose-900" : "border-stone-200 bg-stone-50 text-stone-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] leading-tight ${tone}`}>
      <span>{r.label}</span>
      <span className="font-semibold tabular-nums">{r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? "±0" : r.delta}</span>
    </span>
  );
}

export function Meter({ value, tone = "ink", label }: { value: number; tone?: "ink" | "attn" | "imp" | "upd"; label: string }) {
  const color = { ink: "bg-ink", attn: "bg-attn", imp: "bg-imp", upd: "bg-upd" }[tone];
  return (
    <div className="flex items-center gap-2 text-xs text-muted" title={`${label}: ${value}/100`}>
      <span className="w-16">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 tabular-nums text-ink">{value}%</span>
    </div>
  );
}

export function SectionTitle({ icon, title, count, hint, tone }: { icon: React.ReactNode; title: string; count?: number; hint?: string; tone: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] ${tone}`}>
        {icon}
        {title}
        {count !== undefined && <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums text-ink ring-1 ring-line">{count}</span>}
      </h2>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function fmtTime(iso: string) {
  const d = new Date(new Date(iso).getTime() + 330 * 60000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function fmtAgo(iso: string, nowIso: string) {
  const m = Math.round((new Date(nowIso).getTime() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

// Extractive summaries + conflict detection for a story. LLM summaries (lib/llm.ts) override these when available.
import type { Credibility, Information, Story } from "./types";
import { CRED_RANK, type RawStory } from "./cluster";
import { cosine, sentences, tokenize, type TfIdf } from "./text";

export interface Summary {
  headline: string;
  summary: string;
  keyPoints: string[];
  summaryMode: Story["summaryMode"];
}

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function summarize(raw: RawStory, tfidf: TfIdf): Summary {
  const items = raw.members.map((m) => m.item);

  if (raw.kind === "bucket" && items.length === 1) {
    const i = items[0];
    return { headline: `${i.source}: ${i.title}`, summary: clip(i.content, 320), keyPoints: [], summaryMode: "original" };
  }
  if (raw.kind === "bucket") {
    const latest = [...items].reverse();
    const promo = items.every((i) => i.metadata.isPromo);
    return {
      headline: `${items.length} ${promo ? "promotions" : "updates"} from ${raw.bucketLabel}`,
      summary: latest
        .slice(0, 3)
        .map((i) => (i.metadata.group ? `${i.author.replace(/ \(.*\)$/, "")}: ${i.content}` : i.title))
        .join(" · "),
      keyPoints: [],
      summaryMode: "original",
    };
  }

  if (items.length === 1) {
    const i = items[0];
    return { headline: i.title, summary: clip(i.content, 320), keyPoints: [], summaryMode: "original" };
  }

  // Headline: most credible, most central item that has a real headline (not a short social post).
  const ranked = raw.members
    .map((m) => ({
      m,
      score: CRED_RANK[m.item.credibility] * 0.25 + cosine(m.vec, raw.centroid) + (m.item.title.length > 30 ? 0.3 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  const headline = ranked[0].m.item.title;

  // Candidate sentences from every source, scored by centrality × credibility.
  const seen: string[][] = [];
  const cands: { s: string; score: number; src: string; hasNum: boolean }[] = [];
  for (const { item } of raw.members) {
    sentences(item.content).forEach((s, idx) => {
      const toks = tokenize(s);
      if (toks.length < 4) return;
      // skip near-repeats
      const set = new Set(toks);
      if (seen.some((p) => p.filter((w) => set.has(w)).length / Math.max(p.length, toks.length) > 0.6)) return;
      seen.push(toks);
      const cent = cosine(tfidf.vector(toks), raw.centroid);
      const cred = 0.6 + CRED_RANK[item.credibility] * 0.15;
      cands.push({ s, score: cent * cred + (idx === 0 ? 0.08 : 0), src: item.source, hasNum: /\d/.test(s) });
    });
  }
  cands.sort((a, b) => b.score - a.score);
  const picked = cands.slice(0, 2);
  const keyPoints = cands
    .slice(2)
    .filter((c) => c.hasNum || c.score > 0.25)
    .slice(0, 3)
    .map((c) => c.s);

  return {
    headline,
    summary: picked.map((c) => c.s).join(" "),
    keyPoints,
    summaryMode: "extractive",
  };
}

// ───────────── Conflict detection ─────────────
const DENIAL = /\b(false|denie[sd]|deny|not freezing|no closure|rumou?rs?|debunk\w*|misleading|fake|not a chatbot ban)\b/i;

function figures(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s?%/g)) out.add(`${m[1]}%`);
  for (const m of text.matchAll(/([€$₹])\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|million|bn|billion)?\b/gi)) {
    const mult = { k: 1e3, m: 1e6, million: 1e6, bn: 1e9, billion: 1e9 }[(m[3] ?? "").toLowerCase()] ?? 1;
    const v = parseFloat(m[2].replace(/,/g, "")) * mult;
    out.add(`${m[1]}${v >= 1e6 ? `${+(v / 1e6).toFixed(1)}m` : v.toLocaleString("en-US")}`);
  }
  return out;
}

function sentenceWith(text: string, pred: (s: string) => boolean): string {
  return sentences(text).find(pred) ?? sentences(text)[0] ?? text;
}

export function detectConflict(items: Information[]): Story["conflict"] {
  if (items.length < 2) return undefined;

  // (a) Denial by a credible source vs. claims from a less credible one
  const deniers = items.filter((i) => CRED_RANK[i.credibility] >= 3 && DENIAL.test(`${i.title} ${i.content}`));
  if (deniers.length) {
    const top = Math.max(...deniers.map((d) => CRED_RANK[d.credibility]));
    const claimants = items.filter((i) => CRED_RANK[i.credibility] < top && !DENIAL.test(`${i.title} ${i.content}`));
    if (claimants.length) {
      const d = deniers.sort((a, b) => CRED_RANK[b.credibility] - CRED_RANK[a.credibility])[0];
      const c = claimants.sort((a, b) => CRED_RANK[a.credibility] - CRED_RANK[b.credibility])[0];
      return {
        note: `${d.source} (${d.credibility}) disputes claims circulating from ${c.source} (${c.credibility}). Trust the higher-credibility source.`,
        sides: [
          { source: c.source, credibility: c.credibility, claim: sentenceWith(c.content, () => true) },
          { source: d.source, credibility: d.credibility, claim: sentenceWith(d.content, (s) => DENIAL.test(s)) },
        ],
      };
    }
  }

  // (b) Sources reporting disjoint figures (e.g. €80m vs €65m, 2% vs 10%)
  const withFigs = items.map((i) => ({ i, f: figures(i.content) })).filter((x) => x.f.size > 0);
  for (let a = 0; a < withFigs.length; a++)
    for (let b = a + 1; b < withFigs.length; b++) {
      const A = withFigs[a];
      const B = withFigs[b];
      if (A.i.source === B.i.source) continue;
      const kindsA = new Set([...A.f].map((x) => (x.endsWith("%") ? "%" : x[0])));
      const shared = [...B.f].some((x) => A.f.has(x));
      const comparable = [...B.f].some((x) => kindsA.has(x.endsWith("%") ? "%" : x[0]));
      if (!shared && comparable) {
        const fa = [...A.f].join(", ");
        const fb = [...B.f].join(", ");
        const sides: { source: string; credibility: Credibility; claim: string }[] = [A, B].map((x) => ({
          source: x.i.source,
          credibility: x.i.credibility,
          claim: sentenceWith(x.i.content, (s) => [...x.f].some((f) => s.includes(f.replace(/m$|bn$/, "").slice(1)) || s.includes(f))),
        }));
        return { note: `Sources report different figures: ${fa} vs ${fb}. Check the original reports.`, sides };
      }
    }
  return undefined;
}

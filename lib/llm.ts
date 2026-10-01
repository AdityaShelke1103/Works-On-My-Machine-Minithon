// Optional LLM summaries. Used only if ANTHROPIC_API_KEY or GEMINI_API_KEY is set; otherwise the
// extractive summarizer is used. Results are cached in SQLite so the demo never waits on the network twice.
import { db } from "./db";
import type { Summary } from "./summarize";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function llmStatus(): { available: boolean; provider: string | null } {
  if (process.env.ANTHROPIC_API_KEY) return { available: true, provider: `Anthropic (${ANTHROPIC_MODEL})` };
  if (process.env.GEMINI_API_KEY) return { available: true, provider: `Gemini (${GEMINI_MODEL})` };
  return { available: false, provider: null };
}

export function loadSummaryCache(): Map<string, Summary> {
  const rows = db().prepare("SELECT key, data FROM summaries").all() as { key: string; data: string }[];
  return new Map(rows.map((r) => [r.key, JSON.parse(r.data) as Summary]));
}

function prompt(sources: { source: string; credibility: string; title: string; content: string }[]) {
  return `You summarize a cluster of related reports for a busy student's personal briefing.
Sources (with credibility):
${sources.map((s, i) => `[${i + 1}] ${s.source} (${s.credibility}): ${s.title}\n${s.content}`).join("\n\n")}

Return ONLY JSON: {"headline": string (<= 12 words, neutral), "summary": string (2-3 sentences, key facts only, mention disagreement between sources if any), "keyPoints": string[] (max 3 short facts, each citing [n])}`;
}

async function call(text: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 400, messages: [{ role: "user", content: text }] }),
      });
      if (!r.ok) throw new Error(`Anthropic ${r.status}`);
      const j = await r.json();
      return j.content?.[0]?.text ?? "";
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}`);
    const j = await r.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } finally {
    clearTimeout(timer);
  }
}

export async function llmSummarize(
  key: string,
  sources: { source: string; credibility: string; title: string; content: string }[],
): Promise<Summary | null> {
  if (!llmStatus().available) return null;
  try {
    const raw = await call(prompt(sources));
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    if (!json.headline || !json.summary) return null;
    const s: Summary = { headline: json.headline, summary: json.summary, keyPoints: (json.keyPoints ?? []).slice(0, 3), summaryMode: "llm" };
    db().prepare("INSERT OR REPLACE INTO summaries (key, data, provider, created_at) VALUES (?, ?, ?, ?)").run(key, JSON.stringify(s), llmStatus().provider, new Date().toISOString());
    return s;
  } catch (e) {
    console.warn("[llm] falling back to extractive:", (e as Error).message);
    return null;
  }
}

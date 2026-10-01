import { NextResponse } from "next/server";
import { clusterItems } from "@/lib/cluster";
import { loadItems, loadPreferences } from "@/lib/db";
import { llmStatus, llmSummarize, loadSummaryCache } from "@/lib/llm";
import { summaryKey } from "@/lib/pipeline";
import { ms } from "@/lib/time";

// Fills the LLM summary cache for multi-source stories visible at `now`. No-op without an API key.
export async function POST(req: Request) {
  const { now } = await req.json();
  if (!llmStatus().available || !loadPreferences().useLLM) return NextResponse.json({ updated: 0, available: llmStatus().available });
  const cache = loadSummaryCache();
  const visible = loadItems().filter((i) => ms(i.timestamp) <= ms(now));
  const todo = clusterItems(visible).stories.filter((s) => s.kind === "story" && s.members.length > 1 && !cache.has(summaryKey(s))).slice(0, 12);
  const results = await Promise.all(
    todo.map((s) => llmSummarize(summaryKey(s), s.members.map((m) => ({ source: m.item.source, credibility: m.item.credibility, title: m.item.title, content: m.item.content })))),
  );
  return NextResponse.json({ updated: results.filter(Boolean).length, available: true });
}

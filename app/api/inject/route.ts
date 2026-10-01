import { NextResponse } from "next/server";
import { db, insertInformation } from "@/lib/db";
import { getBriefing } from "@/lib/service";
import type { Information } from "@/lib/types";

// "Breaking update" simulator: drops a new item into the stream at the simulated time.
const SCENARIOS: Record<string, Omit<Information, "id" | "timestamp" | "url">> = {
  exam: {
    sourceType: "email", source: "Gmail", sourceDomain: "mail.google.com", credibility: "high",
    author: "Prof. Anjali Mehta <a.mehta@university.example>",
    title: "URGENT: ML End-Sem exam moved to 9:00 AM tomorrow, Hall B",
    content: "Dear students, due to the heavy rain alert the Machine Learning End-Sem exam has been moved to 9:00 AM tomorrow in Hall B (not Hall A). Please reach 15 minutes early with your hall ticket. — Prof. Mehta",
    metadata: { isDirect: true, injected: true },
  },
  news: {
    sourceType: "news", source: "Global Wire", sourceDomain: "globalwire.example", credibility: "high",
    author: "Tech Desk",
    title: "Orion Labs pauses Orion-4 free tier after security flaw found",
    content: "Orion Labs paused the free student tier of its Orion-4 AI model after researchers found a security flaw in the Orion-4 API. Paid access continues. The company expects to restore the free tier within a week.",
    metadata: { injected: true },
  },
  promo: {
    sourceType: "notification", source: "FoodDash", sourceDomain: "device", credibility: "medium",
    author: "FoodDash",
    title: "🚨 MIDNIGHT MADNESS: 70% off for the next 15 minutes only!",
    content: "URGENT! 70% off everything for the next 15 minutes only. Hurry, act fast, last chance!",
    metadata: { isPromo: true, injected: true },
  },
};

export async function POST(req: Request) {
  const { scenario, now } = await req.json();
  const s = SCENARIOS[scenario];
  if (!s || !now) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const id = `inj-${scenario}-${Date.now()}`;
  insertInformation(db(), { ...s, id, timestamp: now, url: `https://${s.sourceDomain}/${id}` });
  const briefing = getBriefing(now);
  const story = briefing.stories.find((x) => x.sources.some((src) => src.id === id));
  return NextResponse.json({ briefing, injectedStoryId: story?.id ?? null });
}

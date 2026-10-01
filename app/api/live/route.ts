import { NextResponse } from "next/server";
import { db, insertInformation } from "@/lib/db";
import { ms, toISO } from "@/lib/time";

// Optional live source: Hacker News top stories, normalized into the Information shape.
// Any network failure falls back silently to seed data (the demo never depends on it).
export async function POST(req: Request) {
  const { now } = await req.json();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const ids: number[] = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: ctrl.signal }).then((r) => r.json());
    const stories = await Promise.all(
      ids.slice(0, 12).map((id) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: ctrl.signal }).then((r) => r.json())),
    );
    const base = ms(now);
    stories.filter((s) => s?.title).forEach((s, i) => {
      insertInformation(db(), {
        id: `hn-${s.id}`, sourceType: "article", source: "Hacker News", sourceDomain: "news.ycombinator.com", credibility: "medium",
        author: s.by ?? "hn", title: s.title, content: `${s.title}. ${s.score ?? 0} points, ${s.descendants ?? 0} comments on Hacker News.`,
        url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`, timestamp: toISO(base - i * 6 * 60000),
        metadata: { live: true, likes: s.score, comments: s.descendants },
      });
    });
    return NextResponse.json({ ok: true, added: stories.length });
  } catch (e) {
    return NextResponse.json({ ok: false, fallback: "seed", error: (e as Error).message });
  } finally {
    clearTimeout(timer);
  }
}

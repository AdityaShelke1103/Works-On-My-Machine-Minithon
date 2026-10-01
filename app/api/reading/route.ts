import { NextResponse } from "next/server";
import { addReadingSession } from "@/lib/db";

export async function POST(req: Request) {
  const { storyId, startedAt, endedAt, duration } = await req.json();
  if (!storyId || typeof duration !== "number" || duration <= 0) return NextResponse.json({ ok: false }, { status: 400 });
  addReadingSession(storyId, startedAt, endedAt, Math.min(duration, 3600));
  return NextResponse.json({ ok: true });
}

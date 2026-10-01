import { NextResponse } from "next/server";
import { addInteraction } from "@/lib/db";
import { getBriefing } from "@/lib/service";
import type { InteractionKind } from "@/lib/types";

const KINDS: InteractionKind[] = ["view", "star", "unstar", "important", "unimportant", "dismiss", "later", "useful", "not_useful", "restore"];

export async function POST(req: Request) {
  const { storyId, kind, now } = await req.json();
  if (!storyId || !KINDS.includes(kind)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  addInteraction(storyId, kind);
  return NextResponse.json(getBriefing(now));
}

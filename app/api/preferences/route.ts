import { NextResponse } from "next/server";
import { loadPreferences, savePreferences } from "@/lib/db";
import type { Preferences } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(loadPreferences());
}

export async function PUT(req: Request) {
  const patch = (await req.json()) as Partial<Preferences>;
  const next = { ...loadPreferences(), ...patch };
  savePreferences(next);
  return NextResponse.json(next);
}

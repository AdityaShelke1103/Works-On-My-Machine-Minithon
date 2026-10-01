import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/db";

export async function POST() {
  resetDemo();
  return NextResponse.json({ ok: true });
}

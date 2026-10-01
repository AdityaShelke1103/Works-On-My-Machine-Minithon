import { NextResponse } from "next/server";
import { getBriefing } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const now = new URL(req.url).searchParams.get("now");
  return NextResponse.json(getBriefing(now));
}

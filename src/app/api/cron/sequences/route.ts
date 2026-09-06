import { NextRequest, NextResponse } from "next/server";
import { processCampaigns, processDueSequences } from "@/lib/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn("[cron/sequences] CRON_SECRET not set — rejecting");
    return false;
  }
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  const header = req.headers.get("x-cron-secret") || "";
  if (header === secret) return true;
  const q = req.nextUrl.searchParams.get("secret");
  if (q === secret) return true;
  return false;
}

async function tick() {
  const sequences = await processDueSequences(40);
  const campaigns = await processCampaigns(40);
  return { sequences, campaigns, at: new Date().toISOString() };
}

/** Vercel Cron / external scheduler: ticks due sequences + sending campaigns without Redis worker. */
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await tick();
    console.log("[cron/sequences]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/sequences]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

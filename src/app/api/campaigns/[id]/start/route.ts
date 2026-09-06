import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { enqueueSendJob } from "@/lib/queue";
import { processCampaigns } from "@/lib/send";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const campaign = await prisma.campaign.findFirst({ where: { id, userId: user.id } });
  if (!campaign) return notFound();
  if (campaign.status !== "draft" && campaign.status !== "paused") {
    return NextResponse.json({ error: "只有草稿或暂停中的活动可以开始发送" }, { status: 400 });
  }
  await prisma.campaign.update({ where: { id }, data: { status: "sending" } });
  const enqueued = await enqueueSendJob("campaign", { campaignId: id, userId: user.id });
  // Serverless / no Redis: process a small batch inline so status can move without a worker.
  let processed = 0;
  if (enqueued === "skipped") {
    try {
      processed = await processCampaigns(10);
    } catch (err) {
      console.warn("[campaigns/start] inline process failed:", err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json({ ok: true, status: "sending", enqueued, processed });
}

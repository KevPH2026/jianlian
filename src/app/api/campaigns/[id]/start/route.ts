import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { Queue } from "bullmq";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const u = new URL(url);
  return { host: u.hostname, port: Number(u.port || 6379) };
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "不存在" }, { status: 404 });
  if (campaign.status !== "draft" && campaign.status !== "paused") {
    return NextResponse.json({ error: "只有草稿或暂停中的活动可以开始发送" }, { status: 400 });
  }
  await prisma.campaign.update({ where: { id }, data: { status: "sending" } });
  try {
    const queue = new Queue("jianlian-send", { connection: redisConnection() });
    await queue.add("campaign", { campaignId: id }, { removeOnComplete: 100, removeOnFail: 100 });
    await queue.close();
  } catch {
    // Worker 也会轮询 sending 活动，Redis 不可用时仍可发送
  }
  return NextResponse.json({ ok: true, status: "sending" });
}

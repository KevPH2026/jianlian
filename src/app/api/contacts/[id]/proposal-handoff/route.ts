import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { canHandoffProposal } from "@/lib/stages";
import { handoffToProposalAgent } from "@/lib/proposal-handoff";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return notFound();
  if (!canHandoffProposal(contact.stage)) {
    return NextResponse.json(
      { error: "仅「已回复」或「对齐中」可交给提案作战" },
      { status: 400 }
    );
  }
  const result = await handoffToProposalAgent({ userId: user.id, contactId: id });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "失败" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    brief: result.brief,
    briefText: result.briefText,
    activityId: result.activityId,
    webhook: result.webhook,
    // UI must not be clipboard-only: brief persisted + optional webhook wake
    delivered: {
      activitySaved: Boolean(result.activityId),
      webhookPosted: result.webhook.attempted && result.webhook.ok,
      webhookConfigured: result.webhook.attempted,
    },
  });
}

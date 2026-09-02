import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  const sequence = await prisma.sequence.findUnique({ where: { id } });
  if (!sequence) return NextResponse.json({ error: "不存在" }, { status: 404 });
  const body = await req.json();
  const contactIds: string[] = body.contactIds || (body.contactId ? [body.contactId] : []);
  if (!contactIds.length) return NextResponse.json({ error: "请选择联系人" }, { status: 400 });
  const created = [];
  for (const contactId of contactIds) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.doNotContact) continue;
    const enrollment = await prisma.sequenceEnrollment.upsert({
      where: { sequenceId_contactId: { sequenceId: id, contactId } },
      update: { status: "active", currentStep: 0, nextRunAt: new Date(), pausedReason: null },
      create: {
        sequenceId: id,
        contactId,
        status: "active",
        currentStep: 0,
        nextRunAt: new Date(),
      },
    });
    await prisma.activity.create({
      data: { contactId, type: "enrolled", content: `加入序列：${sequence.name}` },
    });
    created.push(enrollment);
  }
  return NextResponse.json({ ok: true, count: created.length });
}

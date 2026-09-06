import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { buildContactData } from "@/lib/contacts";
import { pauseOnDoNotContact } from "@/lib/sequence";
import { ALIGNED_STAGE, isStage } from "@/lib/stages";
import { contactHasActiveBooking } from "@/lib/bookings";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
      threads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      enrollments: { include: { sequence: true } },
      alignmentBookings: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!contact) return notFound();
  const sequences = await prisma.sequence.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const templates = await prisma.emailTemplate.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const activeBooking = contact.alignmentBookings.find((b) => !b.cancelledAt) || null;
  return NextResponse.json({ contact, sequences, templates, activeBooking });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const body = await req.json();
  const prev = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!prev) return notFound();

  const nextStage = body.stage !== undefined ? String(body.stage) : prev.stage;
  if (body.stage !== undefined && !isStage(nextStage)) {
    return NextResponse.json({ error: "无效阶段" }, { status: 400 });
  }
  if (nextStage === ALIGNED_STAGE && prev.stage !== ALIGNED_STAGE) {
    const has = await contactHasActiveBooking(user.id, id);
    if (!has) {
      return NextResponse.json(
        { error: "请先「登记已约」后再进入对齐中（须有会议时间）" },
        { status: 400 }
      );
    }
  }

  const data = buildContactData({
    name: body.name ?? prev.name,
    company: body.company ?? prev.company,
    title: body.title ?? prev.title,
    email: body.email ?? prev.email,
    phone: body.phone ?? prev.phone,
    source: body.source ?? prev.source,
    tags: body.tags ?? prev.tags,
    stage: nextStage,
    notes: body.notes ?? prev.notes,
    doNotContact: body.doNotContact ?? prev.doNotContact,
  });
  // Preserve BANT / CRM fields when only patching stage etc.
  if (body.bantBudget !== undefined) (data as { bantBudget: boolean }).bantBudget = Boolean(body.bantBudget);
  if (body.bantAuthority !== undefined) (data as { bantAuthority: boolean }).bantAuthority = Boolean(body.bantAuthority);
  if (body.bantNeed !== undefined) (data as { bantNeed: boolean }).bantNeed = Boolean(body.bantNeed);
  if (body.bantTimeline !== undefined) (data as { bantTimeline: boolean }).bantTimeline = Boolean(body.bantTimeline);
  if (body.productInterest !== undefined) (data as { productInterest: string }).productInterest = String(body.productInterest);
  if (body.nextAction !== undefined) (data as { nextAction: string }).nextAction = String(body.nextAction);

  const contact = await prisma.contact.update({ where: { id }, data });
  if (prev.stage !== contact.stage) {
    await prisma.activity.create({
      data: { contactId: id, type: "stage_change", content: `${prev.stage} → ${contact.stage}` },
    });
  }
  if (contact.doNotContact) {
    const ens = await prisma.sequenceEnrollment.findMany({ where: { contactId: id, status: "active" } });
    for (const e of ens) {
      const next = pauseOnDoNotContact(e);
      await prisma.sequenceEnrollment.update({
        where: { id: e.id },
        data: { status: next.status, pausedReason: next.pausedReason },
      });
    }
  }
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const prev = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!prev) return notFound();
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { buildContactData } from "@/lib/contacts";
import { pauseOnDoNotContact } from "@/lib/sequence";

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
    },
  });
  if (!contact) return notFound();
  const sequences = await prisma.sequence.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const templates = await prisma.emailTemplate.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ contact, sequences, templates });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const body = await req.json();
  const prev = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!prev) return notFound();
  const data = buildContactData({
    name: body.name ?? prev.name,
    company: body.company ?? prev.company,
    title: body.title ?? prev.title,
    email: body.email ?? prev.email,
    phone: body.phone ?? prev.phone,
    source: body.source ?? prev.source,
    tags: body.tags ?? prev.tags,
    stage: body.stage ?? prev.stage,
    notes: body.notes ?? prev.notes,
    doNotContact: body.doNotContact ?? prev.doNotContact,
  });
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

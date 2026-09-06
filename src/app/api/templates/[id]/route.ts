import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const existing = await prisma.emailTemplate.findFirst({ where: { id, userId: user.id } });
  if (!existing) return notFound();
  const body = await req.json();
  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      name: body.name,
      subject: body.subject,
      body: body.body,
    },
  });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const existing = await prisma.emailTemplate.findFirst({ where: { id, userId: user.id } });
  if (!existing) return notFound();
  await prisma.emailTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

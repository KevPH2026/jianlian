import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const sequence = await prisma.sequence.findFirst({
    where: { id, userId: user.id },
    include: {
      enrollments: { include: { contact: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!sequence) return notFound();
  const contacts = await prisma.contact.findMany({
    where: { userId: user.id, doNotContact: false },
    orderBy: { name: "asc" },
    take: 200,
  });
  return NextResponse.json({ sequence, contacts });
}

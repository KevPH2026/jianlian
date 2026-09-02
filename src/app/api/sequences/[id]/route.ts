import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: {
      enrollments: { include: { contact: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!sequence) return NextResponse.json({ error: "不存在" }, { status: 404 });
  const contacts = await prisma.contact.findMany({
    where: { doNotContact: false },
    orderBy: { name: "asc" },
    take: 200,
  });
  return NextResponse.json({ sequence, contacts });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";
import { parseSteps } from "@/lib/sequence";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const sequences = await prisma.sequence.findMany({
    where: { userId: user.id },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });
  const templates = await prisma.emailTemplate.findMany({ where: { userId: user.id } });
  return NextResponse.json({ sequences, templates });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const steps = parseSteps(body.steps || []);
  if (!body.name) return NextResponse.json({ error: "名称必填" }, { status: 400 });
  if (!steps.length) return NextResponse.json({ error: "至少一步" }, { status: 400 });
  const sequence = await prisma.sequence.create({
    data: { userId: user.id, name: body.name, steps },
  });
  return NextResponse.json(sequence);
}

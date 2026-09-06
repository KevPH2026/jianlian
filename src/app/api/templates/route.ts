import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  if (!body.name || !body.subject || !body.body) {
    return NextResponse.json({ error: "名称、主题、正文必填" }, { status: 400 });
  }
  const template = await prisma.emailTemplate.create({
    data: { userId: user.id, name: body.name, subject: body.subject, body: body.body },
  });
  return NextResponse.json(template);
}

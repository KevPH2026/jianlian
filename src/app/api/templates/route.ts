import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const templates = await prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const body = await req.json();
  if (!body.name || !body.subject || !body.body) {
    return NextResponse.json({ error: "名称、主题、正文必填" }, { status: 400 });
  }
  const template = await prisma.emailTemplate.create({
    data: { name: body.name, subject: body.subject, body: body.body },
  });
  return NextResponse.json(template);
}

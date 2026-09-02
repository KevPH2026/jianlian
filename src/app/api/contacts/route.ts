import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { buildContactData } from "@/lib/contacts";
import { STAGES } from "@/lib/stages";

export async function GET(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const stage = sp.get("stage") || "";
  const tag = sp.get("tag") || "";
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  if (stage && STAGES.includes(stage as (typeof STAGES)[number])) and.push({ stage });
  if (tag) and.push({ tags: { has: tag } });
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { title: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (and.length) where.AND = and;
  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });
  const tags = await prisma.contact.findMany({ select: { tags: true } });
  const allTags = Array.from(new Set(tags.flatMap((t) => t.tags))).sort();
  return NextResponse.json({ contacts, tags: allTags });
}

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const body = await req.json();
  const data = buildContactData({
    name: body.name,
    company: body.company,
    title: body.title,
    email: body.email,
    phone: body.phone,
    source: body.source || "手动",
    tags: Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(/[;,，]/).map((s: string) => s.trim()).filter(Boolean),
    stage: body.stage,
    notes: body.notes,
    doNotContact: body.doNotContact,
  });
  if (!data.name) return NextResponse.json({ error: "姓名必填" }, { status: 400 });
  const contact = await prisma.contact.create({ data });
  await prisma.activity.create({
    data: { contactId: contact.id, type: "note", content: "手动新建联系人" },
  });
  return NextResponse.json(contact);
}

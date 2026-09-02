import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { segmentToWhere, type Segment } from "@/lib/segment";
import { hourlyLimit } from "@/lib/mailer";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const campaigns = await prisma.campaign.findMany({
    include: { template: true, _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
  });
  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ campaigns, templates, rateLimit: hourlyLimit() });
}

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const body = await req.json();
  if (!body.name || !body.templateId) {
    return NextResponse.json({ error: "名称和模板必填" }, { status: 400 });
  }
  const template = await prisma.emailTemplate.findUnique({ where: { id: body.templateId } });
  if (!template) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  const segment: Segment = body.segment || { all: true };
  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      templateId: body.templateId,
      segment,
      status: "draft",
      rateLimitPerHour: Number(body.rateLimitPerHour || hourlyLimit()),
    },
  });
  const contacts = await prisma.contact.findMany({
    where: segmentToWhere(segment),
  });
  if (contacts.length) {
    await prisma.campaignRecipient.createMany({
      data: contacts.map((c) => ({
        campaignId: campaign.id,
        contactId: c.id,
        status: "queued",
      })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json(campaign);
}

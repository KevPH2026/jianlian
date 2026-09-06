import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { segmentToWhere, type Segment } from "@/lib/segment";
import { hourlyLimit } from "@/lib/mailer";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    include: { template: true, _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
  });
  const templates = await prisma.emailTemplate.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ campaigns, templates, rateLimit: hourlyLimit() });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  if (!body.name || !body.templateId) {
    return NextResponse.json({ error: "名称和模板必填" }, { status: 400 });
  }
  const template = await prisma.emailTemplate.findFirst({
    where: { id: body.templateId, userId: user.id },
  });
  if (!template) return notFound();
  const segment: Segment = body.segment || { all: true };
  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: body.name,
      templateId: body.templateId,
      segment,
      status: "draft",
      rateLimitPerHour: Number(body.rateLimitPerHour || hourlyLimit()),
    },
  });
  const contacts = await prisma.contact.findMany({
    where: segmentToWhere(segment, user.id),
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

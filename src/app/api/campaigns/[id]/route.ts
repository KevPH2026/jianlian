import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { previewTemplate } from "@/lib/template";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: user.id },
    include: {
      template: true,
      recipients: { include: { contact: true }, orderBy: { id: "asc" } },
    },
  });
  if (!campaign) return notFound();
  const previews = campaign.recipients.slice(0, 5).map((r) => ({
    contactId: r.contactId,
    name: r.contact.name,
    email: r.contact.email,
    ...previewTemplate(campaign.template.subject, campaign.template.body, r.contact),
  }));
  const counts = campaign.recipients.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  return NextResponse.json({ campaign, previews, counts });
}

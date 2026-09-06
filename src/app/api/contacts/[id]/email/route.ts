import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { sendEmail } from "@/lib/mailer";
import { recordOutbound } from "@/lib/inbox";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return notFound();
  if (contact.doNotContact) return NextResponse.json({ error: "勿联系" }, { status: 400 });
  if (!contact.email) return NextResponse.json({ error: "无邮箱" }, { status: 400 });
  const body = await req.json();
  let subject = body.subject as string;
  let text = body.body as string;
  if (body.templateId) {
    const tpl = await prisma.emailTemplate.findFirst({ where: { id: body.templateId, userId: user.id } });
    if (!tpl) return notFound();
    subject = tpl.subject;
    text = tpl.body;
  }
  if (!subject || !text) return NextResponse.json({ error: "缺少主题或正文" }, { status: 400 });
  const result = await sendEmail({
    to: contact.email,
    subject,
    body: text,
    vars: { name: contact.name, company: contact.company, title: contact.title },
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "发送失败" }, { status: 502 });
  }
  await recordOutbound({
    contactId: contact.id,
    channel: "email",
    subject: result.subject,
    body: result.body,
    dryRun: result.dryRun,
    userId: user.id,
  });
  return NextResponse.json(result);
}

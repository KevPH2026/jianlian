import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { sendEmail } from "@/lib/mailer";
import { recordOutbound } from "@/lib/inbox";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "不存在" }, { status: 404 });
  if (contact.doNotContact) return NextResponse.json({ error: "勿联系" }, { status: 400 });
  if (!contact.email) return NextResponse.json({ error: "无邮箱" }, { status: 400 });
  const body = await req.json();
  let subject = body.subject as string;
  let text = body.body as string;
  if (body.templateId) {
    const tpl = await prisma.emailTemplate.findUnique({ where: { id: body.templateId } });
    if (!tpl) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
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
  });
  return NextResponse.json(result);
}

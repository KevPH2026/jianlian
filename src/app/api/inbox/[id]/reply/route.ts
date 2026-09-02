import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { sendEmail } from "@/lib/mailer";
import { getWhatsAppConfig, isWhatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp";
import { recordOutbound } from "@/lib/inbox";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  const thread = await prisma.thread.findUnique({ where: { id }, include: { contact: true } });
  if (!thread) return NextResponse.json({ error: "不存在" }, { status: 404 });
  const body = await req.json();
  const text = String(body.body || "").trim();
  if (!text) return NextResponse.json({ error: "内容为空" }, { status: 400 });
  const contact = thread.contact;
  if (contact.doNotContact) return NextResponse.json({ error: "勿联系" }, { status: 400 });

  if (thread.channel === "email") {
    if (!contact.email) return NextResponse.json({ error: "无邮箱" }, { status: 400 });
    const result = await sendEmail({
      to: contact.email,
      subject: thread.subject ? `Re: ${thread.subject}` : "回复",
      body: text,
      vars: contact,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
    await recordOutbound({
      contactId: contact.id,
      channel: "email",
      subject: result.subject,
      body: result.body,
      dryRun: result.dryRun,
    });
    await prisma.thread.update({ where: { id }, data: { unread: false } });
    return NextResponse.json(result);
  }

  const cfg = await getWhatsAppConfig();
  if (!isWhatsAppConfigured(cfg)) return NextResponse.json({ error: "未配置" }, { status: 400 });
  if (!contact.phone) return NextResponse.json({ error: "无电话" }, { status: 400 });
  const result = await sendWhatsAppText(contact.phone, text);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  await recordOutbound({ contactId: contact.id, channel: "whatsapp", body: text });
  await prisma.thread.update({ where: { id }, data: { unread: false } });
  return NextResponse.json(result);
}

export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  await prisma.thread.update({ where: { id }, data: { unread: false } });
  return NextResponse.json({ ok: true });
}

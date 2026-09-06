import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { getWhatsAppConfig, isWhatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp";
import { interpolateTemplate } from "@/lib/template";
import { recordOutbound } from "@/lib/inbox";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return notFound();
  if (contact.doNotContact) return NextResponse.json({ error: "勿联系" }, { status: 400 });
  if (!contact.phone) return NextResponse.json({ error: "无电话" }, { status: 400 });
  const cfg = await getWhatsAppConfig(user.id);
  if (!isWhatsAppConfigured(cfg)) {
    return NextResponse.json({ error: "未配置" }, { status: 400 });
  }
  const body = await req.json();
  const text = interpolateTemplate(String(body.body || ""), {
    name: contact.name,
    company: contact.company,
    title: contact.title,
  });
  if (!text.trim()) return NextResponse.json({ error: "正文为空" }, { status: 400 });
  const result = await sendWhatsAppText(contact.phone, text, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error || "发送失败" }, { status: 502 });
  await recordOutbound({
    contactId: contact.id,
    channel: "whatsapp",
    body: text,
    userId: user.id,
  });
  return NextResponse.json(result);
}

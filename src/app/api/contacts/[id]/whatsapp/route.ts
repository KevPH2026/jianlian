import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { getWhatsAppConfig, isWhatsAppConfigured, sendWhatsAppText } from "@/lib/whatsapp";
import { interpolateTemplate } from "@/lib/template";
import { recordOutbound } from "@/lib/inbox";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ error: "不存在" }, { status: 404 });
  if (contact.doNotContact) return NextResponse.json({ error: "勿联系" }, { status: 400 });
  if (!contact.phone) return NextResponse.json({ error: "无电话" }, { status: 400 });
  const cfg = await getWhatsAppConfig();
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
  const result = await sendWhatsAppText(contact.phone, text);
  if (!result.ok) return NextResponse.json({ error: result.error || "发送失败" }, { status: 502 });
  await recordOutbound({
    contactId: contact.id,
    channel: "whatsapp",
    body: text,
  });
  return NextResponse.json(result);
}

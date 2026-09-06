import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { recordInboundReply } from "@/lib/inbox";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return notFound();
  const body = await req.json();
  const channel = body.channel === "whatsapp" ? "whatsapp" : "email";
  const text = String(body.body || "").trim();
  if (!text) return NextResponse.json({ error: "内容为空" }, { status: 400 });
  await recordInboundReply({
    contactId: id,
    channel,
    body: text,
    subject: body.subject,
  });
  return NextResponse.json({ ok: true });
}

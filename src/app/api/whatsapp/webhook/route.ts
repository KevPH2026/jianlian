import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig, parseWhatsAppWebhook } from "@/lib/whatsapp";
import { findContactByPhone, recordInboundReply } from "@/lib/inbox";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  const cfg = await getWhatsAppConfig();
  if (mode === "subscribe" && token && token === cfg.verifyToken) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "verify failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const messages = parseWhatsAppWebhook(payload);
  for (const msg of messages) {
    const contact = await findContactByPhone(msg.from);
    if (contact) {
      await recordInboundReply({
        contactId: contact.id,
        channel: "whatsapp",
        body: msg.body,
      });
    } else {
      const created = await prisma.contact.create({
        data: {
          name: `WhatsApp ${msg.from}`,
          phone: msg.from,
          source: "whatsapp",
          stage: "已回复",
          tags: ["whatsapp"],
          score: 15,
        },
      });
      await recordInboundReply({
        contactId: created.id,
        channel: "whatsapp",
        body: msg.body,
      });
    }
  }
  return NextResponse.json({ ok: true, received: messages.length });
}

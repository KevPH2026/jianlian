import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findSettingsByPhoneNumberId, findSettingsByVerifyToken, parseWhatsAppWebhook } from "@/lib/whatsapp";
import { findContactByPhone, recordInboundReply } from "@/lib/inbox";
import { pickSettingsForWebhook } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  if (mode === "subscribe" && token) {
    const settings = await findSettingsByVerifyToken(token);
    if (settings.length) {
      return new NextResponse(challenge || "", { status: 200 });
    }
    const envToken = process.env.WHATSAPP_VERIFY_TOKEN || "jianlian-verify";
    if (token === envToken) {
      return new NextResponse(challenge || "", { status: 200 });
    }
  }
  return NextResponse.json({ error: "verify failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const messages = parseWhatsAppWebhook(payload);
  let received = 0;
  for (const msg of messages) {
    const byPhone = msg.phoneNumberId ? await findSettingsByPhoneNumberId(msg.phoneNumberId) : [];
    const settings = pickSettingsForWebhook(byPhone, { phoneNumberId: msg.phoneNumberId });
    const resolved = settings.length ? settings : byPhone;
    if (!resolved.length) continue;
    for (const setting of resolved) {
      const contact = await findContactByPhone(msg.from, setting.userId);
      if (contact) {
        await recordInboundReply({
          contactId: contact.id,
          channel: "whatsapp",
          body: msg.body,
        });
      } else {
        const created = await prisma.contact.create({
          data: {
            userId: setting.userId,
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
      received++;
    }
  }
  return NextResponse.json({ ok: true, received: received || messages.length });
}

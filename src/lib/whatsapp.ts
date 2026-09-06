import { prisma } from "./prisma";
import { digitsPhone } from "./utils";

export type WhatsAppConfig = {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
  userId?: string;
};

export async function getOrCreateSetting(userId: string) {
  return prisma.setting.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      brandName: "建联",
      industry: "",
      targetMarkets: "",
      stalledDays: 5,
      waVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "jianlian-verify",
      waApiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    },
  });
}

export async function getWhatsAppConfig(userId?: string): Promise<WhatsAppConfig> {
  const row = userId ? await prisma.setting.findUnique({ where: { userId } }) : null;
  return {
    userId,
    phoneNumberId: row?.waPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: row?.waAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || "",
    verifyToken: row?.waVerifyToken || process.env.WHATSAPP_VERIFY_TOKEN || "jianlian-verify",
    apiVersion: row?.waApiVersion || process.env.WHATSAPP_API_VERSION || "v21.0",
  };
}

export async function findSettingsByVerifyToken(token: string) {
  const t = (token || "").trim();
  if (!t) return [];
  return prisma.setting.findMany({ where: { waVerifyToken: t } });
}

export async function findSettingsByPhoneNumberId(phoneNumberId: string) {
  const id = (phoneNumberId || "").trim();
  if (!id) return [];
  return prisma.setting.findMany({ where: { waPhoneNumberId: id } });
}

export function isWhatsAppConfigured(cfg: WhatsAppConfig): boolean {
  return Boolean(cfg.phoneNumberId && cfg.accessToken);
}

export async function sendWhatsAppText(
  toPhone: string,
  body: string,
  userId?: string
): Promise<{
  ok: boolean;
  error?: string;
  messageId?: string;
}> {
  const cfg = await getWhatsAppConfig(userId);
  if (!isWhatsAppConfigured(cfg)) {
    return { ok: false, error: "未配置" };
  }
  const to = digitsPhone(toPhone);
  if (!to) return { ok: false, error: "无效号码" };
  const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) {
      return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, messageId: json.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type InboundWa = {
  from: string;
  body: string;
  messageId?: string;
  phoneNumberId?: string;
};

export function parseWhatsAppWebhook(payload: unknown): InboundWa[] {
  const out: InboundWa[] = [];
  const body = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          messages?: Array<{ from?: string; id?: string; text?: { body?: string }; type?: string }>;
        };
      }>;
    }>;
  };
  for (const entry of body?.entry || []) {
    for (const change of entry.changes || []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id || "";
      for (const msg of change.value?.messages || []) {
        const text = msg.text?.body || "";
        if (msg.from && text) {
          out.push({ from: msg.from, body: text, messageId: msg.id, phoneNumberId });
        }
      }
    }
  }
  return out;
}

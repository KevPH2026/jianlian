import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";
import { smtpConfigured } from "@/lib/mailer";
import { getOrCreateSetting, getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const cfg = await getWhatsAppConfig(user.id);
  const setting = await getOrCreateSetting(user.id);
  return NextResponse.json({
    brand: {
      brandName: setting.brandName,
      industry: setting.industry,
      targetMarkets: setting.targetMarkets,
    },
    smtp: {
      configured: smtpConfigured(),
      host: process.env.SMTP_HOST || "",
      port: process.env.SMTP_PORT || "587",
      from: process.env.SMTP_FROM || "",
    },
    imap: {
      configured: Boolean(process.env.IMAP_HOST),
      host: process.env.IMAP_HOST || "",
    },
    whatsapp: {
      configured: isWhatsAppConfigured(cfg),
      phoneNumberId: setting.waPhoneNumberId || cfg.phoneNumberId,
      verifyToken: setting.waVerifyToken || cfg.verifyToken,
      apiVersion: setting.waApiVersion || cfg.apiVersion,
      hasToken: Boolean(setting.waAccessToken || cfg.accessToken),
      webhookPath: "/api/whatsapp/webhook",
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const current = await getOrCreateSetting(user.id);
  const updated = await prisma.setting.update({
    where: { userId: user.id },
    data: {
      brandName: body.brandName ?? current.brandName,
      industry: body.industry ?? current.industry,
      targetMarkets: body.targetMarkets ?? current.targetMarkets,
      waPhoneNumberId: body.waPhoneNumberId ?? current.waPhoneNumberId,
      waAccessToken: body.waAccessToken === "" || body.waAccessToken ? body.waAccessToken : current.waAccessToken,
      waVerifyToken: body.waVerifyToken ?? current.waVerifyToken,
      waApiVersion: body.waApiVersion ?? current.waApiVersion,
    },
  });
  return NextResponse.json({
    ok: true,
    whatsapp: {
      phoneNumberId: updated.waPhoneNumberId,
      verifyToken: updated.waVerifyToken,
      hasToken: Boolean(updated.waAccessToken),
    },
  });
}

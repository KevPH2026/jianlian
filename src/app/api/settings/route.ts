import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { smtpConfigured } from "@/lib/mailer";
import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const cfg = await getWhatsAppConfig();
  const setting = await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", brandName: "建联", industry: "汽车后市场配件", targetMarkets: "中东,非洲,东南亚,东欧" },
  });
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
      phoneNumberId: cfg.phoneNumberId,
      verifyToken: cfg.verifyToken,
      apiVersion: cfg.apiVersion,
      hasToken: Boolean(cfg.accessToken),
      webhookPath: "/api/whatsapp/webhook",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const body = await req.json();
  const current = await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const updated = await prisma.setting.update({
    where: { id: "default" },
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

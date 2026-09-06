import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";
import { smtpConfigured } from "@/lib/mailer";
import { getOrCreateSetting, getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp";
import { STALLED_DAYS } from "@/lib/constants";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const cfg = await getWhatsAppConfig(user.id);
  const setting = await getOrCreateSetting(user.id);
  const stalledDays =
    typeof (setting as { stalledDays?: number }).stalledDays === "number"
      ? (setting as { stalledDays: number }).stalledDays
      : STALLED_DAYS;
  return NextResponse.json({
    brand: {
      brandName: setting.brandName,
      industry: setting.industry,
      targetMarkets: setting.targetMarkets,
    },
    stalledDays,
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
    proposalHandoff: {
      webhookConfigured: Boolean((process.env.PROPOSAL_HANDOFF_WEBHOOK_URL || "").trim()),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const current = await getOrCreateSetting(user.id);
  let stalledDays = (current as { stalledDays?: number }).stalledDays ?? STALLED_DAYS;
  if (body.stalledDays !== undefined && body.stalledDays !== null && body.stalledDays !== "") {
    const n = Number(body.stalledDays);
    if (!Number.isFinite(n) || n < 1 || n > 90) {
      return NextResponse.json({ error: "stalledDays 须为 1–90" }, { status: 400 });
    }
    stalledDays = Math.floor(n);
  }
  const updated = await prisma.setting.update({
    where: { userId: user.id },
    data: {
      brandName: body.brandName ?? current.brandName,
      industry: body.industry ?? current.industry,
      targetMarkets: body.targetMarkets ?? current.targetMarkets,
      stalledDays,
      waPhoneNumberId: body.waPhoneNumberId ?? current.waPhoneNumberId,
      waAccessToken: body.waAccessToken === "" || body.waAccessToken ? body.waAccessToken : current.waAccessToken,
      waVerifyToken: body.waVerifyToken ?? current.waVerifyToken,
      waApiVersion: body.waApiVersion ?? current.waApiVersion,
    },
  });
  return NextResponse.json({
    ok: true,
    stalledDays: updated.stalledDays,
    whatsapp: {
      phoneNumberId: updated.waPhoneNumberId,
      verifyToken: updated.waVerifyToken,
      hasToken: Boolean(updated.waAccessToken),
    },
  });
}

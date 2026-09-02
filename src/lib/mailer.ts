import nodemailer from "nodemailer";
import { interpolateTemplate } from "./template";

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim());
}

export function getFromAddress(): string {
  return process.env.SMTP_FROM || "建联 <noreply@jianlian.local>";
}

export function createTransport() {
  if (!smtpConfigured()) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  vars?: { name?: string | null; company?: string | null; title?: string | null };
};

export type SendEmailResult = {
  ok: boolean;
  dryRun: boolean;
  messageId?: string;
  error?: string;
  subject: string;
  body: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const subject = interpolateTemplate(input.subject, input.vars || {});
  const body = interpolateTemplate(input.body, input.vars || {});
  if (!smtpConfigured()) {
    return { ok: true, dryRun: true, subject, body };
  }
  const transport = createTransport();
  if (!transport) {
    return { ok: true, dryRun: true, subject, body };
  }
  try {
    const info = await transport.sendMail({
      from: getFromAddress(),
      to: input.to,
      subject,
      text: body,
    });
    return { ok: true, dryRun: false, messageId: info.messageId, subject, body };
  } catch (err) {
    return {
      ok: false,
      dryRun: false,
      error: err instanceof Error ? err.message : String(err),
      subject,
      body,
    };
  }
}

export function hourlyLimit(): number {
  const n = Number(process.env.SEND_RATE_PER_HOUR || 20);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

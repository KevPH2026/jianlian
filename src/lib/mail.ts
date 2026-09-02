import nodemailer from "nodemailer";

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim());
}

export function mailFrom() {
  return process.env.SMTP_FROM || "建联 <noreply@jianlian.local>";
}

export function createTransport() {
  if (!smtpConfigured()) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
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

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; dryRun: boolean; error?: string }> {
  if (!opts.to) return { ok: false, dryRun: false, error: "missing to" };
  const transport = createTransport();
  if (!transport) {
    return { ok: true, dryRun: true };
  }
  try {
    await transport.sendMail({
      from: mailFrom(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return { ok: true, dryRun: false };
  } catch (e) {
    return { ok: false, dryRun: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

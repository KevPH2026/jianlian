import { prisma } from "./prisma";
import { digitsPhone, phonesMatch } from "./utils";
import { applyInboundReply } from "./sequence";

export async function findContactByPhone(phone: string) {
  const digits = digitsPhone(phone);
  if (!digits) return null;
  const contacts = await prisma.contact.findMany({
    where: { phone: { not: null } },
  });
  return contacts.find((c) => phonesMatch(c.phone, digits)) || null;
}

export async function findContactByEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  return prisma.contact.findFirst({
    where: { email: { equals: e, mode: "insensitive" } },
  });
}

export async function upsertThreadMessage(opts: {
  contactId: string;
  channel: "email" | "whatsapp";
  direction: "inbound" | "outbound";
  body: string;
  subject?: string;
}) {
  const thread = await prisma.thread.upsert({
    where: { contactId_channel: { contactId: opts.contactId, channel: opts.channel } },
    create: {
      contactId: opts.contactId,
      channel: opts.channel,
      subject: opts.subject || (opts.channel === "email" ? "邮件往来" : "WhatsApp"),
      lastMessageAt: new Date(),
      unread: opts.direction === "inbound",
    },
    update: {
      lastMessageAt: new Date(),
      unread: opts.direction === "inbound" ? true : undefined,
      subject: opts.subject || undefined,
    },
  });
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      direction: opts.direction,
      body: opts.body,
      channel: opts.channel,
    },
  });
  return { thread, message };
}

export async function recordInboundReply(opts: {
  contactId: string;
  channel: "email" | "whatsapp";
  body: string;
  subject?: string;
}) {
  await upsertThreadMessage({
    contactId: opts.contactId,
    channel: opts.channel,
    direction: "inbound",
    body: opts.body,
    subject: opts.subject,
  });

  const contact = await prisma.contact.update({
    where: { id: opts.contactId },
    data: { stage: "已回复", lastContactedAt: new Date() },
  });

  await prisma.activity.create({
    data: {
      contactId: opts.contactId,
      type: opts.channel === "whatsapp" ? "wa_received" : "email_replied",
      content: opts.body.slice(0, 2000),
      meta: { channel: opts.channel },
    },
  });

  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { contactId: opts.contactId, status: "active" },
  });
  const paused = applyInboundReply(enrollments);
  for (const e of paused) {
    if (e.status === "paused") {
      await prisma.sequenceEnrollment.update({
        where: { id: e.id },
        data: { status: "paused", pausedReason: "replied" },
      });
    }
  }

  const recipients = await prisma.campaignRecipient.findMany({
    where: { contactId: opts.contactId, status: "sent" },
  });
  for (const r of recipients) {
    await prisma.campaignRecipient.update({
      where: { id: r.id },
      data: { status: "replied" },
    });
  }

  return contact;
}

export async function recordOutbound(opts: {
  contactId: string;
  channel: "email" | "whatsapp";
  body: string;
  subject?: string;
  dryRun?: boolean;
  activityType?: string;
}) {
  await upsertThreadMessage({
    contactId: opts.contactId,
    channel: opts.channel,
    direction: "outbound",
    body: opts.dryRun ? `[dry-run] ${opts.body}` : opts.body,
    subject: opts.subject,
  });
  await prisma.contact.update({
    where: { id: opts.contactId },
    data: {
      lastContactedAt: new Date(),
      stage: opts.dryRun ? undefined : "已触达",
    },
  });
  await prisma.activity.create({
    data: {
      contactId: opts.contactId,
      type: opts.activityType || (opts.channel === "whatsapp" ? "wa_sent" : "email_sent"),
      content: (opts.dryRun ? "[dry-run] " : "") + (opts.subject ? `${opts.subject}\n` : "") + opts.body.slice(0, 2000),
      meta: { channel: opts.channel, dryRun: Boolean(opts.dryRun) },
    },
  });
  await prisma.sendLog.create({ data: { channel: opts.channel } });
}

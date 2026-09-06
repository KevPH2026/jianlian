import { prisma } from "./prisma";
import { sendEmail, hourlyLimit, smtpConfigured } from "./mailer";
import { recordOutbound } from "./inbox";
import { parseSteps, advanceAfterStep, pauseOnDoNotContact } from "./sequence";
import { interpolateTemplate } from "./template";
import { getWhatsAppConfig, isWhatsAppConfigured, sendWhatsAppText } from "./whatsapp";

export async function sentInLastHour(userId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.sendLog.count({ where: { userId, createdAt: { gte: since } } });
}

export async function remainingQuota(userId: string, limit?: number): Promise<number> {
  const cap = limit ?? hourlyLimit();
  const used = await sentInLastHour(userId);
  return Math.max(0, cap - used);
}

export async function processCampaigns(maxN = 20): Promise<number> {
  const campaigns = await prisma.campaign.findMany({ where: { status: "sending" } });
  let processed = 0;
  for (const campaign of campaigns) {
    const left = await remainingQuota(campaign.userId, campaign.rateLimitPerHour);
    if (left <= 0) continue;
    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, status: "queued" },
      include: { contact: true },
      take: Math.min(left, maxN - processed),
    });
    const template = await prisma.emailTemplate.findFirst({
      where: { id: campaign.templateId, userId: campaign.userId },
    });
    if (!template) continue;
    for (const rec of recipients) {
      if (processed >= maxN) return processed;
      const c = rec.contact;
      if (c.doNotContact || !c.email) {
        await prisma.campaignRecipient.update({
          where: { id: rec.id },
          data: { status: "skipped", error: c.doNotContact ? "勿联系" : "无邮箱" },
        });
        continue;
      }
      const result = await sendEmail({
        to: c.email,
        subject: template.subject,
        body: template.body,
        vars: c,
      });
      if (!result.ok) {
        await prisma.campaignRecipient.update({
          where: { id: rec.id },
          data: { status: "bounced", error: result.error, sentAt: new Date() },
        });
        await prisma.activity.create({
          data: { contactId: c.id, type: "email_bounced", content: result.error || "bounce" },
        });
        processed++;
        continue;
      }
      await prisma.campaignRecipient.update({
        where: { id: rec.id },
        data: { status: "sent", sentAt: new Date(), dryRun: result.dryRun },
      });
      await recordOutbound({
        contactId: c.id,
        channel: "email",
        subject: result.subject,
        body: result.body,
        dryRun: result.dryRun,
        userId: campaign.userId,
      });
      processed++;
    }
    const remaining = await prisma.campaignRecipient.count({
      where: { campaignId: campaign.id, status: "queued" },
    });
    if (remaining === 0) {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "done" } });
    }
  }
  return processed;
}

export async function processDueSequences(maxN = 20): Promise<number> {
  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: "active", nextRunAt: { lte: new Date() } },
    include: { sequence: true, contact: true },
    take: maxN,
  });
  let processed = 0;
  for (const enrollment of due) {
    const contact = enrollment.contact;
    if (contact.doNotContact) {
      const next = pauseOnDoNotContact(enrollment);
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: next.status, pausedReason: next.pausedReason },
      });
      continue;
    }
    const steps = parseSteps(enrollment.sequence.steps);
    if (!steps.length || enrollment.currentStep >= steps.length) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", nextRunAt: null },
      });
      continue;
    }

    let current = { status: enrollment.status, currentStep: enrollment.currentStep, pausedReason: enrollment.pausedReason };
    let guard = 0;
    while (guard++ < 10 && current.status === "active" && current.currentStep < steps.length) {
      const step = steps[current.currentStep];
      if (step.type === "wait") {
        const adv = advanceAfterStep(current, steps, new Date());
        current = { ...current, ...adv };
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: adv.status, currentStep: adv.currentStep, nextRunAt: adv.nextRunAt },
        });
        break;
      }
      if (step.type === "email") {
        const tpl = await prisma.emailTemplate.findFirst({
          where: { id: step.templateId, userId: contact.userId },
        });
        if (!tpl || !contact.email) {
          const adv = advanceAfterStep(current, steps, new Date());
          current = { ...current, ...adv };
          await prisma.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: adv.status, currentStep: adv.currentStep, nextRunAt: adv.nextRunAt, pausedReason: tpl ? "无邮箱跳过" : "模板缺失" },
          });
          processed++;
          if (adv.nextRunAt && adv.nextRunAt.getTime() > Date.now() + 1000) break;
          continue;
        }
        const quota = await remainingQuota(contact.userId);
        if (quota <= 0) break;
        const result = await sendEmail({
          to: contact.email,
          subject: tpl.subject,
          body: tpl.body,
          vars: contact,
        });
        if (!result.ok) {
          await prisma.activity.create({
            data: { contactId: contact.id, type: "email_bounced", content: result.error || "bounce" },
          });
        } else {
          await recordOutbound({
            contactId: contact.id,
            channel: "email",
            subject: result.subject,
            body: result.body,
            dryRun: result.dryRun,
            userId: contact.userId,
          });
        }
        const adv = advanceAfterStep(current, steps, new Date());
        current = { ...current, ...adv };
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: adv.status, currentStep: adv.currentStep, nextRunAt: adv.nextRunAt },
        });
        processed++;
        if (adv.nextRunAt && adv.nextRunAt.getTime() > Date.now() + 1000) break;
        continue;
      }
      if (step.type === "whatsapp") {
        const cfg = await getWhatsAppConfig(contact.userId);
        const text = interpolateTemplate(step.body, contact);
        if (isWhatsAppConfigured(cfg) && contact.phone && text) {
          const result = await sendWhatsAppText(contact.phone, text, contact.userId);
          if (result.ok) {
            await recordOutbound({ contactId: contact.id, channel: "whatsapp", body: text, userId: contact.userId });
          }
        }
        const adv = advanceAfterStep(current, steps, new Date());
        current = { ...current, ...adv };
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: adv.status, currentStep: adv.currentStep, nextRunAt: adv.nextRunAt },
        });
        processed++;
        if (adv.nextRunAt && adv.nextRunAt.getTime() > Date.now() + 1000) break;
      }
    }
  }
  return processed;
}

export { smtpConfigured };

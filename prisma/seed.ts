import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  DTC_SETTING,
  buildDemoContacts,
  DEMO_THREADS,
  daysAgo,
} from "../src/lib/dtc-defaults";
import { INTENT_TEMPLATES } from "../src/lib/intent-templates";

const prisma = new PrismaClient();

async function upsertIntentTemplates(userId: string) {
  const ids: Record<string, string> = {};
  for (const t of INTENT_TEMPLATES) {
    let row = await prisma.emailTemplate.findFirst({ where: { name: t.name, userId } });
    if (!row) {
      row = await prisma.emailTemplate.create({
        data: { userId, name: t.name, subject: t.subject, body: t.body },
      });
    } else {
      row = await prisma.emailTemplate.update({
        where: { id: row.id },
        data: { subject: t.subject, body: t.body },
      });
    }
    ids[t.intent] = row.id;
  }
  return ids;
}

async function main() {
  const passwordHash = await bcrypt.hash("admin12345", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@jianlian.local" },
    update: { passwordHash, name: "管理员", role: "ADMIN" },
    create: { email: "admin@jianlian.local", passwordHash, name: "管理员", role: "ADMIN" },
  });

  await prisma.setting.upsert({
    where: { userId: admin.id },
    update: {
      brandName: DTC_SETTING.brandName,
      industry: DTC_SETTING.industry,
      targetMarkets: DTC_SETTING.targetMarkets,
      stalledDays: 5,
    },
    create: {
      userId: admin.id,
      brandName: DTC_SETTING.brandName,
      industry: DTC_SETTING.industry,
      targetMarkets: DTC_SETTING.targetMarkets,
      stalledDays: 5,
      waVerifyToken: "jianlian-verify",
      waApiVersion: "v21.0",
    },
  });

  const tplIds = await upsertIntentTemplates(admin.id);

  let sequence = await prisma.sequence.findFirst({ where: { name: "默认 4 触达", userId: admin.id } });
  const steps = [
    { type: "email", templateId: tplIds["破冰"] },
    { type: "wait", waitDays: 3 },
    { type: "email", templateId: tplIds["价值"] },
    { type: "wait", waitDays: 4 },
    { type: "email", templateId: tplIds["催约"] },
    { type: "wait", waitDays: 7 },
    { type: "email", templateId: tplIds["停损"] },
  ];
  if (!sequence) {
    sequence = await prisma.sequence.create({
      data: { userId: admin.id, name: "默认 4 触达", steps },
    });
  } else {
    sequence = await prisma.sequence.update({
      where: { id: sequence.id },
      data: { steps },
    });
  }

  if ((await prisma.contact.count({ where: { userId: admin.id } })) > 0) {
    console.log("seed: contacts exist, refreshed settings + 四意图模板 + sequence");
    return;
  }

  const rows = buildDemoContacts();
  const created = [];
  for (const c of rows) {
    const row = await prisma.contact.create({ data: { ...c, userId: admin.id } });
    created.push(row);
    await prisma.activity.create({
      data: { contactId: row.id, type: "created", content: "种子数据建档" },
    });
  }

  for (const t of DEMO_THREADS) {
    const contact = created[t.contactIndex];
    if (!contact) continue;
    await prisma.thread.create({
      data: {
        contactId: contact.id,
        channel: t.channel,
        subject: t.subject,
        lastMessageAt: daysAgo(t.lastMessageDaysAgo),
        unread: t.unread,
        messages: {
          create: t.messages.map((m) => ({
            direction: m.direction,
            channel: m.channel,
            body: m.body,
            createdAt: daysAgo(m.daysAgo),
          })),
        },
      },
    });
  }

  const stalled = created[2];
  const fresh = created[3];
  if (stalled) {
    await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: stalled.id,
        status: "active",
        currentStep: 2,
        nextRunAt: daysAgo(1),
      },
    });
  }
  if (fresh) {
    await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: sequence.id,
        contactId: fresh.id,
        status: "active",
        currentStep: 0,
        nextRunAt: new Date(),
      },
    });
  }
  await prisma.sendLog.create({
    data: { userId: admin.id, channel: "email", createdAt: daysAgo(6) },
  });

  console.log("seed: admin + DTC demo + 四意图模板 + 0/3/7/14 sequence");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

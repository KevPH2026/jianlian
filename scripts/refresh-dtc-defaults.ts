/**
 * Production refresh: switch admin Setting + 「首封介绍」 to DTC brand-growth defaults,
 * replace demo contacts (email %.example) with new DTC rows.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/refresh-dtc-defaults.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  DTC_SETTING,
  INTRO_TEMPLATE,
  INTENT_TEMPLATES,
  buildDemoContacts,
  DEMO_THREADS,
  daysAgo,
} from "../src/lib/dtc-defaults";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@jianlian.local" } });
  if (!admin) {
    throw new Error("admin@jianlian.local not found — run db:seed first or create the admin user");
  }

  await prisma.setting.upsert({
    where: { userId: admin.id },
    update: {
      brandName: DTC_SETTING.brandName,
      industry: DTC_SETTING.industry,
      targetMarkets: DTC_SETTING.targetMarkets,
    },
    create: {
      userId: admin.id,
      brandName: DTC_SETTING.brandName,
      industry: DTC_SETTING.industry,
      targetMarkets: DTC_SETTING.targetMarkets,
      waVerifyToken: "jianlian-verify",
      waApiVersion: "v21.0",
    },
  });
  console.log("updated Setting →", DTC_SETTING);

  const intentIds: Record<string, string> = {};
  for (const it of INTENT_TEMPLATES) {
    let row = await prisma.emailTemplate.findFirst({ where: { name: it.name, userId: admin.id } });
    if (!row) {
      row = await prisma.emailTemplate.create({
        data: { userId: admin.id, name: it.name, subject: it.subject, body: it.body },
      });
    } else {
      row = await prisma.emailTemplate.update({
        where: { id: row.id },
        data: { subject: it.subject, body: it.body },
      });
    }
    intentIds[it.intent] = row.id;
  }
  const seq = await prisma.sequence.findFirst({ where: { name: "默认 4 触达", userId: admin.id } });
  if (seq && intentIds["破冰"]) {
    await prisma.sequence.update({
      where: { id: seq.id },
      data: {
        steps: [
          { type: "email", templateId: intentIds["破冰"] },
          { type: "wait", waitDays: 3 },
          { type: "email", templateId: intentIds["价值"] },
          { type: "wait", waitDays: 4 },
          { type: "email", templateId: intentIds["催约"] },
          { type: "wait", waitDays: 7 },
          { type: "email", templateId: intentIds["停损"] },
        ],
      },
    });
  }


  const tpl = await prisma.emailTemplate.findFirst({
    where: { name: INTRO_TEMPLATE.name, userId: admin.id },
  });
  if (tpl) {
    await prisma.emailTemplate.update({
      where: { id: tpl.id },
      data: { subject: INTRO_TEMPLATE.subject, body: INTRO_TEMPLATE.body },
    });
    console.log("updated template", INTRO_TEMPLATE.name);
  } else {
    await prisma.emailTemplate.create({
      data: {
        userId: admin.id,
        name: INTRO_TEMPLATE.name,
        subject: INTRO_TEMPLATE.subject,
        body: INTRO_TEMPLATE.body,
      },
    });
    console.log("created template", INTRO_TEMPLATE.name);
  }

  const demoContacts = await prisma.contact.findMany({
    where: { userId: admin.id, email: { endsWith: ".example" } },
    select: { id: true, email: true, company: true },
  });

  if (demoContacts.length === 0) {
    console.log("no %.example demo contacts — settings/template only; skip re-insert");
    return;
  }

  const ids = demoContacts.map((c) => c.id);
  console.log(`deleting ${ids.length} demo contacts (%.example) + cascades…`);
  await prisma.contact.deleteMany({ where: { id: { in: ids } } });

  const rows = buildDemoContacts();
  const created = [];
  for (const c of rows) {
    const row = await prisma.contact.create({ data: { ...c, userId: admin.id } });
    created.push(row);
    await prisma.activity.create({
      data: { contactId: row.id, type: "created", content: "DTC 演示数据刷新" },
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

  console.log(`re-inserted ${created.length} DTC demo contacts + ${DEMO_THREADS.length} threads`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

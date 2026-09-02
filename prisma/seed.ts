import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin12345", 10);
  await prisma.user.upsert({
    where: { email: "admin@jianlian.local" },
    update: { passwordHash, name: "管理员" },
    create: { email: "admin@jianlian.local", passwordHash, name: "管理员" },
  });

  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      brandName: "建联",
      industry: "汽车后市场配件",
      targetMarkets: "中东,非洲,东南亚,东欧,拉美",
      waVerifyToken: "jianlian-verify",
      waApiVersion: "v21.0",
    },
  });

  let tpl = await prisma.emailTemplate.findFirst({ where: { name: "首封介绍" } });
  if (!tpl) {
    tpl = await prisma.emailTemplate.create({
      data: {
        name: "首封介绍",
        subject: "{{company}} 合作机会 — 写给 {{name}}",
        body: `Hi {{name}},

我是建联负责 {{company}} 市场的客户经理。看到贵司在相关品类上的采购动作，想介绍我们可稳定供货、交期可控的方案。

若方便，本周用 15 分钟对齐规格与目标数量即可。

谢谢。`,
      },
    });
  }

  let sequence = await prisma.sequence.findFirst({ where: { name: "默认 4 触达" } });
  if (!sequence) {
    sequence = await prisma.sequence.create({
      data: {
        name: "默认 4 触达",
        steps: [
          { type: "email", templateId: tpl.id },
          { type: "wait", waitDays: 3 },
          { type: "email", templateId: tpl.id },
          { type: "wait", waitDays: 4 },
          { type: "email", templateId: tpl.id },
          { type: "wait", waitDays: 7 },
          { type: "email", templateId: tpl.id },
        ],
      },
    });
  }

  if ((await prisma.contact.count()) > 0) {
    console.log("seed: contacts exist, skip demo rows");
    return;
  }

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const rows = [
    {
      name: "Ahmed Hassan",
      company: "Al-Faisal Trading",
      title: "Procurement Director",
      email: "ahmed.hassan@alfaisal.example",
      phone: "+966500100001",
      country: "Saudi Arabia",
      language: "en",
      source: "canton_fair",
      productInterest: "brake pads",
      quantitySignal: "500 sets",
      icpScore: 8,
      leadTier: "HOT",
      score: 8,
      stage: "跟进中",
      bantBudget: true,
      bantAuthority: true,
      bantNeed: true,
      bantTimeline: false,
      nextAction: "发试样方案",
      lastContactedAt: daysAgo(1),
      tags: ["中东", "热"],
    },
    {
      name: "Elena Petrov",
      company: "Avtodetal LLC",
      title: "Buyer",
      email: "elena.petrov@avtodetal.example",
      phone: "+79001234567",
      country: "Russia",
      language: "en",
      source: "website",
      productInterest: "oil filters",
      quantitySignal: "2000 pcs",
      icpScore: 6,
      leadTier: "WARM",
      score: 6,
      stage: "已回复",
      bantBudget: false,
      bantAuthority: true,
      bantNeed: true,
      bantTimeline: false,
      nextAction: "确认滤芯规格",
      lastContactedAt: daysAgo(2),
      tags: ["东欧"],
    },
    {
      name: "Chinedu Okonkwo",
      company: "Lagos Auto Parts",
      title: "Owner",
      email: "chinedu@lagosauto.example",
      phone: "+2348012345678",
      country: "Nigeria",
      language: "en",
      source: "referral",
      productInterest: "suspension",
      icpScore: 5,
      leadTier: "WARM",
      score: 5,
      stage: "已触达",
      bantBudget: true,
      bantAuthority: true,
      bantNeed: false,
      bantTimeline: false,
      nextAction: "停滞跟进",
      lastContactedAt: daysAgo(8),
      tags: ["非洲", "停滞"],
    },
    {
      name: "Maria Santos",
      company: "Andes Motors",
      title: "Import Manager",
      email: "maria.santos@andesmotors.example",
      phone: "+56912345678",
      country: "Chile",
      language: "es",
      source: "cold_email",
      productInterest: "brake pads",
      icpScore: 4,
      leadTier: "WARM",
      score: 4,
      stage: "新线索",
      bantNeed: true,
      nextAction: "首封触达",
      lastContactedAt: null,
      tags: ["拉美"],
      createdAt: daysAgo(10),
    },
    {
      name: "Rajesh Kumar",
      company: "Bharat Fleet Supplies",
      title: "Fleet Manager",
      email: "rajesh.kumar@bharatfleet.example",
      phone: "+919876543210",
      country: "India",
      language: "en",
      source: "linkedin",
      productInterest: "filters",
      icpScore: 5,
      leadTier: "WARM",
      score: 5,
      stage: "新线索",
      bantAuthority: true,
      bantNeed: true,
      nextAction: "确认车队规模",
      tags: ["南亚"],
    },
    {
      name: "Fatima Al-Zahra",
      company: "Gulf Spare Hub",
      title: "CEO",
      email: "fatima@gulfspare.example",
      phone: "+971501112233",
      country: "UAE",
      language: "en",
      source: "whatsapp",
      productInterest: "suspension, filters",
      quantitySignal: "container",
      icpScore: 9,
      leadTier: "HOT",
      score: 9,
      stage: "跟进中",
      bantBudget: true,
      bantAuthority: true,
      bantNeed: true,
      bantTimeline: true,
      nextAction: "报价待确认",
      lastContactedAt: daysAgo(0),
      tags: ["中东", "热"],
    },
    {
      name: "Kenji Tanaka",
      company: "Osaka Aftermarket",
      title: "Purchasing",
      email: "kenji.tanaka@osakaam.example",
      phone: "+818012345678",
      country: "Japan",
      language: "en",
      source: "exhibition",
      productInterest: "brake pads",
      icpScore: 6,
      leadTier: "WARM",
      score: 6,
      stage: "已触达",
      bantNeed: true,
      bantTimeline: true,
      nextAction: "等待回复",
      lastContactedAt: daysAgo(2),
      tags: ["东亚"],
    },
    {
      name: "Sophie Martin",
      company: "EuroPart Distribution",
      title: "Sourcing",
      email: "sophie.martin@europart.example",
      phone: "+33601020304",
      country: "France",
      language: "fr",
      source: "cold_email",
      productInterest: "filters",
      icpScore: 2,
      leadTier: "COLD",
      score: 2,
      stage: "勿联系",
      doNotContact: true,
      nextAction: "勿联系",
      lastContactedAt: daysAgo(20),
      tags: ["退订"],
    },
  ];

  const created = [];
  for (const c of rows) {
    const row = await prisma.contact.create({ data: c });
    created.push(row);
    await prisma.activity.create({
      data: { contactId: row.id, type: "created", content: "种子数据建档" },
    });
  }

  const ahmed = created[0];
  const elena = created[1];
  const chinedu = created[2];
  const maria = created[3];

  await prisma.thread.create({
    data: {
      contactId: ahmed.id,
      channel: "whatsapp",
      subject: "WhatsApp",
      lastMessageAt: daysAgo(1),
      unread: false,
      messages: {
        create: [
          {
            direction: "inbound",
            channel: "whatsapp",
            body: "Need ceramic pads for Camry, 500 sets. FOB?",
            createdAt: daysAgo(3),
          },
          {
            direction: "outbound",
            channel: "whatsapp",
            body: "Hi Ahmed, ceramic or semi-metallic. 500 sets FOB Shanghai, 7-day lead.",
            createdAt: daysAgo(1),
          },
        ],
      },
    },
  });

  await prisma.thread.create({
    data: {
      contactId: elena.id,
      channel: "email",
      subject: "Filter RFQ",
      lastMessageAt: daysAgo(2),
      unread: true,
      messages: {
        create: [
          {
            direction: "outbound",
            channel: "email",
            body: "Hi Elena, sharing our oil filter range for fleet distributors.",
            createdAt: daysAgo(5),
          },
          {
            direction: "inbound",
            channel: "email",
            body: "Please quote 2000 pcs OEM equivalent for Toyota 90915-YZZD3.",
            createdAt: daysAgo(2),
          },
        ],
      },
    },
  });

  await prisma.sequenceEnrollment.create({
    data: {
      sequenceId: sequence.id,
      contactId: chinedu.id,
      status: "active",
      currentStep: 2,
      nextRunAt: daysAgo(1),
    },
  });
  await prisma.sequenceEnrollment.create({
    data: {
      sequenceId: sequence.id,
      contactId: maria.id,
      status: "active",
      currentStep: 0,
      nextRunAt: new Date(),
    },
  });
  await prisma.sendLog.create({
    data: { channel: "email", createdAt: daysAgo(6) },
  });

  console.log("seed: admin + 8 contacts + 1 template + 1 sequence");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

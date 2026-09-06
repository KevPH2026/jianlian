/** Shared DTC brand-growth defaults for seed + production refresh. */

export const DTC_SETTING = {
  brandName: "dtc.lab",
  industry: "DTC品牌增长",
  targetMarkets: "独立站,Shopify卖家,新消费品牌,美妆个护,服饰,家居",
} as const;

export const INTRO_TEMPLATE = {
  name: "首封介绍",
  subject: "{{company}} × dtc.lab — 写给 {{name}} 的增长提案",
  body: `Hi {{name}},

我是 dtc.lab，帮 DTC / 独立站品牌做冷启动与增长资产搭建。看到 {{company}} 在相关品类上的动作，想聊聊如何用内容、投放诊断与漏斗对齐，把线索变成可复用的增长资产。

若方便，约 15 分钟对齐预算与目标即可——不谈供货交期，只谈增长与提案。

Thanks / 谢谢。`,
} as const;

export type DemoContactSeed = {
  name: string;
  company: string;
  title: string;
  email: string;
  phone?: string;
  country?: string;
  language?: string;
  source: string;
  productInterest: string;
  quantitySignal?: string;
  icpScore: number;
  leadTier: string;
  score: number;
  stage: string;
  bantBudget?: boolean;
  bantAuthority?: boolean;
  bantNeed?: boolean;
  bantTimeline?: boolean;
  nextAction: string;
  lastContactedAt?: Date | null;
  tags: string[];
  createdAt?: Date;
  doNotContact?: boolean;
};

export function daysAgo(n: number, now = Date.now()): Date {
  return new Date(now - n * 24 * 60 * 60 * 1000);
}

/** ~8 fictional DTC brand founders / CMOs / growth leads. */
export function buildDemoContacts(now = Date.now()): DemoContactSeed[] {
  const d = (n: number) => daysAgo(n, now);
  return [
    {
      name: "林晓雯",
      company: "GlowLab Beauty",
      title: "Founder / 主理人",
      email: "xiaowen.lin@glowlab.example",
      phone: "+8613810002001",
      country: "China",
      language: "zh",
      source: "referral",
      productInterest: "冷启动提案,美妆个护",
      quantitySignal: "月投放 8万+",
      icpScore: 9,
      leadTier: "HOT",
      score: 9,
      stage: "跟进中",
      bantBudget: true,
      bantAuthority: true,
      bantNeed: true,
      bantTimeline: true,
      nextAction: "发冷启动提案大纲",
      lastContactedAt: d(1),
      tags: ["美妆", "独立站", "热"],
    },
    {
      name: "Jordan Lee",
      company: "Northloom Home",
      title: "CMO",
      email: "jordan.lee@northloom.example",
      phone: "+14155550102",
      country: "United States",
      language: "en",
      source: "website",
      productInterest: "内容增长,家居",
      quantitySignal: "内容团队外包",
      icpScore: 7,
      leadTier: "HOT",
      score: 7,
      stage: "已回复",
      bantBudget: true,
      bantAuthority: true,
      bantNeed: true,
      bantTimeline: false,
      nextAction: "对齐内容日历与 KPI",
      lastContactedAt: d(2),
      tags: ["家居", "独立站"],
    },
    {
      name: "陈予安",
      company: "Threadform Apparel",
      title: "Growth Lead",
      email: "yuan.chen@threadform.example",
      phone: "+8613910003003",
      country: "China",
      language: "zh",
      source: "cold_email",
      productInterest: "投放诊断,服饰",
      icpScore: 6,
      leadTier: "WARM",
      score: 6,
      stage: "已触达",
      bantBudget: true,
      bantAuthority: false,
      bantNeed: true,
      bantTimeline: false,
      nextAction: "停滞跟进 — 投放下滑复盘",
      lastContactedAt: d(8),
      tags: ["服饰", "停滞"],
    },
    {
      name: "Sofia Mendes",
      company: "VitaSip Wellness",
      title: "Brand Director",
      email: "sofia.mendes@vitasip.example",
      phone: "+351910000004",
      country: "Portugal",
      language: "en",
      source: "linkedin",
      productInterest: "冷启动提案,新消费品牌",
      icpScore: 5,
      leadTier: "WARM",
      score: 5,
      stage: "新线索",
      bantNeed: true,
      bantAuthority: true,
      nextAction: "首封增长提案触达",
      lastContactedAt: null,
      tags: ["新消费", "独立站"],
      createdAt: d(10),
    },
    {
      name: "韩思齐",
      company: "Petora Studio",
      title: "Head of Marketing",
      email: "siqi.han@petora.example",
      phone: "+8613710005005",
      country: "China",
      language: "zh",
      source: "event",
      productInterest: "内容增长,Shopify卖家",
      icpScore: 6,
      leadTier: "WARM",
      score: 6,
      stage: "新线索",
      bantAuthority: true,
      bantNeed: true,
      nextAction: "确认 Shopify 店铺与内容资产",
      tags: ["Shopify卖家"],
    },
    {
      name: "Maya Okonkwo",
      company: "Lumen Skin Co",
      title: "CEO",
      email: "maya@lumenskin.example",
      phone: "+447700900006",
      country: "United Kingdom",
      language: "en",
      source: "referral",
      productInterest: "投放诊断,美妆个护",
      quantitySignal: "Q4 增长冲刺",
      icpScore: 8,
      leadTier: "HOT",
      score: 8,
      stage: "跟进中",
      bantBudget: true,
      bantAuthority: true,
      bantNeed: true,
      bantTimeline: true,
      nextAction: "提案报价待确认",
      lastContactedAt: d(0),
      tags: ["美妆", "热"],
    },
    {
      name: "赵一诺",
      company: "CasaMint Living",
      title: "品牌负责人",
      email: "yinuo.zhao@casamint.example",
      phone: "+8618610007007",
      country: "China",
      language: "zh",
      source: "linkedin",
      productInterest: "内容增长,家居",
      icpScore: 5,
      leadTier: "WARM",
      score: 5,
      stage: "已触达",
      bantNeed: true,
      bantTimeline: true,
      nextAction: "等待回复 — 增长诊断摘要",
      lastContactedAt: d(2),
      tags: ["家居", "独立站"],
    },
    {
      name: "Alex Rivera",
      company: "Driftwear Co",
      title: "Marketing Manager",
      email: "alex.rivera@driftwear.example",
      phone: "+12125550108",
      country: "United States",
      language: "en",
      source: "cold_email",
      productInterest: "投放诊断",
      icpScore: 2,
      leadTier: "COLD",
      score: 2,
      stage: "勿联系",
      doNotContact: true,
      nextAction: "勿联系",
      lastContactedAt: d(20),
      tags: ["退订"],
    },
  ];
}

export type DemoThreadSeed = {
  /** Index into buildDemoContacts() result */
  contactIndex: number;
  channel: string;
  subject: string;
  lastMessageDaysAgo: number;
  unread: boolean;
  messages: { direction: string; channel: string; body: string; daysAgo: number }[];
};

export const DEMO_THREADS: DemoThreadSeed[] = [
  {
    contactIndex: 0,
    channel: "email",
    subject: "冷启动提案跟进",
    lastMessageDaysAgo: 1,
    unread: false,
    messages: [
      {
        direction: "inbound",
        channel: "email",
        body: "想了解你们怎么帮独立站美妆做冷启动，有没有 15 分钟可以对齐预算？",
        daysAgo: 3,
      },
      {
        direction: "outbound",
        channel: "email",
        body: "Hi 晓雯，可以。我们通常先看店铺资产与投放漏斗，再给一版冷启动提案大纲。明天下午方便吗？",
        daysAgo: 1,
      },
    ],
  },
  {
    contactIndex: 1,
    channel: "email",
    subject: "Content growth inquiry",
    lastMessageDaysAgo: 2,
    unread: true,
    messages: [
      {
        direction: "outbound",
        channel: "email",
        body: "Hi Jordan, sharing a short note on how dtc.lab helps home brands turn content into a reusable growth asset.",
        daysAgo: 5,
      },
      {
        direction: "inbound",
        channel: "email",
        body: "Interesting — can you send a sample content calendar + how you measure CAC after 30 days?",
        daysAgo: 2,
      },
    ],
  },
];

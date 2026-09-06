import { prisma } from "./prisma";
import { listActiveBookingForContact } from "./bookings";

export type ProposalBrief = {
  company: string;
  contactName: string;
  title: string;
  productInterest: string;
  icpTags: string[];
  recentMessages: Array<{ direction: string; channel: string; body: string; createdAt: string }>;
  bant: { budget: boolean; authority: boolean; need: boolean; timeline: boolean };
  booking: { scheduledAt: string; meetingUrl: string | null } | null;
  contactUrl: string;
  quantitySignal: string;
};

export function buildContactDeepLink(contactId: string): string {
  const base = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/contacts/${contactId}`;
}

export async function buildProposalBrief(userId: string, contactId: string): Promise<ProposalBrief | null> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    include: {
      threads: {
        include: { messages: { orderBy: { createdAt: "desc" }, take: 5 } },
      },
    },
  });
  if (!contact) return null;

  const msgs = contact.threads
    .flatMap((t) =>
      t.messages.map((m) => ({
        direction: m.direction,
        channel: m.channel || t.channel,
        body: m.body.slice(0, 500),
        createdAt: m.createdAt.toISOString(),
      }))
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-5);

  const booking = await listActiveBookingForContact(userId, contactId);

  return {
    company: contact.company,
    contactName: contact.name,
    title: contact.title,
    productInterest: contact.productInterest,
    icpTags: contact.tags || [],
    recentMessages: msgs,
    bant: {
      budget: contact.bantBudget,
      authority: contact.bantAuthority,
      need: contact.bantNeed,
      timeline: contact.bantTimeline,
    },
    booking: booking
      ? { scheduledAt: booking.scheduledAt.toISOString(), meetingUrl: booking.meetingUrl }
      : null,
    contactUrl: buildContactDeepLink(contactId),
    quantitySignal: contact.quantitySignal || "",
  };
}

export function formatBriefText(brief: ProposalBrief): string {
  const lines = [
    "【提案作战 brief】",
    `公司：${brief.company}`,
    `联系人：${brief.contactName}${brief.title ? `（${brief.title}）` : ""}`,
    `品类/意向：${brief.productInterest || "—"}`,
    `ICP 标签：${brief.icpTags.join(", ") || "—"}`,
    `预算信号：${brief.quantitySignal || "—"}`,
    `BANT：预算 ${brief.bant.budget ? "✓" : "✗"} / 决策 ${brief.bant.authority ? "✓" : "✗"} / 需求 ${brief.bant.need ? "✓" : "✗"} / 时间 ${brief.bant.timeline ? "✓" : "✗"}`,
    brief.booking
      ? `已约：${brief.booking.scheduledAt}${brief.booking.meetingUrl ? ` · ${brief.booking.meetingUrl}` : ""}`
      : "已约：—",
    `深链：${brief.contactUrl}`,
    "最近对话：",
    ...brief.recentMessages.map(
      (m) => `- [${m.direction}/${m.channel}] ${m.body.replace(/\s+/g, " ").slice(0, 160)}`
    ),
  ];
  return lines.join("\n");
}

export async function handoffToProposalAgent(opts: {
  userId: string;
  contactId: string;
}): Promise<{
  ok: boolean;
  error?: string;
  brief?: ProposalBrief;
  briefText?: string;
  activityId?: string;
  webhook: { attempted: boolean; ok: boolean; status?: number; error?: string };
}> {
  const brief = await buildProposalBrief(opts.userId, opts.contactId);
  if (!brief) return { ok: false, error: "不存在", webhook: { attempted: false, ok: false } };

  const briefText = formatBriefText(brief);
  const activity = await prisma.activity.create({
    data: {
      contactId: opts.contactId,
      type: "proposal_handoff",
      content: briefText,
      meta: { brief },
    },
  });

  const webhookUrl = (process.env.PROPOSAL_HANDOFF_WEBHOOK_URL || "").trim();
  let webhook: { attempted: boolean; ok: boolean; status?: number; error?: string } = {
    attempted: false,
    ok: false,
  };

  if (webhookUrl) {
    webhook.attempted = true;
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "proposal_handoff",
          agent: "提案作战官",
          userId: opts.userId,
          contactId: opts.contactId,
          brief,
          briefText,
          activityId: activity.id,
        }),
      });
      webhook.status = res.status;
      webhook.ok = res.ok;
      if (!res.ok) webhook.error = `webhook HTTP ${res.status}`;
    } catch (e) {
      webhook.error = e instanceof Error ? e.message : "webhook failed";
    }
  }

  return {
    ok: true,
    brief,
    briefText,
    activityId: activity.id,
    webhook,
  };
}

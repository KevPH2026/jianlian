import { prisma } from "./prisma";
import { STALLED_DAYS } from "./constants";
import { countWeeklyBookings } from "./bookings";
import { getOrCreateSetting } from "./whatsapp";

export type TodayContact = {
  id: string;
  name: string;
  company: string;
  stage: string;
  leadTier: string;
  productInterest: string;
  nextAction: string;
  lastContactedAt: Date | null;
  tags: string[];
};

function stalledCutoff(stalledDays: number, now = new Date()) {
  return new Date(now.getTime() - stalledDays * 24 * 60 * 60 * 1000);
}

function stopCutoff(stalledDays: number, now = new Date()) {
  const days = Math.max(stalledDays * 2, 14);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getStalledDays(userId: string): Promise<number> {
  const setting = await getOrCreateSetting(userId);
  const n = (setting as { stalledDays?: number }).stalledDays;
  return typeof n === "number" && n > 0 ? n : STALLED_DAYS;
}

/** 该回：有入站回复待处理（阶段=已回复） */
export async function listNeedReply(userId: string): Promise<TodayContact[]> {
  return prisma.contact.findMany({
    where: {
      userId,
      doNotContact: false,
      stage: "已回复",
    },
    orderBy: [{ lastContactedAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      company: true,
      stage: true,
      leadTier: true,
      productInterest: true,
      nextAction: true,
      lastContactedAt: true,
      tags: true,
    },
  });
}

/** 该跟：停滞超过 stalledDays，且非勿联系/对齐中/已回复 */
export async function listNeedFollow(userId: string, stalledDays?: number): Promise<TodayContact[]> {
  const days = stalledDays ?? (await getStalledDays(userId));
  const before = stalledCutoff(days);
  return prisma.contact.findMany({
    where: {
      userId,
      doNotContact: false,
      stage: { in: ["新线索", "已触达", "跟进中"] },
      OR: [
        { lastContactedAt: { lte: before } },
        { lastContactedAt: null, createdAt: { lte: before } },
      ],
    },
    orderBy: [{ lastContactedAt: "asc" }, { createdAt: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      company: true,
      stage: true,
      leadTier: true,
      productInterest: true,
      nextAction: true,
      lastContactedAt: true,
      tags: true,
    },
  });
}

/** 该停：触达后长期无回复，建议停损 */
export async function listNeedStop(userId: string, stalledDays?: number): Promise<TodayContact[]> {
  const days = stalledDays ?? (await getStalledDays(userId));
  const before = stopCutoff(days);
  return prisma.contact.findMany({
    where: {
      userId,
      doNotContact: false,
      stage: { in: ["已触达", "跟进中"] },
      OR: [
        { lastContactedAt: { lte: before } },
        { lastContactedAt: null, createdAt: { lte: before } },
      ],
    },
    orderBy: [{ lastContactedAt: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      company: true,
      stage: true,
      leadTier: true,
      productInterest: true,
      nextAction: true,
      lastContactedAt: true,
      tags: true,
    },
  });
}

export async function buildTodayPayload(userId: string) {
  const stalledDays = await getStalledDays(userId);
  const [needReply, needFollow, needStop, weeklyBookings] = await Promise.all([
    listNeedReply(userId),
    listNeedFollow(userId, stalledDays),
    listNeedStop(userId, stalledDays),
    countWeeklyBookings(userId),
  ]);
  // Avoid double-listing: 该停 excludes those already in 该跟 when same set — keep both lists independent by definition
  return {
    stalledDays,
    needReply,
    needFollow,
    needStop,
    weeklyBookings,
  };
}

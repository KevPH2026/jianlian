import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";
import { STAGES } from "@/lib/stages";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stalledBefore = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const owned = { userId: user.id };
  const [contacts, sends, unreplied, enrollActive, enrollPaused, enrollCompleted, stalled, sequenceDue] =
    await Promise.all([
      prisma.contact.groupBy({ by: ["stage"], where: owned, _count: { _all: true } }),
      prisma.sendLog.count({ where: { userId: user.id, createdAt: { gte: since } } }),
      prisma.contact.count({ where: { userId: user.id, stage: "已触达" } }),
      prisma.sequenceEnrollment.count({ where: { status: "active", sequence: owned } }),
      prisma.sequenceEnrollment.count({ where: { status: "paused", sequence: owned } }),
      prisma.sequenceEnrollment.count({ where: { status: "completed", sequence: owned } }),
      prisma.contact.count({
        where: {
          userId: user.id,
          doNotContact: false,
          stage: { not: "勿联系" },
          OR: [
            { lastContactedAt: { lte: stalledBefore } },
            { lastContactedAt: null, createdAt: { lte: stalledBefore } },
          ],
        },
      }),
      prisma.sequenceEnrollment.count({
        where: { status: "active", nextRunAt: { lte: new Date() }, sequence: owned },
      }),
    ]);
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const row of contacts) byStage[row.stage] = row._count._all;
  const enroll = { active: enrollActive, paused: enrollPaused, completed: enrollCompleted };
  const recent = await prisma.activity.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    where: { contact: { userId: user.id } },
    include: { contact: { select: { name: true } } },
  });
  const totalContacts = contacts.reduce((n, r) => n + r._count._all, 0);
  return NextResponse.json({
    byStage,
    totalContacts,
    sendsLast7Days: sends,
    unreplied,
    enrollments: enroll,
    recent,
    stalled,
    sequenceDue,
    sends7d: sends,
    total: totalContacts,
    stageCounts: byStage,
  });
}

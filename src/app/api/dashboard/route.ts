import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { STAGES } from "@/lib/stages";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stalledBefore = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const [contacts, sends, unreplied, enrollments, stalled, sequenceDue] = await Promise.all([
    prisma.contact.groupBy({ by: ["stage"], _count: { _all: true } }),
    prisma.sendLog.count({ where: { createdAt: { gte: since } } }),
    prisma.contact.count({ where: { stage: "已触达" } }),
    prisma.sequenceEnrollment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contact.count({
      where: {
        doNotContact: false,
        stage: { not: "勿联系" },
        OR: [
          { lastContactedAt: { lte: stalledBefore } },
          { lastContactedAt: null, createdAt: { lte: stalledBefore } },
        ],
      },
    }),
    prisma.sequenceEnrollment.count({
      where: { status: "active", nextRunAt: { lte: new Date() } },
    }),
  ]);
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const row of contacts) byStage[row.stage] = row._count._all;
  const enroll = { active: 0, paused: 0, completed: 0 };
  for (const row of enrollments) {
    if (row.status in enroll) (enroll as Record<string, number>)[row.status] = row._count._all;
  }
  const recent = await prisma.activity.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { contact: { select: { name: true } } },
  });
  return NextResponse.json({
    byStage,
    totalContacts: contacts.reduce((n, r) => n + r._count._all, 0),
    sendsLast7Days: sends,
    unreplied,
    enrollments: enroll,
    recent,
    stalled,
    sequenceDue,
    sends7d: sends,
    total: contacts.reduce((n, r) => n + r._count._all, 0),
    stageCounts: byStage,
  });
}

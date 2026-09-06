import { prisma } from "./prisma";
import { ALIGNED_STAGE, FOLLOWING_STAGE } from "./stages";
import { startOfWeek, endOfWeek } from "./week";

export type BookingInput = {
  scheduledAt: Date | string;
  meetingUrl?: string | null;
  note?: string | null;
};

function parseScheduledAt(value: Date | string): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Pause active enrollments when booking is created (aligned). */
export async function pauseSequencesForAlignment(contactId: string) {
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { contactId, status: "active" },
  });
  // Reuse reply-pause shape but reason = aligned
  for (const e of enrollments) {
    await prisma.sequenceEnrollment.update({
      where: { id: e.id },
      data: { status: "paused", pausedReason: "aligned" },
    });
  }
  return enrollments.length;
}

export async function createAlignmentBooking(opts: {
  userId: string;
  contactId: string;
  scheduledAt: Date | string;
  meetingUrl?: string | null;
  note?: string | null;
}) {
  const scheduledAt = parseScheduledAt(opts.scheduledAt);
  if (!scheduledAt) {
    return { error: "scheduledAt 必填且须为有效时间", status: 400 as const };
  }
  const contact = await prisma.contact.findFirst({
    where: { id: opts.contactId, userId: opts.userId },
  });
  if (!contact) return { error: "不存在", status: 404 as const };

  const booking = await prisma.alignmentBooking.create({
    data: {
      userId: opts.userId,
      contactId: opts.contactId,
      scheduledAt,
      meetingUrl: opts.meetingUrl?.trim() || null,
      note: opts.note?.trim() || null,
    },
  });

  await prisma.contact.update({
    where: { id: opts.contactId },
    data: { stage: ALIGNED_STAGE },
  });

  await pauseSequencesForAlignment(opts.contactId);

  await prisma.activity.create({
    data: {
      contactId: opts.contactId,
      type: "booking_created",
      content: `登记已约：${scheduledAt.toISOString()}${opts.meetingUrl ? ` · ${opts.meetingUrl}` : ""}`,
      meta: { bookingId: booking.id, scheduledAt: scheduledAt.toISOString() },
    },
  });

  return { booking, status: 200 as const };
}

/** Reschedule updates the same row — weekly metric does not +1. */
export async function rescheduleAlignmentBooking(opts: {
  userId: string;
  bookingId: string;
  scheduledAt?: Date | string;
  meetingUrl?: string | null;
  note?: string | null;
}) {
  const existing = await prisma.alignmentBooking.findFirst({
    where: { id: opts.bookingId, userId: opts.userId, cancelledAt: null },
  });
  if (!existing) return { error: "不存在或已取消", status: 404 as const };

  const data: {
    scheduledAt?: Date;
    meetingUrl?: string | null;
    note?: string | null;
  } = {};
  if (opts.scheduledAt !== undefined) {
    const scheduledAt = parseScheduledAt(opts.scheduledAt);
    if (!scheduledAt) return { error: "scheduledAt 无效", status: 400 as const };
    data.scheduledAt = scheduledAt;
  }
  if (opts.meetingUrl !== undefined) data.meetingUrl = opts.meetingUrl?.trim() || null;
  if (opts.note !== undefined) data.note = opts.note?.trim() || null;

  const booking = await prisma.alignmentBooking.update({
    where: { id: existing.id },
    data,
  });

  await prisma.activity.create({
    data: {
      contactId: existing.contactId,
      type: "booking_rescheduled",
      content: `改期：${booking.scheduledAt.toISOString()}`,
      meta: { bookingId: booking.id, scheduledAt: booking.scheduledAt.toISOString() },
    },
  });

  return { booking, status: 200 as const };
}

export async function cancelAlignmentBooking(opts: { userId: string; bookingId: string }) {
  const existing = await prisma.alignmentBooking.findFirst({
    where: { id: opts.bookingId, userId: opts.userId, cancelledAt: null },
  });
  if (!existing) return { error: "不存在或已取消", status: 404 as const };

  const booking = await prisma.alignmentBooking.update({
    where: { id: existing.id },
    data: { cancelledAt: new Date() },
  });

  await prisma.contact.update({
    where: { id: existing.contactId },
    data: { stage: FOLLOWING_STAGE },
  });

  await prisma.activity.create({
    data: {
      contactId: existing.contactId,
      type: "booking_cancelled",
      content: "取消已约，阶段回跟进中",
      meta: { bookingId: booking.id },
    },
  });

  return { booking, status: 200 as const };
}

/** Weekly metric: non-cancelled bookings whose createdAt falls in current week. */
export async function countWeeklyBookings(userId: string, now = new Date()) {
  const gte = startOfWeek(now);
  const lt = endOfWeek(now);
  return prisma.alignmentBooking.count({
    where: {
      userId,
      cancelledAt: null,
      createdAt: { gte, lt },
    },
  });
}

export async function listActiveBookingForContact(userId: string, contactId: string) {
  return prisma.alignmentBooking.findFirst({
    where: { userId, contactId, cancelledAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function contactHasActiveBooking(userId: string, contactId: string) {
  const n = await prisma.alignmentBooking.count({
    where: { userId, contactId, cancelledAt: null },
  });
  return n > 0;
}

/** Pure helper for tests: whether a booking counts toward weekly metric. */
export function bookingCountsInWeek(
  booking: { createdAt: Date; cancelledAt: Date | null },
  weekStart: Date,
  weekEnd: Date
): boolean {
  if (booking.cancelledAt) return false;
  return booking.createdAt >= weekStart && booking.createdAt < weekEnd;
}

// silence unused import warning if tree-shaken oddly

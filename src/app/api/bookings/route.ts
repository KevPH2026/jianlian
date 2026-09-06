import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/tenant";
import { createAlignmentBooking, countWeeklyBookings } from "@/lib/bookings";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const contactId = req.nextUrl.searchParams.get("contactId");
  const where = {
    userId: user.id,
    ...(contactId ? { contactId } : {}),
  };
  const bookings = await prisma.alignmentBooking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { contact: { select: { id: true, name: true, company: true } } },
    take: 100,
  });
  const weekly = await countWeeklyBookings(user.id);
  return NextResponse.json({ bookings, weeklyBookings: weekly });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const contactId = String(body.contactId || "");
  if (!contactId) return NextResponse.json({ error: "contactId 必填" }, { status: 400 });
  const result = await createAlignmentBooking({
    userId: user.id,
    contactId,
    scheduledAt: body.scheduledAt,
    meetingUrl: body.meetingUrl,
    note: body.note,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ booking: result.booking, ok: true });
}

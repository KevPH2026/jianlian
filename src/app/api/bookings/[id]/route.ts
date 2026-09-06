import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/tenant";
import { cancelAlignmentBooking, rescheduleAlignmentBooking } from "@/lib/bookings";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const body = await req.json();
  if (body.cancel === true || body.action === "cancel") {
    const result = await cancelAlignmentBooking({ userId: user.id, bookingId: id });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ booking: result.booking, ok: true });
  }
  const result = await rescheduleAlignmentBooking({
    userId: user.id,
    bookingId: id,
    scheduledAt: body.scheduledAt,
    meetingUrl: body.meetingUrl,
    note: body.note,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ booking: result.booking, ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const result = await cancelAlignmentBooking({ userId: user.id, bookingId: id });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ booking: result.booking, ok: true });
}

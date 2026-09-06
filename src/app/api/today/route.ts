import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/tenant";
import { buildTodayPayload } from "@/lib/today";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "@/lib/week";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const url = new URL(req.url);
  if (url.searchParams.get("bookings") === "1") {
    const gte = startOfWeek();
    const lt = endOfWeek();
    const bookings = await prisma.alignmentBooking.findMany({
      where: { userId: user.id, cancelledAt: null, createdAt: { gte, lt } },
      orderBy: { createdAt: "desc" },
      include: { contact: { select: { id: true, name: true, company: true } } },
    });
    return NextResponse.json({ bookings });
  }
  const payload = await buildTodayPayload(user.id);
  return NextResponse.json(payload);
}

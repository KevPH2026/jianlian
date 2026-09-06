import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const threads = await prisma.thread.findMany({
    where: { contact: { userId: user.id } },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ threads });
}

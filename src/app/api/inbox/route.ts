import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const threads = await prisma.thread.findMany({
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ threads });
}

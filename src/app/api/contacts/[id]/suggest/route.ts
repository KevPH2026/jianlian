import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound, requireUser, unauthorized } from "@/lib/tenant";
import { buildSuggestedNextLine } from "@/lib/suggest";
import type { IntentName } from "@/lib/constants";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const contact = await prisma.contact.findFirst({
    where: { id, userId: user.id },
    include: {
      threads: { include: { messages: { orderBy: { createdAt: "desc" }, take: 10 } } },
    },
  });
  if (!contact) return notFound();
  const templates = await prisma.emailTemplate.findMany({ where: { userId: user.id } });
  const intent = req.nextUrl.searchParams.get("intent") as IntentName | null;
  const recentMessages = contact.threads
    .flatMap((t) => t.messages.map((m) => ({ direction: m.direction, body: m.body, channel: m.channel })))
    .slice(0, 10)
    .reverse();
  const suggestion = buildSuggestedNextLine({
    contact: {
      name: contact.name,
      company: contact.company,
      title: contact.title,
      stage: contact.stage,
      productInterest: contact.productInterest,
      tags: contact.tags,
    },
    recentMessages,
    templates,
    intent,
  });
  return NextResponse.json(suggestion);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  if (body.intent) url.searchParams.set("intent", String(body.intent));
  // Reuse GET logic
  const fakeReq = new NextRequest(url.toString());
  return GET(fakeReq, ctx);
}

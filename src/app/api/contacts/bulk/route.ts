import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { isStage } from "@/lib/stages";
import { pauseOnDoNotContact } from "@/lib/sequence";

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const body = await req.json();
  const ids: string[] = body.ids || [];
  if (!ids.length) return NextResponse.json({ error: "未选择联系人" }, { status: 400 });
  const action = body.action as string;
  if (action === "stage" && isStage(body.stage)) {
    await prisma.contact.updateMany({ where: { id: { in: ids } }, data: { stage: body.stage } });
    if (body.stage === "勿联系") {
      await prisma.contact.updateMany({ where: { id: { in: ids } }, data: { doNotContact: true } });
    }
    return NextResponse.json({ ok: true, count: ids.length });
  }
  if (action === "tag") {
    const tag = String(body.tag || "").trim();
    if (!tag) return NextResponse.json({ error: "标签为空" }, { status: 400 });
    const contacts = await prisma.contact.findMany({ where: { id: { in: ids } } });
    for (const c of contacts) {
      const tags = Array.from(new Set([...c.tags, tag]));
      await prisma.contact.update({ where: { id: c.id }, data: { tags } });
    }
    return NextResponse.json({ ok: true, count: ids.length });
  }
  if (action === "dnc") {
    await prisma.contact.updateMany({
      where: { id: { in: ids } },
      data: { doNotContact: true, stage: "勿联系" },
    });
    const ens = await prisma.sequenceEnrollment.findMany({ where: { contactId: { in: ids }, status: "active" } });
    for (const e of ens) {
      const next = pauseOnDoNotContact(e);
      await prisma.sequenceEnrollment.update({
        where: { id: e.id },
        data: { status: next.status, pausedReason: next.pausedReason },
      });
    }
    return NextResponse.json({ ok: true, count: ids.length });
  }
  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

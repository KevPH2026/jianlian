import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/tenant";
import { ALIGNED_STAGE, isStage } from "@/lib/stages";
import { pauseOnDoNotContact } from "@/lib/sequence";
import { contactHasActiveBooking } from "@/lib/bookings";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const ids: string[] = body.ids || [];
  if (!ids.length) return NextResponse.json({ error: "未选择联系人" }, { status: 400 });
  const owned = { id: { in: ids }, userId: user.id };
  const action = body.action as string;
  if (action === "stage" && isStage(body.stage)) {
    if (body.stage === ALIGNED_STAGE) {
      const missing: string[] = [];
      for (const id of ids) {
        const has = await contactHasActiveBooking(user.id, id);
        if (!has) missing.push(id);
      }
      if (missing.length) {
        return NextResponse.json(
          { error: "部分联系人无已约记录，无法批量设为对齐中；请先「登记已约」", missing },
          { status: 400 }
        );
      }
    }
    const result = await prisma.contact.updateMany({ where: owned, data: { stage: body.stage } });
    if (body.stage === "勿联系") {
      await prisma.contact.updateMany({ where: owned, data: { doNotContact: true } });
    }
    return NextResponse.json({ ok: true, count: result.count });
  }
  if (action === "tag") {
    const tag = String(body.tag || "").trim();
    if (!tag) return NextResponse.json({ error: "标签为空" }, { status: 400 });
    const contacts = await prisma.contact.findMany({ where: owned });
    for (const c of contacts) {
      const tags = Array.from(new Set([...c.tags, tag]));
      await prisma.contact.update({ where: { id: c.id }, data: { tags } });
    }
    return NextResponse.json({ ok: true, count: contacts.length });
  }
  if (action === "dnc") {
    const result = await prisma.contact.updateMany({
      where: owned,
      data: { doNotContact: true, stage: "勿联系" },
    });
    const ens = await prisma.sequenceEnrollment.findMany({
      where: { contactId: { in: ids }, contact: { userId: user.id }, status: "active" },
    });
    for (const e of ens) {
      const next = pauseOnDoNotContact(e);
      await prisma.sequenceEnrollment.update({
        where: { id: e.id },
        data: { status: next.status, pausedReason: next.pausedReason },
      });
    }
    return NextResponse.json({ ok: true, count: result.count });
  }
  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

import { prisma } from "./prisma";
import { leadScoreAndTier, scoreContact } from "./scoring";
import { dedupContacts, parseContactCsv, type CsvContactRow } from "./csv";
import { normalizeStage } from "./stages";

export async function importCsv(text: string) {
  const rows = parseContactCsv(text);
  const existing = await prisma.contact.findMany({
    select: { id: true, name: true, company: true, email: true, phone: true, tags: true, notes: true },
  });
  const { creates, updates, skipped } = dedupContacts(rows, existing);

  const createdIds: string[] = [];
  for (const row of creates) {
    const scored = leadScoreAndTier(row);
    const contact = await prisma.contact.create({
      data: {
        name: row.name,
        company: row.company,
        title: row.title,
        email: row.email || null,
        phone: row.phone || null,
        source: row.source || "csv",
        tags: row.tags,
        stage: normalizeStage(row.stage),
        notes: row.notes,
        score: scored.score,
        icpScore: scored.icpScore,
        leadTier: scored.leadTier,
      },
    });
    createdIds.push(contact.id);
    await prisma.activity.create({
      data: { contactId: contact.id, type: "imported", content: "CSV 导入新建" },
    });
  }

  const updatedIds: string[] = [];
  for (const u of updates) {
    const row = u.row;
    const prev = u.existing;
    const mergedTags = Array.from(new Set([...(prev.tags || []), ...row.tags]));
    const scored = leadScoreAndTier(row);
    const contact = await prisma.contact.update({
      where: { id: prev.id },
      data: {
        name: row.name || undefined,
        company: row.company || undefined,
        title: row.title || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        source: row.source || undefined,
        tags: mergedTags,
        stage: row.stage || undefined,
        notes: row.notes ? `${prev.notes || ""}\n${row.notes}`.trim() : undefined,
        score: scored.score,
        icpScore: scored.icpScore,
        leadTier: scored.leadTier,
      },
    });
    updatedIds.push(contact.id);
    await prisma.activity.create({
      data: {
        contactId: contact.id,
        type: "imported",
        content: `CSV 导入更新（按 ${u.matchedBy} 去重）`,
      },
    });
  }

  return {
    parsed: rows.length,
    created: createdIds.length,
    updated: updatedIds.length,
    skipped: skipped.length,
    createdIds,
    updatedIds,
  };
}

export function contactToCsvRow(c: {
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  stage: string;
  notes: string | null;
  score: number;
  doNotContact: boolean;
}) {
  return {
    name: c.name,
    company: c.company || "",
    title: c.title || "",
    email: c.email || "",
    phone: c.phone || "",
    source: c.source || "",
    tags: (c.tags || []).join(";"),
    stage: c.stage,
    notes: c.notes || "",
    score: c.score,
    doNotContact: c.doNotContact,
  };
}

export function buildContactData(input: Partial<CsvContactRow> & { doNotContact?: boolean; notes?: string }) {
  const name = (input.name || "").trim();
  const scored = leadScoreAndTier(input);
  const data = {
    name,
    company: input.company || "",
    title: input.title || "",
    email: input.email || null,
    phone: input.phone || null,
    source: input.source || "",
    tags: input.tags || [],
    stage: normalizeStage(input.stage),
    notes: input.notes || "",
    doNotContact: Boolean(input.doNotContact),
    country: (input as { country?: string }).country || "",
    language: (input as { language?: string }).language || "",
    productInterest: (input as { productInterest?: string }).productInterest || "",
    nextAction: (input as { nextAction?: string }).nextAction || "",
    score: scored.score,
    icpScore: scored.icpScore,
    leadTier: scored.leadTier,
    bantBudget: Boolean((input as { bantBudget?: boolean }).bantBudget),
    bantAuthority: Boolean((input as { bantAuthority?: boolean }).bantAuthority),
    bantNeed: Boolean((input as { bantNeed?: boolean }).bantNeed),
    bantTimeline: Boolean((input as { bantTimeline?: boolean }).bantTimeline),
  };
  if (data.doNotContact) data.stage = "勿联系";
  return data;
}

export { scoreContact };

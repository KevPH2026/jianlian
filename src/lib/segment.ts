import type { Prisma } from "@prisma/client";

export type Segment = {
  stage?: string;
  tag?: string;
  q?: string;
  all?: boolean;
};

export function segmentToWhere(segment: Segment): Prisma.ContactWhereInput {
  if (segment.all) return { doNotContact: false };
  const where: Prisma.ContactWhereInput = { doNotContact: false };
  const and: Prisma.ContactWhereInput[] = [];
  if (segment.stage) and.push({ stage: segment.stage });
  if (segment.tag) and.push({ tags: { has: segment.tag } });
  if (segment.q) {
    and.push({
      OR: [
        { name: { contains: segment.q, mode: "insensitive" } },
        { company: { contains: segment.q, mode: "insensitive" } },
        { email: { contains: segment.q, mode: "insensitive" } },
      ],
    });
  }
  if (and.length) where.AND = and;
  return where;
}

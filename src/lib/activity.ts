import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function logActivity(
  contactId: string,
  type: string,
  content: string,
  meta?: Prisma.InputJsonValue
) {
  return prisma.activity.create({
    data: { contactId, type, content, meta: meta ?? undefined },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import { contactToCsvRow } from "@/lib/contacts";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const contacts = await prisma.contact.findMany({ orderBy: { name: "asc" } });
  const csv = toCsv(contacts.map(contactToCsvRow));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jianlian-contacts.csv"',
    },
  });
}

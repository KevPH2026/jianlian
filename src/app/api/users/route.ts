import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLE, USER_ROLE, requireAdmin } from "@/lib/tenant";
import { getOrCreateSetting } from "@/lib/whatsapp";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || email.split("@")[0] || "用户";
  const password = String(body.password || "");
  const role = body.role === ADMIN_ROLE ? ADMIN_ROLE : USER_ROLE;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "邮箱无效" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "邮箱已存在" }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  await getOrCreateSetting(user.id);
  return NextResponse.json(user);
}

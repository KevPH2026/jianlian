import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export const ADMIN_ROLE = "ADMIN";
export const USER_ROLE = "USER";

export type TenantUser = {
  id: string;
  role: string;
  email: string;
  name?: string | null;
};

export function isAdmin(role?: string | null): boolean {
  return role === ADMIN_ROLE;
}

/** 401 if missing session, 403 if not ADMIN, 200 if admin. */
export function adminGuard(user: { role?: string | null } | null | undefined): 401 | 403 | 200 {
  if (!user) return 401;
  if (!isAdmin(user.role)) return 403;
  return 200;
}

export function ownedWhere(userId: string, extra: Record<string, unknown> = {}) {
  return { userId, ...extra };
}

/** Guessing another tenant's id must look like missing (404, not 403). */
export function visibleOr404<T extends { userId: string }>(
  row: T | null | undefined,
  userId: string
): T | null {
  if (!row || row.userId !== userId) return null;
  return row;
}

export function filterByUserId<T extends { userId: string }>(rows: T[], userId: string): T[] {
  return rows.filter((r) => r.userId === userId);
}

/**
 * WhatsApp inbound must resolve Setting first, then only that user's contacts.
 * Matching several settings with the same phone number still keeps pools separate.
 */
export function pickSettingsForWebhook<
  T extends { waVerifyToken?: string | null; waPhoneNumberId?: string | null },
>(
  settings: T[],
  opts: { verifyToken?: string; phoneNumberId?: string }
): T[] {
  const phone = (opts.phoneNumberId || "").trim();
  if (phone) {
    const hits = settings.filter((s) => (s.waPhoneNumberId || "") === phone);
    if (hits.length) return hits;
  }
  const token = (opts.verifyToken || "").trim();
  if (token) return settings.filter((s) => (s.waVerifyToken || "") === token);
  return [];
}

export async function requireUser(): Promise<TenantUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) return null;
  return {
    id,
    email,
    role: session.user.role || USER_ROLE,
    name: session.user.name,
  };
}

export async function requireAdmin(): Promise<
  { user: TenantUser; error: null } | { user: TenantUser | null; error: NextResponse }
> {
  const user = await requireUser();
  const status = adminGuard(user);
  if (status === 401) return { user: null, error: unauthorized() };
  if (status === 403) return { user, error: forbidden() };
  return { user: user!, error: null };
}

export function unauthorized() {
  return NextResponse.json({ error: "未登录" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "无权限" }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: "不存在" }, { status: 404 });
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "仪表盘" },
  { href: "/contacts", label: "联系人" },
  { href: "/inbox", label: "收件箱" },
  { href: "/campaigns", label: "邮件活动" },
  { href: "/templates", label: "模板" },
  { href: "/sequences", label: "序列" },
  { href: "/settings", label: "设置" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          建联
        </Link>
        <div className="mt-0.5 text-xs text-slate-400">外联工作台</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm",
                active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 px-4 py-4 text-xs text-slate-500">
        <div className="truncate">{data?.user?.email}</div>
        <button className="mt-2 text-slate-400 hover:text-slate-700" onClick={() => signOut({ callbackUrl: "/login" })}>
          退出
        </button>
      </div>
    </aside>
  );
}

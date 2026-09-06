"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { STAGE_COLORS, type Stage } from "@/lib/stages";
import { formatDate } from "@/lib/utils";

type TodayContact = {
  id: string;
  name: string;
  company: string;
  stage: string;
  leadTier: string;
  productInterest: string;
  nextAction: string;
  lastContactedAt: string | null;
  tags: string[];
};

type BookingRow = {
  id: string;
  scheduledAt: string;
  meetingUrl: string | null;
  contact: { id: string; name: string; company: string };
};

type Payload = {
  stalledDays: number;
  needReply: TodayContact[];
  needFollow: TodayContact[];
  needStop: TodayContact[];
  weeklyBookings: number;
};

function CtaLinks({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className || ""}`}>
      <Link
        href="/contacts"
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        导入 / 去联系人
      </Link>
      <Link
        href="/templates"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        看模板
      </Link>
      <Link
        href="/campaigns"
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        写活动
      </Link>
    </div>
  );
}

function ContactList({
  title,
  items,
  empty,
  emptyLink,
}: {
  title: string;
  items: TodayContact[];
  empty: string;
  emptyLink?: { href: string; label: string };
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-800">{title}</h2>
        <Badge className="border-slate-200 text-slate-600">{items.length}</Badge>
      </div>
      <ul className="divide-y divide-slate-100 text-sm">
        {items.map((c) => (
          <li key={c.id} className="py-2">
            <Link href={`/contacts/${c.id}`} className="flex items-start justify-between gap-3 hover:text-blue-700">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-500">
                  {c.company || "—"} · {c.productInterest || c.nextAction || "—"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Badge className={STAGE_COLORS[(c.stage as Stage) || "新线索"] || "border-slate-200"}>{c.stage}</Badge>
                <div className="mt-1 text-[10px] text-slate-400">{formatDate(c.lastContactedAt)}</div>
              </div>
            </Link>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="py-3 text-slate-500">
            <span>{empty}</span>
            {emptyLink ? (
              <>
                {" "}
                <Link href={emptyLink.href} className="text-blue-600 hover:underline">
                  {emptyLink.label}
                </Link>
              </>
            ) : null}
          </li>
        ) : null}
      </ul>
    </Card>
  );
}

export default function TodayPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [showBookings, setShowBookings] = useState(false);

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function openBookings() {
    setShowBookings(true);
    const json = await fetch("/api/today?bookings=1").then((r) => r.json());
    setBookings(json.bookings || []);
  }

  if (!data) return <p className="text-sm text-slate-500">加载中…</p>;

  const allEmpty =
    data.needReply.length === 0 && data.needFollow.length === 0 && data.needStop.length === 0;

  return (
    <div>
      <PageHeader
        title="今日"
        subtitle="先回人、再跟人、必要时停；本周约到的会算进右上角"
        actions={
          <button
            type="button"
            onClick={openBookings}
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            本周已约 {data.weeklyBookings}
          </button>
        }
      />

      <Card className="mb-4 border-blue-100 bg-gradient-to-br from-blue-50/80 to-white">
        <h2 className="text-sm font-semibold text-slate-900">今天怎么干</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-medium text-white">
              1
            </span>
            <span>
              进「
              <Link href="/contacts" className="font-medium text-blue-700 hover:underline">
                人
              </Link>
              」导入或新建品牌线索
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-medium text-white">
              2
            </span>
            <span>
              打开线索 →「建议下一句」→ 去「
              <Link href="/campaigns" className="font-medium text-blue-700 hover:underline">
                稿
              </Link>
              」用
              <Link href="/templates" className="font-medium text-blue-700 hover:underline">
                破冰模板
              </Link>
              发活动（点头才发）
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-medium text-white">
              3
            </span>
            <span>有回复会出现在「该回」；对方同意开会后点「登记已约」</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-medium text-white">
              4
            </span>
            <span>对齐后点「交给提案作战」</span>
          </li>
        </ol>
        <CtaLinks className="mt-4" />
        <p className="mt-3 text-xs text-slate-400">停滞阈值 {data.stalledDays} 天 · 「该跟」按此计算</p>
      </Card>

      {showBookings ? (
        <Card className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">本周已约（按创建时间，不含取消）</h3>
            <button type="button" className="text-xs text-slate-400" onClick={() => setShowBookings(false)}>
              收起
            </button>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {(bookings || []).map((b) => (
              <li key={b.id} className="py-2 flex justify-between gap-3">
                <Link href={`/contacts/${b.contact.id}`} className="hover:text-blue-700">
                  {b.contact.name} · {b.contact.company}
                </Link>
                <span className="text-xs text-slate-500">{formatDate(b.scheduledAt)}</span>
              </li>
            ))}
            {bookings && bookings.length === 0 ? <li className="py-2 text-slate-400">本周暂无</li> : null}
          </ul>
        </Card>
      ) : null}

      {allEmpty ? (
        <Card className="mb-4 border-dashed border-slate-300 bg-slate-50/50 py-10 text-center">
          <p className="text-base font-medium text-slate-800">今日有活才会出现在这里</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            先导入或新建线索，发出去之后，待回、该跟、该停才会排进下方三列。从联系人开始即可。
          </p>
          <div className="mt-5 flex justify-center">
            <CtaLinks />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <ContactList
            title="该回"
            items={data.needReply}
            empty="暂无待回。有人回复后会出现在这里。"
            emptyLink={{ href: "/contacts", label: "去联系人" }}
          />
          <ContactList
            title="该跟"
            items={data.needFollow}
            empty="暂无停滞待跟。发出去后若久未回，会排到这里。"
            emptyLink={{ href: "/contacts", label: "去跟进" }}
          />
          <ContactList
            title="该停"
            items={data.needStop}
            empty="暂无建议停损。多次未回的线索会出现在这里。"
            emptyLink={{ href: "/contacts", label: "查看线索" }}
          />
        </div>
      )}

      {!allEmpty ? null : (
        <p className="text-center text-xs text-slate-400">三列：该回 · 该跟 · 该停 — 有数据后自动展开</p>
      )}
    </div>
  );
}

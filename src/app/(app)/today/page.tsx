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

function ContactList({ title, items, empty }: { title: string; items: TodayContact[]; empty: string }) {
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
        {items.length === 0 ? <li className="py-3 text-slate-400">{empty}</li> : null}
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

  return (
    <div>
      <PageHeader
        title="今日"
        subtitle={`该回 / 该跟 / 该停 · 停滞阈值 ${data.stalledDays} 天`}
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
      <div className="grid gap-4 lg:grid-cols-3">
        <ContactList title="该回" items={data.needReply} empty="没有待回线索" />
        <ContactList title="该跟" items={data.needFollow} empty="没有停滞待跟" />
        <ContactList title="该停" items={data.needStop} empty="没有建议停损" />
      </div>
    </div>
  );
}

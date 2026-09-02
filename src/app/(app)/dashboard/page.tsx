"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader, Badge } from "@/components/ui";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/stages";
import { formatDate } from "@/lib/utils";

type Dash = {
  byStage: Record<string, number>;
  totalContacts: number;
  sendsLast7Days: number;
  unreplied: number;
  stalled?: number;
  sequenceDue?: number;
  enrollments: { active: number; paused: number; completed: number };
  recent: Array<{ id: string; type: string; content: string; createdAt: string; contact: { name: string } }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <p className="text-sm text-slate-500">加载中…</p>;
  return (
    <div>
      <PageHeader title="仪表盘" subtitle="阶段分布、近 7 日发送、未回复与序列报名" />
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <div className="text-sm text-slate-500">联系人</div>
          <div className="mt-1 text-2xl font-semibold">{data.totalContacts}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">近 7 日发送</div>
          <div className="mt-1 text-2xl font-semibold">{data.sendsLast7Days}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">未回复线程</div>
          <div className="mt-1 text-2xl font-semibold">{data.unreplied}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">进行中报名</div>
          <div className="mt-1 text-2xl font-semibold">{data.enrollments.active}</div>
          <div className="mt-1 text-xs text-slate-400">暂停 {data.enrollments.paused} · 完成 {data.enrollments.completed}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">停滞 5+ 天</div>
          <div className="mt-1 text-2xl font-semibold">{data.stalled ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">序列待发</div>
          <div className="mt-1 text-2xl font-semibold">{data.sequenceDue ?? 0}</div>
        </Card>
      </div>
      <h2 className="mt-8 mb-3 text-sm font-medium text-slate-700">阶段</h2>
      <div className="grid gap-3 md:grid-cols-5">
        {STAGES.map((s) => (
          <Card key={s} className="p-4">
            <Badge className={STAGE_COLORS[s as Stage]}>{s}</Badge>
            <div className="mt-2 text-xl font-semibold">{data.byStage[s] || 0}</div>
          </Card>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-sm font-medium text-slate-700">最近动态</h2>
      <Card>
        <ul className="divide-y divide-slate-100 text-sm">
          {data.recent.map((a) => (
            <li key={a.id} className="py-2 flex justify-between gap-4">
              <span>
                <span className="font-medium">{a.contact.name}</span>
                <span className="text-slate-500"> · {a.type} · {a.content.slice(0, 80)}</span>
              </span>
              <span className="shrink-0 text-slate-400">{formatDate(a.createdAt)}</span>
            </li>
          ))}
          {data.recent.length === 0 ? <li className="py-2 text-slate-400">暂无</li> : null}
        </ul>
      </Card>
    </div>
  );
}

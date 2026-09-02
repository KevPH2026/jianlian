"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Data = {
  sequence: {
    id: string;
    name: string;
    steps: Array<{ type: string; waitDays?: number; templateId?: string; body?: string }>;
    enrollments: Array<{
      id: string;
      status: string;
      currentStep: number;
      nextRunAt: string | null;
      pausedReason: string | null;
      contact: { id: string; name: string; email: string | null };
    }>;
  };
  contacts: Array<{ id: string; name: string; email: string | null; company: string }>;
};

export default function SequenceDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [picked, setPicked] = useState<string>("");

  async function load() {
    const json = await fetch(`/api/sequences/${params.id}`).then((r) => r.json());
    setData(json);
  }
  useEffect(() => {
    if (params.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function enroll() {
    if (!picked) return;
    await fetch(`/api/sequences/${params.id}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: picked }),
    });
    load();
  }

  if (!data?.sequence) return <p className="text-sm text-slate-500">加载中…</p>;
  const s = data.sequence;
  return (
    <div>
      <PageHeader title={s.name} subtitle="手动报名后，worker 会处理到期步骤" />
      <Card className="mb-4">
        <ol className="list-decimal pl-5 text-sm space-y-1">
          {s.steps.map((step, i) => (
            <li key={i}>
              {step.type === "wait" && `等待 ${step.waitDays} 天`}
              {step.type === "email" && `发送邮件模板 ${step.templateId}`}
              {step.type === "whatsapp" && `WhatsApp：${step.body}`}
            </li>
          ))}
        </ol>
      </Card>
      <Card className="mb-4">
        <div className="flex gap-2">
          <select className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">选择联系人报名</option>
            {data.contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.company}</option>
            ))}
          </select>
          <Button onClick={enroll}>报名</Button>
        </div>
      </Card>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 text-left">联系人</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">步骤</th>
              <th className="p-3 text-left">下次执行</th>
            </tr>
          </thead>
          <tbody>
            {s.enrollments.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="p-3">{e.contact.name}</td>
                <td className="p-3">{e.status}{e.pausedReason ? ` / ${e.pausedReason}` : ""}</td>
                <td className="p-3">{e.currentStep}</td>
                <td className="p-3 text-slate-400">{formatDate(e.nextRunAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

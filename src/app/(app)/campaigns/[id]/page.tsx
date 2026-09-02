"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, PageHeader } from "@/components/ui";

type Data = {
  campaign: {
    id: string;
    name: string;
    status: string;
    rateLimitPerHour: number;
    template: { name: string; subject: string; body: string };
    recipients: Array<{
      id: string;
      status: string;
      dryRun: boolean;
      error: string | null;
      contact: { name: string; email: string | null };
    }>;
  };
  previews: Array<{ contactId: string; name: string; email: string | null; subject: string; body: string }>;
  counts: Record<string, number>;
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [hint, setHint] = useState("");

  async function load() {
    const json = await fetch(`/api/campaigns/${params.id}`).then((r) => r.json());
    setData(json);
  }
  useEffect(() => {
    if (params.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function start() {
    const res = await fetch(`/api/campaigns/${params.id}/start`, { method: "POST" });
    const json = await res.json();
    setHint(res.ok ? "已开始发送，worker 将按每小时限额处理队列" : json.error);
    load();
  }

  if (!data?.campaign) return <p className="text-sm text-slate-500">加载中…</p>;
  const c = data.campaign;
  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={`模板「${c.template.name}」· 状态 ${c.status} · 限速 ${c.rateLimitPerHour}/小时`}
        actions={
          (c.status === "draft" || c.status === "paused") ? (
            <Button onClick={start}>开始发送</Button>
          ) : (
            <Badge className="border-emerald-200 text-emerald-700">{c.status}</Badge>
          )
        }
      />
      {hint ? <p className="mb-4 text-sm text-emerald-700">{hint}</p> : null}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {Object.entries(data.counts).map(([k, v]) => (
          <Badge key={k} className="border-slate-200">{k}: {v}</Badge>
        ))}
      </div>
      <h2 className="mb-2 text-sm font-medium">个性化预览（前 5 人）</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {data.previews.map((p) => (
          <Card key={p.contactId}>
            <div className="text-sm font-medium">{p.name} · {p.email}</div>
            <div className="mt-1 text-xs text-slate-500">{p.subject}</div>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{p.body}</pre>
          </Card>
        ))}
      </div>
      <h2 className="mt-8 mb-2 text-sm font-medium">收件人</h2>
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 text-left">联系人</th>
              <th className="p-3 text-left">邮箱</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {c.recipients.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">{r.contact.name}</td>
                <td className="p-3">{r.contact.email}</td>
                <td className="p-3">
                  {r.status}
                  {r.dryRun ? " (dry-run)" : ""}
                </td>
                <td className="p-3 text-slate-400">{r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { STAGES } from "@/lib/stages";
import { formatDate } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
  status: string;
  rateLimitPerHour: number;
  createdAt: string;
  template: { name: string };
  _count: { recipients: number };
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [stage, setStage] = useState("");
  const [rate, setRate] = useState("20");

  async function load() {
    const json = await fetch("/api/campaigns").then((r) => r.json());
    setCampaigns(json.campaigns || []);
    setTemplates(json.templates || []);
    if (!templateId && json.templates?.[0]) setTemplateId(json.templates[0].id);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        templateId,
        rateLimitPerHour: Number(rate || 20),
        segment: stage ? { stage } : { all: true },
      }),
    });
    setName("");
    load();
  }

  return (
    <div>
      <PageHeader title="邮件活动" subtitle="默认保存为草稿，需显式点击开始发送。限速默认 20/小时。" />
      <Card className="mb-6">
        <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-4">
          <Input placeholder="活动名称" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">全部可联系人</option>
            {STAGES.filter((s) => s !== "勿联系").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input placeholder="每小时上限" value={rate} onChange={(e) => setRate(e.target.value)} />
          <div className="md:col-span-4">
            <Button type="submit">创建草稿</Button>
          </div>
        </form>
      </Card>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 text-left">名称</th>
              <th className="p-3 text-left">模板</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">收件人</th>
              <th className="p-3 text-left">创建于</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link className="text-blue-700 hover:underline" href={`/campaigns/${c.id}`}>{c.name}</Link>
                </td>
                <td className="p-3">{c.template.name}</td>
                <td className="p-3">{c.status}</td>
                <td className="p-3">{c._count.recipients}</td>
                <td className="p-3 text-slate-400">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

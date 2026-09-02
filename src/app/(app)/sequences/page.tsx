"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";

type Seq = { id: string; name: string; steps: unknown; _count: { enrollments: number } };

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Seq[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [name, setName] = useState("新序列");
  const [t1, setT1] = useState("");
  const [wait, setWait] = useState("3");
  const [t2, setT2] = useState("");

  async function load() {
    const json = await fetch("/api/sequences").then((r) => r.json());
    setSequences(json.sequences || []);
    setTemplates(json.templates || []);
    if (!t1 && json.templates?.[0]) setT1(json.templates[0].id);
    if (!t2 && json.templates?.[1]) setT2(json.templates[1].id);
    else if (!t2 && json.templates?.[0]) setT2(json.templates[0].id);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        steps: [
          { type: "email", templateId: t1 },
          { type: "wait", waitDays: Number(wait || 3) },
          { type: "email", templateId: t2 },
        ],
      }),
    });
    load();
  }

  return (
    <div>
      <PageHeader title="序列" subtitle="步骤：发邮件 → 等待 N 天 → 跟进。回复或勿联系会自动暂停。" />
      <Card className="mb-6">
        <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-4">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="序列名称" />
          <Select value={t1} onChange={(e) => setT1(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>第 0 天：{t.name}</option>
            ))}
          </Select>
          <Input value={wait} onChange={(e) => setWait(e.target.value)} placeholder="等待天数" />
          <Select value={t2} onChange={(e) => setT2(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>跟进：{t.name}</option>
            ))}
          </Select>
          <div className="md:col-span-4">
            <Button type="submit">创建序列</Button>
          </div>
        </form>
      </Card>
      <div className="grid gap-3">
        {sequences.map((s) => (
          <Card key={s.id}>
            <Link href={`/sequences/${s.id}`} className="font-medium text-blue-700 hover:underline">
              {s.name}
            </Link>
            <div className="text-xs text-slate-400 mt-1">报名 {s._count.enrollments} · 步骤 {Array.isArray(s.steps) ? s.steps.length : 0}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

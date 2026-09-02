"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, PageHeader, Textarea } from "@/components/ui";
import { interpolateTemplate, wordCount } from "@/lib/template";

type Tpl = { id: string; name: string; subject: string; body: string };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });

  async function load() {
    const json = await fetch("/api/templates").then((r) => r.json());
    setTemplates(json.templates || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", subject: "", body: "" });
    load();
  }

  const preview = interpolateTemplate(form.subject + "\n" + form.body, {
    name: "陈启明",
    company: "星河科技",
    title: "CEO",
  });

  return (
    <div>
      <PageHeader title="邮件模板" subtitle="支持 {{name}} {{company}} {{title}}" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form onSubmit={onCreate} className="space-y-2">
            <Input placeholder="模板名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="主题" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <Textarea rows={8} placeholder="正文" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            <p className={`text-xs ${wordCount(form.body) < 200 ? "text-slate-400" : "text-red-600"}`}>邮件 {wordCount(form.body)}/200 词 · WhatsApp 建议少于 100 词</p>
            <Button type="submit">保存模板</Button>
          </form>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-600">
            预览（陈启明 / 星河科技 / CEO）{"\n"}
            {preview}
          </div>
        </Card>
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-slate-500">{t.subject}</div>
              <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{t.body}</pre>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

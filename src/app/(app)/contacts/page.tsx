"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { STAGES, STAGE_COLORS, type Stage } from "@/lib/stages";

type Contact = {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string | null;
  phone: string | null;
  source: string;
  tags: string[];
  stage: Stage;
  score: number;
  icpScore?: number;
  leadTier?: string;
  country?: string;
  doNotContact: boolean;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [tag, setTag] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", title: "", email: "", phone: "", tags: "" });

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (stage) sp.set("stage", stage);
    if (tag) sp.set("tag", tag);
    const res = await fetch(`/api/contacts?${sp}`);
    const json = await res.json();
    setContacts(json.contacts || []);
    setTags(json.tags || []);
  }, [q, stage, tag]);

  useEffect(() => {
    load();
  }, [load]);

  const ids = Object.keys(selected).filter((k) => selected[k]);

  async function bulk(action: string, extra: Record<string, string> = {}) {
    if (!ids.length) return;
    await fetch("/api/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action, ...extra }),
    });
    setSelected({});
    load();
  }

  async function onImport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem("file") as HTMLInputElement)?.files?.[0];
    if (!input) return;
    const fd = new FormData();
    fd.set("file", input);
    const res = await fetch("/api/contacts/import", { method: "POST", body: fd });
    const json = await res.json();
    setMsg(`导入：新建 ${json.created}，更新 ${json.updated}，跳过 ${json.skipped}`);
    load();
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: form.tags }),
    });
    setCreating(false);
    setForm({ name: "", company: "", title: "", email: "", phone: "", tags: "" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="联系人"
        subtitle="搜索、筛选、批量打标签/改阶段、CSV 导入导出"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => (window.location.href = "/api/contacts/export")}>
              导出 CSV
            </Button>
            <Button onClick={() => setCreating((v) => !v)}>新建</Button>
          </div>
        }
      />
      {creating ? (
        <Card className="mb-4">
          <form onSubmit={onCreate} className="grid gap-2 md:grid-cols-3">
            <Input placeholder="姓名 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="公司" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="职位" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="邮箱" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="电话" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="标签，逗号分隔" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit">保存</Button>
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>取消</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input className="max-w-xs" placeholder="搜索姓名/公司/邮箱/电话" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">全部阶段</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">全部标签</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <form onSubmit={onImport} className="ml-auto flex items-center gap-2 text-sm">
            <input type="file" name="file" accept=".csv,text/csv" className="text-xs" />
            <Button type="submit" variant="outline">导入 CSV</Button>
          </form>
        </div>
        {msg ? <p className="mt-2 text-xs text-emerald-700">{msg}</p> : null}
        {ids.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span>已选 {ids.length}</span>
            <Select defaultValue="" onChange={(e) => e.target.value && bulk("stage", { stage: e.target.value })}>
              <option value="">改阶段…</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const t = (e.currentTarget.elements.namedItem("tag") as HTMLInputElement).value;
                bulk("tag", { tag: t });
              }}
              className="flex gap-1"
            >
              <Input name="tag" placeholder="批量标签" className="w-32" />
              <Button type="submit" variant="outline">打标签</Button>
            </form>
            <Button variant="danger" onClick={() => bulk("dnc")}>勿联系</Button>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    const on = e.target.checked;
                    const next: Record<string, boolean> = {};
                    contacts.forEach((c) => (next[c.id] = on));
                    setSelected(next);
                  }}
                />
              </th>
              <th className="p-3">姓名</th>
              <th className="p-3">公司 / 职位</th>
              <th className="p-3">联系方式</th>
              <th className="p-3">阶段</th>
              <th className="p-3">标签</th>
              <th className="p-3">ICP</th>
              <th className="p-3">层级</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-3">
                  <input type="checkbox" checked={!!selected[c.id]} onChange={(e) => setSelected({ ...selected, [c.id]: e.target.checked })} />
                </td>
                <td className="p-3">
                  <Link className="font-medium text-blue-700 hover:underline" href={`/contacts/${c.id}`}>
                    {c.name}
                  </Link>
                  {c.doNotContact ? <span className="ml-2 text-xs text-slate-400">勿联系</span> : null}
                </td>
                <td className="p-3 text-slate-600">
                  {c.company}
                  <div className="text-xs text-slate-400">{c.title}</div>
                </td>
                <td className="p-3 text-slate-600">
                  {c.email || "—"}
                  <div className="text-xs text-slate-400">{c.phone || "—"}</div>
                </td>
                <td className="p-3">
                  <Badge className={STAGE_COLORS[c.stage]}>{c.stage}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t} className="border-slate-200 text-slate-600">{t}</Badge>
                    ))}
                  </div>
                </td>
                <td className="p-3 font-medium">{c.icpScore ?? c.score}</td>
                <td className="p-3">{c.leadTier === "HOT" ? "热" : c.leadTier === "WARM" ? "温" : "冷"}</td>
              </tr>
            ))}
            {contacts.length === 0 ? (
              <tr>
                <td className="p-6 text-slate-400" colSpan={8}>暂无联系人</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, PageHeader } from "@/components/ui";

type Settings = {
  brand?: { brandName: string; industry: string; targetMarkets: string };
  smtp: { configured: boolean; host: string; port: string; from: string };
  imap: { configured: boolean; host: string };
  whatsapp: {
    configured: boolean;
    phoneNumberId: string;
    verifyToken: string;
    apiVersion: string;
    hasToken: boolean;
    webhookPath: string;
  };
};

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [form, setForm] = useState({ brandName: "", industry: "", targetMarkets: "", waPhoneNumberId: "", waAccessToken: "", waVerifyToken: "" });
  const [hint, setHint] = useState("");

  async function load() {
    const json = await fetch("/api/settings").then((r) => r.json());
    setData(json);
    setForm({
      brandName: json.brand?.brandName || "",
      industry: json.brand?.industry || "",
      targetMarkets: json.brand?.targetMarkets || "",
      waPhoneNumberId: json.whatsapp?.phoneNumberId || "",
      waAccessToken: "",
      waVerifyToken: json.whatsapp?.verifyToken || "",
    });
  }
  useEffect(() => {
    load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setHint(res.ok ? "已保存 WhatsApp 配置" : "保存失败");
    load();
  }

  if (!data) return <p className="text-sm text-slate-500">加载中…</p>;
  return (
    <div>
      <PageHeader title="设置" subtitle="SMTP 来自环境变量；WhatsApp Cloud API 可在此保存。" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <h3 className="font-medium">品牌与市场</h3>
          <p className="mt-1 text-xs text-slate-500">用于 ICP 目标市场匹配。消息长度：WhatsApp &lt; 100 词，邮件 &lt; 200 词。</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-500">品牌</label>
              <Input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">行业</label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">目标市场（逗号分隔）</label>
              <Input value={form.targetMarkets} onChange={(e) => setForm({ ...form, targetMarkets: e.target.value })} />
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="font-medium">SMTP</h3>
          <p className="mt-2 text-sm text-slate-600">
            状态：{data.smtp.configured ? "已配置" : "未配置（发送将 dry-run 并写入记录）"}
          </p>
          <dl className="mt-3 space-y-1 text-sm text-slate-500">
            <div>SMTP_HOST：{data.smtp.host || "（空）"}</div>
            <div>SMTP_PORT：{data.smtp.port}</div>
            <div>SMTP_FROM：{data.smtp.from || "（空）"}</div>
          </dl>
        </Card>
        <Card>
          <h3 className="font-medium">IMAP 入站</h3>
          <p className="mt-2 text-sm text-slate-600">
            {data.imap.configured ? `已配置 ${data.imap.host}` : "未配置。可在联系人页手动登记回复。"}
          </p>
        </Card>
        <Card className="md:col-span-2">
          <h3 className="font-medium">WhatsApp Cloud API</h3>
          <p className="mt-1 text-sm text-slate-500">
            仅官方 Cloud API。Webhook：<code className="rounded bg-slate-100 px-1">{data.whatsapp.webhookPath}</code>
            {" "}（GET 验证 + POST 入站）。当前：{data.whatsapp.configured ? "已配置" : "未配置"}
          </p>
          <form onSubmit={onSave} className="mt-4 grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-500">Phone Number ID</label>
              <Input value={form.waPhoneNumberId} onChange={(e) => setForm({ ...form, waPhoneNumberId: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Verify Token</label>
              <Input value={form.waVerifyToken} onChange={(e) => setForm({ ...form, waVerifyToken: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500">Access Token {data.whatsapp.hasToken ? "（已保存，留空则不修改）" : ""}</label>
              <Input type="password" value={form.waAccessToken} onChange={(e) => setForm({ ...form, waAccessToken: e.target.value })} />
            </div>
            <div>
              <Button type="submit">保存</Button>
              {hint ? <span className="ml-3 text-sm text-emerald-700">{hint}</span> : null}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

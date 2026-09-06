"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, PageHeader } from "@/components/ui";

type Settings = {
  brand?: { brandName: string; industry: string; targetMarkets: string };
  stalledDays?: number;
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
  proposalHandoff?: { webhookConfigured: boolean };
};

export default function SettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    brandName: "",
    industry: "",
    targetMarkets: "",
    stalledDays: "5",
    waPhoneNumberId: "",
    waAccessToken: "",
    waVerifyToken: "",
  });
  const [hint, setHint] = useState("");

  async function load() {
    const json = await fetch("/api/settings").then((r) => r.json());
    setData(json);
    setForm({
      brandName: json.brand?.brandName || "",
      industry: json.brand?.industry || "",
      targetMarkets: json.brand?.targetMarkets || "",
      stalledDays: String(json.stalledDays ?? 5),
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
      body: JSON.stringify({
        ...form,
        stalledDays: Number(form.stalledDays),
      }),
    });
    const json = await res.json();
    setHint(res.ok ? "已保存" : json.error || "保存失败");
    load();
  }

  if (!data) return <p className="text-sm text-slate-500">加载中…</p>;
  return (
    <div>
      <PageHeader title="设置" subtitle="ICP 客群、停滞天数、SMTP 只读、WhatsApp Cloud API。周「约到对齐」= 本周新建且未取消的 AlignmentBooking（按 createdAt）。" />
      <form onSubmit={onSave} className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <h3 className="font-medium">品牌与市场</h3>
          <p className="mt-1 text-xs text-slate-500">ICP 客群用于客群/品类匹配。消息长度：WhatsApp &lt; 100 词，邮件 &lt; 200 词。</p>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <div>
              <label className="text-xs text-slate-500">品牌</label>
              <Input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">行业</label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">ICP 客群（逗号分隔）</label>
              <Input value={form.targetMarkets} onChange={(e) => setForm({ ...form, targetMarkets: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">停滞天数（该跟）</label>
              <Input
                type="number"
                min={1}
                max={90}
                value={form.stalledDays}
                onChange={(e) => setForm({ ...form, stalledDays: e.target.value })}
              />
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
          <h3 className="font-medium">IMAP 入站 / 提案 handoff</h3>
          <p className="mt-2 text-sm text-slate-600">
            {data.imap.configured ? `IMAP 已配置 ${data.imap.host}` : "IMAP 未配置。可在联系人页手动登记回复。"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            提案作战 webhook：{data.proposalHandoff?.webhookConfigured ? "已配置 PROPOSAL_HANDOFF_WEBHOOK_URL" : "未配置（交接仍写入活动时间线）"}
          </p>
        </Card>
        <Card className="md:col-span-2">
          <h3 className="font-medium">WhatsApp Cloud API</h3>
          <p className="mt-1 text-sm text-slate-500">
            仅官方 Cloud API。Webhook：<code className="rounded bg-slate-100 px-1">{data.whatsapp.webhookPath}</code>
            {" "}当前：{data.whatsapp.configured ? "已配置" : "未配置"}
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
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
          </div>
        </Card>
      </form>
    </div>
  );
}

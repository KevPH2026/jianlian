"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input, PageHeader, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Thread = {
  id: string;
  channel: string;
  subject: string;
  unread: boolean;
  lastMessageAt: string;
  contact: { id: string; name: string; email: string | null; phone: string | null; stage?: string };
  messages: Array<{ id: string; direction: string; body: string; createdAt: string }>;
};

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [current, setCurrent] = useState<Thread | null>(null);
  const [body, setBody] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [contactStage, setContactStage] = useState("");

  async function load() {
    const json = await fetch("/api/inbox").then((r) => r.json());
    setThreads(json.threads || []);
    setCurrent((prev) => json.threads?.find((t: Thread) => t.id === prev?.id) || json.threads?.[0] || null);
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!current?.contact?.id) return;
    fetch(`/api/contacts/${current.contact.id}`)
      .then((r) => r.json())
      .then((j) => setContactStage(j.contact?.stage || ""));
  }, [current?.contact?.id]);

  async function reply() {
    if (!current) return;
    const res = await fetch(`/api/inbox/${current.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setHint(res.ok ? (json.dryRun ? "dry-run 已记录" : "已回复") : json.error);
    setBody("");
    load();
  }

  async function registerBooking() {
    if (!current) return;
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: current.contact.id,
        scheduledAt,
        meetingUrl: meetingUrl || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "登记失败");
      return;
    }
    setHint("已登记已约");
    setContactStage("对齐中");
    setScheduledAt("");
    setMeetingUrl("");
  }

  async function handoff() {
    if (!current) return;
    setError("");
    const res = await fetch(`/api/contacts/${current.contact.id}/proposal-handoff`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "失败");
      return;
    }
    setHint(
      json.delivered?.webhookPosted
        ? "已交给提案作战（webhook + 时间线）"
        : "已交给提案作战（brief 已写入时间线）"
    );
  }

  const canHandoff = contactStage === "已回复" || contactStage === "对齐中";

  return (
    <div>
      <PageHeader title="收件箱" subtitle="邮件与 WhatsApp 统一会话 · 可登记已约 / 交给提案作战" />
      {hint ? <p className="mb-3 text-sm text-emerald-700">{hint}</p> : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-1 overflow-hidden">
          <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  className={`w-full text-left px-4 py-3 text-sm ${current?.id === t.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  onClick={() => setCurrent(t)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t.contact.name}</span>
                    {t.unread ? <Badge className="border-blue-200 text-blue-700">未读</Badge> : null}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.channel === "whatsapp" ? "WhatsApp" : "邮件"} · {formatDate(t.lastMessageAt)}
                  </div>
                </button>
              </li>
            ))}
            {threads.length === 0 ? <li className="p-4 text-sm text-slate-400">暂无会话</li> : null}
          </ul>
        </Card>
        <Card className="lg:col-span-2 min-h-[70vh] flex flex-col">
          {current ? (
            <>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">
                    <Link className="hover:text-blue-700" href={`/contacts/${current.contact.id}`}>
                      {current.contact.name}
                    </Link>
                  </div>
                  <div className="text-xs text-slate-400">{current.subject || current.channel} · {contactStage || "—"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canHandoff ? (
                    <Button variant="outline" onClick={handoff}>交给提案作战</Button>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-auto">
                {current.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      m.direction === "outbound" ? "ml-auto bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className={`mt-1 text-[10px] ${m.direction === "outbound" ? "text-blue-100" : "text-slate-400"}`}>
                      {formatDate(m.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-medium text-slate-600">登记已约</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  <Input placeholder="会议链接" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
                </div>
                <Button className="mt-2" variant="outline" onClick={registerBooking} disabled={!scheduledAt}>
                  登记已约
                </Button>
              </div>
              <div className="mt-3">
                <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="回复…" />
                <Button className="mt-2" onClick={reply}>
                  回复
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">选择左侧会话</p>
          )}
        </Card>
      </div>
    </div>
  );
}

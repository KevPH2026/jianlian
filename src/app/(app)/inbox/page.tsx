"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Thread = {
  id: string;
  channel: string;
  subject: string;
  unread: boolean;
  lastMessageAt: string;
  contact: { id: string; name: string; email: string | null; phone: string | null };
  messages: Array<{ id: string; direction: string; body: string; createdAt: string }>;
};

export default function InboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [current, setCurrent] = useState<Thread | null>(null);
  const [body, setBody] = useState("");
  const [hint, setHint] = useState("");

  async function load() {
    const json = await fetch("/api/inbox").then((r) => r.json());
    setThreads(json.threads || []);
    setCurrent((prev) => json.threads?.find((t: Thread) => t.id === prev?.id) || json.threads?.[0] || null);
  }
  useEffect(() => {
    load();
  }, []);

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

  return (
    <div>
      <PageHeader title="收件箱" subtitle="邮件与 WhatsApp 统一会话" />
      {hint ? <p className="mb-3 text-sm text-emerald-700">{hint}</p> : null}
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
              <div className="mb-3">
                <div className="font-medium">{current.contact.name}</div>
                <div className="text-xs text-slate-400">{current.subject || current.channel}</div>
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

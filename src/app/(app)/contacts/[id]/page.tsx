"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { STAGES, STAGE_COLORS, canHandoffProposal, type Stage } from "@/lib/stages";
import { formatDate } from "@/lib/utils";
import { interpolateTemplate } from "@/lib/template";
import { INTENT_NAMES } from "@/lib/constants";

type Booking = {
  id: string;
  scheduledAt: string;
  meetingUrl: string | null;
  note: string | null;
  cancelledAt: string | null;
};

type Payload = {
  contact: {
    id: string;
    name: string;
    company: string;
    title: string;
    email: string | null;
    phone: string | null;
    source: string;
    tags: string[];
    stage: Stage;
    notes: string;
    score: number;
    icpScore?: number;
    leadTier?: string;
    country?: string;
    language?: string;
    productInterest?: string;
    nextAction?: string;
    doNotContact: boolean;
    bantBudget?: boolean;
    bantAuthority?: boolean;
    bantNeed?: boolean;
    bantTimeline?: boolean;
    lastContactedAt: string | null;
    activities: Array<{ id: string; type: string; content: string; createdAt: string }>;
    enrollments: Array<{ id: string; status: string; pausedReason: string | null; currentStep: number; sequence: { name: string } }>;
    threads: Array<{ id: string; channel: string; messages: Array<{ id: string; direction: string; body: string; createdAt: string }> }>;
    alignmentBookings?: Booking[];
  };
  sequences: Array<{ id: string; name: string }>;
  templates: Array<{ id: string; name: string; subject: string; body: string }>;
  activeBooking?: Booking | null;
};

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [waCfg, setWaCfg] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [tplId, setTplId] = useState("");
  const [waBody, setWaBody] = useState("{{name}} 您好，我是建联团队。");
  const [reply, setReply] = useState("");
  const [seqId, setSeqId] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [suggestIntent, setSuggestIntent] = useState("");
  const [suggestDraft, setSuggestDraft] = useState("");
  const [suggestSubject, setSuggestSubject] = useState("");
  const [handoffInfo, setHandoffInfo] = useState("");

  async function load() {
    const res = await fetch(`/api/contacts/${params.id}`);
    const json = await res.json();
    setData(json);
    const s = await fetch("/api/settings").then((r) => r.json());
    setWaCfg(Boolean(s.whatsapp?.configured));
  }
  useEffect(() => {
    if (params.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!data?.contact) return <p className="text-sm text-slate-500">加载中…</p>;
  const c = data.contact;
  const vars = { name: c.name, company: c.company, title: c.title };
  const activeBooking = data.activeBooking || c.alignmentBookings?.find((b) => !b.cancelledAt) || null;

  async function patch(body: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/contacts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "更新失败");
      return;
    }
    load();
  }

  async function sendEmail() {
    const res = await fetch(`/api/contacts/${c.id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tplId ? { templateId: tplId } : { subject: emailSubject, body: emailBody }),
    });
    const json = await res.json();
    setHint(res.ok ? (json.dryRun ? "已记录 dry-run（未配置 SMTP）" : "已发送") : json.error);
    load();
  }

  async function sendWa() {
    const res = await fetch(`/api/contacts/${c.id}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: waBody }),
    });
    const json = await res.json();
    setHint(res.ok ? "WhatsApp 已发送" : json.error || "未配置");
    load();
  }

  async function logReply() {
    await fetch(`/api/contacts/${c.id}/log-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply, channel: "email" }),
    });
    setReply("");
    setHint("已登记回复，阶段改为已回复，序列已暂停");
    load();
  }

  async function enroll() {
    if (!seqId) return;
    await fetch(`/api/sequences/${seqId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: c.id }),
    });
    setHint("已加入序列");
    load();
  }

  async function registerBooking() {
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: c.id,
        scheduledAt,
        meetingUrl: meetingUrl || null,
        note: bookingNote || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "登记失败");
      return;
    }
    setHint("已登记已约 → 对齐中，序列已暂停");
    setScheduledAt("");
    setMeetingUrl("");
    setBookingNote("");
    load();
  }

  async function rescheduleBooking() {
    if (!activeBooking) return;
    setError("");
    const res = await fetch(`/api/bookings/${activeBooking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: scheduledAt || activeBooking.scheduledAt,
        meetingUrl: meetingUrl || activeBooking.meetingUrl,
        note: bookingNote || activeBooking.note,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "改期失败");
      return;
    }
    setHint("已改期（同一条 Booking，周指标不 +1）");
    load();
  }

  async function cancelBooking() {
    if (!activeBooking) return;
    const res = await fetch(`/api/bookings/${activeBooking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancel: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "取消失败");
      return;
    }
    setHint("已取消已约 → 跟进中");
    load();
  }

  async function loadSuggest() {
    const sp = suggestIntent ? `?intent=${encodeURIComponent(suggestIntent)}` : "";
    const json = await fetch(`/api/contacts/${c.id}/suggest${sp}`).then((r) => r.json());
    setSuggestDraft(json.draft || json.body || "");
    setSuggestSubject(json.subject || "");
    setSuggestIntent(json.intent || suggestIntent);
    setHint("已生成建议下一句（可编辑，不会自动外发）");
  }

  async function handoffProposal() {
    setHandoffInfo("");
    setError("");
    const res = await fetch(`/api/contacts/${c.id}/proposal-handoff`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "handoff 失败");
      return;
    }
    const parts = ["brief 已写入活动时间线"];
    if (json.delivered?.webhookPosted) parts.push("已 POST 提案作战 webhook");
    else if (json.delivered?.webhookConfigured) parts.push("webhook 调用失败，可重试");
    else parts.push("未配置 PROPOSAL_HANDOFF_WEBHOOK_URL（仍已落库）");
    setHandoffInfo(parts.join(" · "));
    setHint("已交给提案作战");
    if (json.briefText && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(json.briefText);
      } catch {
        /* clipboard is optional convenience only */
      }
    }
    load();
  }

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={`${c.company} · ${c.title || "无职位"} · ICP ${c.icpScore ?? c.score} · ${c.leadTier === "HOT" ? "热" : c.leadTier === "WARM" ? "温" : "冷"}`}
        actions={<Badge className={STAGE_COLORS[c.stage]}>{c.stage}</Badge>}
      />
      {hint ? <p className="mb-2 text-sm text-emerald-700">{hint}</p> : null}
      {handoffInfo ? <p className="mb-2 text-sm text-indigo-700">{handoffInfo}</p> : null}
      {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 space-y-3 text-sm">
          <div>
            <div className="text-slate-400">邮箱</div>
            <div>{c.email || "—"}</div>
          </div>
          <div>
            <div className="text-slate-400">电话</div>
            <div>{c.phone || "—"}</div>
          </div>
          <div>
            <div className="text-slate-400">来源 / 国家 / 语言</div>
            <div>{c.source || "—"} · {c.country || "—"} · {c.language || "—"}</div>
          </div>
          <div>
            <div className="text-slate-400">产品意向 / 下一步</div>
            <div>{c.productInterest || "—"} · {c.nextAction || "—"}</div>
          </div>
          <div>
            <div className="text-slate-400">最近联系</div>
            <div>{formatDate(c.lastContactedAt)}</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {c.tags.map((t) => (
              <Badge key={t} className="border-slate-200">{t}</Badge>
            ))}
          </div>
          <Select
            value={c.stage}
            onChange={(e) => {
              if (e.target.value === "对齐中" && !activeBooking) {
                setError("请先「登记已约」后再进入对齐中");
                return;
              }
              patch({ stage: e.target.value });
            }}
          >
            {STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={c.doNotContact} onChange={(e) => patch({ doNotContact: e.target.checked })} />
            勿联系
          </label>
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              ["bantBudget", "B 预算", c.bantBudget],
              ["bantAuthority", "A 决策权", c.bantAuthority],
              ["bantNeed", "N 需求", c.bantNeed],
              ["bantTimeline", "T 时间", c.bantTimeline],
            ].map(([k, label, v]) => (
              <label key={String(k)} className="flex items-center gap-1">
                <input type="checkbox" checked={!!v} onChange={(e) => patch({ [k as string]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <Textarea defaultValue={c.notes} rows={4} onBlur={(e) => patch({ notes: e.target.value })} />
          {canHandoffProposal(c.stage) ? (
            <div>
              <Button onClick={handoffProposal}>交给提案作战</Button>
              <p className="mt-1.5 text-xs text-slate-500">对齐谈妥后点这里：把 brief 交给提案侧继续跟进。</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">对齐完成后会出现「交给提案作战」。</p>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="mb-2 font-medium">登记已约</h3>
            {activeBooking ? (
              <p className="mb-2 text-sm text-indigo-700">
                当前已约：{formatDate(activeBooking.scheduledAt)}
                {activeBooking.meetingUrl ? ` · ${activeBooking.meetingUrl}` : ""}
              </p>
            ) : (
              <p className="mb-2 text-xs text-slate-500">对方同意开会后在此登记：填开始时间 → 阶段变为「对齐中」，序列自动暂停。</p>
            )}
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-500">开始时间 *</label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500">会议链接</label>
                <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://" />
              </div>
            </div>
            <Textarea className="mt-2" rows={2} placeholder="备注" value={bookingNote} onChange={(e) => setBookingNote(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-2">
              {!activeBooking ? (
                <Button onClick={registerBooking} disabled={!scheduledAt}>登记已约</Button>
              ) : (
                <>
                  <Button onClick={rescheduleBooking}>改期（同条）</Button>
                  <Button variant="outline" onClick={cancelBooking}>取消已约</Button>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">用途：把「约到的会」记进本周已约；改期不重复计数，取消则回到跟进中。</p>
          </Card>

          <Card>
            <h3 className="mb-2 font-medium">建议下一句</h3>
            <p className="mb-2 text-xs text-slate-500">按阶段生成可编辑草稿；不会自动外发，确认后再「填入发邮件」或去活动发出。</p>
            <div className="flex flex-wrap gap-2">
              <Select value={suggestIntent} onChange={(e) => setSuggestIntent(e.target.value)}>
                <option value="">按阶段自动</option>
                {INTENT_NAMES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
              <Button variant="outline" onClick={loadSuggest}>生成草稿</Button>
              <Button
                onClick={() => {
                  setEmailSubject(suggestSubject);
                  setEmailBody(suggestDraft);
                  setHint("已填入发邮件区，可继续编辑后发送");
                }}
                disabled={!suggestDraft}
              >
                填入发邮件
              </Button>
            </div>
            <Input className="mt-2" placeholder="建议主题" value={suggestSubject} onChange={(e) => setSuggestSubject(e.target.value)} />
            <Textarea className="mt-2" rows={6} placeholder="点击生成草稿（不会空白）" value={suggestDraft} onChange={(e) => setSuggestDraft(e.target.value)} />
          </Card>

          <Card>
            <h3 className="mb-2 font-medium">发邮件</h3>
            <Select
              value={tplId}
              onChange={(e) => {
                setTplId(e.target.value);
                const t = data.templates.find((x) => x.id === e.target.value);
                if (t) {
                  setEmailSubject(interpolateTemplate(t.subject, vars));
                  setEmailBody(interpolateTemplate(t.body, vars));
                }
              }}
            >
              <option value="">选择模板或手写</option>
              {data.templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <Input className="mt-2" placeholder="主题" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            <Textarea className="mt-2" rows={5} placeholder="正文，可用 {{name}} {{company}} {{title}}" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button onClick={sendEmail} disabled={!c.email || c.doNotContact}>发送 / Dry-run</Button>
              {!c.email ? <span className="text-xs text-slate-400 self-center">无邮箱</span> : null}
            </div>
          </Card>

          <Card>
            <h3 className="mb-2 font-medium">WhatsApp Cloud API</h3>
            {waCfg ? (
              <>
                <Textarea rows={3} value={waBody} onChange={(e) => setWaBody(e.target.value)} />
                <Button className="mt-2" onClick={sendWa} disabled={!c.phone || c.doNotContact}>发送 WhatsApp</Button>
              </>
            ) : (
              <p className="text-sm text-amber-700">未配置。请到设置页填写 WABA Phone Number ID 与 Access Token。</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-2 font-medium">序列报名</h3>
            <div className="flex gap-2">
              <Select value={seqId} onChange={(e) => setSeqId(e.target.value)}>
                <option value="">选择序列</option>
                {data.sequences.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Button onClick={enroll}>手动加入</Button>
            </div>
            <ul className="mt-3 text-sm text-slate-600">
              {c.enrollments.map((e) => (
                <li key={e.id}>
                  {e.sequence.name} · {e.status}
                  {e.pausedReason ? `（${e.pausedReason}）` : ""} · 步骤 {e.currentStep}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-amber-100 bg-amber-50/40">
            <h3 className="mb-1 font-medium">手动登记回复</h3>
            <p className="mb-2 text-xs text-slate-500">
              在外部邮箱/微信看到对方回复时，粘贴到这里登记——线索会进「今日 · 该回」，阶段改为已回复并暂停序列。IMAP 未开时必用。
            </p>
            <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="粘贴对方回复内容" />
            <Button className="mt-2" variant="outline" onClick={logReply}>登记回复</Button>
          </Card>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-medium">活动时间线</h2>
      <Card>
        <ul className="space-y-3 text-sm">
          {c.activities.map((a) => (
            <li key={a.id} className="border-b border-slate-50 pb-2">
              <div className="text-xs text-slate-400">{formatDate(a.createdAt)} · {a.type}</div>
              <div className="whitespace-pre-wrap text-slate-700">{a.content}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

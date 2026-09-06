"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Account = { id: string; email: string; name: string; role: string; createdAt: string };

export function UsersManager() {
  const [users, setUsers] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "USER" });

  async function load() {
    const res = await fetch("/api/users");
    if (res.status === 403) {
      setError("无权限");
      return;
    }
    const json = await res.json();
    setUsers(json.users || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "创建失败");
      return;
    }
    setForm({ email: "", name: "", password: "", role: "USER" });
    load();
  }

  return (
    <div>
      <PageHeader title="账号" subtitle="仅为各用户开通登录。此处不展示其他用户的联系人。" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-medium">新建账号</h3>
          <form onSubmit={onCreate} className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">邮箱</label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">姓名</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">密码</label>
              <Input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">角色</label>
              <Select
                className="w-full"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </Select>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit">创建账号</Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-3 font-medium">账号列表</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="pb-2 font-medium">邮箱</th>
                <th className="pb-2 font-medium">角色</th>
                <th className="pb-2 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2">
                    <div>{u.email}</div>
                    {u.name ? <div className="text-xs text-slate-400">{u.name}</div> : null}
                  </td>
                  <td className="py-2">{u.role === "ADMIN" ? "管理员" : "用户"}</td>
                  <td className="py-2 text-slate-500">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td className="py-2 text-slate-400" colSpan={3}>
                    暂无
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

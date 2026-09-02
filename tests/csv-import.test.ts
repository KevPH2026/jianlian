import { describe, expect, it } from "vitest";
import { parseContactCsv, dedupContacts, toCsv } from "../src/lib/csv";
import { scoreContact } from "../src/lib/scoring";
import { normalizeStage } from "../src/lib/stages";

function importPreview(csvText: string, existing: Array<{ id: string; name: string; company?: string | null; email?: string | null; phone?: string | null }>) {
  const rows = parseContactCsv(csvText);
  const { creates, updates, skipped } = dedupContacts(rows, existing);
  return {
    parsed: rows.length,
    created: creates.map((r) => ({
      ...r,
      stage: normalizeStage(r.stage),
      score: scoreContact(r),
    })),
    updated: updates,
    skipped,
  };
}

describe("CSV 导入", () => {
  it("解析并给决策人打分", () => {
    const csv = [
      "name,company,title,email,phone,source,tags,stage,notes",
      "陈启明,星河科技,CEO,chen@xinghe.example,13800001001,展会,决策人,新线索,主对接",
    ].join("\n");
    const result = importPreview(csv, []);
    expect(result.parsed).toBe(1);
    expect(result.created).toHaveLength(1);
    expect(result.created[0].score).toBe(100);
    expect(result.created[0].stage).toBe("新线索");
  });

  it("导入时按邮箱更新已有联系人", () => {
    const csv = "name,company,email\n陈启明,星河科技新名,chen@xinghe.example\n";
    const result = importPreview(csv, [
      { id: "c1", name: "陈启明", company: "星河科技", email: "chen@xinghe.example", phone: "13800001001" },
    ]);
    expect(result.created).toHaveLength(0);
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0].existing.id).toBe("c1");
  });

  it("跳过无姓名行", () => {
    const csv = "name,email\n,nobody@x.com\n有名字,a@x.com\n";
    const result = importPreview(csv, []);
    expect(result.parsed).toBe(1);
    expect(result.created[0].name).toBe("有名字");
  });

  it("导出 CSV 包含必要列", () => {
    const csv = toCsv([
      {
        name: "A",
        company: "B",
        title: "CEO",
        email: "a@b.com",
        phone: "1",
        source: "seed",
        tags: "x;y",
        stage: "新线索",
        notes: "n",
        score: 70,
        doNotContact: false,
      },
    ]);
    expect(csv.split("\n")[0]).toContain("email");
    expect(csv).toContain("a@b.com");
  });

  it("无效阶段回落到 新线索", () => {
    const csv = "name,stage\n测试人,未知阶段\n";
    const result = importPreview(csv, []);
    expect(result.created[0].stage).toBe("新线索");
  });
});

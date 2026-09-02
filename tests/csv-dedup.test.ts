import { describe, expect, it } from "vitest";
import { dedupContacts, parseContactCsv, type CsvContactRow } from "../src/lib/csv";

const row = (p: Partial<CsvContactRow> & { name: string }): CsvContactRow => ({
  company: "",
  title: "",
  email: "",
  phone: "",
  source: "csv",
  tags: [],
  stage: "新线索",
  notes: "",
  ...p,
});

describe("CSV 去重", () => {
  it("优先按邮箱去重", () => {
    const incoming = [row({ name: "李雷", email: "lei@acme.com", company: "Acme", phone: "13800001111" })];
    const existing = [{ id: "1", name: "旧名", company: "Other", email: "lei@acme.com", phone: null }];
    const r = dedupContacts(incoming, existing);
    expect(r.creates).toHaveLength(0);
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].matchedBy).toBe("email");
  });

  it("邮箱大小写不敏感", () => {
    const incoming = [row({ name: "李雷", email: "Lei@Acme.com" })];
    const existing = [{ id: "1", name: "李雷", company: "", email: "lei@acme.com", phone: null }];
    const r = dedupContacts(incoming, existing);
    expect(r.updates[0].matchedBy).toBe("email");
  });

  it("无邮箱时按电话去重", () => {
    const incoming = [row({ name: "韩梅梅", phone: "+86 138-0000-2222" })];
    const existing = [{ id: "2", name: "不同", company: "X", email: null, phone: "13800002222" }];
    const r = dedupContacts(incoming, existing);
    expect(r.updates).toHaveLength(1);
    expect(r.updates[0].matchedBy).toBe("phone");
  });

  it("无邮箱无电话时按姓名+公司去重", () => {
    const incoming = [row({ name: "王芳", company: "星河科技" })];
    const existing = [{ id: "3", name: "王芳", company: "星河科技", email: null, phone: null }];
    const r = dedupContacts(incoming, existing);
    expect(r.updates[0].matchedBy).toBe("name+company");
  });

  it("文件内重复行只保留第一条新建", () => {
    const incoming = [
      row({ name: "A", email: "a@x.com" }),
      row({ name: "A2", email: "a@x.com" }),
    ];
    const r = dedupContacts(incoming, []);
    expect(r.creates).toHaveLength(1);
    expect(r.skipped).toHaveLength(1);
  });

  it("完全新的联系人进入 creates", () => {
    const incoming = [row({ name: "新客", email: "new@x.com" })];
    const r = dedupContacts(incoming, [{ id: "9", name: "别人", company: "Y", email: "old@x.com", phone: null }]);
    expect(r.creates).toHaveLength(1);
    expect(r.updates).toHaveLength(0);
  });

  it("parseContactCsv 支持中文表头", () => {
    const csv = "姓名,公司,职位,邮箱,电话,标签,阶段\n赵云,蜀汉,CEO,zy@shu.com,13900000001,决策人,新线索\n";
    const rows = parseContactCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("赵云");
    expect(rows[0].email).toBe("zy@shu.com");
    expect(rows[0].tags).toContain("决策人");
  });
});

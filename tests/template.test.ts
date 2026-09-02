import { describe, expect, it } from "vitest";
import { interpolateTemplate, previewTemplate, missingPlaceholders } from "../src/lib/template";

describe("模板插值", () => {
  it("替换 name company title", () => {
    const text = "您好 {{name}}，我看到 {{company}} 的 {{title}} 岗位";
    const out = interpolateTemplate(text, { name: "李雷", company: "Acme", title: "CEO" });
    expect(out).toBe("您好 李雷，我看到 Acme 的 CEO 岗位");
  });

  it("允许空格变体 {{ name }}", () => {
    expect(interpolateTemplate("Hi {{ name }}", { name: "Ann" })).toBe("Hi Ann");
  });

  it("缺失变量替换为空字符串", () => {
    expect(interpolateTemplate("Hi {{name}} @ {{company}}", { name: "Ann" })).toBe("Hi Ann @ ");
  });

  it("previewTemplate 同时处理主题和正文", () => {
    const p = previewTemplate("致 {{name}}", "来自 {{company}}", { name: "韩梅梅", company: "星河" });
    expect(p.subject).toBe("致 韩梅梅");
    expect(p.body).toBe("来自 星河");
  });

  it("missingPlaceholders 列出空值", () => {
    expect(missingPlaceholders("{{name}} {{title}}", { name: "A" })).toEqual(["title"]);
  });
});

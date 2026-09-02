import { describe, expect, it } from "vitest";
import { emailLengthHint, extractTemplateVars, renderTemplate, waLengthHint, wordCount } from "@/lib/templates";

describe("template vars", () => {
  it("replaces name company title", () => {
    const out = renderTemplate(
      "Hi {{name}}, {{title}} at {{company}}",
      { name: "Ahmed", title: "Buyer", company: "Al-Faisal" }
    );
    expect(out).toBe("Hi Ahmed, Buyer at Al-Faisal");
  });

  it("allows spaces inside braces", () => {
    expect(renderTemplate("{{ name }} / {{  company  }}", { name: "A", company: "B" })).toBe("A / B");
  });

  it("empty vars become empty string", () => {
    expect(renderTemplate("X{{title}}Y", { name: "n" })).toBe("XY");
  });

  it("extracts unique vars", () => {
    expect(extractTemplateVars("{{name}} {{name}} {{company}}")).toEqual(["name", "company"]);
  });

  it("email hint under 200 words", () => {
    const short = "Hello there this is a short note.";
    expect(emailLengthHint(short).ok).toBe(true);
    const long = Array.from({ length: 200 }, () => "word").join(" ");
    expect(wordCount(long)).toBe(200);
    expect(emailLengthHint(long).ok).toBe(false);
  });

  it("whatsapp hint under 100 words", () => {
    const long = Array.from({ length: 100 }, () => "hi").join(" ");
    expect(waLengthHint(long).ok).toBe(false);
    expect(waLengthHint("Hi Ahmed, 15 min this week?").ok).toBe(true);
  });
});

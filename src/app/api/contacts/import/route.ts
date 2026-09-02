import { NextRequest, NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/session";
import { importCsv } from "@/lib/contacts";

export async function POST(req: NextRequest) {
  if (!(await requireUser())) return unauthorized();
  const contentType = req.headers.get("content-type") || "";
  let text = "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file && typeof file === "object" && "text" in file) {
      text = await (file as File).text();
    }
  } else {
    const body = await req.json().catch(() => ({}));
    text = body.csv || body.text || "";
  }
  if (!text.trim()) return NextResponse.json({ error: "空文件" }, { status: 400 });
  const result = await importCsv(text);
  return NextResponse.json(result);
}

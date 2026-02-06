import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export async function POST(request: Request) {
  const { filePath, content } = await request.json();
  
  const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
  if (!allowed.some(p => filePath.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }
  
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf-8");
    return NextResponse.json({ ok: true, filePath });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

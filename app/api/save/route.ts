import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export async function POST(request: Request) {
  try {
    const { code, filename } = await request.json();
    if (!code || !filename) {
      return NextResponse.json({ error: "Code and filename required" }, { status: 400 });
    }

    // Sanitize filename - no path traversal
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const scriptsDir = join(homedir(), "scripts");
    mkdirSync(scriptsDir, { recursive: true });
    const filePath = join(scriptsDir, safeName);

    writeFileSync(filePath, code, "utf-8");

    return NextResponse.json({ success: true, path: filePath });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

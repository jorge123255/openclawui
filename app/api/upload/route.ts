import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadDir = join(homedir(), ".openclaw", "tmp", "uploads");
    mkdirSync(uploadDir, { recursive: true });
    
    const ext = file.name.split(".").pop() || "txt";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = join(uploadDir, `${randomUUID().slice(0, 8)}_${safeName}`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(filePath, buffer);
    
    // Try to read as text for preview
    let textContent: string | null = null;
    const textExts = ["txt", "md", "json", "csv", "xml", "yaml", "yml", "toml", "ini", "cfg", "conf", "log", "py", "js", "ts", "html", "css", "sh", "rb", "go", "rs", "java", "kt", "php", "pl", "lua", "r", "sql", "c", "cpp", "h", "swift"];
    if (textExts.includes(ext.toLowerCase())) {
      try {
        textContent = buffer.toString("utf-8").slice(0, 5000);
      } catch {}
    }
    
    return NextResponse.json({
      success: true,
      filename: file.name,
      path: filePath,
      size: file.size,
      type: file.type,
      textContent,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

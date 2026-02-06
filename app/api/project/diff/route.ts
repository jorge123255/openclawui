import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export async function POST(request: Request) {
  const { filePath, newContent } = await request.json();
  
  // Security: only allow paths under safe directories
  const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
  if (!allowed.some(p => filePath.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }
  
  try {
    const oldContent = existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
    const isNew = !existsSync(filePath);
    
    // Generate unified diff using system diff
    let diff = "";
    if (!isNew) {
      // Write new content to temp file and diff
      const tmpFile = `/tmp/diff-new-${Date.now()}`;
      writeFileSync(tmpFile, newContent);
      try {
        diff = execSync(`diff -u "${filePath}" "${tmpFile}" || true`, { encoding: "utf-8", timeout: 5000 });
      } finally {
        try { execSync(`rm "${tmpFile}"`); } catch {}
      }
    } else {
      // New file — show all lines as additions
      diff = newContent.split("\n").map((l: string) => `+${l}`).join("\n");
    }
    
    return NextResponse.json({
      filePath,
      isNew,
      oldContent,
      newContent,
      diff,
      stats: {
        additions: (diff.match(/^\+[^+]/gm) || []).length,
        deletions: (diff.match(/^-[^-]/gm) || []).length,
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

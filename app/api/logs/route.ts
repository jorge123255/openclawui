import { NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const sessionsDir = join(homedir(), ".openclaw", "agents", "main", "sessions");

  try {
    if (sessionId) {
      // Get specific session log
      const logPath = join(sessionsDir, `${sessionId}.jsonl`);
      const content = await readFile(logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const entries = lines.slice(-limit).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });

      return NextResponse.json({
        success: true,
        sessionId,
        entries,
        total: lines.length,
      });
    } else {
      // List recent sessions with last entry
      const files = await readdir(sessionsDir);
      const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

      const sessions = await Promise.all(
        jsonlFiles.slice(0, 20).map(async (file) => {
          const filePath = join(sessionsDir, file);
          const stats = await stat(filePath);
          
          // Read last few lines
          let lastEntry = null;
          try {
            const content = await readFile(filePath, "utf-8");
            const lines = content.trim().split("\n").filter(Boolean);
            if (lines.length > 0) {
              const lastLine = lines[lines.length - 1];
              lastEntry = JSON.parse(lastLine);
            }
          } catch {}

          return {
            sessionId: file.replace(".jsonl", ""),
            file,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            lastEntry,
          };
        })
      );

      // Sort by modified date
      sessions.sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime()
      );

      return NextResponse.json({
        success: true,
        sessions: sessions.slice(offset, offset + limit),
        total: jsonlFiles.length,
      });
    }
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

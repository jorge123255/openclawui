import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    // Get recent session activity via clawdbot CLI
    const { stdout } = await execAsync(
      `clawdbot sessions list --limit ${limit} --json 2>/dev/null || echo '{"sessions":[]}'`
    );

    const data = JSON.parse(stdout || '{"sessions":[]}');
    const sessions = data.sessions || [];

    // Convert to activity items
    const activities = sessions.slice(0, limit).map((s: any) => ({
      id: s.sessionKey || s.id,
      type: "session",
      title: s.label || s.sessionKey?.substring(0, 8) || "Session",
      detail: s.lastMessage?.content?.substring(0, 50) || null,
      timestamp: s.lastActivity || s.createdAt || new Date().toISOString(),
    }));

    return NextResponse.json({ success: true, activities });
  } catch (e: any) {
    // Return empty on error
    return NextResponse.json({ success: true, activities: [] });
  }
}

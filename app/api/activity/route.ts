import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    const { stdout } = await execAsync(
      `/usr/local/bin/clawdbot sessions list --json`,
      { timeout: 5000, env: { ...process.env, HOME: homedir() } }
    );

    const data = JSON.parse(stdout || '{"sessions":[]}');
    const sessions = data.sessions || [];

    // Convert to activity items using actual CLI output fields
    const activities = sessions.slice(0, limit).map((s: any) => {
      const key = s.key || "";
      // Derive a friendly name from the session key
      let title = "Session";
      if (key.includes(":main:main")) title = "Main Session";
      else if (key.includes(":webchat")) title = "Web Chat";
      else if (key.includes(":subagent:")) title = "Sub-agent";
      else if (key === "default") title = "Default";
      else if (key) title = key.split(":").pop() || "Session";

      const model = s.model ? `Model: ${s.model}` : null;
      const tokens = s.totalTokens ? `${(s.totalTokens / 1000).toFixed(1)}k tokens` : null;
      const detail = [model, tokens].filter(Boolean).join(" · ");

      return {
        id: s.sessionId || s.key,
        type: "session",
        title,
        detail: detail || null,
        timestamp: s.updatedAt
          ? new Date(s.updatedAt).toISOString()
          : new Date().toISOString(),
      };
    });

    return NextResponse.json({ success: true, activities });
  } catch (e: any) {
    return NextResponse.json({ success: true, activities: [], _error: e.message?.substring(0, 200) });
  }
}

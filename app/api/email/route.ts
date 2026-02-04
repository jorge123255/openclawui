import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") || "inbox";
  const limit = searchParams.get("limit") || "20";

  try {
    // Use gog skill to fetch emails
    const cmd = folder === "sent"
      ? `gog mail list --sent --limit ${limit} --json 2>/dev/null`
      : `gog mail list --limit ${limit} --json 2>/dev/null`;

    const { stdout } = await execAsync(cmd);
    const messages = JSON.parse(stdout || "[]");

    const emails = Array.isArray(messages) ? messages.map((m: any) => ({
      id: m.id || m.messageId || String(Math.random()),
      from: m.from || m.sender || "Unknown",
      subject: m.subject || "(No subject)",
      snippet: m.snippet || m.preview || "",
      date: m.date || m.receivedAt || new Date().toISOString(),
      unread: m.unread ?? !m.read,
      starred: m.starred || false,
    })) : [];

    return NextResponse.json({ success: true, emails });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: "Not connected to Google. Run 'gog auth login' to connect.",
      emails: [],
    });
  }
}

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Use openclaw CLI for gateway communication
async function runOpenClaw(args: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`/usr/local/bin/clawdbot ${args}`, {
      timeout: 30000,
      env: { ...process.env, HOME: process.env.HOME || '/Users/gszulc' },
    });
    return JSON.parse(stdout);
  } catch (e: any) {
    console.error('OpenClaw error:', e.message);
    throw e;
  }
}

export async function POST(request: Request) {
  const { action, sessionKey, limit, message } = await request.json();

  try {
    switch (action) {
      case "list":
        return await listSessions();
      case "history":
        return await getHistory(sessionKey, limit);
      case "send":
        return await sendMessage(sessionKey, message);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

async function listSessions() {
  try {
    const result = await runOpenClaw('sessions list --json');
    return NextResponse.json({
      success: true,
      sessions: result.sessions || result || [],
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      sessions: [],
      error: e.message,
    });
  }
}

async function getHistory(sessionKey: string, limit: number = 20) {
  if (!sessionKey) {
    return NextResponse.json({ error: "Session key required" }, { status: 400 });
  }

  try {
    const result = await runOpenClaw(`sessions history "${sessionKey}" --limit ${limit} --json`);
    return NextResponse.json({
      success: true,
      messages: result.messages || result || [],
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      messages: [],
      error: e.message,
    });
  }
}

async function sendMessage(sessionKey: string, message: string) {
  if (!sessionKey || !message) {
    return NextResponse.json({ error: "Session key and message required" }, { status: 400 });
  }

  try {
    // Escape the message for shell
    const escapedMessage = message.replace(/'/g, "'\\''");
    const result = await runOpenClaw(`sessions send "${sessionKey}" '${escapedMessage}' --json`);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

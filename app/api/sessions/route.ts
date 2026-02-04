import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const OPENCLAW_CONFIG = join(homedir(), ".openclaw", "openclaw.json");

async function getConfig() {
  try {
    const data = await readFile(OPENCLAW_CONFIG, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const { action, sessionKey, limit } = await request.json();

  const config = await getConfig();
  const gatewayPort = config.gateway?.port || 18789;
  const gatewayToken = config.gateway?.auth?.token;
  
  const baseUrl = `http://127.0.0.1:${gatewayPort}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (gatewayToken) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
  }

  try {
    switch (action) {
      case "list":
        return await listSessions(baseUrl, headers);
      case "history":
        return await getHistory(baseUrl, headers, sessionKey, limit);
      case "send":
        return await sendMessage(baseUrl, headers, sessionKey, request);
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

async function listSessions(baseUrl: string, headers: Record<string, string>) {
  try {
    // Use the gateway's RPC endpoint
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "sessions.list",
        params: { messageLimit: 1 },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      // Try alternative endpoint
      const altRes = await fetch(`${baseUrl}/api/sessions`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (altRes.ok) {
        const data = await altRes.json();
        return NextResponse.json({ sessions: data.sessions || data, success: true });
      }
      throw new Error(`Gateway error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      sessions: data.result?.sessions || data.sessions || [],
    });
  } catch (e: any) {
    // Return empty list if gateway is unreachable
    return NextResponse.json({
      success: false,
      sessions: [],
      error: e.message,
    });
  }
}

async function getHistory(
  baseUrl: string,
  headers: Record<string, string>,
  sessionKey: string,
  limit: number = 20
) {
  if (!sessionKey) {
    return NextResponse.json({ error: "Session key required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "sessions.history",
        params: { sessionKey, limit, includeTools: false },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      messages: data.result?.messages || data.messages || [],
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      messages: [],
      error: e.message,
    });
  }
}

async function sendMessage(
  baseUrl: string,
  headers: Record<string, string>,
  sessionKey: string,
  request: Request
) {
  const { message } = await request.json();
  
  if (!sessionKey || !message) {
    return NextResponse.json({ error: "Session key and message required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "sessions.send",
        params: { sessionKey, message },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      result: data.result,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

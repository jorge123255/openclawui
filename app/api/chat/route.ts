import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

function getConfigPath(): string {
  const clawdbotPath = join(homedir(), ".clawdbot", "clawdbot.json");
  try {
    require("fs").accessSync(clawdbotPath);
    return clawdbotPath;
  } catch {
    return join(homedir(), ".openclaw", "openclaw.json");
  }
}

async function getConfig() {
  try {
    const data = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const { message, sessionKey } = await request.json();

  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const config = await getConfig();
  const gatewayPort = config.gateway?.port || 18789;
  const gatewayToken = config.gateway?.auth?.token;

  // Use the OpenAI-compatible chat completions endpoint
  const url = `http://127.0.0.1:${gatewayPort}/v1/chat/completions`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (gatewayToken) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "default",
        messages: [{ role: "user", content: message }],
        stream: false,
        // Use webchat session for UI
        user: sessionKey || "webchat-ui",
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for long responses
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Gateway error:", res.status, text);
      return NextResponse.json({
        success: false,
        error: `Gateway error: ${res.status}`,
      });
    }

    const data = await res.json();
    
    // Extract the assistant's response
    const assistantMessage = data.choices?.[0]?.message?.content || data.content || "";
    
    return NextResponse.json({
      success: true,
      response: assistantMessage,
      usage: data.usage,
    });
  } catch (e: any) {
    console.error("Chat error:", e);
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

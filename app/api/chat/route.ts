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

async function loadFileQuietly(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function buildSystemPrompt(config: any): Promise<string> {
  const workspace = config.workspace?.path || join(homedir(), "clawd");
  
  const soul = await loadFileQuietly(join(workspace, "SOUL.md"));
  const user = await loadFileQuietly(join(workspace, "USER.md"));
  const identity = await loadFileQuietly(join(workspace, "IDENTITY.md"));
  
  const parts: string[] = [];
  parts.push("You are chatting via the OpenClaw Web UI. This is a browser-based chat interface.");
  parts.push("The user is your human (George). Respond naturally as you would in any conversation.");
  parts.push("You can use markdown formatting (bold, code blocks, lists, etc.) — the UI renders it.");
  parts.push("");
  
  if (identity) {
    parts.push("## Your Identity");
    parts.push(identity);
    parts.push("");
  }
  if (soul) {
    parts.push("## Your Soul");
    parts.push(soul);
    parts.push("");
  }
  if (user) {
    parts.push("## About Your Human");
    parts.push(user);
    parts.push("");
  }
  
  parts.push(`Current time: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} (CST)`);
  
  return parts.join("\n");
}

export async function POST(request: Request) {
  const { message, messages: history, sessionKey } = await request.json();

  if (!message && (!history || history.length === 0)) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const config = await getConfig();
  const gatewayPort = config.gateway?.port || 18789;
  const gatewayToken = config.gateway?.auth?.token;

  const systemPrompt = await buildSystemPrompt(config);
  
  // Build messages array: system prompt + full history
  const apiMessages: Array<{role: string; content: string}> = [];
  apiMessages.push({ role: "system", content: systemPrompt });
  
  if (history && history.length > 0) {
    // Send full conversation history
    for (const msg of history) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
    // Add the new message if it's not already the last one
    const lastMsg = history[history.length - 1];
    if (message && lastMsg?.content !== message) {
      apiMessages.push({ role: "user", content: message });
    }
  } else {
    apiMessages.push({ role: "user", content: message });
  }

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
        messages: apiMessages,
        stream: false,
        user: sessionKey || "webchat-ui",
      }),
      signal: AbortSignal.timeout(120000),
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

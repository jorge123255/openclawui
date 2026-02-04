import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const OPENCLAW_CONFIG = join(homedir(), ".openclaw", "openclaw.json");

// Default MCP server URL (from George's setup)
const DEFAULT_MCP_URL = "http://192.168.1.91:3000";

async function getConfig() {
  try {
    const data = await readFile(OPENCLAW_CONFIG, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const { action, tool, args } = await request.json();

  const config = await getConfig();
  const mcpUrl = config.env?.MCP_SERVER_URL || DEFAULT_MCP_URL;

  try {
    switch (action) {
      case "list-tools":
        return await listTools(mcpUrl);
      case "call-tool":
        return await callTool(mcpUrl, tool, args);
      case "status":
        return await getStatus(mcpUrl);
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

async function listTools(mcpUrl: string) {
  try {
    // Call the MCP server's tools/list endpoint
    const res = await fetch(`${mcpUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`MCP server error: ${res.status}`);
    }

    const data = await res.json();
    
    // Parse the tools from the response
    const tools = data.result?.tools || [];
    
    // Group tools by category (inferred from name prefix)
    const categorizedTools = tools.map((tool: any) => {
      const nameParts = tool.name.split("_");
      const category = nameParts.length > 1 ? nameParts[0] : "other";
      return {
        ...tool,
        category,
      };
    });

    return NextResponse.json({
      success: true,
      tools: categorizedTools,
      count: tools.length,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      tools: [],
      error: e.message,
    });
  }
}

async function callTool(mcpUrl: string, tool: string, args: any) {
  if (!tool) {
    return NextResponse.json({ error: "Tool name required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${mcpUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: tool,
          arguments: args || {},
        },
        id: 1,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`MCP server error: ${res.status}`);
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

async function getStatus(mcpUrl: string) {
  try {
    const res = await fetch(`${mcpUrl}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    return NextResponse.json({
      success: true,
      connected: res.ok,
    });
  } catch {
    return NextResponse.json({
      success: false,
      connected: false,
    });
  }
}

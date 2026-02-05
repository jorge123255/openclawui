import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { execSync } from "child_process";
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

// Use curl instead of fetch to work around macOS local network permissions
function curlJsonRpc(url: string, method: string, params: object, timeoutSec = 10): any {
  try {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    });
    // Escape single quotes in payload for shell
    const escapedPayload = payload.replace(/'/g, "'\"'\"'");
    const result = execSync(
      `curl -s --max-time ${timeoutSec} -X POST -H "Content-Type: application/json" -d '${escapedPayload}' "${url}/mcp"`,
      { encoding: "utf-8" }
    );
    return JSON.parse(result);
  } catch (e: any) {
    throw new Error(`Request failed: ${e.message}`);
  }
}

export async function POST(request: Request) {
  const { action, tool, args } = await request.json();

  const config = await getConfig();
  const mcpUrl = config.env?.MCP_SERVER_URL || DEFAULT_MCP_URL;

  try {
    switch (action) {
      case "list-tools":
        return listTools(mcpUrl);
      case "call-tool":
        return callTool(mcpUrl, tool, args);
      case "status":
        return getStatus(mcpUrl);
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

function listTools(mcpUrl: string) {
  try {
    const data = curlJsonRpc(mcpUrl, "tools/list", {});
    
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

function callTool(mcpUrl: string, tool: string, args: any) {
  if (!tool) {
    return NextResponse.json({ error: "Tool name required" }, { status: 400 });
  }

  try {
    const data = curlJsonRpc(mcpUrl, "tools/call", {
      name: tool,
      arguments: args || {},
    }, 30);

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

function getStatus(mcpUrl: string) {
  try {
    curlJsonRpc(mcpUrl, "tools/list", {}, 5);
    return NextResponse.json({
      success: true,
      connected: true,
    });
  } catch {
    return NextResponse.json({
      success: false,
      connected: false,
    });
  }
}

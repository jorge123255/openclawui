import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { execSync } from "child_process";
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

// Use curl instead of fetch to work around macOS local network permissions
function curlGet(url: string, apiKey: string): any {
  try {
    const result = execSync(
      `curl -s --max-time 10 -H "X-N8N-API-KEY: ${apiKey}" "${url}"`,
      { encoding: "utf-8" }
    );
    return JSON.parse(result);
  } catch (e: any) {
    throw new Error(`Request failed: ${e.message}`);
  }
}

function curlPost(url: string, apiKey: string, body?: object): any {
  try {
    const bodyArg = body ? `-d '${JSON.stringify(body)}'` : "";
    const result = execSync(
      `curl -s --max-time 10 -X POST -H "X-N8N-API-KEY: ${apiKey}" -H "Content-Type: application/json" ${bodyArg} "${url}"`,
      { encoding: "utf-8" }
    );
    return result ? JSON.parse(result) : {};
  } catch (e: any) {
    throw new Error(`Request failed: ${e.message}`);
  }
}

export async function POST(request: Request) {
  const { action, workflowId } = await request.json();

  const config = await getConfig();
  const n8nUrl = config.env?.N8N_BASE_URL;
  const n8nKey = config.env?.N8N_API_KEY;

  if (!n8nUrl || !n8nKey) {
    return NextResponse.json({
      success: false,
      error: "N8N not configured. Set N8N_BASE_URL and N8N_API_KEY in settings.",
    });
  }

  try {
    switch (action) {
      case "list-workflows":
        return listWorkflows(n8nUrl, n8nKey);
      case "trigger":
        return triggerWorkflow(n8nUrl, n8nKey, workflowId);
      case "status":
        return getStatus(n8nUrl, n8nKey);
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

function listWorkflows(baseUrl: string, apiKey: string) {
  const data = curlGet(`${baseUrl}/api/v1/workflows`, apiKey);
  
  return NextResponse.json({
    success: true,
    workflows: data.data || [],
  });
}

function triggerWorkflow(baseUrl: string, apiKey: string, workflowId: string) {
  if (!workflowId) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  curlPost(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, apiKey);

  return NextResponse.json({
    success: true,
    message: `Triggered workflow ${workflowId}`,
  });
}

function getStatus(baseUrl: string, apiKey: string) {
  try {
    curlGet(`${baseUrl}/api/v1/workflows`, apiKey);
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

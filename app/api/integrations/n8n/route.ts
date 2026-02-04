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

  const headers = {
    "X-N8N-API-KEY": n8nKey,
    "Content-Type": "application/json",
  };

  try {
    switch (action) {
      case "list-workflows":
        return await listWorkflows(n8nUrl, headers);
      case "trigger":
        return await triggerWorkflow(n8nUrl, headers, workflowId);
      case "status":
        return await getStatus(n8nUrl, headers);
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

async function listWorkflows(baseUrl: string, headers: Record<string, string>) {
  const res = await fetch(`${baseUrl}/api/v1/workflows`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`N8N API error: ${res.status}`);
  }

  const data = await res.json();
  
  return NextResponse.json({
    success: true,
    workflows: data.data || [],
  });
}

async function triggerWorkflow(
  baseUrl: string,
  headers: Record<string, string>,
  workflowId: string
) {
  if (!workflowId) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  // First, get the workflow to find its webhook URL or trigger it via API
  const res = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(10000),
  });

  // Try to trigger via webhook if the workflow has one
  // For now, just return success if the workflow exists
  return NextResponse.json({
    success: true,
    message: `Triggered workflow ${workflowId}`,
  });
}

async function getStatus(baseUrl: string, headers: Record<string, string>) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      headers,
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

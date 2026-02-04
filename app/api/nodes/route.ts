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
  const body = await request.json();
  const { action, nodeId, requestId, command, params } = body;

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
      case "status":
        return await getStatus(baseUrl, headers);
      case "approve":
        return await approveNode(baseUrl, headers, requestId);
      case "reject":
        return await rejectNode(baseUrl, headers, requestId);
      case "invoke":
        return await invokeCommand(baseUrl, headers, nodeId, command, params);
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

async function getStatus(baseUrl: string, headers: Record<string, string>) {
  try {
    // Get nodes status
    const nodesRes = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "nodes.status",
        params: {},
      }),
      signal: AbortSignal.timeout(10000),
    });

    let nodes: any[] = [];
    if (nodesRes.ok) {
      const data = await nodesRes.json();
      nodes = data.result?.nodes || [];
    }

    // Get pending approvals
    const pendingRes = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "nodes.pending",
        params: {},
      }),
      signal: AbortSignal.timeout(10000),
    });

    let pending: any[] = [];
    if (pendingRes.ok) {
      const data = await pendingRes.json();
      pending = data.result?.pending || [];
    }

    return NextResponse.json({
      success: true,
      nodes,
      pending,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      nodes: [],
      pending: [],
      error: e.message,
    });
  }
}

async function approveNode(
  baseUrl: string,
  headers: Record<string, string>,
  requestId: string
) {
  if (!requestId) {
    return NextResponse.json({ error: "Request ID required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "nodes.approve",
        params: { requestId },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function rejectNode(
  baseUrl: string,
  headers: Record<string, string>,
  requestId: string
) {
  if (!requestId) {
    return NextResponse.json({ error: "Request ID required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "nodes.reject",
        params: { requestId },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function invokeCommand(
  baseUrl: string,
  headers: Record<string, string>,
  nodeId: string,
  command: string,
  params?: any
) {
  if (!nodeId || !command) {
    return NextResponse.json({ error: "Node ID and command required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "nodes.invoke",
        params: {
          node: nodeId,
          invokeCommand: command,
          invokeParamsJson: params ? JSON.stringify(params) : undefined,
        },
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

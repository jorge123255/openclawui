import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
  const body = await request.json();
  const { action, nodeId, requestId, command, params } = body;

  try {
    switch (action) {
      case "status":
        return await getStatus();
      case "pending":
        return await getPending();
      case "approve":
        return await approveNode(requestId);
      case "reject":
        return await rejectNode(requestId);
      case "invoke":
        return await invokeCommand(nodeId, command, params);
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

async function getStatus() {
  try {
    const result = await runOpenClaw('nodes status --json');
    return NextResponse.json({
      success: true,
      nodes: result.nodes || result || [],
      pending: result.pending || [],
    });
  } catch (e: any) {
    // Gateway might not have nodes enabled
    return NextResponse.json({
      success: true,
      nodes: [],
      pending: [],
      error: e.message,
    });
  }
}

async function getPending() {
  try {
    const result = await runOpenClaw('nodes pending --json');
    return NextResponse.json({
      success: true,
      pending: result.pending || result || [],
    });
  } catch (e: any) {
    return NextResponse.json({
      success: true,
      pending: [],
      error: e.message,
    });
  }
}

async function approveNode(requestId: string) {
  if (!requestId) {
    return NextResponse.json({ error: "Request ID required" }, { status: 400 });
  }

  try {
    await runOpenClaw(`nodes approve "${requestId}" --json`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function rejectNode(requestId: string) {
  if (!requestId) {
    return NextResponse.json({ error: "Request ID required" }, { status: 400 });
  }

  try {
    await runOpenClaw(`nodes reject "${requestId}" --json`);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function invokeCommand(nodeId: string, command: string, params?: any) {
  if (!nodeId || !command) {
    return NextResponse.json({ error: "Node ID and command required" }, { status: 400 });
  }

  try {
    let args = `nodes invoke "${nodeId}" "${command}"`;
    if (params) {
      args += ` --params '${JSON.stringify(params)}'`;
    }
    args += ' --json';
    
    const result = await runOpenClaw(args);
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

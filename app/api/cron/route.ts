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
  const { action, jobId, job, patch } = body;

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
        return await listJobs(baseUrl, headers);
      case "add":
        return await addJob(baseUrl, headers, job);
      case "update":
        return await updateJob(baseUrl, headers, jobId, patch);
      case "remove":
        return await removeJob(baseUrl, headers, jobId);
      case "run":
        return await runJob(baseUrl, headers, jobId);
      case "status":
        return await getStatus(baseUrl, headers);
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

async function listJobs(baseUrl: string, headers: Record<string, string>) {
  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "cron.list",
        params: { includeDisabled: true },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      jobs: data.result?.jobs || [],
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      jobs: [],
      error: e.message,
    });
  }
}

async function addJob(baseUrl: string, headers: Record<string, string>, job: any) {
  if (!job) {
    return NextResponse.json({ error: "Job definition required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "cron.add",
        params: { job },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gateway error: ${res.status} - ${text}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      jobId: data.result?.jobId,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function updateJob(
  baseUrl: string,
  headers: Record<string, string>,
  jobId: string,
  patch: any
) {
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "cron.update",
        params: { jobId, patch },
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

async function removeJob(baseUrl: string, headers: Record<string, string>, jobId: string) {
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "cron.remove",
        params: { jobId },
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

async function runJob(baseUrl: string, headers: Record<string, string>, jobId: string) {
  if (!jobId) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "cron.run",
        params: { jobId },
      }),
      signal: AbortSignal.timeout(30000),
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

async function getStatus(baseUrl: string, headers: Record<string, string>) {
  try {
    const res = await fetch(`${baseUrl}/rpc`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        method: "cron.status",
        params: {},
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Gateway error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      status: data.result,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

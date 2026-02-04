import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";

const execAsync = promisify(exec);

// OpenClaw CLI path - check common locations
const OPENCLAW_CLI = join(homedir(), "clawdbot-fix", "openclaw.mjs");
const OPENCLAW_CONFIG = join(homedir(), ".openclaw", "openclaw.json");

// Wrapper to run openclaw commands
function openclaw(args: string): string {
  return `node "${OPENCLAW_CLI}" ${args}`;
}

const execEnv = { 
  ...process.env
};

export async function POST(request: Request) {
  const { action, config } = await request.json();

  try {
    switch (action) {
      case "status":
        return await getStatus();
      case "start":
        return await startGateway();
      case "stop":
        return await stopGateway();
      case "config-patch":
        return await patchConfig(config);
      case "config-get":
        return await getConfig();
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}

async function getStatus() {
  try {
    const { stdout } = await execAsync(openclaw("gateway status --json"), { timeout: 5000, env: execEnv });
    const status = JSON.parse(stdout);
    return NextResponse.json({ running: true, ...status });
  } catch (e: any) {
    // Check if gateway process exists
    try {
      await execAsync("pgrep -f 'openclaw-gateway'");
      return NextResponse.json({ running: true, status: "running" });
    } catch {
      return NextResponse.json({ running: false, status: "stopped" });
    }
  }
}

async function startGateway() {
  try {
    // Start in background
    await execAsync(`nohup ${openclaw("gateway start")} > /dev/null 2>&1 &`, { env: execEnv });
    
    // Wait a bit and check status
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const status = await getStatus();
    return status;
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

async function stopGateway() {
  try {
    await execAsync(openclaw("gateway stop"), { timeout: 10000, env: execEnv });
    return NextResponse.json({ success: true, running: false });
  } catch (error: any) {
    // Try pkill as fallback
    try {
      await execAsync("pkill -f 'openclaw-gateway'");
      return NextResponse.json({ success: true, running: false });
    } catch {
      return NextResponse.json({
        success: false,
        error: error.message,
      });
    }
  }
}

async function patchConfig(config: Record<string, any>) {
  try {
    // Use openclaw config set for each key
    for (const [key, value] of Object.entries(config)) {
      const valueStr = typeof value === "string" ? value : JSON.stringify(value);
      await execAsync(openclaw(`config set "${key}" "${valueStr.replace(/"/g, '\\"')}"`), { timeout: 5000, env: execEnv });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

async function getConfig() {
  try {
    // Read the config file directly
    const configData = await readFile(OPENCLAW_CONFIG, "utf-8");
    return NextResponse.json({ config: JSON.parse(configData) });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

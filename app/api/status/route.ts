import { NextResponse } from "next/server";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

function curlCheck(url: string, timeoutSec = 3): boolean {
  try {
    execSync(`curl -s --max-time ${timeoutSec} -o /dev/null -w "%{http_code}" "${url}"`, { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

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

export async function GET() {
  const config = await getConfig();
  const gatewayPort = config.gateway?.port || 18789;

  // Get various status info
  const status: any = {
    timestamp: Date.now(),
    gateway: { connected: false },
    sessions: { count: 0, active: 0 },
    cron: { count: 0, enabled: 0 },
    memory: { backend: "sqlite", files: 0 },
    services: {},
  };

  // Check gateway
  try {
    status.gateway.connected = curlCheck(`http://127.0.0.1:${gatewayPort}/`);
  } catch {}

  // Get sessions count
  try {
    const { stdout } = await execAsync("/usr/local/bin/clawdbot sessions list --json", {
      timeout: 5000,
      env: { ...process.env, HOME: homedir() },
    });
    const data = JSON.parse(stdout);
    status.sessions.count = data.count || data.sessions?.length || 0;
    // Count active (updated in last hour)
    const hourAgo = Date.now() - 3600000;
    status.sessions.active = (data.sessions || []).filter(
      (s: any) => s.updatedAt > hourAgo
    ).length;
  } catch {}

  // Get cron count
  try {
    const { stdout, stderr } = await execAsync("/usr/local/bin/clawdbot cron list --all --json", {
      timeout: 10000,
      env: { ...process.env, HOME: homedir() },
    });
    const data = JSON.parse(stdout);
    const jobs = data.jobs || [];
    status.cron.count = jobs.length;
    status.cron.enabled = jobs.filter((j: any) => j.enabled).length;
  } catch {}

  // Get memory status
  try {
    status.memory.backend = config.memory?.backend || "sqlite";
    status.memory.qmdEnabled = status.memory.backend === "qmd";
    // Count memory files
    const { readdirSync } = require("fs");
    const workspaceDir = config.workspace?.dir || join(homedir(), "clawd");
    const memoryDir = join(workspaceDir, "memory");
    try {
      const files = readdirSync(memoryDir).filter((f: string) => f.endsWith(".md"));
      // Add MEMORY.md from workspace root
      const hasMemoryMd = require("fs").existsSync(join(workspaceDir, "MEMORY.md"));
      status.memory.files = files.length + (hasMemoryMd ? 1 : 0);
    } catch {
      status.memory.files = 0;
    }
  } catch {}

  // Check Ollama
  try {
    const ollamaHost = config.env?.OLLAMA_HOST || "http://192.168.1.10:11434";
    status.services.ollama = curlCheck(`${ollamaHost}/api/tags`) ? "online" : "offline";
  } catch {
    status.services.ollama = "offline";
  }

  // Check N8N
  try {
    const n8nUrl = config.env?.N8N_BASE_URL || "http://192.168.1.13:5678";
    status.services.n8n = curlCheck(`${n8nUrl}/healthz`) ? "online" : "offline";
  } catch {
    status.services.n8n = "offline";
  }

  return NextResponse.json(status);
}

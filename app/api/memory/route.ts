import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

// Try both config paths (clawdbot and openclaw)
function getConfigPath(): string {
  const clawdbotPath = join(homedir(), ".clawdbot", "clawdbot.json");
  const openclawPath = join(homedir(), ".openclaw", "openclaw.json");
  // Prefer clawdbot if it exists (newer)
  try {
    require("fs").accessSync(clawdbotPath);
    return clawdbotPath;
  } catch {
    return openclawPath;
  }
}

async function getConfig() {
  try {
    const configPath = getConfigPath();
    const data = await readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function getWorkspace(): Promise<string> {
  const config = await getConfig();
  return config.agents?.defaults?.workspace || join(homedir(), "clawd");
}

async function runClawdbot(args: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`/usr/local/bin/clawdbot ${args}`, {
      timeout: 30000,
      env: { ...process.env, HOME: process.env.HOME || '/Users/gszulc' },
    });
    return JSON.parse(stdout);
  } catch (e: any) {
    // Try to parse JSON from stderr or throw
    throw e;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, path, content, query, setting, value } = body;

  try {
    switch (action) {
      case "list":
        return await listMemoryFiles();
      case "read":
        return await readMemoryFile(path);
      case "write":
        return await writeMemoryFile(path, content);
      case "search":
        return await searchMemory(query);
      case "status":
        return await getMemoryStatus();
      case "config":
        return await getMemoryConfig();
      case "toggle":
        return await toggleSetting(setting, value);
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

async function listMemoryFiles() {
  const workspace = await getWorkspace();
  const files: { name: string; path: string; size: number; modified: string }[] = [];

  // Check MEMORY.md
  try {
    const memoryPath = join(workspace, "MEMORY.md");
    const stats = await stat(memoryPath);
    files.push({
      name: "MEMORY.md",
      path: "MEMORY.md",
      size: stats.size,
      modified: stats.mtime.toISOString(),
    });
  } catch {}

  // Check memory/ directory
  try {
    const memoryDir = join(workspace, "memory");
    const entries = await readdir(memoryDir);
    
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        const filePath = join(memoryDir, entry);
        const stats = await stat(filePath);
        files.push({
          name: entry,
          path: `memory/${entry}`,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      }
    }
  } catch {}

  // Sort by modified date (newest first)
  files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  return NextResponse.json({
    success: true,
    workspace,
    files,
  });
}

async function readMemoryFile(filePath: string) {
  if (!filePath) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  // Security: only allow MEMORY.md and memory/*.md
  if (!filePath.match(/^(MEMORY\.md|memory\/[^/]+\.md)$/)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const workspace = await getWorkspace();
  const fullPath = join(workspace, filePath);

  try {
    const content = await readFile(fullPath, "utf-8");
    const stats = await stat(fullPath);
    
    return NextResponse.json({
      success: true,
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.code === "ENOENT" ? "File not found" : e.message,
    });
  }
}

async function writeMemoryFile(filePath: string, content: string) {
  if (!filePath || content === undefined) {
    return NextResponse.json({ error: "Path and content required" }, { status: 400 });
  }

  // Security: only allow MEMORY.md and memory/*.md
  if (!filePath.match(/^(MEMORY\.md|memory\/[^/]+\.md)$/)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const workspace = await getWorkspace();
  const fullPath = join(workspace, filePath);

  try {
    await writeFile(fullPath, content, "utf-8");
    const stats = await stat(fullPath);
    
    return NextResponse.json({
      success: true,
      path: filePath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

async function searchMemory(query: string) {
  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  try {
    // Use the memory_search via gateway RPC (we'll shell out to clawdbot for now)
    const { stdout } = await execAsync(
      `/usr/local/bin/clawdbot rpc memory.search --query "${query.replace(/"/g, '\\"')}" --json`,
      { timeout: 10000, env: { ...process.env, HOME: process.env.HOME || '/Users/gszulc' } }
    );
    
    const result = JSON.parse(stdout);
    return NextResponse.json({
      success: true,
      results: result.results || result.snippets || [],
      query,
    });
  } catch (e: any) {
    // Fallback: simple grep search
    try {
      const workspace = await getWorkspace();
      const { stdout } = await execAsync(
        `grep -rn -i "${query.replace(/"/g, '\\"')}" "${workspace}/MEMORY.md" "${workspace}/memory/" 2>/dev/null | head -20`,
        { timeout: 5000 }
      );
      
      const results = stdout.split("\n").filter(Boolean).map((line) => {
        const match = line.match(/^([^:]+):(\d+):(.*)$/);
        if (match) {
          return {
            path: match[1].replace(workspace + "/", ""),
            line: parseInt(match[2]),
            snippet: match[3].trim(),
          };
        }
        return null;
      }).filter(Boolean);

      return NextResponse.json({
        success: true,
        results,
        query,
        fallback: true,
      });
    } catch {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        error: "Search unavailable",
      });
    }
  }
}

async function getMemoryStatus() {
  const config = await getConfig();
  const workspace = await getWorkspace();
  
  // Check if QMD is enabled
  const backend = config.memory?.backend || "sqlite";
  const qmdEnabled = backend === "qmd";
  
  // Get memory search config
  const memorySearch = config.agents?.defaults?.memorySearch || {};
  
  // Count memory files
  let fileCount = 0;
  let totalSize = 0;
  
  try {
    const memoryPath = join(workspace, "MEMORY.md");
    const stats = await stat(memoryPath);
    fileCount++;
    totalSize += stats.size;
  } catch {}
  
  try {
    const memoryDir = join(workspace, "memory");
    const entries = await readdir(memoryDir);
    for (const entry of entries) {
      if (entry.endsWith(".md")) {
        const stats = await stat(join(memoryDir, entry));
        fileCount++;
        totalSize += stats.size;
      }
    }
  } catch {}

  return NextResponse.json({
    success: true,
    status: {
      backend,
      qmdEnabled,
      provider: memorySearch.provider || "auto",
      model: memorySearch.model,
      hybridEnabled: memorySearch.query?.hybrid?.enabled ?? true,
      sessionMemory: memorySearch.experimental?.sessionMemory ?? false,
      fileCount,
      totalSizeBytes: totalSize,
      workspace,
    },
  });
}

async function getMemoryConfig() {
  const config = await getConfig();
  
  return NextResponse.json({
    success: true,
    memory: config.memory || {},
    memorySearch: config.agents?.defaults?.memorySearch || {},
  });
}

async function toggleSetting(setting: string, value: boolean) {
  if (!setting) {
    return NextResponse.json({ error: "Setting name required" }, { status: 400 });
  }

  try {
    const configPath = getConfigPath();
    const configData = await readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    // Handle different settings
    if (setting === "sessionMemory") {
      // Ensure the path exists
      if (!config.agents) config.agents = {};
      if (!config.agents.defaults) config.agents.defaults = {};
      if (!config.agents.defaults.memorySearch) config.agents.defaults.memorySearch = {};
      if (!config.agents.defaults.memorySearch.experimental) {
        config.agents.defaults.memorySearch.experimental = {};
      }
      
      config.agents.defaults.memorySearch.experimental.sessionMemory = value;
      
      // Also update sources if enabling
      if (value) {
        config.agents.defaults.memorySearch.sources = ["memory", "sessions"];
      } else {
        config.agents.defaults.memorySearch.sources = ["memory"];
      }
    } else if (setting === "hybridSearch") {
      if (!config.agents) config.agents = {};
      if (!config.agents.defaults) config.agents.defaults = {};
      if (!config.agents.defaults.memorySearch) config.agents.defaults.memorySearch = {};
      if (!config.agents.defaults.memorySearch.query) {
        config.agents.defaults.memorySearch.query = {};
      }
      if (!config.agents.defaults.memorySearch.query.hybrid) {
        config.agents.defaults.memorySearch.query.hybrid = {};
      }
      
      config.agents.defaults.memorySearch.query.hybrid.enabled = value;
    } else {
      return NextResponse.json({ error: "Unknown setting" }, { status: 400 });
    }

    // Write back
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      setting,
      value,
      message: "Config updated. Restart gateway to apply changes.",
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

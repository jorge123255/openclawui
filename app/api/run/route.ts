import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";

const TIMEOUT = 30; // seconds
const MAX_OUTPUT = 10000; // chars

interface RunRequest {
  code: string;
  language: string;
}

function detectRuntime(language: string): { cmd: string; ext: string } | null {
  const lang = language.toLowerCase().trim();
  const map: Record<string, { cmd: string; ext: string }> = {
    python: { cmd: "python3", ext: "py" },
    python3: { cmd: "python3", ext: "py" },
    py: { cmd: "python3", ext: "py" },
    javascript: { cmd: "node", ext: "js" },
    js: { cmd: "node", ext: "js" },
    node: { cmd: "node", ext: "js" },
    typescript: { cmd: "npx tsx", ext: "ts" },
    ts: { cmd: "npx tsx", ext: "ts" },
    bash: { cmd: "bash", ext: "sh" },
    sh: { cmd: "bash", ext: "sh" },
    shell: { cmd: "bash", ext: "sh" },
    zsh: { cmd: "zsh", ext: "sh" },
    ruby: { cmd: "ruby", ext: "rb" },
    rb: { cmd: "ruby", ext: "rb" },
  };
  return map[lang] || null;
}

export async function POST(request: Request) {
  try {
    const { code, language }: RunRequest = await request.json();

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const lang = language || "bash";
    const runtime = detectRuntime(lang);

    if (!runtime) {
      return NextResponse.json({
        error: `Unsupported language: ${lang}. Supported: python, javascript, typescript, bash, ruby`,
      }, { status: 400 });
    }

    // Write code to temp file
    const tmpDir = join(homedir(), ".openclaw", "tmp", "run");
    mkdirSync(tmpDir, { recursive: true });
    const fileId = randomUUID().slice(0, 8);
    const tmpFile = join(tmpDir, `run_${fileId}.${runtime.ext}`);

    writeFileSync(tmpFile, code, "utf-8");

    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    const startTime = Date.now();

    try {
      stdout = execSync(`${runtime.cmd} "${tmpFile}" 2>&1`, {
        encoding: "utf-8",
        timeout: TIMEOUT * 1000,
        maxBuffer: 1024 * 1024,
        cwd: homedir(),
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });
    } catch (e: any) {
      exitCode = e.status || 1;
      stdout = e.stdout || "";
      stderr = e.stderr || e.message || "Execution failed";
    }

    const elapsed = Date.now() - startTime;

    // Cleanup
    try { unlinkSync(tmpFile); } catch {}

    // Truncate output if too long
    let output = (stdout + (stderr ? "\n" + stderr : "")).trim();
    let truncated = false;
    if (output.length > MAX_OUTPUT) {
      output = output.slice(0, MAX_OUTPUT) + "\n... (output truncated)";
      truncated = true;
    }

    return NextResponse.json({
      success: exitCode === 0,
      output,
      exitCode,
      elapsed,
      truncated,
      language: lang,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

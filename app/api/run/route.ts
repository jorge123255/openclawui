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

interface RuntimeInfo {
  ext: string;
  run: (file: string) => string;  // command to execute the file
  cleanup?: (file: string) => string[];  // extra files to clean up
}

function detectRuntime(language: string): RuntimeInfo | null {
  const lang = language.toLowerCase().trim();

  // Interpreted languages — just run the file
  const interpreted: Record<string, RuntimeInfo> = {
    python:     { ext: "py",  run: (f) => `python3 "${f}"` },
    python3:    { ext: "py",  run: (f) => `python3 "${f}"` },
    py:         { ext: "py",  run: (f) => `python3 "${f}"` },
    javascript: { ext: "js",  run: (f) => `node "${f}"` },
    js:         { ext: "js",  run: (f) => `node "${f}"` },
    node:       { ext: "js",  run: (f) => `node "${f}"` },
    typescript: { ext: "ts",  run: (f) => `npx tsx "${f}"` },
    ts:         { ext: "ts",  run: (f) => `npx tsx "${f}"` },
    bash:       { ext: "sh",  run: (f) => `bash "${f}"` },
    sh:         { ext: "sh",  run: (f) => `bash "${f}"` },
    shell:      { ext: "sh",  run: (f) => `bash "${f}"` },
    zsh:        { ext: "sh",  run: (f) => `zsh "${f}"` },
    ruby:       { ext: "rb",  run: (f) => `ruby "${f}"` },
    rb:         { ext: "rb",  run: (f) => `ruby "${f}"` },
    php:        { ext: "php", run: (f) => `php "${f}"` },
    perl:       { ext: "pl",  run: (f) => `perl "${f}"` },
    pl:         { ext: "pl",  run: (f) => `perl "${f}"` },
    lua:        { ext: "lua", run: (f) => `lua "${f}"` },
    r:          { ext: "R",   run: (f) => `Rscript "${f}"` },
  };

  if (interpreted[lang]) return interpreted[lang];

  // Compiled languages — compile then run
  const compiled: Record<string, RuntimeInfo> = {
    c:      { ext: "c",     run: (f) => `gcc -o "${f}.out" "${f}" && "${f}.out"`,              cleanup: (f) => [`${f}.out`] },
    cpp:    { ext: "cpp",   run: (f) => `g++ -o "${f}.out" "${f}" -std=c++17 && "${f}.out"`,   cleanup: (f) => [`${f}.out`] },
    "c++":  { ext: "cpp",   run: (f) => `g++ -o "${f}.out" "${f}" -std=c++17 && "${f}.out"`,   cleanup: (f) => [`${f}.out`] },
    go:     { ext: "go",    run: (f) => `go run "${f}"` },
    golang: { ext: "go",    run: (f) => `go run "${f}"` },
    rust:   { ext: "rs",    run: (f) => `rustc -o "${f}.out" "${f}" && "${f}.out"`,            cleanup: (f) => [`${f}.out`] },
    rs:     { ext: "rs",    run: (f) => `rustc -o "${f}.out" "${f}" && "${f}.out"`,            cleanup: (f) => [`${f}.out`] },
    swift:  { ext: "swift", run: (f) => `swift "${f}"` },
    java:   { ext: "java",  run: (f) => {
      // Java source-file mode: --source <version> skips class-name-must-match-filename
      return `java --source 25 "${f}"`;
    }},
    kotlin: { ext: "kts",   run: (f) => `kotlin "${f}"` },
    kt:     { ext: "kts",   run: (f) => `kotlin "${f}"` },
    kts:    { ext: "kts",   run: (f) => `kotlin "${f}"` },
  };

  if (compiled[lang]) return compiled[lang];

  return null;
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
        error: `Unsupported language: ${lang}. Supported: python, javascript, typescript, bash, go, rust, c, c++, swift, java, kotlin, php, perl, lua, ruby, r`,
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
      const command = runtime.run(tmpFile);
      stdout = execSync(`${command} 2>&1`, {
        encoding: "utf-8",
        timeout: TIMEOUT * 1000,
        maxBuffer: 1024 * 1024,
        cwd: homedir(),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          // Ensure Homebrew/cargo/go paths are available
          PATH: [
            "/usr/local/opt/openjdk/bin",
            "/usr/local/opt/php/bin",
            "/usr/local/opt/rust/bin",
            "/usr/local/opt/kotlin/bin",
            "/usr/local/opt/lua/bin",
            process.env.PATH,
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "/usr/local/go/bin",
            `${homedir()}/.cargo/bin`,
            `${homedir()}/go/bin`,
          ].filter(Boolean).join(":"),
        },
      });
    } catch (e: any) {
      exitCode = e.status || 1;
      stdout = e.stdout || "";
      stderr = e.stderr || e.message || "Execution failed";
    }

    const elapsed = Date.now() - startTime;

    // Cleanup source file + any compiled artifacts
    try { unlinkSync(tmpFile); } catch {}
    if (runtime.cleanup) {
      for (const f of runtime.cleanup(tmpFile)) {
        try { unlinkSync(f); } catch {}
      }
    }

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

import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { homedir } from "os";

export async function POST(request: Request) {
  try {
    const { command, cwd } = await request.json();
    if (!command) {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    let output: string;
    let exitCode = 0;
    const startTime = Date.now();

    try {
      output = execSync(command, {
        encoding: "utf-8",
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 5,
        cwd: cwd || homedir(),
        env: {
          ...process.env,
          PATH: [
            "/usr/local/opt/openjdk/bin",
            "/usr/local/opt/php/bin",
            "/usr/local/opt/rust/bin",
            "/usr/local/opt/kotlin/bin",
            process.env.PATH,
            "/usr/local/bin",
            "/opt/homebrew/bin",
            "/usr/local/go/bin",
            `${homedir()}/.cargo/bin`,
          ].filter(Boolean).join(":"),
          TERM: "xterm-256color",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (e: any) {
      exitCode = e.status || 1;
      output = (e.stdout || "") + (e.stderr || "");
    }

    return NextResponse.json({
      output: output.slice(0, 50000),
      exitCode,
      elapsed: Date.now() - startTime,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

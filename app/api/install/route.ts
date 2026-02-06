import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { homedir } from "os";

export async function POST(request: Request) {
  try {
    const { package: pkg, language } = await request.json();
    if (!pkg) {
      return NextResponse.json({ error: "Package name required" }, { status: 400 });
    }

    let command: string;
    const lang = (language || "").toLowerCase();

    if (["python", "py", "python3"].includes(lang)) {
      command = `pip3 install --user --break-system-packages "${pkg}"`;
    } else if (["javascript", "js", "node", "typescript", "ts"].includes(lang)) {
      command = `npm install -g "${pkg}"`;
    } else if (["ruby", "rb"].includes(lang)) {
      command = `gem install "${pkg}"`;
    } else if (["go", "golang"].includes(lang)) {
      command = `go install "${pkg}@latest"`;
    } else if (["rust", "rs"].includes(lang)) {
      command = `cargo install "${pkg}"`;
    } else {
      return NextResponse.json({ error: `No package manager for ${lang}` }, { status: 400 });
    }

    const output = execSync(`${command} 2>&1`, {
      encoding: "utf-8",
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      env: {
        ...process.env,
        PATH: [
          "/usr/local/opt/openjdk/bin",
          "/usr/local/opt/php/bin",
          "/usr/local/opt/rust/bin",
          process.env.PATH,
          "/usr/local/bin",
          "/opt/homebrew/bin",
          `${homedir()}/.cargo/bin`,
          `${homedir()}/go/bin`,
        ].filter(Boolean).join(":"),
      },
    });

    return NextResponse.json({ success: true, output: output.trim() });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.stderr || e.stdout || e.message,
    }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const { action, provider } = await request.json();

  try {
    switch (action) {
      case "check-node":
        return await checkNode();
      case "check-openclaw":
        return await checkOpenClaw();
      case "install-openclaw":
        return await installOpenClaw();
      case "install-provider":
        return await installProvider(provider);
      case "check-provider":
        return await checkProvider(provider);
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

async function checkOpenClaw() {
  try {
    const { stdout } = await execAsync("openclaw --version");
    return NextResponse.json({
      installed: true,
      version: stdout.trim(),
    });
  } catch {
    return NextResponse.json({
      installed: false,
    });
  }
}

async function checkNode() {
  try {
    const { stdout: nodeVersion } = await execAsync("node --version");
    const { stdout: npmVersion } = await execAsync("npm --version");
    
    return NextResponse.json({
      success: true,
      node: nodeVersion.trim().replace(/^v/, ""),
      npm: npmVersion.trim(),
      installed: true,
    });
  } catch {
    return NextResponse.json({
      success: true,
      installed: false,
      message: "Node.js not found. Please install from https://nodejs.org",
    });
  }
}

async function installOpenClaw() {
  try {
    // Check if already installed
    try {
      const { stdout } = await execAsync("openclaw --version");
      return NextResponse.json({
        success: true,
        alreadyInstalled: true,
        version: stdout.trim(),
      });
    } catch {
      // Not installed, proceed with installation
    }

    // Install OpenClaw globally
    const { stdout, stderr } = await execAsync(
      "npm install -g openclaw",
      { timeout: 120000 } // 2 minute timeout
    );

    return NextResponse.json({
      success: true,
      output: stdout,
      installed: true,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

async function installProvider(provider: string) {
  const packages: Record<string, string> = {
    anthropic: "@anthropic-ai/claude-code",
    openai: "@openai/codex",
  };

  const pkg = packages[provider];
  if (!pkg) {
    return NextResponse.json({
      success: false,
      error: `Unknown provider: ${provider}`,
    });
  }

  try {
    // Check if already installed
    try {
      await execAsync(`npm list -g ${pkg}`);
      return NextResponse.json({
        success: true,
        alreadyInstalled: true,
        package: pkg,
      });
    } catch {
      // Not installed, proceed
    }

    const { stdout } = await execAsync(
      `npm install -g ${pkg}`,
      { timeout: 120000 }
    );

    return NextResponse.json({
      success: true,
      output: stdout,
      package: pkg,
      installed: true,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      package: pkg,
    });
  }
}

async function checkProvider(provider: string) {
  const commands: Record<string, string> = {
    anthropic: "claude --version",
    openai: "codex --version",
  };

  const cmd = commands[provider];
  if (!cmd) {
    return NextResponse.json({ installed: false });
  }

  try {
    const { stdout } = await execAsync(cmd);
    return NextResponse.json({
      installed: true,
      version: stdout.trim(),
    });
  } catch {
    return NextResponse.json({ installed: false });
  }
}

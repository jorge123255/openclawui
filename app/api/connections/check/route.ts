import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Ensure brew-installed CLIs are found
const execEnv = { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` };
const run = (cmd: string, opts?: any) => execAsync(cmd, { timeout: 5000, env: execEnv, ...opts });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service");

  if (!service) {
    return NextResponse.json({ error: "Missing service parameter" }, { status: 400 });
  }

  try {
    let connected = false;
    let details: any = {};
    let setupHint = "";

    switch (service) {
      case "google": {
        // Check if gog has stored credentials AND a valid token
        try {
          // First check: are there any OAuth client credentials?
          const { stdout: credOut } = await run("gog auth credentials list 2>&1 || true", { timeout: 5000 });
          const hasCreds = !String(credOut).toLowerCase().includes("no oauth");
          
          if (!hasCreds) {
            connected = false;
            setupHint = "OAuth credentials needed. Click Connect to set up.";
            details.needsCredentials = true;
            break;
          }
          
          // Second check: try to list calendar events (lightweight API call)
          try {
            const { stdout: calOut } = await run("gog calendar list --max 1 --json 2>&1", { timeout: 8000 });
            connected = !String(calOut).toLowerCase().includes("error") &&
                       !String(calOut).toLowerCase().includes("no token") &&
                       !String(calOut).toLowerCase().includes("missing --account");
            if (String(calOut).includes("missing --account")) {
              // Has credentials but no account authorized yet
              connected = false;
              setupHint = "Credentials found but no account authorized. Click Connect to add your Google account.";
              details.needsAuth = true;
            }
          } catch {
            connected = false;
            setupHint = "Google auth expired or not set up. Click Connect to authenticate.";
          }
        } catch {
          connected = false;
          setupHint = "gog CLI not found. Install with: brew install gogcli";
        }
        break;
      }

      case "github": {
        // Check gh auth status (exits 1 when not logged in, so use || true)
        try {
          const { stdout } = await run("gh auth status 2>&1 || true", { timeout: 5000 });
          const output = String(stdout);
          if (output.includes("command not found")) {
            connected = false;
            setupHint = "gh CLI not found. Install with: brew install gh";
          } else {
            connected = output.includes("Logged in to");
            details.output = output.trim();
            if (connected) {
              const match = output.match(/Logged in to .+ as (\S+)/);
              if (match) details.username = match[1];
            }
            if (!connected) setupHint = "Run 'gh auth login' to authenticate with GitHub";
          }
        } catch (e: any) {
          connected = false;
          setupHint = "gh CLI not found. Install with: brew install gh";
        }
        break;
      }

      case "apple-reminders": {
        // Check if remindctl works (macOS only)
        try {
          const { stdout } = await run("remindctl lists 2>&1 || true", { timeout: 5000 });
          // If it returns lists without errors, we have access
          connected = !String(stdout).toLowerCase().includes("error") && 
                     !String(stdout).toLowerCase().includes("denied") &&
                     !String(stdout).toLowerCase().includes("not found") &&
                     String(stdout).trim().length > 0;
          details.output = String(stdout).trim().substring(0, 200);
          if (!connected) setupHint = "Grant Reminders access in System Settings → Privacy & Security → Reminders";
        } catch (e: any) {
          connected = false;
          const msg = e.message || "";
          if (msg.includes("not found")) {
            setupHint = "remindctl not found. Install with: brew install remindctl";
          } else {
            setupHint = "Grant Reminders access in System Settings → Privacy & Security → Reminders";
          }
        }
        break;
      }

      case "things": {
        // Check if things CLI works + Things 3 app is installed
        try {
          const { stdout } = await run("things inbox 2>&1 || true", { timeout: 5000 });
          connected = !String(stdout).toLowerCase().includes("error") && 
                     !String(stdout).toLowerCase().includes("not found") &&
                     !String(stdout).toLowerCase().includes("command not found");
          details.output = String(stdout).trim().substring(0, 200);
        } catch (e: any) {
          connected = false;
          const msg = e.message || "";
          if (msg.includes("command not found")) {
            setupHint = "things CLI not found. Install with: brew install things-cli";
          } else {
            setupHint = "Things 3 must be installed from the Mac App Store";
          }
        }
        break;
      }

      case "imessage": {
        // Check if imsg works (needs Full Disk Access)
        try {
          const { stdout } = await run("imsg chats --limit 1 2>&1 || true", { timeout: 5000 });
          connected = !String(stdout).toLowerCase().includes("denied") && 
                     !String(stdout).toLowerCase().includes("error") &&
                     !String(stdout).toLowerCase().includes("permission") &&
                     String(stdout).trim().length > 0;
          details.output = String(stdout).trim().substring(0, 200);
          if (!connected) setupHint = "Grant Full Disk Access in System Settings → Privacy & Security → Full Disk Access";
        } catch (e: any) {
          connected = false;
          const msg = (String(e.stderr || e.message || "") || "").toLowerCase();
          if (msg.includes("denied") || msg.includes("permission")) {
            setupHint = "Grant Full Disk Access to Terminal in System Settings → Privacy & Security → Full Disk Access";
          } else if (msg.includes("not found")) {
            setupHint = "imsg not found. Install with: brew install imsg";
          } else {
            setupHint = "Grant Full Disk Access in System Settings → Privacy & Security → Full Disk Access";
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown service" }, { status: 400 });
    }

    return NextResponse.json({ service, connected, details, setupHint });
  } catch (e: any) {
    return NextResponse.json({ 
      service, 
      connected: false, 
      error: e.message 
    });
  }
}

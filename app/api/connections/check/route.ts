import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
        // Check if gog is authenticated by looking for config + tokens
        try {
          const { stdout } = await execAsync("gog auth status 2>&1 || true", { timeout: 5000 });
          // gog shows config_exists true and has a token if authenticated
          connected = stdout.includes("config_exists\ttrue") && 
                     !stdout.includes("token\t\n") &&
                     !stdout.includes("no token");
          // Also try a real API call
          if (!connected) {
            try {
              const { stdout: profileOut } = await execAsync("gog me 2>&1", { timeout: 5000 });
              connected = profileOut.includes("@") || profileOut.includes("email");
            } catch {}
          }
          details.output = stdout.trim();
          if (!connected) setupHint = "Run 'gog auth login' to authenticate with Google";
        } catch {
          connected = false;
          setupHint = "gog CLI not found. Install with: brew install gogcli";
        }
        break;
      }

      case "github": {
        // Check gh auth status
        try {
          const { stdout, stderr } = await execAsync("gh auth status 2>&1", { timeout: 5000 });
          const output = stdout + stderr;
          connected = output.includes("Logged in to");
          details.output = output.trim();
          if (connected) {
            // Extract username
            const match = output.match(/Logged in to .+ as (\S+)/);
            if (match) details.username = match[1];
          }
          if (!connected) setupHint = "Run 'gh auth login' to authenticate with GitHub";
        } catch {
          connected = false;
          setupHint = "gh CLI not found. Install with: brew install gh";
        }
        break;
      }

      case "apple-reminders": {
        // Check if remindctl works (macOS only)
        try {
          const { stdout } = await execAsync("remindctl lists 2>&1", { timeout: 5000 });
          // If it returns lists without errors, we have access
          connected = !stdout.toLowerCase().includes("error") && 
                     !stdout.toLowerCase().includes("denied") &&
                     !stdout.toLowerCase().includes("not found") &&
                     stdout.trim().length > 0;
          details.output = stdout.trim().substring(0, 200);
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
          const { stdout } = await execAsync("things inbox 2>&1", { timeout: 5000 });
          connected = !stdout.toLowerCase().includes("error") && 
                     !stdout.toLowerCase().includes("not found") &&
                     !stdout.toLowerCase().includes("command not found");
          details.output = stdout.trim().substring(0, 200);
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
          const { stdout } = await execAsync("imsg chats --limit 1 2>&1", { timeout: 5000 });
          connected = !stdout.toLowerCase().includes("denied") && 
                     !stdout.toLowerCase().includes("error") &&
                     !stdout.toLowerCase().includes("permission") &&
                     stdout.trim().length > 0;
          details.output = stdout.trim().substring(0, 200);
          if (!connected) setupHint = "Grant Full Disk Access in System Settings → Privacy & Security → Full Disk Access";
        } catch (e: any) {
          connected = false;
          const msg = (e.stderr || e.message || "").toLowerCase();
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

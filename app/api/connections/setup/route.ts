import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service } = body;

    if (!service) {
      return NextResponse.json({ error: "Missing service" }, { status: 400 });
    }

    switch (service) {
      case "google": {
        // Google OAuth via gog - opens browser for auth
        try {
          // gog auth login opens a browser window for OAuth
          // We run it detached so it doesn't block
          execAsync("gog auth login 2>&1").catch(() => {});
          return NextResponse.json({ 
            success: true, 
            message: "Google OAuth started! A browser window should open. Complete the sign-in there, then come back and refresh.",
            needsBrowser: true,
          });
        } catch (e: any) {
          return NextResponse.json({ 
            success: false, 
            error: `Failed to start OAuth: ${e.message}. Try running 'gog auth login' in Terminal.`
          });
        }
      }

      case "github": {
        // GitHub OAuth via gh CLI - uses device flow
        try {
          // gh auth login with web flow
          execAsync("gh auth login --web -p https 2>&1").catch(() => {});
          return NextResponse.json({ 
            success: true, 
            message: "GitHub auth started! Check Terminal for a code to enter at github.com/login/device",
            needsBrowser: true,
          });
        } catch (e: any) {
          return NextResponse.json({ 
            success: false, 
            error: `Failed to start auth: ${e.message}. Try running 'gh auth login' in Terminal.`
          });
        }
      }

      case "apple-reminders": {
        // Apple Reminders - just test access, macOS will prompt for permission
        try {
          const { stdout } = await execAsync("remindctl lists 2>&1", { timeout: 10000 });
          if (stdout.toLowerCase().includes("error") || stdout.toLowerCase().includes("denied")) {
            return NextResponse.json({ 
              success: false, 
              error: "Permission denied. Go to System Settings → Privacy & Security → Reminders and enable access for Terminal."
            });
          }
          return NextResponse.json({ 
            success: true, 
            message: "Apple Reminders connected!",
            output: stdout.trim()
          });
        } catch (e: any) {
          return NextResponse.json({ 
            success: false, 
            error: "Grant Reminders access: System Settings → Privacy & Security → Reminders → Enable Terminal"
          });
        }
      }

      case "things": {
        // Things 3 - check if app + CLI exist
        try {
          // Check if Things 3 app is installed
          const { stdout: appCheck } = await execAsync("ls /Applications/Things3.app 2>&1 || ls '/Applications/Things 3.app' 2>&1 || echo 'NOT_INSTALLED'", { timeout: 5000 });
          
          if (appCheck.includes("NOT_INSTALLED")) {
            return NextResponse.json({ 
              success: false, 
              error: "Things 3 is not installed. Get it from the Mac App Store first, then install the CLI: brew install things-cli"
            });
          }

          // Check CLI
          const { stdout } = await execAsync("which things 2>&1 || echo 'NO_CLI'", { timeout: 5000 });
          if (stdout.includes("NO_CLI")) {
            return NextResponse.json({ 
              success: false, 
              error: "Things CLI not found. Install with: brew install things-cli"
            });
          }

          return NextResponse.json({ 
            success: true, 
            message: "Things 3 connected!"
          });
        } catch (e: any) {
          return NextResponse.json({ 
            success: false, 
            error: `Things 3 setup failed: ${e.message}`
          });
        }
      }

      case "imessage": {
        // iMessage needs Full Disk Access for chat.db
        try {
          const { stdout } = await execAsync("imsg chats --limit 1 2>&1", { timeout: 5000 });
          if (stdout.includes("denied") || stdout.includes("permission")) {
            return NextResponse.json({ 
              success: false, 
              error: "Permission denied. Go to System Settings → Privacy & Security → Full Disk Access and enable it for Terminal (and the OpenClaw gateway process)."
            });
          }
          return NextResponse.json({ 
            success: true, 
            message: "iMessage connected!",
            output: stdout.trim()
          });
        } catch (e: any) {
          const msg = (e.stderr || e.message || "").toLowerCase();
          if (msg.includes("denied") || msg.includes("permission")) {
            return NextResponse.json({ 
              success: false, 
              error: "Full Disk Access required. Go to System Settings → Privacy & Security → Full Disk Access → Enable Terminal"
            });
          }
          return NextResponse.json({ 
            success: false, 
            error: `iMessage setup failed: ${e.message}`
          });
        }
      }

      default:
        return NextResponse.json({ error: "Unknown service" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

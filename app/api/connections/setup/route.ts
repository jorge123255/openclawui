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
        // Google OAuth via gog
        try {
          // Start OAuth flow - this will open browser
          const { stdout, stderr } = await execAsync("gog auth login 2>&1", {
            timeout: 5000, // Short timeout - it opens browser
          });
          return NextResponse.json({ 
            success: true, 
            message: "OAuth flow started. Complete in browser.",
            output: stdout || stderr
          });
        } catch (e: any) {
          // Expected - command opens browser and may not return immediately
          return NextResponse.json({ 
            success: true, 
            message: "OAuth flow started. Complete in browser."
          });
        }
      }

      case "github": {
        // GitHub OAuth via gh CLI
        try {
          const { stdout, stderr } = await execAsync("gh auth login --web 2>&1", {
            timeout: 5000,
          });
          return NextResponse.json({ 
            success: true, 
            message: "GitHub OAuth started. Complete in browser.",
            output: stdout || stderr
          });
        } catch {
          return NextResponse.json({ 
            success: true, 
            message: "GitHub OAuth started. Complete in browser."
          });
        }
      }

      case "apple-reminders": {
        // Apple Reminders just needs permissions
        try {
          const { stdout } = await execAsync("remindctl list --limit 1 2>&1");
          return NextResponse.json({ 
            success: true, 
            message: "Apple Reminders access granted.",
            output: stdout
          });
        } catch (e: any) {
          return NextResponse.json({ 
            success: false, 
            error: "Grant Reminders access in System Settings > Privacy & Security > Reminders"
          });
        }
      }

      case "things": {
        // Things 3 just needs to be installed
        try {
          const { stdout } = await execAsync("things inbox --limit 1 2>&1");
          return NextResponse.json({ 
            success: true, 
            message: "Things 3 connected.",
            output: stdout
          });
        } catch {
          return NextResponse.json({ 
            success: false, 
            error: "Things 3 must be installed from the Mac App Store"
          });
        }
      }

      case "imessage": {
        // iMessage needs Full Disk Access
        try {
          const { stdout } = await execAsync("imsg chats --limit 1 2>&1");
          return NextResponse.json({ 
            success: true, 
            message: "iMessage access granted.",
            output: stdout
          });
        } catch {
          return NextResponse.json({ 
            success: false, 
            error: "Grant Full Disk Access in System Settings > Privacy & Security > Full Disk Access"
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

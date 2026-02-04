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

    switch (service) {
      case "google": {
        // Check if gog is authenticated
        try {
          const { stdout } = await execAsync("gog auth status 2>&1 || true");
          connected = stdout.toLowerCase().includes("authenticated") || 
                     stdout.toLowerCase().includes("logged in") ||
                     !stdout.toLowerCase().includes("not authenticated");
          details.output = stdout.trim();
        } catch {
          connected = false;
        }
        break;
      }

      case "github": {
        // Check gh auth status
        try {
          const { stdout } = await execAsync("gh auth status 2>&1 || true");
          connected = stdout.includes("Logged in to");
          details.output = stdout.trim();
        } catch {
          connected = false;
        }
        break;
      }

      case "apple-reminders": {
        // Check if remindctl works (macOS only)
        try {
          const { stdout } = await execAsync("remindctl list --limit 1 2>&1 || true");
          connected = !stdout.includes("error") && !stdout.includes("Error");
          details.output = stdout.trim();
        } catch {
          connected = false;
        }
        break;
      }

      case "things": {
        // Check if things CLI works
        try {
          const { stdout } = await execAsync("things inbox --limit 1 2>&1 || true");
          connected = !stdout.includes("error") && !stdout.includes("Error");
          details.output = stdout.trim();
        } catch {
          connected = false;
        }
        break;
      }

      case "imessage": {
        // Check if imsg works
        try {
          const { stdout } = await execAsync("imsg chats --limit 1 2>&1 || true");
          connected = !stdout.includes("error") && !stdout.includes("Error");
          details.output = stdout.trim();
        } catch {
          connected = false;
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown service" }, { status: 400 });
    }

    return NextResponse.json({ service, connected, details });
  } catch (e: any) {
    return NextResponse.json({ 
      service, 
      connected: false, 
      error: e.message 
    });
  }
}

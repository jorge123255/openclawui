import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  const data: any = {};

  // Fetch data from each connected service in parallel
  const [email, calendar, github, tasks] = await Promise.all([
    // Email (via gog)
    (async () => {
      try {
        const { stdout } = await execAsync("gog mail list --unread --limit 5 --json 2>/dev/null || echo '[]'");
        const messages = JSON.parse(stdout || "[]");
        return {
          unread: Array.isArray(messages) ? messages.length : 0,
          latest: messages[0]?.subject?.substring(0, 30) || null,
        };
      } catch {
        return null;
      }
    })(),

    // Calendar (via gog)
    (async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { stdout } = await execAsync(`gog calendar list --date ${today} --json 2>/dev/null || echo '[]'`);
        const events = JSON.parse(stdout || "[]");
        return {
          today: Array.isArray(events) ? events.length : 0,
          next: events[0]?.summary?.substring(0, 30) || null,
        };
      } catch {
        return null;
      }
    })(),

    // GitHub (via gh)
    (async () => {
      try {
        const { stdout: notifOut } = await execAsync("gh api notifications --jq 'length' 2>/dev/null || echo '0'");
        const { stdout: prOut } = await execAsync("gh pr list --state open --json number --jq 'length' 2>/dev/null || echo '0'");
        return {
          notifications: parseInt(notifOut.trim()) || 0,
          prs: parseInt(prOut.trim()) || 0,
        };
      } catch {
        return null;
      }
    })(),

    // Tasks (via remindctl or things)
    (async () => {
      try {
        // Try Apple Reminders first
        const { stdout } = await execAsync("remindctl list --incomplete --json 2>/dev/null || echo '[]'");
        const tasks = JSON.parse(stdout || "[]");
        const today = new Date().toISOString().split("T")[0];
        const dueToday = Array.isArray(tasks) 
          ? tasks.filter((t: any) => t.dueDate?.startsWith(today)).length 
          : 0;
        return {
          pending: Array.isArray(tasks) ? tasks.length : 0,
          today: dueToday,
        };
      } catch {
        // Try Things
        try {
          const { stdout } = await execAsync("things today --json 2>/dev/null || echo '[]'");
          const tasks = JSON.parse(stdout || "[]");
          return {
            pending: Array.isArray(tasks) ? tasks.length : 0,
            today: Array.isArray(tasks) ? tasks.length : 0,
          };
        } catch {
          return null;
        }
      }
    })(),
  ]);

  if (email) data.email = email;
  if (calendar) data.calendar = calendar;
  if (github) data.github = github;
  if (tasks) data.tasks = tasks;

  return NextResponse.json({ success: true, data });
}

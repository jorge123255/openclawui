import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    // Use gog skill to fetch calendar events
    const { stdout } = await execAsync(
      `gog calendar list --date ${date} --json 2>/dev/null`
    );
    const rawEvents = JSON.parse(stdout || "[]");

    const events = Array.isArray(rawEvents) ? rawEvents.map((e: any) => ({
      id: e.id || e.eventId || String(Math.random()),
      summary: e.summary || e.title || "(No title)",
      start: e.start?.dateTime || e.start?.date || e.startTime || date,
      end: e.end?.dateTime || e.end?.date || e.endTime || date,
      location: e.location || null,
      attendees: e.attendees?.length || 0,
      allDay: !e.start?.dateTime,
    })) : [];

    return NextResponse.json({ success: true, events });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: "Not connected to Google Calendar. Run 'gog auth login' to connect.",
      events: [],
    });
  }
}

import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const SETTINGS_PATH = join(homedir(), ".openclaw", "connection-settings.json");

interface Permission {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  requiresApproval?: boolean;
}

interface ConnectionSettings {
  model: string;
  permissions: Permission[];
  approvalRules: string[];
}

async function loadSettings(): Promise<Record<string, ConnectionSettings>> {
  try {
    const data = await readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveSettings(settings: Record<string, ConnectionSettings>): Promise<void> {
  // Ensure directory exists
  await mkdir(join(homedir(), ".openclaw"), { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function GET() {
  try {
    const settings = await loadSettings();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { service, settings } = await request.json();
    
    if (!service || !settings) {
      return NextResponse.json({ error: "Missing service or settings" }, { status: 400 });
    }

    // Load existing settings
    const allSettings = await loadSettings();
    
    // Update settings for this service
    allSettings[service] = settings;
    
    // Save
    await saveSettings(allSettings);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

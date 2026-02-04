import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

function getConfigPath(): string {
  const clawdbotPath = join(homedir(), ".clawdbot", "clawdbot.json");
  try {
    require("fs").accessSync(clawdbotPath);
    return clawdbotPath;
  } catch {
    return join(homedir(), ".openclaw", "openclaw.json");
  }
}

async function getConfig() {
  try {
    const data = await readFile(getConfigPath(), "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function GET() {
  const config = await getConfig();
  
  // Get assistant identity from config (ui.assistant or agents.defaults.assistant for backward compat)
  const assistant = config.ui?.assistant || config.agents?.defaults?.assistant || {};
  
  return NextResponse.json({
    name: assistant.name || "Assistant",
    avatar: assistant.avatar || "🤖",
  });
}

export async function POST(request: Request) {
  const { name, avatar } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const configPath = getConfigPath();
    const configData = await readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    // Ensure path exists (use ui.assistant which is the correct location)
    if (!config.ui) config.ui = {};
    if (!config.ui.assistant) config.ui.assistant = {};

    // Update
    config.ui.assistant.name = name;
    if (avatar) {
      config.ui.assistant.avatar = avatar;
    }
    
    // Remove old location if it exists
    if (config.agents?.defaults?.assistant) {
      delete config.agents.defaults.assistant;
    }

    // Write back
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      name,
      avatar: avatar || config.agents.defaults.assistant.avatar || "🤖",
      message: "Assistant identity updated",
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
    });
  }
}

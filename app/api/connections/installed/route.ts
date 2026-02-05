import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, access } from "fs/promises";
import { join } from "path";
import { CONNECTION_REGISTRY, SKILL_TO_CONNECTION, ConnectionDef } from "../registry";

const execAsync = promisify(exec);
const execEnv = { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` };
const run = (cmd: string, opts?: any) => execAsync(cmd, { timeout: 8000, env: execEnv, ...opts });

// Skill directories to scan
const SKILL_DIRS = [
  join(process.env.HOME || "/Users/gszulc", "clawdbot-fix/skills"),
  join(process.env.HOME || "/Users/gszulc", "clawd/skills"),
];

interface InstalledConnection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  skill: string;
  category: string;
  authType: string;
  status: "connected" | "disconnected" | "checking";
  setupSteps?: string[];
  details?: any;
  source: "user" | "builtin"; // where the skill was found
}

// Returns map of skillName → "user" | "builtin" (user takes priority)
async function getInstalledSkills(): Promise<Map<string, "user" | "builtin">> {
  const skills = new Map<string, "user" | "builtin">();
  for (let i = 0; i < SKILL_DIRS.length; i++) {
    const dir = SKILL_DIRS[i];
    // First dir is builtin (clawdbot-fix/skills), second is user (clawd/skills)
    const source: "user" | "builtin" = i === 0 ? "builtin" : "user";
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        try {
          await access(join(dir, entry, "SKILL.md"));
          // User dir overrides builtin
          if (source === "user" || !skills.has(entry)) {
            skills.set(entry, source);
          }
        } catch {
          // Not a skill directory
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }
  return skills;
}

async function checkConnection(def: ConnectionDef): Promise<"connected" | "disconnected"> {
  if (!def.auth.checkCmd) return "disconnected";
  if (def.auth.type === "none") return "connected";

  try {
    const { stdout, stderr } = await run(def.auth.checkCmd + " || true", { timeout: 8000 });
    const output = String(stdout) + String(stderr || "");

    // Check for failure indicators
    if (def.auth.checkFail) {
      const failPatterns = def.auth.checkFail.split("|");
      for (const pattern of failPatterns) {
        if (pattern === "^$") {
          // Empty output = fail
          if (output.trim() === "") return "disconnected";
        } else if (output.toLowerCase().includes(pattern.toLowerCase())) {
          return "disconnected";
        }
      }
    }

    // Check for success indicators
    if (def.auth.checkSuccess) {
      return output.includes(def.auth.checkSuccess) ? "connected" : "disconnected";
    }

    // If we got non-empty output and no fail patterns matched, assume connected
    return output.trim().length > 0 ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}

export async function GET() {
  try {
    const installedSkills = await getInstalledSkills();
    const connections: InstalledConnection[] = [];

    // Match installed skills to registry entries
    const skillEntries = Array.from(installedSkills.entries());
    for (const [skillName, source] of skillEntries) {
      const def = SKILL_TO_CONNECTION.get(skillName);
      if (def) {
        const status = await checkConnection(def);
        connections.push({
          id: def.id,
          name: def.name,
          description: def.description,
          icon: def.icon,
          color: def.color,
          skill: def.skill,
          category: def.category,
          authType: def.auth.type,
          status,
          setupSteps: def.auth.setupSteps,
          source,
        });
      } else {
        // Skill installed but not in registry — show as "no setup needed"
        connections.push({
          id: skillName,
          name: skillName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          description: "Installed skill",
          icon: "puzzle",
          color: "gray",
          skill: skillName,
          category: "other",
          authType: "none",
          status: "connected",
          source,
        });
      }
    }

    // Sort: disconnected first, then by category, then alphabetical
    connections.sort((a, b) => {
      if (a.status !== b.status) return a.status === "disconnected" ? -1 : 1;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      connections,
      totalInstalled: installedSkills.size,
      connected: connections.filter(c => c.status === "connected").length,
      disconnected: connections.filter(c => c.status === "disconnected").length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

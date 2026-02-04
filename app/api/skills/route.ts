import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

// Skills directories to check
const SKILLS_DIRS = [
  join(homedir(), "clawd", "skills"),
  join(homedir(), "clawdbot-fix", "skills"),
];

export async function POST(request: Request) {
  const { action, name, query } = await request.json();

  try {
    switch (action) {
      case "list":
        return await listInstalledSkills();
      case "browse":
        return await browseSkills(query);
      case "install":
        return await installSkill(name);
      case "uninstall":
        return await uninstallSkill(name);
      case "info":
        return await getSkillInfo(name);
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
}

async function listInstalledSkills() {
  const skills: any[] = [];
  
  for (const dir of SKILLS_DIRS) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = join(dir, entry.name);
          const skillInfo = await parseSkillInfo(skillPath, entry.name);
          if (skillInfo && !skills.some(s => s.name === skillInfo.name)) {
            skills.push({ ...skillInfo, installed: true });
          }
        }
      }
    } catch (e) {
      // Directory doesn't exist, skip
    }
  }

  return NextResponse.json({ skills, success: true });
}

async function parseSkillInfo(skillPath: string, name: string) {
  try {
    // Try to read SKILL.md for metadata
    const skillMdPath = join(skillPath, "SKILL.md");
    const content = await readFile(skillMdPath, "utf-8");
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let description = "";
    let homepage = "";
    let version = "";
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      
      // Extract description
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) description = descMatch[1].trim();
      
      // Extract homepage
      const homeMatch = frontmatter.match(/homepage:\s*(.+)/);
      if (homeMatch) homepage = homeMatch[1].trim();
      
      // Extract version
      const versionMatch = frontmatter.match(/version:\s*(.+)/);
      if (versionMatch) version = versionMatch[1].trim();
    }
    
    // If no description in frontmatter, try first paragraph after frontmatter
    if (!description) {
      const afterFrontmatter = content.replace(/^---[\s\S]*?---\n*/, "");
      const firstPara = afterFrontmatter.split("\n\n")[0];
      if (firstPara && !firstPara.startsWith("#")) {
        description = firstPara.slice(0, 200);
      }
    }
    
    return {
      name,
      description: description || `${name} skill`,
      homepage,
      version,
      path: skillPath,
    };
  } catch (e) {
    // No SKILL.md, return basic info
    return {
      name,
      description: `${name} skill`,
      path: skillPath,
    };
  }
}

async function browseSkills(query?: string) {
  // For now, return a curated list of popular skills
  // In the future, this could fetch from clawdhub.com API
  const popularSkills = [
    {
      name: "github",
      description: "Interact with GitHub using the gh CLI. Issues, PRs, CI runs, and API queries.",
      category: "automation",
      homepage: "https://clawdhub.com/skills/github",
    },
    {
      name: "weather",
      description: "Get current weather and forecasts (no API key required).",
      category: "cloud",
    },
    {
      name: "imsg",
      description: "iMessage/SMS CLI for listing chats, history, watch, and sending.",
      category: "chat",
    },
    {
      name: "gog",
      description: "Google Workspace CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.",
      category: "productivity",
    },
    {
      name: "bird",
      description: "X/Twitter CLI for reading, searching, posting, and engagement.",
      category: "chat",
    },
    {
      name: "coding-agent",
      description: "Run Codex CLI, Claude Code, or other coding agents via background process.",
      category: "ai",
    },
    {
      name: "peekaboo",
      description: "Capture and automate macOS UI with the Peekaboo CLI.",
      category: "automation",
    },
    {
      name: "video-frames",
      description: "Extract frames or short clips from videos using ffmpeg.",
      category: "media",
    },
    {
      name: "openai-image-gen",
      description: "Batch-generate images via OpenAI Images API with gallery output.",
      category: "ai",
    },
    {
      name: "sag",
      description: "ElevenLabs text-to-speech with mac-style say UX.",
      category: "media",
    },
    {
      name: "things-mac",
      description: "Manage Things 3 via the things CLI on macOS.",
      category: "productivity",
    },
    {
      name: "apple-reminders",
      description: "Manage Apple Reminders via the remindctl CLI on macOS.",
      category: "productivity",
    },
    {
      name: "nano-pdf",
      description: "Edit PDFs with natural-language instructions using the nano-pdf CLI.",
      category: "automation",
    },
    {
      name: "gemini",
      description: "Gemini CLI for one-shot Q&A, summaries, and generation.",
      category: "ai",
    },
    {
      name: "mcporter",
      description: "List, configure, auth, and call MCP servers/tools directly.",
      category: "ai",
    },
  ];

  let filtered = popularSkills;
  if (query) {
    const q = query.toLowerCase();
    filtered = popularSkills.filter(
      s => s.name.toLowerCase().includes(q) ||
           s.description.toLowerCase().includes(q) ||
           s.category?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ skills: filtered, success: true });
}

async function installSkill(name: string) {
  if (!name) {
    return NextResponse.json({ error: "Skill name required" }, { status: 400 });
  }

  try {
    // Try using clawdhub CLI
    const { stdout, stderr } = await execAsync(`clawdhub install ${name}`, {
      timeout: 60000,
    });
    
    return NextResponse.json({
      success: true,
      message: `Installed ${name}`,
      output: stdout,
    });
  } catch (e: any) {
    // If clawdhub fails, provide manual instructions
    return NextResponse.json({
      success: false,
      error: `Failed to install via clawdhub CLI. Try manually:\n\nclawdhub install ${name}\n\nOr clone from GitHub.`,
    });
  }
}

async function uninstallSkill(name: string) {
  if (!name) {
    return NextResponse.json({ error: "Skill name required" }, { status: 400 });
  }

  // Find and remove the skill directory
  for (const dir of SKILLS_DIRS) {
    const skillPath = join(dir, name);
    try {
      await execAsync(`rm -rf "${skillPath}"`);
      return NextResponse.json({
        success: true,
        message: `Uninstalled ${name}`,
      });
    } catch (e) {
      // Try next directory
    }
  }

  return NextResponse.json({
    success: false,
    error: `Could not find skill "${name}" to uninstall`,
  });
}

async function getSkillInfo(name: string) {
  if (!name) {
    return NextResponse.json({ error: "Skill name required" }, { status: 400 });
  }

  for (const dir of SKILLS_DIRS) {
    const skillPath = join(dir, name);
    try {
      const info = await parseSkillInfo(skillPath, name);
      if (info) {
        return NextResponse.json({ skill: info, success: true });
      }
    } catch (e) {
      // Try next directory
    }
  }

  return NextResponse.json({
    success: false,
    error: `Skill "${name}" not found`,
  });
}

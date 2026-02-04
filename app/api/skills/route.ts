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
      case "search":
        return await searchClawHub(query);
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

// Cache for GitHub skills list
let skillsCache: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function browseSkills(query?: string) {
  // Fetch from GitHub OpenClaw repo
  const now = Date.now();
  
  if (!skillsCache || now - cacheTime > CACHE_TTL) {
    try {
      // Get list of skill directories
      const listRes = await fetch(
        "https://api.github.com/repos/openclaw/openclaw/contents/skills",
        { headers: { "User-Agent": "OpenClawUI" } }
      );
      
      if (!listRes.ok) throw new Error("GitHub API error");
      
      const dirs = await listRes.json();
      const skillDirs = dirs.filter((d: any) => d.type === "dir").map((d: any) => d.name);
      
      // Fetch SKILL.md for each (in parallel, limited batch)
      const skills: any[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < skillDirs.length; i += batchSize) {
        const batch = skillDirs.slice(i, i + batchSize);
        const promises = batch.map(async (name: string) => {
          try {
            const mdRes = await fetch(
              `https://raw.githubusercontent.com/openclaw/openclaw/main/skills/${name}/SKILL.md`,
              { headers: { "User-Agent": "OpenClawUI" } }
            );
            
            if (!mdRes.ok) return { name, description: `${name} skill` };
            
            const content = await mdRes.text();
            
            // Parse frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            let description = "";
            let homepage = "";
            
            if (frontmatterMatch) {
              const fm = frontmatterMatch[1];
              const descMatch = fm.match(/description:\s*(.+)/);
              if (descMatch) description = descMatch[1].trim();
              const homeMatch = fm.match(/homepage:\s*(.+)/);
              if (homeMatch) homepage = homeMatch[1].trim();
            }
            
            // Infer category from name/description
            let category = "default";
            const lower = (name + " " + description).toLowerCase();
            if (lower.includes("ai") || lower.includes("model") || lower.includes("llm") || lower.includes("gpt") || lower.includes("claude")) category = "ai";
            else if (lower.includes("browser") || lower.includes("web")) category = "browser";
            else if (lower.includes("mail") || lower.includes("email") || lower.includes("gmail")) category = "email";
            else if (lower.includes("calendar") || lower.includes("reminder") || lower.includes("todo") || lower.includes("things")) category = "productivity";
            else if (lower.includes("message") || lower.includes("chat") || lower.includes("discord") || lower.includes("telegram") || lower.includes("slack")) category = "chat";
            else if (lower.includes("image") || lower.includes("video") || lower.includes("audio") || lower.includes("media") || lower.includes("camera")) category = "media";
            else if (lower.includes("github") || lower.includes("code") || lower.includes("git")) category = "automation";
            
            return { name, description: description || `${name} skill`, homepage, category };
          } catch (e) {
            return { name, description: `${name} skill` };
          }
        });
        
        const results = await Promise.all(promises);
        skills.push(...results);
      }
      
      skillsCache = skills;
      cacheTime = now;
    } catch (e) {
      console.error("Failed to fetch from GitHub:", e);
      // Fall back to empty list
      if (!skillsCache) skillsCache = [];
    }
  }

  let filtered = skillsCache || [];
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (s: any) => s.name.toLowerCase().includes(q) ||
           s.description?.toLowerCase().includes(q) ||
           s.category?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ skills: filtered, success: true });
}

async function searchClawHub(query?: string) {
  if (!query) {
    return NextResponse.json({ skills: [], success: true, message: "Enter a search query" });
  }

  try {
    // Use clawhub CLI to search
    const { stdout } = await execAsync(`clawhub search "${query}" --json 2>/dev/null || clawhub search "${query}" 2>/dev/null`, {
      timeout: 30000,
    });

    // Try to parse as JSON first
    try {
      const results = JSON.parse(stdout);
      const skills = (Array.isArray(results) ? results : results.skills || []).map((s: any) => ({
        name: s.name || s.slug,
        slug: s.slug || s.name,
        description: s.description || "",
        author: s.author || s.publisher || "",
        version: s.version || "",
        downloads: s.downloads || 0,
      }));
      return NextResponse.json({ skills, success: true, source: "clawhub" });
    } catch {
      // Parse text output (name - description format)
      const lines = stdout.trim().split("\n").filter(Boolean);
      const skills = lines.map((line: string) => {
        const match = line.match(/^([^\s-]+)\s*-?\s*(.*)$/);
        if (match) {
          return { name: match[1], slug: match[1], description: match[2] || "" };
        }
        return { name: line.trim(), slug: line.trim(), description: "" };
      });
      return NextResponse.json({ skills, success: true, source: "clawhub" });
    }
  } catch (e: any) {
    // Fallback to local search in cached skills
    console.error("ClawHub search failed:", e.message);
    return await browseSkills(query);
  }
}

async function installSkill(name: string) {
  if (!name) {
    return NextResponse.json({ error: "Skill name required" }, { status: 400 });
  }

  const targetDir = join(homedir(), "clawd", "skills", name);

  try {
    // Method 1: Try clawdhub CLI
    try {
      const { stdout } = await execAsync(`clawdhub install ${name}`, {
        timeout: 60000,
      });
      return NextResponse.json({
        success: true,
        message: `Installed ${name}`,
        output: stdout,
      });
    } catch (e) {
      // clawdhub failed, try git clone
    }

    // Method 2: Clone from OpenClaw GitHub repo
    // First check if skill exists in repo
    const checkRes = await fetch(
      `https://api.github.com/repos/openclaw/openclaw/contents/skills/${name}`,
      { headers: { "User-Agent": "OpenClawUI" } }
    );
    
    if (!checkRes.ok) {
      return NextResponse.json({
        success: false,
        error: `Skill "${name}" not found in OpenClaw repository`,
      });
    }

    // Create skills directory if needed
    await execAsync(`mkdir -p "${join(homedir(), "clawd", "skills")}"`);

    // Use sparse checkout to get just this skill
    const tempDir = `/tmp/openclaw-skill-${Date.now()}`;
    await execAsync(`
      git clone --depth 1 --filter=blob:none --sparse \
        https://github.com/openclaw/openclaw.git "${tempDir}" && \
      cd "${tempDir}" && \
      git sparse-checkout set "skills/${name}" && \
      cp -r "skills/${name}" "${targetDir}" && \
      rm -rf "${tempDir}"
    `, { timeout: 120000 });

    return NextResponse.json({
      success: true,
      message: `Installed ${name} to ${targetDir}`,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: `Failed to install: ${e.message}`,
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

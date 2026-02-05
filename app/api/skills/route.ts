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
  const body = await request.json();
  const { action, name, query } = body;

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
      case "configure":
        return await getSkillConfig(name);
      case "run-command":
        return await runInstallCommand(body);
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

  // name might be "author/skill" for store skills or just "skill" for official
  const parts = name.split("/");
  const skillName = parts.length > 1 ? parts[1] : parts[0];
  const author = parts.length > 1 ? parts[0] : null;
  const targetDir = join(homedir(), "clawd", "skills", skillName);

  try {
    // Method 1: Try clawdhub CLI
    try {
      const { stdout } = await execAsync(`clawdhub install ${skillName}`, {
        timeout: 60000,
      });
      return NextResponse.json({
        success: true,
        message: `Installed ${skillName}`,
        output: stdout,
      });
    } catch (e) {
      // clawdhub failed, try git
    }

    // Create skills directory if needed
    await execAsync(`mkdir -p "${join(homedir(), "clawd", "skills")}"`);

    // Method 2: Try community skills repo (openclaw/skills) with author path
    if (author) {
      try {
        const checkRes = await fetch(
          `https://api.github.com/repos/openclaw/skills/contents/skills/${author}/${skillName}`,
          { headers: { "User-Agent": "OpenClawUI" } }
        );
        if (checkRes.ok) {
          const tempDir = `/tmp/openclaw-skill-${Date.now()}`;
          await execAsync(`
            git clone --depth 1 --filter=blob:none --sparse \
              https://github.com/openclaw/skills.git "${tempDir}" && \
            cd "${tempDir}" && \
            git sparse-checkout set "skills/${author}/${skillName}" && \
            cp -r "skills/${author}/${skillName}" "${targetDir}" && \
            rm -rf "${tempDir}"
          `, { timeout: 120000 });

          return NextResponse.json({
            success: true,
            message: `Installed ${skillName} (by ${author})`,
          });
        }
      } catch (e) {
        // Try next method
      }
    }

    // Method 3: Try official repo (openclaw/openclaw)
    const checkRes = await fetch(
      `https://api.github.com/repos/openclaw/openclaw/contents/skills/${skillName}`,
      { headers: { "User-Agent": "OpenClawUI" } }
    );
    
    if (checkRes.ok) {
      const tempDir = `/tmp/openclaw-skill-${Date.now()}`;
      await execAsync(`
        git clone --depth 1 --filter=blob:none --sparse \
          https://github.com/openclaw/openclaw.git "${tempDir}" && \
        cd "${tempDir}" && \
        git sparse-checkout set "skills/${skillName}" && \
        cp -r "skills/${skillName}" "${targetDir}" && \
        rm -rf "${tempDir}"
      `, { timeout: 120000 });

      return NextResponse.json({
        success: true,
        message: `Installed ${skillName}`,
      });
    }

    // Method 4: Try community repo without author prefix
    try {
      // Search community repo for skill by name
      const searchRes = await fetch(
        `https://api.github.com/search/code?q=${encodeURIComponent(skillName)}+path:skills+filename:SKILL.md+repo:openclaw/skills`,
        { headers: { "User-Agent": "OpenClawUI" } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.items?.length > 0) {
          const path = searchData.items[0].path; // e.g. "skills/author/skillname/SKILL.md"
          const skillDir = path.replace("/SKILL.md", ""); // "skills/author/skillname"
          
          const tempDir = `/tmp/openclaw-skill-${Date.now()}`;
          await execAsync(`
            git clone --depth 1 --filter=blob:none --sparse \
              https://github.com/openclaw/skills.git "${tempDir}" && \
            cd "${tempDir}" && \
            git sparse-checkout set "${skillDir}" && \
            cp -r "${skillDir}" "${targetDir}" && \
            rm -rf "${tempDir}"
          `, { timeout: 120000 });

          return NextResponse.json({
            success: true,
            message: `Installed ${skillName}`,
          });
        }
      }
    } catch (e) {
      // Final fallback
    }

    return NextResponse.json({
      success: false,
      error: `Skill "${skillName}" not found in any repository`,
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

// Allowed install command patterns for safety
const ALLOWED_KINDS: Record<string, (formula: string) => string> = {
  "brew": (f) => `brew install ${f}`,
  "npm": (f) => `npm install -g ${f}`,
  "pip": (f) => `pip3 install ${f}`,
  "pip3": (f) => `pip3 install ${f}`,
  "cargo": (f) => `cargo install ${f}`,
  "go": (f) => `go install ${f}`,
  "gem": (f) => `gem install ${f}`,
  "apt": (f) => `sudo apt-get install -y ${f}`,
};

async function runInstallCommand(body: any) {
  const { command, kind, formula } = body;

  const execEnv = { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH}` };

  // Option 1: Run from kind+formula (safe, whitelisted)
  if (kind && formula) {
    const cmdBuilder = ALLOWED_KINDS[kind];
    if (!cmdBuilder) {
      return NextResponse.json({ error: `Unknown install kind: ${kind}` }, { status: 400 });
    }
    // Sanitize formula - only allow alphanumeric, hyphens, dots, slashes, @
    if (!/^[a-zA-Z0-9@._\-/]+$/.test(formula)) {
      return NextResponse.json({ error: "Invalid formula name" }, { status: 400 });
    }
    const cmd = cmdBuilder(formula);
    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 300000, env: execEnv });
      return NextResponse.json({
        success: true,
        command: cmd,
        output: String(stdout).trim(),
        stderr: String(stderr || "").trim(),
      });
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        command: cmd,
        error: e.message,
        output: String(e.stdout || "").trim(),
        stderr: String(e.stderr || "").trim(),
      });
    }
  }

  // Option 2: Run an arbitrary command (with safety checks)
  if (command) {
    // Only allow certain safe patterns
    const safePatterns = [
      /^brew install\s/,
      /^npm install\s/,
      /^pip3? install\s/,
      /^cargo install\s/,
      /^go install\s/,
      /^gem install\s/,
      /^which\s/,
      /^caffeinate/,
      /^claude\s/,
      /^clawdhub\s/,
      /^gh\s/,
      /^gog\s/,
      /^\.\/install\.sh/,
      /^cd\s/,
      /^mkdir\s+-?p?\s/,
      /^chmod\s/,
    ];

    const isSafe = safePatterns.some(p => p.test(command.trim()));
    if (!isSafe) {
      return NextResponse.json({
        error: "Command not allowed. Only install commands (brew, npm, pip, cargo) are permitted.",
      }, { status: 403 });
    }

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 300000, env: execEnv });
      return NextResponse.json({
        success: true,
        command,
        output: String(stdout).trim(),
        stderr: String(stderr || "").trim(),
      });
    } catch (e: any) {
      return NextResponse.json({
        success: false,
        command,
        error: e.message,
        output: String(e.stdout || "").trim(),
        stderr: String(e.stderr || "").trim(),
      });
    }
  }

  return NextResponse.json({ error: "Provide kind+formula or command" }, { status: 400 });
}

async function getSkillConfig(name: string) {
  if (!name) {
    return NextResponse.json({ error: "Skill name required" }, { status: 400 });
  }

  for (const dir of SKILLS_DIRS) {
    const skillPath = join(dir, name);
    try {
      const content = await readFile(join(skillPath, "SKILL.md"), "utf-8");

      // Parse frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = fmMatch ? fmMatch[1] : "";

      // Parse metadata for requirements
      let requires: any = {};
      let installSteps: any[] = [];
      let description = "";
      let skillName = name;

      // Get description
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch) description = descMatch[1].trim();

      // Get name
      const nameMatch = frontmatter.match(/^name:\s*(.+)/m);
      if (nameMatch) skillName = nameMatch[1].trim();

      // Parse metadata block (YAML-ish)
      const metaMatch = content.match(/metadata:\s*\n?\s*\{[\s\S]*?\}/);
      if (metaMatch) {
        try {
          // Try to extract requires and install from metadata JSON
          const metaStr = metaMatch[0].replace(/metadata:\s*/, "");
          // This is often pseudo-JSON in YAML, try to parse the openclaw section
          const reqBinsMatch = metaStr.match(/"bins":\s*\[([^\]]*)\]/);
          if (reqBinsMatch) {
            requires.bins = reqBinsMatch[1].replace(/"/g, "").split(",").map((s: string) => s.trim()).filter(Boolean);
          }
          const reqEnvMatch = metaStr.match(/"env":\s*\[([^\]]*)\]/);
          if (reqEnvMatch) {
            requires.env = reqEnvMatch[1].replace(/"/g, "").split(",").map((s: string) => s.trim()).filter(Boolean);
          }

          // Extract install steps
          const installMatch = metaStr.match(/"install":\s*\[([\s\S]*?)\]/);
          if (installMatch) {
            const stepsStr = installMatch[1];
            const stepBlocks = stepsStr.split(/\{/).filter(Boolean);
            for (const block of stepBlocks) {
              const idMatch = block.match(/"id":\s*"([^"]+)"/);
              const kindMatch = block.match(/"kind":\s*"([^"]+)"/);
              const formulaMatch = block.match(/"formula":\s*"([^"]+)"/);
              const labelMatch = block.match(/"label":\s*"([^"]+)"/);
              if (idMatch || labelMatch) {
                installSteps.push({
                  id: idMatch?.[1],
                  kind: kindMatch?.[1],
                  formula: formulaMatch?.[1],
                  label: labelMatch?.[1] || `Install ${formulaMatch?.[1] || idMatch?.[1]}`,
                });
              }
            }
          }
        } catch (e) {
          // Metadata parsing failed, not critical
        }
      }

      // Check which requirements are met
      const checks: any[] = [];

      // Check required binaries
      if (requires.bins) {
        for (const bin of requires.bins) {
          try {
            await execAsync(`which ${bin} 2>/dev/null`, { env: { ...process.env, PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH}` } });
            checks.push({ type: "bin", name: bin, met: true });
          } catch {
            checks.push({ type: "bin", name: bin, met: false });
          }
        }
      }

      // Check required env vars
      if (requires.env) {
        for (const envVar of requires.env) {
          const val = process.env[envVar];
          checks.push({ type: "env", name: envVar, met: !!val && val.length > 0 });
        }
      }

      // Extract quick start / usage from content
      const afterFrontmatter = content.replace(/^---[\s\S]*?---\n*/, "");
      const quickStartMatch = afterFrontmatter.match(/## Quick [Ss]tart([\s\S]*?)(?=\n## |\n---|\n$)/);
      const usageMatch = afterFrontmatter.match(/## Usage([\s\S]*?)(?=\n## |\n---|\n$)/);
      const quickStart = quickStartMatch?.[1]?.trim() || usageMatch?.[1]?.trim() || "";

      // Extract runnable code blocks from bash/sh code fences only
      const codeBlocks: any[] = [];
      const codeBlockRegex = /```(?:bash|sh|zsh)\n([\s\S]*?)```/g;
      let cbMatch;
      const seen = new Set<string>();
      while ((cbMatch = codeBlockRegex.exec(afterFrontmatter)) !== null) {
        const block = cbMatch[1].trim();
        const lines = block.split("\n").map(l => l.trim()).filter(l => {
          if (!l || l.startsWith("#") || l.startsWith("//")) return false;
          // Skip lines that are clearly not commands
          if (/^\d+\.?\s+\w/.test(l)) return false;  // "1. Description"
          if (l.startsWith("-") || l.startsWith("*")) return false;  // list items
          if (l.startsWith("**") || l.startsWith("`")) return false;  // markdown
          if (l === "..." || l === "---") return false;
          // Must look like a command (starts with a word char, path, or variable)
          if (!/^[a-zA-Z.\/~$]/.test(l)) return false;
          return true;
        });

        for (const line of lines) {
          if (seen.has(line)) continue;
          seen.add(line);

          // Determine if safe to run
          const safePatterns = [
            { pattern: /^brew install\s+\S+/, kind: "brew" },
            { pattern: /^npm install\s/, kind: "npm" },
            { pattern: /^pip3? install\s/, kind: "pip" },
            { pattern: /^cargo install\s/, kind: "cargo" },
            { pattern: /^go install\s/, kind: "go" },
            { pattern: /^gem install\s/, kind: "gem" },
            { pattern: /^claude\s/, kind: "cli" },
            { pattern: /^clawdhub\s/, kind: "cli" },
            { pattern: /^gh\s/, kind: "cli" },
            { pattern: /^gog\s/, kind: "cli" },
            { pattern: /^\.\/install\.sh/, kind: "script" },
            { pattern: /^cd\s/, kind: "nav" },
            { pattern: /^mkdir\s/, kind: "fs" },
            { pattern: /^chmod\s/, kind: "fs" },
            { pattern: /^cp\s/, kind: "fs" },
            { pattern: /^cat\s/, kind: "read" },
            { pattern: /^launchctl\s/, kind: "system" },
          ];

          const match = safePatterns.find(p => p.pattern.test(line));
          codeBlocks.push({
            command: line,
            runnable: !!match,
            kind: match?.kind || "unknown",
          });
        }
      }

      // Check if all requirements are met
      const allMet = checks.length === 0 || checks.every(c => c.met);

      return NextResponse.json({
        success: true,
        skill: {
          name: skillName,
          dirName: name,
          description,
          requires,
          installSteps,
          checks,
          allMet,
          quickStart: quickStart.slice(0, 1000),
          codeBlocks,
          path: skillPath,
        },
      });
    } catch (e) {
      // Try next directory
    }
  }

  return NextResponse.json({ success: false, error: `Skill "${name}" not found` });
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

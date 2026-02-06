import { NextResponse } from "next/server";
import { execSync } from "child_process";

// GET - list checkpoints
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("path");
  
  if (!projectPath) return NextResponse.json({ error: "path required" }, { status: 400 });
  
  const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
  if (!allowed.some(p => projectPath.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }
  
  try {
    // Check if git repo
    try {
      execSync(`git -C "${projectPath}" rev-parse --git-dir`, { encoding: "utf-8", timeout: 3000 });
    } catch {
      return NextResponse.json({ checkpoints: [], isGit: false });
    }
    
    // List tags that start with "checkpoint/"
    const raw = execSync(
      `git -C "${projectPath}" tag -l "checkpoint/*" --sort=-creatordate --format="%(refname:short)|%(creatordate:iso)|%(subject)" 2>/dev/null || echo ""`,
      { encoding: "utf-8", timeout: 5000 }
    ).trim();
    
    const checkpoints = raw ? raw.split("\n").filter(Boolean).map(line => {
      const [tag, date, ...msgParts] = line.split("|");
      return { id: tag, name: tag.replace("checkpoint/", ""), date, message: msgParts.join("|") || "" };
    }) : [];
    
    // Also get current HEAD info
    const head = execSync(`git -C "${projectPath}" log -1 --format="%h|%s" 2>/dev/null || echo "none|"`, { encoding: "utf-8", timeout: 3000 }).trim();
    const [headHash, headMsg] = head.split("|");
    
    return NextResponse.json({ checkpoints, isGit: true, head: { hash: headHash, message: headMsg } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - create checkpoint or revert
export async function POST(request: Request) {
  const { projectPath, action, name, checkpointId } = await request.json();
  
  if (!projectPath) return NextResponse.json({ error: "projectPath required" }, { status: 400 });
  
  const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
  if (!allowed.some(p => projectPath.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }
  
  try {
    if (action === "create") {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const tagName = `checkpoint/${name || timestamp}`;
      
      // Stage and commit any uncommitted changes first
      execSync(`git -C "${projectPath}" add -A && git -C "${projectPath}" commit -m "Checkpoint: ${name || timestamp}" --allow-empty 2>/dev/null || true`, 
        { encoding: "utf-8", timeout: 10000 });
      
      // Create tag
      execSync(`git -C "${projectPath}" tag -a "${tagName}" -m "Checkpoint created by Bob UI"`,
        { encoding: "utf-8", timeout: 5000 });
      
      return NextResponse.json({ ok: true, checkpoint: tagName });
      
    } else if (action === "revert") {
      if (!checkpointId) return NextResponse.json({ error: "checkpointId required" }, { status: 400 });
      
      // Stash current changes first (safety net)
      execSync(`git -C "${projectPath}" stash push -m "Pre-revert stash" 2>/dev/null || true`,
        { encoding: "utf-8", timeout: 5000 });
      
      // Reset to checkpoint
      execSync(`git -C "${projectPath}" checkout "${checkpointId}"`,
        { encoding: "utf-8", timeout: 10000 });
      
      return NextResponse.json({ ok: true, revertedTo: checkpointId });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

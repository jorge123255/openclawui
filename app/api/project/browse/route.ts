import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { join } from "path";
import { homedir } from "os";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let dir = searchParams.get("dir") || homedir();

  if (dir.startsWith("~")) dir = join(homedir(), dir.slice(1));

  const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
  if (!allowed.some((p) => dir.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  try {
    // Use ls command — reliable on macOS, no hanging on special dirs
    const raw = execSync(
      `ls -1p "${dir}" 2>/dev/null | grep '/$' | sed 's|/$||'`,
      { encoding: "utf-8", timeout: 3000 }
    ).trim();

    const skip = new Set([
      "node_modules", "__pycache__", ".next", "dist", "build",
      ".cache", "coverage", "Library", "Applications", ".Trash",
    ]);

    const folders = raw
      .split("\n")
      .filter((n) => n && !skip.has(n))
      .map((name) => ({ name, path: join(dir, name) }));

    return NextResponse.json({
      current: dir,
      parent: dir !== "/" ? join(dir, "..") : null,
      folders,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

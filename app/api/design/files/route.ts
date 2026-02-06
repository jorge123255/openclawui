import { NextResponse } from "next/server";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";

function getFiles(dir: string, base: string = ""): Array<{ path: string; name: string; isDir: boolean }> {
  const results: Array<{ path: string; name: string; isDir: boolean }> = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = join(dir, entry.name);
      const relPath = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        results.push({ path: relPath, name: entry.name, isDir: true });
        results.push(...getFiles(fullPath, relPath));
      } else {
        const ext = extname(entry.name).toLowerCase();
        if ([".html", ".htm", ".svg", ".css", ".js", ".tsx", ".jsx", ".vue"].includes(ext)) {
          results.push({ path: relPath, name: entry.name, isDir: false });
        }
      }
    }
  } catch {}
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dir = searchParams.get("dir");
  if (!dir) return NextResponse.json({ error: "dir parameter required" }, { status: 400 });

  // Security: only allow paths under common project dirs
  const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
  if (!allowed.some(p => dir.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const files = getFiles(dir);
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const { path } = await request.json();
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  try {
    const content = readFileSync(path, "utf-8");
    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { path, content } = await request.json();
    if (!path || content === undefined) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 });
    }

    // Security: only allow paths under common project dirs
    const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
    if (!allowed.some(p => path.startsWith(p))) {
      return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    }

    writeFileSync(path, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

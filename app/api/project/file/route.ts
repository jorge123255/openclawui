import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";

const ALLOWED_PREFIXES = ["/Users", "/Volumes", "/home", "/tmp"];

function checkPath(p: string): boolean {
  return ALLOWED_PREFIXES.some(prefix => p.startsWith(prefix));
}

// Read a file
export async function POST(request: Request) {
  try {
    const { path } = await request.json();
    if (!path || !checkPath(path)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    if (!existsSync(path)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const content = readFileSync(path, "utf-8");
    return NextResponse.json({ content, path });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Write a file
export async function PUT(request: Request) {
  try {
    const { path, content } = await request.json();
    if (!path || content === undefined || !checkPath(path)) {
      return NextResponse.json({ error: "Invalid path or content" }, { status: 400 });
    }
    writeFileSync(path, content, "utf-8");
    return NextResponse.json({ success: true, path });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

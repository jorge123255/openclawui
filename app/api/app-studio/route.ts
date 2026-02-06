import { NextRequest, NextResponse } from "next/server";
import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

const PROJECTS_DIR = "/Users/gszulc/clawd/projects/app-studio";
const SCREENSHOTS_DIR = "/Users/gszulc/clawd/screenshots/app-studio";

// Ensure dirs exist
try { mkdirSync(PROJECTS_DIR, { recursive: true }); } catch {}
try { mkdirSync(SCREENSHOTS_DIR, { recursive: true }); } catch {}

function hasXcode(): boolean {
  try {
    execSync("xcodebuild -version", { timeout: 5000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getSimulators(): { name: string; udid: string; state: string; runtime: string }[] {
  try {
    const raw = execSync("xcrun simctl list devices -j", { timeout: 10000 }).toString();
    const data = JSON.parse(raw);
    const result: { name: string; udid: string; state: string; runtime: string }[] = [];
    for (const [runtime, devices] of Object.entries(data.devices || {})) {
      for (const d of devices as any[]) {
        if (d.isAvailable) {
          result.push({
            name: d.name,
            udid: d.udid,
            state: d.state,
            runtime: runtime.replace("com.apple.CoreSimulator.SimRuntime.", ""),
          });
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

function bootSimulator(udid: string): boolean {
  try {
    execSync(`xcrun simctl boot ${udid}`, { timeout: 30000, stdio: "pipe" });
    return true;
  } catch (e: any) {
    // Already booted is fine
    return e.message?.includes("current state: Booted") || false;
  }
}

function screenshotSimulator(udid: string): string | null {
  const path = join(SCREENSHOTS_DIR, `sim-${Date.now()}.png`);
  try {
    execSync(`xcrun simctl io ${udid} screenshot "${path}"`, { timeout: 10000, stdio: "pipe" });
    return path;
  } catch {
    return null;
  }
}

function buildProject(projectPath: string, simulator: string): { success: boolean; output: string; duration: number } {
  const start = Date.now();
  try {
    const output = execSync(
      `cd "${projectPath}" && xcodebuild -scheme App -destination 'platform=iOS Simulator,id=${simulator}' build 2>&1`,
      { timeout: 120000, maxBuffer: 5 * 1024 * 1024 }
    ).toString();
    return { success: true, output: output.slice(-2000), duration: Date.now() - start };
  } catch (e: any) {
    return { success: false, output: (e.stdout?.toString() || e.message || "").slice(-2000), duration: Date.now() - start };
  }
}

function installAndLaunch(projectPath: string, simulator: string, bundleId: string): boolean {
  try {
    // Find the built .app
    const buildDir = join(projectPath, "build/Build/Products/Debug-iphonesimulator");
    const apps = readdirSync(buildDir).filter(f => f.endsWith(".app"));
    if (apps.length === 0) return false;
    
    execSync(`xcrun simctl install ${simulator} "${join(buildDir, apps[0])}"`, { timeout: 15000, stdio: "pipe" });
    execSync(`xcrun simctl launch ${simulator} ${bundleId}`, { timeout: 10000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function scanSwiftFiles(baseDir: string, rel: string = ""): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];
  try {
    const entries = readdirSync(baseDir);
    for (const e of entries) {
      const full = join(baseDir, e);
      const relPath = rel ? `${rel}/${e}` : e;
      try {
        const stat = require("fs").statSync(full);
        if (stat.isDirectory() && !e.startsWith(".") && e !== "build") {
          results.push(...scanSwiftFiles(full, relPath));
        } else if (e.endsWith(".swift")) {
          results.push({ path: relPath, content: readFileSync(full, "utf-8") });
        }
      } catch {}
    }
  } catch {}
  return results;
}

// iOS App template
const IOS_TEMPLATE = {
  "Package.swift": `// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "App")
`,
  "App/AppApp.swift": `import SwiftUI

@main
struct AppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`,
  "App/ContentView.swift": `import SwiftUI

struct ContentView: View {
    @State private var count = 0
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Hello, World!")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Count: \\(count)")
                    .font(.title2)
                    .foregroundStyle(.secondary)
                
                HStack(spacing: 16) {
                    Button(action: { count -= 1 }) {
                        Image(systemName: "minus.circle.fill")
                            .font(.title)
                    }
                    
                    Button(action: { count += 1 }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title)
                    }
                }
                .padding()
            }
            .navigationTitle("My App")
        }
    }
}

#Preview {
    ContentView()
}
`,
};

// tvOS App template
const TVOS_TEMPLATE = {
  "App/AppApp.swift": `import SwiftUI

@main
struct AppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`,
  "App/ContentView.swift": `import SwiftUI

struct ContentView: View {
    @State private var selectedIndex = 0
    let items = ["Movies", "TV Shows", "Sports", "Music", "Settings"]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 40) {
                Text("My TV App")
                    .font(.system(size: 60, weight: .bold))
                
                HStack(spacing: 30) {
                    ForEach(items.indices, id: \\.self) { index in
                        Button(action: { selectedIndex = index }) {
                            VStack {
                                Image(systemName: iconForItem(items[index]))
                                    .font(.system(size: 50))
                                Text(items[index])
                                    .font(.headline)
                            }
                            .frame(width: 200, height: 200)
                            .background(selectedIndex == index ? Color.blue : Color.gray.opacity(0.3))
                            .cornerRadius(20)
                        }
                        .buttonStyle(.card)
                    }
                }
            }
        }
    }
    
    func iconForItem(_ item: String) -> String {
        switch item {
        case "Movies": return "film"
        case "TV Shows": return "tv"
        case "Sports": return "sportscourt"
        case "Music": return "music.note"
        case "Settings": return "gear"
        default: return "star"
        }
    }
}
`,
};

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");

  switch (action) {
    case "status":
      return NextResponse.json({
        xcodeInstalled: hasXcode(),
        projectsDir: PROJECTS_DIR,
        screenshotsDir: SCREENSHOTS_DIR,
      });

    case "simulators":
      return NextResponse.json({ simulators: getSimulators() });

    case "projects": {
      try {
        const dirs = readdirSync(PROJECTS_DIR).filter(d => {
          try { return require("fs").statSync(join(PROJECTS_DIR, d)).isDirectory(); } catch { return false; }
        });
        return NextResponse.json({ projects: dirs });
      } catch {
        return NextResponse.json({ projects: [] });
      }
    }

    case "files": {
      const project = req.nextUrl.searchParams.get("project");
      if (!project) return NextResponse.json({ error: "No project" }, { status: 400 });
      const projectPath = join(PROJECTS_DIR, project);
      if (!existsSync(projectPath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const files = scanSwiftFiles(projectPath);
      return NextResponse.json({ files });
    }

    case "screenshot": {
      const udid = req.nextUrl.searchParams.get("udid");
      if (!udid) return NextResponse.json({ error: "No udid" }, { status: 400 });
      const path = screenshotSimulator(udid);
      if (!path) return NextResponse.json({ error: "Screenshot failed" }, { status: 500 });
      return NextResponse.json({ path });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "create": {
      const { name, platform = "ios" } = body;
      if (!name) return NextResponse.json({ error: "No name" }, { status: 400 });
      
      const projectPath = join(PROJECTS_DIR, name);
      if (existsSync(projectPath)) return NextResponse.json({ error: "Already exists" }, { status: 400 });
      
      mkdirSync(projectPath, { recursive: true });
      mkdirSync(join(projectPath, "App"), { recursive: true });
      
      const template = platform === "tvos" ? TVOS_TEMPLATE : IOS_TEMPLATE;
      for (const [file, content] of Object.entries(template)) {
        const dir = join(projectPath, file.split("/").slice(0, -1).join("/"));
        if (dir !== projectPath) mkdirSync(dir, { recursive: true });
        writeFileSync(join(projectPath, file), content);
      }
      
      // Create Xcode project file (minimal .xcodeproj)
      // For now, we'll use swift build or let the user open in Xcode
      return NextResponse.json({ ok: true, path: projectPath, platform });
    }

    case "editFile": {
      const { project, file, content } = body;
      if (!project || !file || content === undefined) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      const filePath = join(PROJECTS_DIR, project, file);
      // Security: ensure within projects dir
      if (!filePath.startsWith(PROJECTS_DIR)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 403 });
      }
      writeFileSync(filePath, content);
      return NextResponse.json({ ok: true });
    }

    case "build": {
      const { project, simulator } = body;
      if (!project || !simulator) return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const projectPath = join(PROJECTS_DIR, project);
      const result = buildProject(projectPath, simulator);
      return NextResponse.json(result);
    }

    case "boot": {
      const { udid } = body;
      if (!udid) return NextResponse.json({ error: "No udid" }, { status: 400 });
      const ok = bootSimulator(udid);
      return NextResponse.json({ ok });
    }

    case "aiEdit": {
      // Send the current code + user instruction to the AI for modification
      const { project, file, instruction, currentCode } = body;
      if (!instruction || !currentCode) return NextResponse.json({ error: "Missing params" }, { status: 400 });

      const GATEWAY_URL = "http://192.168.1.75:18789";
      const GATEWAY_TOKEN = "e590d5dafc405a8f7cf9b024be074aff6f11405f99b8d8c2";

      const payload = JSON.stringify({
        model: "openai-codex/gpt-5.3-codex",
        messages: [
          {
            role: "system",
            content: `You are a SwiftUI expert. The user will give you a SwiftUI file and an instruction. 
Return ONLY the complete modified Swift file. No explanations, no markdown, no code fences — just the raw Swift code.
Make sure the code compiles. Use modern SwiftUI (iOS 17+).`,
          },
          {
            role: "user",
            content: `Here is the current SwiftUI file:\n\n${currentCode}\n\nInstruction: ${instruction}\n\nReturn the complete modified file:`,
          },
        ],
        stream: false,
        max_tokens: 8000,
      });

      const tmpFile = `/tmp/app-studio-ai-${Date.now()}.json`;
      writeFileSync(tmpFile, payload);

      return new Promise((resolve) => {
        const curl = spawn("curl", [
          "-s", "-X", "POST",
          `${GATEWAY_URL}/v1/chat/completions`,
          "-H", "Content-Type: application/json",
          "-H", `Authorization: Bearer ${GATEWAY_TOKEN}`,
          "-d", `@${tmpFile}`,
        ]);

        let stdout = "";
        curl.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
        curl.on("close", () => {
          try { require("fs").unlinkSync(tmpFile); } catch {}
          try {
            const parsed = JSON.parse(stdout);
            let newCode = parsed.choices?.[0]?.message?.content || "";
            // Strip markdown fences if AI included them
            newCode = newCode.replace(/^```swift\n?/, "").replace(/\n?```$/, "").trim();
            
            // Auto-save if project + file provided
            if (project && file && newCode) {
              const filePath = join(PROJECTS_DIR, project, file);
              if (filePath.startsWith(PROJECTS_DIR)) {
                writeFileSync(filePath, newCode);
              }
            }
            
            resolve(NextResponse.json({ ok: true, code: newCode }));
          } catch {
            resolve(NextResponse.json({ error: "AI call failed" }, { status: 500 }));
          }
        });
      }) as any;
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

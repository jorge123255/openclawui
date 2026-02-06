import { NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";

interface ProjectAnalysis {
  name: string;
  description: string | null;
  version: string | null;
  path: string;
  framework: string | null;
  language: string;
  packageManager: string | null;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  structure: FileNode[];
  entryPoints: string[];
  routes: string[];
  components: string[];
  styles: string[];
  configFiles: string[];
  summary: string;
  devCommand: string | null;
  buildCommand: string | null;
  totalFiles: number;
  totalSize: number;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  ext?: string;
  size?: number;
  children?: FileNode[];
}

const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "__pycache__",
  ".cache", "coverage", ".turbo", ".vercel", ".output", "vendor",
  ".svelte-kit", ".nuxt", "target", "out",
]);

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".py", ".rb",
  ".go", ".rs", ".java", ".kt", ".swift", ".php", ".html", ".css",
  ".scss", ".less", ".json", ".yaml", ".yml", ".toml", ".md",
  ".sql", ".graphql", ".prisma", ".env", ".sh",
]);

function scanDirectory(dir: string, basePath: string = "", depth: number = 0, maxDepth: number = 5): FileNode[] {
  if (depth > maxDepth) return [];
  const results: FileNode[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".env" && entry.name !== ".env.local") continue;
      if (IGNORE_DIRS.has(entry.name)) continue;
      
      const fullPath = join(dir, entry.name);
      const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        const children = scanDirectory(fullPath, relPath, depth + 1, maxDepth);
        if (children.length > 0) {
          results.push({ name: entry.name, path: relPath, type: "directory", children });
        }
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (CODE_EXTENSIONS.has(ext) || entry.name.startsWith(".env")) {
          const stat = statSync(fullPath);
          results.push({ name: entry.name, path: relPath, type: "file", ext, size: stat.size });
        }
      }
    }
  } catch {}
  return results;
}

function countFiles(nodes: FileNode[]): { count: number; size: number } {
  let count = 0, size = 0;
  for (const n of nodes) {
    if (n.type === "file") { count++; size += n.size || 0; }
    if (n.children) { const c = countFiles(n.children); count += c.count; size += c.size; }
  }
  return { count, size };
}

function findFiles(nodes: FileNode[], test: (n: FileNode) => boolean): string[] {
  const results: string[] = [];
  for (const n of nodes) {
    if (n.type === "file" && test(n)) results.push(n.path);
    if (n.children) results.push(...findFiles(n.children, test));
  }
  return results;
}

function detectFramework(dir: string, pkg: any): { framework: string | null; language: string; devCommand: string | null; buildCommand: string | null } {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  
  if (deps["next"]) return { framework: "Next.js", language: "TypeScript/JavaScript", devCommand: "npm run dev", buildCommand: "npm run build" };
  if (deps["nuxt"] || deps["nuxt3"]) return { framework: "Nuxt", language: "TypeScript/JavaScript", devCommand: "npm run dev", buildCommand: "npm run build" };
  if (deps["@sveltejs/kit"]) return { framework: "SvelteKit", language: "TypeScript/JavaScript", devCommand: "npm run dev", buildCommand: "npm run build" };
  if (deps["svelte"]) return { framework: "Svelte", language: "JavaScript", devCommand: "npm run dev", buildCommand: "npm run build" };
  if (deps["vue"]) return { framework: "Vue", language: "TypeScript/JavaScript", devCommand: "npm run dev", buildCommand: "npm run build" };
  if (deps["react"]) return { framework: "React", language: "TypeScript/JavaScript", devCommand: "npm start", buildCommand: "npm run build" };
  if (deps["express"]) return { framework: "Express", language: "JavaScript", devCommand: "npm run dev", buildCommand: null };
  if (deps["fastify"]) return { framework: "Fastify", language: "JavaScript", devCommand: "npm run dev", buildCommand: null };
  
  // Check for non-JS projects
  if (existsSync(join(dir, "requirements.txt")) || existsSync(join(dir, "setup.py")) || existsSync(join(dir, "pyproject.toml"))) {
    if (existsSync(join(dir, "manage.py"))) return { framework: "Django", language: "Python", devCommand: "python manage.py runserver", buildCommand: null };
    if (existsSync(join(dir, "app.py")) || existsSync(join(dir, "wsgi.py"))) return { framework: "Flask", language: "Python", devCommand: "python app.py", buildCommand: null };
    return { framework: null, language: "Python", devCommand: null, buildCommand: null };
  }
  if (existsSync(join(dir, "Cargo.toml"))) return { framework: null, language: "Rust", devCommand: "cargo run", buildCommand: "cargo build" };
  if (existsSync(join(dir, "go.mod"))) return { framework: null, language: "Go", devCommand: "go run .", buildCommand: "go build" };
  if (existsSync(join(dir, "Gemfile"))) return { framework: "Rails", language: "Ruby", devCommand: "rails server", buildCommand: null };
  if (existsSync(join(dir, "composer.json"))) return { framework: "Laravel/PHP", language: "PHP", devCommand: "php artisan serve", buildCommand: null };
  if (existsSync(join(dir, "Dockerfile"))) return { framework: "Docker", language: "Unknown", devCommand: null, buildCommand: "docker build ." };
  
  return { framework: null, language: "Unknown", devCommand: null, buildCommand: null };
}

function buildSummary(analysis: Omit<ProjectAnalysis, "summary">): string {
  const parts: string[] = [];
  parts.push(`Project: ${analysis.name}`);
  if (analysis.description) parts.push(`Description: ${analysis.description}`);
  if (analysis.version) parts.push(`Version: ${analysis.version}`);
  if (analysis.framework) parts.push(`Framework: ${analysis.framework}`);
  parts.push(`Language: ${analysis.language}`);
  parts.push(`Files: ${analysis.totalFiles} (${(analysis.totalSize / 1024).toFixed(0)}KB)`);
  if (analysis.entryPoints.length) parts.push(`Entry points: ${analysis.entryPoints.join(", ")}`);
  if (analysis.routes.length) parts.push(`Routes/Pages: ${analysis.routes.length}`);
  if (analysis.components.length) parts.push(`Components: ${analysis.components.length}`);
  if (Object.keys(analysis.dependencies).length) {
    const topDeps = Object.keys(analysis.dependencies).slice(0, 15).join(", ");
    parts.push(`Key deps: ${topDeps}`);
  }
  if (analysis.scripts && Object.keys(analysis.scripts).length) {
    parts.push(`Scripts: ${Object.keys(analysis.scripts).join(", ")}`);
  }
  return parts.join("\n");
}

export async function POST(request: Request) {
  try {
    const { path: projectPath } = await request.json();
    if (!projectPath) return NextResponse.json({ error: "path required" }, { status: 400 });
    
    const allowed = ["/Users", "/Volumes", "/home", "/tmp"];
    if (!allowed.some(p => projectPath.startsWith(p))) {
      return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    }
    
    if (!existsSync(projectPath)) {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }
    
    // Read package.json if exists
    let pkg: any = {};
    const pkgPath = join(projectPath, "package.json");
    if (existsSync(pkgPath)) {
      try { pkg = JSON.parse(readFileSync(pkgPath, "utf-8")); } catch {}
    }
    
    const { framework, language, devCommand, buildCommand } = detectFramework(projectPath, pkg);
    const structure = scanDirectory(projectPath);
    const { count: totalFiles, size: totalSize } = countFiles(structure);
    
    // Find key files
    const entryPoints = findFiles(structure, n => 
      ["index.html", "index.tsx", "index.ts", "index.js", "app.tsx", "app.ts", "app.js",
       "main.tsx", "main.ts", "main.py", "app.py", "main.go", "main.rs", "server.ts", "server.js"
      ].includes(n.name.toLowerCase())
    );
    
    const routes = findFiles(structure, n =>
      n.path.includes("/pages/") || n.path.includes("/routes/") ||
      n.path.includes("/app/") && (n.name === "page.tsx" || n.name === "page.ts" || n.name === "page.js" || n.name === "route.ts" || n.name === "route.js")
    );
    
    const components = findFiles(structure, n =>
      (n.path.includes("/components/") || n.path.includes("/Components/")) &&
      [".tsx", ".jsx", ".vue", ".svelte"].includes(n.ext || "")
    );
    
    const styles = findFiles(structure, n =>
      [".css", ".scss", ".less"].includes(n.ext || "") ||
      n.name === "tailwind.config.js" || n.name === "tailwind.config.ts"
    );
    
    const configFiles = findFiles(structure, n =>
      ["tsconfig.json", "vite.config.ts", "vite.config.js", "next.config.js", "next.config.ts",
       "next.config.mjs", "webpack.config.js", ".eslintrc.json", ".prettierrc",
       "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
       "nginx.conf", ".env", ".env.local", ".env.example"
      ].includes(n.name)
    );
    
    const analysis: Omit<ProjectAnalysis, "summary"> = {
      name: pkg.name || basename(projectPath),
      description: pkg.description || null,
      version: pkg.version || null,
      path: projectPath,
      framework,
      language,
      packageManager: existsSync(join(projectPath, "pnpm-lock.yaml")) ? "pnpm" :
                      existsSync(join(projectPath, "yarn.lock")) ? "yarn" :
                      existsSync(join(projectPath, "bun.lockb")) ? "bun" :
                      existsSync(join(projectPath, "package-lock.json")) ? "npm" : null,
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      scripts: pkg.scripts || {},
      structure,
      entryPoints,
      routes,
      components,
      styles,
      configFiles,
      devCommand,
      buildCommand,
      totalFiles,
      totalSize,
    };
    
    return NextResponse.json({
      ...analysis,
      path: projectPath,
      summary: buildSummary(analysis),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

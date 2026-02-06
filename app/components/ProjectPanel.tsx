"use client";

import { useState, useEffect } from "react";
import { 
  FolderOpen, FileCode, ChevronRight, ChevronDown, ChevronLeft, Search, 
  Loader2, X, RefreshCw, Zap, GitBranch, Package, Globe, Home
} from "lucide-react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  ext?: string;
  size?: number;
  children?: FileNode[];
}

interface ProjectAnalysis {
  name: string;
  description: string | null;
  version: string | null;
  path: string;
  framework: string | null;
  language: string;
  packageManager: string | null;
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
  dependencies: Record<string, string>;
}

interface BrowseFolder {
  name: string;
  path: string;
}

interface ProjectPanelProps {
  onClose: () => void;
  onFileOpen: (path: string, content: string) => void;
  onProjectLoaded: (analysis: ProjectAnalysis) => void;
}

function FileTree({ nodes, level, onFileClick, expandedDirs, toggleDir, fileFilter }: {
  nodes: FileNode[];
  level: number;
  onFileClick: (path: string) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  fileFilter: string;
}) {
  return (
    <>
      {nodes
        .filter(n => !fileFilter || n.name.toLowerCase().includes(fileFilter.toLowerCase()) || n.type === "directory")
        .map(node => (
          <div key={node.path}>
            <button
              onClick={() => node.type === "directory" ? toggleDir(node.path) : onFileClick(node.path)}
              className={`w-full text-left flex items-center gap-1.5 py-1 px-2 rounded text-sm hover:bg-white/5 transition-colors ${
                node.type === "file" ? "text-gray-300" : "text-gray-400"
              }`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
            >
              {node.type === "directory" ? (
                expandedDirs.has(node.path) ? 
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : 
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              ) : null}
              {node.type === "directory" ? (
                <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-green-400 shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
              {node.size !== undefined && (
                <span className="text-xs text-gray-600 ml-auto shrink-0">
                  {node.size > 1024 ? `${(node.size / 1024).toFixed(0)}K` : `${node.size}B`}
                </span>
              )}
            </button>
            {node.type === "directory" && node.children && expandedDirs.has(node.path) && (
              <FileTree
                nodes={node.children}
                level={level + 1}
                onFileClick={onFileClick}
                expandedDirs={expandedDirs}
                toggleDir={toggleDir}
                fileFilter={fileFilter}
              />
            )}
          </div>
        ))}
    </>
  );
}

export default function ProjectPanel({ onClose, onFileOpen, onProjectLoaded }: ProjectPanelProps) {
  const [projectPath, setProjectPath] = useState("");
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [fileFilter, setFileFilter] = useState("");
  const [error, setError] = useState("");

  // Folder browser state
  const [browsePath, setBrowsePath] = useState("");
  const [browseFolders, setBrowseFolders] = useState<BrowseFolder[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Project detail toggles
  const [showDeps, setShowDeps] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  // Load folder browser on mount
  useEffect(() => {
    browseDirectory("");
  }, []);

  function toggleDir(path: string) {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  async function browseDirectory(dir: string) {
    setBrowseLoading(true);
    try {
      const url = dir ? `/api/project/browse?dir=${encodeURIComponent(dir)}` : "/api/project/browse";
      const res = await fetch(url);
      const data = await res.json();
      if (data.folders) {
        setBrowsePath(data.current);
        setBrowseFolders(data.folders);
      }
    } catch {}
    setBrowseLoading(false);
  }

  async function selectFolder(path: string) {
    setProjectPath(path);
    analyzeProject(path);
  }

  async function analyzeProject(pathOverride?: string) {
    const targetPath = (pathOverride || projectPath).trim();
    if (!targetPath) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/project/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: targetPath }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data);
        onProjectLoaded(data);
        // Auto-expand first level
        const topDirs = data.structure.filter((n: FileNode) => n.type === "directory").map((n: FileNode) => n.path);
        setExpandedDirs(new Set(topDirs.slice(0, 3)));
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function openFile(relPath: string) {
    try {
      const fullPath = `${analysis!.path}/${relPath}`;
      const res = await fetch("/api/project/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fullPath }),
      });
      const data = await res.json();
      if (data.content !== undefined) {
        onFileOpen(fullPath, data.content);
      }
    } catch {}
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-white/10 shrink-0" style={{ width: "300px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Project</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Folder browser (when no project loaded) */}
      {!analysis ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick access bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10">
            <button onClick={() => browseDirectory("")} className="px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10" title="Home">
              <Home className="w-3 h-3" />
            </button>
            <button onClick={() => browseDirectory("/Volumes")} className="px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10">
              Volumes
            </button>
            <div className="flex-1" />
            <button onClick={() => setShowManualInput(!showManualInput)} className="px-2 py-1 text-xs rounded text-gray-500 hover:text-white">
              {showManualInput ? "Browse" : "Type path"}
            </button>
          </div>

          {showManualInput ? (
            /* Manual text input (legacy UI) */
            <div className="p-3 space-y-2">
              <input
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzeProject()}
                placeholder="/path/to/project"
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => analyzeProject()}
                disabled={loading || !projectPath.trim()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading ? "Analyzing..." : "Open & Analyze"}
              </button>
            </div>
          ) : (
            <>
              {/* Current path + Analyze button */}
              <div className="px-3 py-2 border-b border-white/5 space-y-1.5">
                <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                  <FolderOpen className="w-3 h-3 shrink-0" />
                  <span className="truncate">{browsePath}</span>
                </div>
                <button
                  onClick={() => selectFolder(browsePath)}
                  disabled={loading || !browsePath}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {loading ? "Analyzing..." : "Open this folder as project"}
                </button>
              </div>

              {/* Folder list */}
              <div className="flex-1 overflow-y-auto">
                {/* Up button */}
                {browsePath && browsePath !== "/" && (
                  <button
                    onClick={() => {
                      const parent = browsePath.split("/").slice(0, -1).join("/") || "/";
                      browseDirectory(parent);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-white/5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Up</span>
                  </button>
                )}

                {browseLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                ) : browseFolders.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-gray-500 text-center">No subdirectories</div>
                ) : (
                  browseFolders.map(f => (
                    <button
                      key={f.path}
                      onClick={() => browseDirectory(f.path)}
                      className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5"
                    >
                      <FolderOpen className="w-3.5 h-3.5 shrink-0 text-blue-400/60" />
                      <span className="truncate">{f.name}</span>
                      <ChevronRight className="w-3 h-3 shrink-0 text-gray-600 ml-auto" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          {error && <p className="px-3 py-2 text-xs text-red-400">{error}</p>}

          {loading && (
            <div className="px-3 py-2 border-t border-white/10 flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing project...
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Project info card */}
          <div className="p-3 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-white">{analysis.name}</h3>
              <button onClick={() => { setAnalysis(null); setProjectPath(""); setShowDeps(false); setShowScripts(false); }} className="text-xs text-gray-500 hover:text-white">
                Change
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.framework && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                  <Globe className="w-3 h-3" />
                  {analysis.framework}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                <FileCode className="w-3 h-3" />
                {analysis.totalFiles} files
              </span>
              {analysis.packageManager && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">
                  <Package className="w-3 h-3" />
                  {analysis.packageManager}
                </span>
              )}
            </div>
            {(analysis.routes.length > 0 || analysis.components.length > 0) && (
              <div className="text-xs text-gray-500">
                {analysis.routes.length > 0 && <span>{analysis.routes.length} routes • </span>}
                {analysis.components.length > 0 && <span>{analysis.components.length} components</span>}
              </div>
            )}

            {/* Description */}
            {analysis.description && (
              <p className="text-xs text-gray-400 italic">{analysis.description}</p>
            )}

            {/* Version */}
            {analysis.version && (
              <p className="text-xs text-gray-500">v{analysis.version}</p>
            )}

            {/* Key dependencies */}
            {Object.keys(analysis.dependencies).length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowDeps(!showDeps)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white">
                  {showDeps ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Dependencies ({Object.keys(analysis.dependencies).length})
                </button>
                {showDeps && (
                  <div className="mt-1 ml-4 space-y-0.5 max-h-32 overflow-y-auto">
                    {Object.entries(analysis.dependencies).map(([name, ver]) => (
                      <div key={name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 truncate">{name}</span>
                        <span className="text-gray-600 shrink-0 ml-2">{String(ver)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Scripts */}
            {Object.keys(analysis.scripts).length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowScripts(!showScripts)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white">
                  {showScripts ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Scripts ({Object.keys(analysis.scripts).length})
                </button>
                {showScripts && (
                  <div className="mt-1 ml-4 space-y-0.5">
                    {Object.entries(analysis.scripts).map(([name, cmd]) => (
                      <div key={name} className="text-xs">
                        <span className="text-green-400 font-mono">{name}</span>
                        <span className="text-gray-600 ml-2 truncate">{String(cmd).slice(0, 40)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Entry points */}
            {analysis.entryPoints.length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                <span className="text-gray-400">Entry:</span> {analysis.entryPoints.join(", ")}
              </div>
            )}

            {/* Config files */}
            {analysis.configFiles.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                <span className="text-gray-400">Config:</span> {analysis.configFiles.join(", ")}
              </div>
            )}
          </div>

          {/* File filter */}
          <div className="px-3 py-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                placeholder="Filter files..."
                className="w-full pl-7 pr-2 py-1 bg-gray-800 border border-white/10 rounded text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          {/* File tree */}
          <div className="flex-1 overflow-y-auto py-1">
            <FileTree
              nodes={analysis.structure}
              level={0}
              onFileClick={openFile}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              fileFilter={fileFilter}
            />
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { 
  FolderOpen, FileCode, ChevronRight, ChevronDown, Search, 
  Loader2, X, RefreshCw, Zap, GitBranch, Package, Globe
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

  function toggleDir(path: string) {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  async function analyzeProject() {
    if (!projectPath.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/project/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: projectPath.trim() }),
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

      {/* Project path input */}
      {!analysis ? (
        <div className="p-3 space-y-3">
          <input
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyzeProject()}
            placeholder="/path/to/project"
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={analyzeProject}
            disabled={loading || !projectPath.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? "Analyzing..." : "Open & Analyze"}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>Examples:</p>
            <button onClick={() => setProjectPath("/Users/gszulc/clawd/projects/openclawui")} className="block text-blue-400 hover:underline truncate w-full text-left">
              ~/clawd/projects/openclawui
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Project info card */}
          <div className="p-3 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-white">{analysis.name}</h3>
              <button onClick={() => { setAnalysis(null); setProjectPath(""); }} className="text-xs text-gray-500 hover:text-white">
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

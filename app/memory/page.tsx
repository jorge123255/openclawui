"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain,
  ChevronLeft,
  RefreshCw,
  Loader2,
  FileText,
  Search,
  Save,
  Database,
  Zap,
  Clock,
  Edit,
  X,
  Check,
  FolderOpen,
  Settings,
} from "lucide-react";

interface MemoryFile {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface SearchResult {
  path: string;
  line?: number;
  snippet: string;
  score?: number;
}

interface MemoryStatus {
  backend: string;
  qmdEnabled: boolean;
  provider: string;
  model?: string;
  hybridEnabled: boolean;
  sessionMemory: boolean;
  fileCount: number;
  totalSizeBytes: number;
  workspace: string;
}

export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "search" | "settings">("files");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [filesRes, statusRes] = await Promise.all([
        fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list" }),
        }),
        fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status" }),
        }),
      ]);

      const filesData = await filesRes.json();
      const statusData = await statusRes.json();

      if (filesData.success) setFiles(filesData.files);
      if (statusData.success) setStatus(statusData.status);
    } catch (e) {
      console.error("Failed to load memory data:", e);
    }
    setLoading(false);
  }

  async function loadFile(path: string) {
    setSelectedFile(path);
    setEditing(false);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", path }),
      });
      const data = await res.json();
      if (data.success) {
        setFileContent(data.content);
        setOriginalContent(data.content);
      }
    } catch (e) {
      console.error("Failed to load file:", e);
    }
  }

  async function saveFile() {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path: selectedFile, content: fileContent }),
      });
      const data = await res.json();
      if (data.success) {
        setOriginalContent(fileContent);
        setEditing(false);
        loadData(); // Refresh file list
      }
    } catch (e) {
      console.error("Failed to save file:", e);
    }
    setSaving(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (e) {
      console.error("Search failed:", e);
    }
    setSearching(false);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }

  const hasChanges = fileContent !== originalContent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Memory</h1>
                  <p className="text-sm text-gray-400">
                    {status?.fileCount || 0} files • {formatBytes(status?.totalSizeBytes || 0)}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Cards */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Database className="w-4 h-4" />
                Backend
              </div>
              <div className="text-lg font-semibold capitalize">
                {status.qmdEnabled ? (
                  <span className="text-purple-400">QMD</span>
                ) : (
                  <span className="text-blue-400">SQLite</span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Zap className="w-4 h-4" />
                Embeddings
              </div>
              <div className="text-lg font-semibold capitalize">
                {status.provider || "auto"}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Search className="w-4 h-4" />
                Hybrid Search
              </div>
              <div className="text-lg font-semibold">
                {status.hybridEnabled ? (
                  <span className="text-green-400">On</span>
                ) : (
                  <span className="text-gray-500">Off</span>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Session Memory
              </div>
              <div className="text-lg font-semibold">
                {status.sessionMemory ? (
                  <span className="text-green-400">On</span>
                ) : (
                  <span className="text-gray-500">Off</span>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
          {[
            { id: "files", label: "Files", icon: FileText },
            { id: "search", label: "Search", icon: Search },
            { id: "settings", label: "Settings", icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? "bg-purple-500/20 text-purple-400"
                  : "hover:bg-white/10 text-gray-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* File List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Memory Files
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No memory files found</p>
              ) : (
                files.map((file) => (
                  <motion.button
                    key={file.path}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => loadFile(file.path)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedFile === file.path
                        ? "bg-purple-500/20 border-purple-500/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(file.modified)}
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* File Editor */}
            <div className="md:col-span-2">
              {selectedFile ? (
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{selectedFile}</span>
                      {hasChanges && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                          unsaved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editing ? (
                        <>
                          <button
                            onClick={() => {
                              setFileContent(originalContent);
                              setEditing(false);
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={saveFile}
                            disabled={saving || !hasChanges}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  {editing ? (
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="w-full h-96 p-4 bg-transparent font-mono text-sm resize-none focus:outline-none"
                      spellCheck={false}
                    />
                  ) : (
                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
                      {fileContent || "Loading..."}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FileText className="w-12 h-12 mb-4 opacity-50" />
                  <p>Select a file to view</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search memory..."
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-2"
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                </p>
                {searchResults.map((result, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => {
                          setActiveTab("files");
                          loadFile(result.path);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-medium"
                      >
                        {result.path}
                        {result.line && `:${result.line}`}
                      </button>
                      {result.score && (
                        <span className="text-xs text-gray-500">
                          {(result.score * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 font-mono">
                      {result.snippet}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : searchQuery && !searching ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a query to search your memory</p>
                <p className="text-sm mt-2">
                  Uses {status?.qmdEnabled ? "QMD (BM25 + vector)" : "vector"} search
                </p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Memory Backend
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <div className="font-medium">SQLite (Default)</div>
                    <div className="text-sm text-gray-400">
                      Built-in vector search with optional OpenAI/Gemini embeddings
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${!status?.qmdEnabled ? "bg-green-500" : "bg-gray-600"}`} />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <div className="font-medium">QMD (Experimental)</div>
                    <div className="text-sm text-gray-400">
                      BM25 + vector + reranking, fully local
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full ${status?.qmdEnabled ? "bg-purple-500" : "bg-gray-600"}`} />
                </div>

                <p className="text-sm text-gray-500">
                  To enable QMD, set <code className="bg-white/10 px-1 rounded">memory.backend = "qmd"</code> in your config
                  and install the QMD CLI: <code className="bg-white/10 px-1 rounded">bun install -g github.com/tobi/qmd</code>
                </p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Embedding Provider
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {["auto", "openai", "gemini", "local"].map((provider) => (
                  <div
                    key={provider}
                    className={`p-4 rounded-lg border ${
                      status?.provider === provider
                        ? "bg-purple-500/20 border-purple-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="font-medium capitalize">{provider}</div>
                    <div className="text-xs text-gray-400">
                      {provider === "auto" && "Auto-detect available provider"}
                      {provider === "openai" && "text-embedding-3-small"}
                      {provider === "gemini" && "gemini-embedding-001"}
                      {provider === "local" && "node-llama-cpp (no API)"}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Configure via <code className="bg-white/10 px-1 rounded">agents.defaults.memorySearch.provider</code>
              </p>
            </div>

            {/* Session Memory Toggle */}
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Session Memory
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Index conversation history for search. Find things from past chats.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !status?.sessionMemory;
                    try {
                      const res = await fetch("/api/memory", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "toggle", setting: "sessionMemory", value: newValue }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        // Update local state
                        setStatus((prev) => prev ? { ...prev, sessionMemory: newValue } : null);
                        alert("Setting saved! Restart gateway to apply.");
                      } else {
                        alert("Error: " + data.error);
                      }
                    } catch (e: any) {
                      alert("Error: " + e.message);
                    }
                  }}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    status?.sessionMemory ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      status?.sessionMemory ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="mt-4 p-3 bg-black/20 rounded-lg text-sm text-gray-400">
                <strong>What gets indexed:</strong> User and assistant messages from your conversations.
                <br />
                <strong>Privacy:</strong> Stays local, indexed per-agent.
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Current Config</h3>
              <pre className="text-sm font-mono bg-black/30 p-4 rounded-lg overflow-auto">
{`memory:
  backend: "${status?.backend || "sqlite"}"
  citations: "auto"

agents.defaults.memorySearch:
  provider: "${status?.provider || "auto"}"
  hybridEnabled: ${status?.hybridEnabled}
  sessionMemory: ${status?.sessionMemory}

workspace: ${status?.workspace || "~/clawd"}`}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

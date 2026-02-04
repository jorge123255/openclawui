"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  ChevronLeft,
  RefreshCw,
  Loader2,
  Clock,
  User,
  Bot,
  ChevronRight,
  Search,
  X,
} from "lucide-react";

interface SessionLog {
  sessionId: string;
  file: string;
  size: number;
  modified: string;
  lastEntry?: any;
}

interface LogEntry {
  role?: string;
  content?: any;
  timestamp?: number;
  raw?: string;
}

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filter, setFilter] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (autoRefresh && selectedSession) {
      const interval = setInterval(() => loadEntries(selectedSession), 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedSession]);

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
    setLoading(false);
  }

  async function loadEntries(sessionId: string) {
    setEntriesLoading(true);
    try {
      const res = await fetch(`/api/logs?session=${sessionId}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        // Scroll to bottom
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (e) {
      console.error("Failed to load entries:", e);
    }
    setEntriesLoading(false);
  }

  function selectSession(sessionId: string) {
    setSelectedSession(sessionId);
    loadEntries(sessionId);
  }

  function formatTime(timestamp: number | string | undefined): string {
    if (!timestamp) return "";
    const date = new Date(typeof timestamp === "number" ? timestamp : timestamp);
    return date.toLocaleTimeString();
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

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getContentPreview(entry: LogEntry): string {
    if (entry.raw) return entry.raw.substring(0, 100);
    if (typeof entry.content === "string") return entry.content.substring(0, 100);
    if (Array.isArray(entry.content)) {
      const textPart = entry.content.find((p: any) => p.type === "text");
      if (textPart) return textPart.text?.substring(0, 100) || "";
    }
    return JSON.stringify(entry).substring(0, 100);
  }

  const filteredEntries = filter
    ? entries.filter((e) => getContentPreview(e).toLowerCase().includes(filter.toLowerCase()))
    : entries;

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
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Logs</h1>
                  <p className="text-sm text-gray-400">
                    {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 ${
                  autoRefresh
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/10 text-gray-400"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto
              </button>
              <button
                onClick={loadSessions}
                disabled={loading}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Session List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Sessions</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No sessions found</p>
            ) : (
              sessions.map((session) => (
                <motion.button
                  key={session.sessionId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => selectSession(session.sessionId)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSession === session.sessionId
                      ? "bg-green-500/20 border-green-500/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm truncate">
                      {session.sessionId.substring(0, 8)}...
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatBytes(session.size)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(session.modified)}
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Log Viewer */}
          <div className="md:col-span-2">
            {selectedSession ? (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-mono text-sm">{selectedSession}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter..."
                        className="pl-9 pr-8 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-green-500/50 w-40"
                      />
                      {filter && (
                        <button
                          onClick={() => setFilter("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                    {entriesLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                </div>
                <div className="p-4 max-h-[600px] overflow-auto space-y-3">
                  {filteredEntries.map((entry, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg text-sm ${
                        entry.role === "user"
                          ? "bg-blue-500/10 border-l-2 border-blue-500"
                          : entry.role === "assistant"
                          ? "bg-green-500/10 border-l-2 border-green-500"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                        {entry.role === "user" ? (
                          <User className="w-3 h-3" />
                        ) : entry.role === "assistant" ? (
                          <Bot className="w-3 h-3" />
                        ) : null}
                        <span className="capitalize">{entry.role || "system"}</span>
                        {entry.timestamp && (
                          <span className="ml-auto">{formatTime(entry.timestamp)}</span>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto">
                        {getContentPreview(entry)}
                      </pre>
                    </motion.div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a session to view logs</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

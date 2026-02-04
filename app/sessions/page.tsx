"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare,
  ChevronLeft,
  RefreshCw,
  Loader2,
  User,
  Bot,
  Clock,
  Zap,
  X,
  ChevronRight,
  Send,
} from "lucide-react";

interface Session {
  key: string;
  kind: string;
  label?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount?: number;
  model?: string;
  channel?: string;
}

export default function SessionsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadSessions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadSessions() {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
    setLoading(false);
  }

  async function loadHistory(sessionKey: string) {
    setHistoryLoading(true);
    setSelectedSession(sessionKey);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "history", sessionKey, limit: 20 }),
      });
      const data = await res.json();
      if (data.messages) {
        setSessionHistory(data.messages);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
    setHistoryLoading(false);
  }

  function formatTime(timestamp: string | undefined) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  const mainSessions = sessions.filter(s => s.kind === "main" || !s.kind);
  const subagentSessions = sessions.filter(s => s.kind === "isolated" || s.kind === "subagent");

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sessions</h1>
              <p className="text-sm text-muted-foreground">
                {sessions.length} active sessions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { setLoading(true); loadSessions(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <div className="space-y-6">
          {/* Main Sessions */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Main Sessions
            </h2>
            {mainSessions.length === 0 ? (
              <div className="p-6 rounded-xl bg-secondary/50 text-center text-muted-foreground">
                No active main sessions
              </div>
            ) : (
              <div className="space-y-2">
                {mainSessions.map((session) => (
                  <SessionCard
                    key={session.key}
                    session={session}
                    selected={selectedSession === session.key}
                    onClick={() => loadHistory(session.key)}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Subagent Sessions */}
          {subagentSessions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Subagent Sessions
              </h2>
              <div className="space-y-2">
                {subagentSessions.map((session) => (
                  <SessionCard
                    key={session.key}
                    session={session}
                    selected={selectedSession === session.key}
                    onClick={() => loadHistory(session.key)}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Session Detail / History */}
        <div className="lg:sticky lg:top-8 h-fit">
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">
                {selectedSession ? "Conversation History" : "Select a session"}
              </h3>
              {selectedSession && (
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="h-[500px] overflow-y-auto p-4">
              {historyLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !selectedSession ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p>Click a session to view history</p>
                </div>
              ) : sessionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === "assistant" ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        {msg.role === "assistant" ? (
                          <Bot className="w-4 h-4 text-primary" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`max-w-[80%] p-3 rounded-xl ${
                        msg.role === "assistant" 
                          ? "bg-card border border-border" 
                          : "bg-primary text-primary-foreground"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">
                          {typeof msg.content === "string" 
                            ? msg.content.slice(0, 500) + (msg.content.length > 500 ? "..." : "")
                            : JSON.stringify(msg.content).slice(0, 500)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SessionCard({
  session,
  selected,
  onClick,
  formatTime,
}: {
  session: Session;
  selected: boolean;
  onClick: () => void;
  formatTime: (t: string | undefined) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50 bg-card"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium">{session.label || session.key}</h4>
          <p className="text-xs text-muted-foreground">
            {session.channel && <span className="capitalize">{session.channel} • </span>}
            {session.model && <span>{session.model}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatTime(session.lastMessageAt)}
        </div>
      </div>
      {session.lastMessage && (
        <p className="text-sm text-muted-foreground truncate">
          {session.lastMessage}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {session.messageCount || 0} messages
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
}

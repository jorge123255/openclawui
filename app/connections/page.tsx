"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ChevronLeft,
  Mail,
  Calendar,
  Github,
  CheckSquare,
  StickyNote,
  MessageSquare,
  Home,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Settings,
  Loader2,
  Plus,
  Zap,
} from "lucide-react";

interface Connection {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  skill: string;
  status: "connected" | "disconnected" | "checking";
  setupUrl?: string;
  configKey?: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: "google",
      name: "Google Workspace",
      description: "Gmail, Calendar, Contacts, Drive",
      icon: Mail,
      color: "red",
      skill: "gog",
      status: "checking",
      configKey: "GOOGLE_CREDENTIALS",
    },
    {
      id: "github",
      name: "GitHub",
      description: "Repos, Issues, PRs, Actions",
      icon: Github,
      color: "gray",
      skill: "github",
      status: "checking",
    },
    {
      id: "apple-reminders",
      name: "Apple Reminders",
      description: "Lists, tasks, due dates",
      icon: CheckSquare,
      color: "orange",
      skill: "apple-reminders",
      status: "checking",
    },
    {
      id: "things",
      name: "Things 3",
      description: "Projects, todos, areas",
      icon: CheckSquare,
      color: "blue",
      skill: "things-mac",
      status: "checking",
    },
    {
      id: "imessage",
      name: "iMessage",
      description: "Messages, chats, send texts",
      icon: MessageSquare,
      color: "green",
      skill: "imsg",
      status: "checking",
    },
  ]);

  const [showSetup, setShowSetup] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    checkConnections();
  }, []);

  async function checkConnections() {
    // Check each connection status
    const updated: Connection[] = await Promise.all(
      connections.map(async (conn): Promise<Connection> => {
        try {
          const res = await fetch(`/api/connections/check?service=${conn.id}`);
          const data = await res.json();
          return { ...conn, status: data.connected ? "connected" : "disconnected" };
        } catch {
          return { ...conn, status: "disconnected" };
        }
      })
    );
    setConnections(updated);
  }

  async function setupConnection(id: string) {
    setSetupLoading(true);
    try {
      const res = await fetch(`/api/connections/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: id }),
      });
      const data = await res.json();
      
      if (data.authUrl) {
        // Open OAuth flow
        window.open(data.authUrl, "_blank");
      } else if (data.success) {
        // Refresh status
        await checkConnections();
        setShowSetup(null);
      } else {
        alert(data.error || "Setup failed");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setSetupLoading(false);
  }

  const colorClasses: Record<string, string> = {
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    gray: "from-gray-500/20 to-gray-500/5 border-gray-500/30",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
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
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Connections</h1>
                  <p className="text-sm text-gray-400">
                    Link your services
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={checkConnections}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-green-400">
              {connections.filter(c => c.status === "connected").length}
            </div>
            <div className="text-sm text-gray-400">Connected</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {connections.filter(c => c.status === "checking").length}
            </div>
            <div className="text-sm text-gray-400">Checking</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-gray-400">
              {connections.filter(c => c.status === "disconnected").length}
            </div>
            <div className="text-sm text-gray-400">Available</div>
          </div>
        </div>

        {/* Connections Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {connections.map((conn) => (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-xl bg-gradient-to-br ${colorClasses[conn.color]} border transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <conn.icon className="w-8 h-8" />
                  <div>
                    <h3 className="font-semibold">{conn.name}</h3>
                    <p className="text-sm text-gray-400">{conn.description}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  conn.status === "connected"
                    ? "bg-green-500/20 text-green-400"
                    : conn.status === "checking"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {conn.status === "connected" ? (
                    <><Check className="w-3 h-3" /> Connected</>
                  ) : conn.status === "checking" ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Checking</>
                  ) : (
                    <><X className="w-3 h-3" /> Not connected</>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                {conn.status === "connected" ? (
                  <>
                    <Link
                      href={`/${conn.id}`}
                      className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-center transition-colors"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => setShowSetup(conn.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setupConnection(conn.id)}
                    disabled={setupLoading}
                    className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2"
                  >
                    {setupLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Connect
                  </button>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Skill: <code className="bg-white/10 px-1 rounded">{conn.skill}</code>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-400">Coming Soon</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Notion", icon: StickyNote, color: "gray" },
              { name: "HomeKit", icon: Home, color: "orange" },
              { name: "Obsidian", icon: StickyNote, color: "purple" },
            ].map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-50"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-6 h-6 text-gray-500" />
                  <span className="text-gray-500">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

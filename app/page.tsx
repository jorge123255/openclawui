"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bot,
  Cpu,
  Plug,
  Sparkles,
  Settings,
  Activity,
  ChevronRight,
  Zap,
  Shield,
  MessageSquare,
  Loader2,
  Brain,
  MessageCircle,
  Sun,
  Moon,
} from "lucide-react";

interface GatewayStatus {
  connected: boolean;
  version?: string;
  uptime?: number;
}

function ChatHero() {
  const [assistant, setAssistant] = useState({ name: "Assistant", avatar: "🤖" });

  useEffect(() => {
    fetch("/api/assistant")
      .then((res) => res.json())
      .then((data) => setAssistant(data))
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/chat"
      className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-500/50 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors text-3xl">
            {assistant.avatar}
          </div>
          <div>
            <h2 className="text-xl font-semibold">Chat with {assistant.name}</h2>
            <p className="text-sm text-gray-400">Start a conversation right from your browser</p>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

interface DashboardStats {
  sessions: { count: number; active: number };
  cron: { count: number; enabled: number };
  memory: { backend: string; qmdEnabled: boolean };
  services: { ollama?: string; n8n?: string };
}

export default function Home() {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({
    connected: false,
  });
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null); // null = loading
  const [systemStatus, setSystemStatus] = useState({
    ollama: "detecting" as "online" | "offline" | "detecting",
    telegram: "detecting" as "online" | "offline" | "detecting",
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Check if setup is complete
    const setupComplete = localStorage.getItem("setupComplete");
    setIsFirstRun(!setupComplete);

    if (setupComplete) {
      // Check gateway status
      checkGatewayStatus();
      // Check other services
      checkSystemStatus();
      // Load dashboard stats
      loadStats();
      // Refresh stats every 30 seconds
      const interval = setInterval(loadStats, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  async function checkGatewayStatus() {
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus({ connected: data.running, ...data });
      }
    } catch {
      setGatewayStatus({ connected: false });
    }
  }

  async function checkSystemStatus() {
    // Check config for channel status
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-get" }),
      });
      const data = await res.json();
      if (data.config) {
        // Check Telegram
        const telegramToken = data.config?.channels?.telegram?.botToken;
        setSystemStatus(prev => ({
          ...prev,
          telegram: telegramToken ? "online" : "offline",
        }));
        
        // Check Ollama
        const ollamaUrl = data.config?.models?.providers?.ollama?.baseUrl || "http://localhost:11434";
        try {
          await fetch(ollamaUrl.replace("/v1", "") + "/api/tags", { mode: "no-cors" });
          setSystemStatus(prev => ({ ...prev, ollama: "online" }));
        } catch {
          setSystemStatus(prev => ({ ...prev, ollama: "offline" }));
        }
      }
    } catch {
      setSystemStatus({ ollama: "offline", telegram: "offline" });
    }
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setStats({
          sessions: data.sessions || { count: 0, active: 0 },
          cron: data.cron || { count: 0, enabled: 0 },
          memory: data.memory || { backend: "sqlite", qmdEnabled: false },
          services: data.services || {},
        });
        // Update service status from stats
        if (data.services) {
          setSystemStatus((prev) => ({
            ...prev,
            ollama: data.services.ollama || prev.ollama,
          }));
        }
      }
    } catch {}
  }

  // Loading state - prevent flash
  if (isFirstRun === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  // Show setup wizard for first-time users
  if (isFirstRun) {
    return <WelcomeScreen />;
  }

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">OpenClaw</h1>
            <p className="text-sm text-muted-foreground">Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <StatusBadge connected={gatewayStatus.connected} />
          <ThemeToggle />
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Chat Hero */}
      <ChatHero />

      {/* Live Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="text-2xl font-bold text-blue-400">{stats.sessions.count}</div>
            <div className="text-sm text-muted-foreground">Sessions</div>
            <div className="text-xs text-green-400">{stats.sessions.active} active</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="text-2xl font-bold text-orange-400">{stats.cron.enabled}</div>
            <div className="text-sm text-muted-foreground">Cron Jobs</div>
            <div className="text-xs text-gray-500">{stats.cron.count} total</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="text-2xl font-bold text-purple-400">{stats.memory.qmdEnabled ? "QMD" : "SQLite"}</div>
            <div className="text-sm text-muted-foreground">Memory Backend</div>
            <div className="text-xs text-green-400">{stats.memory.qmdEnabled ? "Hybrid search" : "Vector search"}</div>
          </div>
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stats.services.ollama === "online" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm">Ollama</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${stats.services.n8n === "online" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm">N8N</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Services</div>
          </div>
        </div>
      )}

      {/* Quick Actions - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <QuickAction
          href="/models"
          icon={Cpu}
          title="AI Models"
          description="Manage & configure"
          color="primary"
        />
        <QuickAction
          href="/integrations"
          icon={Plug}
          title="Integrations"
          description="Connect services"
          color="accent"
        />
        <QuickAction
          href="/skills"
          icon={Sparkles}
          title="Skills"
          description="Browse & install"
          color="yellow"
        />
        <QuickAction
          href="/settings"
          icon={Settings}
          title="Settings"
          description="Configure everything"
          color="purple"
        />
      </div>

      {/* Quick Actions - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <QuickAction
          href="/sessions"
          icon={MessageSquare}
          title="Sessions"
          description="Active conversations"
          color="blue"
        />
        <QuickAction
          href="/cron"
          icon={Activity}
          title="Cron Jobs"
          description="Scheduled tasks"
          color="orange"
        />
        <QuickAction
          href="/nodes"
          icon={Zap}
          title="Nodes"
          description="Paired devices"
          color="green"
        />
        <QuickAction
          href="/memory"
          icon={Brain}
          title="Memory"
          description="View & search memories"
          color="purple"
        />
      </div>

      {/* Quick Actions - Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <QuickAction
          href="/logs"
          icon={Shield}
          title="Logs"
          description="Session transcripts"
          color="green"
        />
        <QuickAction
          href="/connections"
          icon={Plug}
          title="Connections"
          description="Email, Calendar, GitHub"
          color="red"
        />
      </div>

      {/* Reset Config Banner */}
      <div className="mb-8 p-4 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Configuration</p>
          <p className="text-xs text-muted-foreground">
            Restart wizard or fully reset OpenClaw
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm("Restart the setup wizard? Your OpenClaw config stays intact.")) {
                localStorage.removeItem("setupComplete");
                localStorage.removeItem("config");
                window.location.reload();
              }
            }}
            className="text-sm px-4 py-2 rounded-lg bg-secondary hover:bg-secondary-hover transition-colors"
          >
            Restart Wizard
          </button>
          <button
            onClick={async () => {
              if (confirm("⚠️ FULL RESET: This will wipe all OpenClaw settings, integrations, and restart setup. Are you sure?")) {
                try {
                  // Call API to run openclaw reset
                  await fetch("/api/gateway/reset", { method: "POST" });
                } catch (e) {
                  console.log("Could not reach gateway for reset");
                }
                localStorage.removeItem("setupComplete");
                localStorage.removeItem("config");
                window.location.reload();
              }
            }}
            className="text-sm px-4 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          >
            Full Reset
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </h2>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              View all
            </button>
          </div>

          <div className="space-y-3">
            <ActivityItem
              icon={MessageSquare}
              title="Voice command processed"
              description='"Order me a coffee" → Starbucks opened'
              time="2 minutes ago"
            />
            <ActivityItem
              icon={Shield}
              title="Security check"
              description="Night patrol completed - all clear"
              time="3 hours ago"
            />
            <ActivityItem
              icon={Zap}
              title="Shortcut triggered"
              description="Morning routine executed"
              time="7 hours ago"
            />
          </div>
        </div>

        {/* Status Panel */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>

          <div className="space-y-4">
            <StatusRow
              label="Gateway"
              status={gatewayStatus.connected ? "online" : "offline"}
            />
            <StatusRow label="Ollama" status={systemStatus.ollama} />
            <StatusRow label="Telegram" status={systemStatus.telegram} />
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium mb-3">Active Models</h3>
            <div className="space-y-2">
              <ModelChip name="Claude Opus" provider="Anthropic" active />
              <ModelChip name="qwen3:8b" provider="Ollama" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Components

function WelcomeScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
        >
          <Bot className="w-14 h-14 text-white" />
        </motion.div>

        <h1 className="text-4xl font-bold mb-4">Welcome to OpenClaw</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your personal AI assistant, made simple. Let's get you set up in just
          a few steps.
        </p>

        <Link
          href="/setup"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-hover rounded-xl font-semibold transition-colors"
        >
          Start Setup
          <ChevronRight className="w-5 h-5" />
        </Link>

        <div className="mt-8 flex flex-col gap-3">
          <button className="text-sm text-primary hover:underline">
            Already have a config? Import
          </button>
          
          <button 
            onClick={() => {
              localStorage.removeItem("setupComplete");
              localStorage.removeItem("config");
              window.location.reload();
            }}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            🔄 Reset UI & Start Over
          </button>
        </div>
      </motion.div>
    </main>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
        connected ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? "bg-accent animate-pulse" : "bg-destructive"
        }`}
      />
      {connected ? "Connected" : "Disconnected"}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("light", saved === "light");
    }
  }, []);

  function toggle() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-secondary transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 hover:from-primary/30",
    accent: "from-accent/20 to-accent/5 hover:from-accent/30",
    yellow: "from-yellow-500/20 to-yellow-500/5 hover:from-yellow-500/30",
    purple: "from-purple-500/20 to-purple-500/5 hover:from-purple-500/30",
    blue: "from-blue-500/20 to-blue-500/5 hover:from-blue-500/30",
    orange: "from-orange-500/20 to-orange-500/5 hover:from-orange-500/30",
    green: "from-green-500/20 to-green-500/5 hover:from-green-500/30",
    red: "from-red-500/20 to-red-500/5 hover:from-red-500/30",
  };

  return (
    <Link
      href={href}
      className={`p-5 rounded-2xl bg-gradient-to-br ${colorClasses[color]} border border-white/5 transition-all hover:scale-[1.02] group`}
    >
      <Icon className="w-8 h-8 mb-3 text-foreground/80" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <ChevronRight className="w-5 h-5 mt-2 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
}: {
  icon: any;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: "online" | "offline" | "detecting";
}) {
  const statusColors = {
    online: "bg-accent",
    offline: "bg-destructive",
    detecting: "bg-yellow-500 animate-pulse",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm capitalize">{status}</span>
      </div>
    </div>
  );
}

function ModelChip({
  name,
  provider,
  active,
}: {
  name: string;
  provider: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg ${
        active ? "bg-primary/20 border border-primary/30" : "bg-secondary"
      }`}
    >
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{provider}</p>
      </div>
      {active && <Zap className="w-4 h-4 text-primary" />}
    </div>
  );
}

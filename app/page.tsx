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
} from "lucide-react";

interface GatewayStatus {
  connected: boolean;
  version?: string;
  uptime?: number;
}

export default function Home() {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({
    connected: false,
  });
  const [isFirstRun, setIsFirstRun] = useState(true);

  useEffect(() => {
    // Check if setup is complete
    const setupComplete = localStorage.getItem("setupComplete");
    setIsFirstRun(!setupComplete);

    // Check gateway status
    checkGatewayStatus();
  }, []);

  async function checkGatewayStatus() {
    try {
      const res = await fetch("/api/gateway/status");
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus({ connected: true, ...data });
      }
    } catch {
      setGatewayStatus({ connected: false });
    }
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

        <div className="flex items-center gap-4">
          <StatusBadge connected={gatewayStatus.connected} />
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <StatusRow label="Ollama" status="detecting" />
            <StatusRow label="Telegram" status="online" />
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

        <p className="mt-6 text-sm text-muted-foreground">
          Already have a config?{" "}
          <button className="text-primary hover:underline">Import</button>
        </p>
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

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Settings,
  ChevronLeft,
  Key,
  MessageSquare,
  Server,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  Plus,
  User,
} from "lucide-react";

type Tab = "identity" | "channels" | "api-keys" | "gateway" | "advanced";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({});
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [assistant, setAssistant] = useState({ name: "", avatar: "" });
  const [savingAssistant, setSavingAssistant] = useState(false);

  useEffect(() => {
    loadConfig();
    loadAssistant();
  }, []);

  async function loadAssistant() {
    try {
      const res = await fetch("/api/assistant");
      const data = await res.json();
      setAssistant({ name: data.name || "", avatar: data.avatar || "🤖" });
    } catch {}
  }

  async function saveAssistant() {
    if (!assistant.name) return;
    setSavingAssistant(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assistant),
      });
      const data = await res.json();
      if (data.success) {
        alert("Assistant identity saved!");
      } else {
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setSavingAssistant(false);
  }

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-get" }),
      });
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch (e) {
      console.error("Failed to load config:", e);
    }
    setLoading(false);
  }

  async function saveChanges() {
    if (Object.keys(changes).length === 0) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-patch", config: changes }),
      });
      const data = await res.json();
      
      if (data.success) {
        setChanges({});
        await loadConfig(); // Reload to get updated config
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error saving: ${e.message}`);
    }
    setSaving(false);
  }

  function updateField(path: string, value: any) {
    setChanges(prev => ({ ...prev, [path]: value }));
  }

  function toggleSecret(key: string) {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function maskValue(value: string | undefined): string {
    if (!value) return "";
    if (value.length <= 8) return "••••••••";
    return value.substring(0, 4) + "••••" + value.substring(value.length - 4);
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "identity", label: "Identity", icon: User },
    { id: "channels", label: "Channels", icon: MessageSquare },
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "gateway", label: "Gateway", icon: Server },
    { id: "advanced", label: "Advanced", icon: Settings },
  ];

  const hasChanges = Object.keys(changes).length > 0;

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
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Settings className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure OpenClaw
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadConfig()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={saveChanges}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover font-medium transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </motion.button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-3xl">
        {activeTab === "identity" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-secondary/50 border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Assistant Identity
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Customize your assistant's name and avatar. This appears in the chat interface and throughout the UI.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={assistant.name}
                    onChange={(e) => setAssistant({ ...assistant, name: e.target.value })}
                    placeholder="e.g., Bob, Jarvis, Friday"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Avatar (emoji or short text)</label>
                  <input
                    type="text"
                    value={assistant.avatar}
                    onChange={(e) => setAssistant({ ...assistant, avatar: e.target.value })}
                    placeholder="e.g., 🤖, 🦾, CB"
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-primary"
                    maxLength={4}
                  />
                </div>

                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-background border border-border">
                    <div className="text-3xl">{assistant.avatar || "🤖"}</div>
                    <div>
                      <div className="font-semibold">{assistant.name || "Assistant"}</div>
                      <div className="text-xs text-muted-foreground">Preview</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={saveAssistant}
                    disabled={savingAssistant || !assistant.name}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingAssistant ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Identity
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
              <strong>Tip:</strong> Common emoji avatars: 🤖 🦾 🧠 💬 ⚡ 🎯 🔮 👾
            </div>
          </div>
        )}

        {activeTab === "channels" && (
          <ChannelsTab
            config={config}
            changes={changes}
            onUpdate={updateField}
            showSecrets={showSecrets}
            toggleSecret={toggleSecret}
            maskValue={maskValue}
          />
        )}
        
        {activeTab === "api-keys" && (
          <ApiKeysTab
            config={config}
            changes={changes}
            onUpdate={updateField}
            showSecrets={showSecrets}
            toggleSecret={toggleSecret}
            maskValue={maskValue}
          />
        )}
        
        {activeTab === "gateway" && (
          <GatewayTab
            config={config}
            changes={changes}
            onUpdate={updateField}
          />
        )}
        
        {activeTab === "advanced" && (
          <AdvancedTab
            config={config}
            changes={changes}
            onUpdate={updateField}
          />
        )}
      </div>
    </main>
  );
}

// Tab Components

function ChannelsTab({
  config,
  changes,
  onUpdate,
  showSecrets,
  toggleSecret,
  maskValue,
}: {
  config: any;
  changes: Record<string, any>;
  onUpdate: (path: string, value: any) => void;
  showSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  maskValue: (value: string | undefined) => string;
}) {
  const telegram = config?.channels?.telegram || {};
  const discord = config?.channels?.discord || {};

  return (
    <div className="space-y-6">
      {/* Telegram */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📱 Telegram
            {telegram.botToken && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                Configured
              </span>
            )}
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <input
              type="checkbox"
              checked={changes["channels.telegram.enabled"] ?? telegram.enabled ?? true}
              onChange={(e) => onUpdate("channels.telegram.enabled", e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bot Token</label>
            <div className="flex gap-2">
              <input
                type={showSecrets["telegram-token"] ? "text" : "password"}
                value={changes["channels.telegram.botToken"] ?? (showSecrets["telegram-token"] ? telegram.botToken : maskValue(telegram.botToken))}
                onChange={(e) => onUpdate("channels.telegram.botToken", e.target.value)}
                placeholder="1234567890:ABCdef..."
                className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
              />
              <button
                onClick={() => toggleSecret("telegram-token")}
                className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {showSecrets["telegram-token"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">DM Policy</label>
            <select
              value={changes["channels.telegram.dmPolicy"] ?? telegram.dmPolicy ?? "pairing"}
              onChange={(e) => onUpdate("channels.telegram.dmPolicy", e.target.value)}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="pairing">Pairing (require /pair)</option>
              <option value="allowlist">Allowlist only</option>
              <option value="open">Open (anyone can DM)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Group Policy</label>
            <select
              value={changes["channels.telegram.groupPolicy"] ?? telegram.groupPolicy ?? "allowlist"}
              onChange={(e) => onUpdate("channels.telegram.groupPolicy", e.target.value)}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="allowlist">Allowlist only</option>
              <option value="open">Open (any group)</option>
              <option value="deny">Deny all groups</option>
            </select>
          </div>
        </div>
      </section>

      {/* Discord */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🎮 Discord
            {discord.token && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                Configured
              </span>
            )}
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-muted-foreground">Enabled</span>
            <input
              type="checkbox"
              checked={changes["channels.discord.enabled"] ?? discord.enabled ?? false}
              onChange={(e) => onUpdate("channels.discord.enabled", e.target.checked)}
              className="w-5 h-5 rounded accent-primary"
            />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bot Token</label>
            <div className="flex gap-2">
              <input
                type={showSecrets["discord-token"] ? "text" : "password"}
                value={changes["channels.discord.token"] ?? (showSecrets["discord-token"] ? discord.token : maskValue(discord.token))}
                onChange={(e) => onUpdate("channels.discord.token", e.target.value)}
                placeholder="MTIzNDU2Nzg5..."
                className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
              />
              <button
                onClick={() => toggleSecret("discord-token")}
                className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {showSecrets["discord-token"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ApiKeysTab({
  config,
  changes,
  onUpdate,
  showSecrets,
  toggleSecret,
  maskValue,
}: {
  config: any;
  changes: Record<string, any>;
  onUpdate: (path: string, value: any) => void;
  showSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  maskValue: (value: string | undefined) => string;
}) {
  const env = config?.env || {};

  const apiKeys = [
    { key: "OPENAI_API_KEY", label: "OpenAI", placeholder: "sk-..." },
    { key: "ANTHROPIC_API_KEY", label: "Anthropic", placeholder: "sk-ant-..." },
    { key: "ELEVENLABS_API_KEY", label: "ElevenLabs (TTS)", placeholder: "sk_..." },
    { key: "N8N_API_KEY", label: "N8N", placeholder: "eyJ..." },
  ];

  return (
    <div className="space-y-6">
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="text-lg font-semibold mb-4">API Keys</h3>
        <p className="text-sm text-muted-foreground mb-6">
          These keys are stored in your local OpenClaw config. For OAuth providers (Anthropic, OpenAI),
          use <code className="bg-secondary px-1 rounded">claude auth</code> or{" "}
          <code className="bg-secondary px-1 rounded">codex auth</code> instead.
        </p>

        <div className="space-y-4">
          {apiKeys.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-2">{label}</label>
              <div className="flex gap-2">
                <input
                  type={showSecrets[key] ? "text" : "password"}
                  value={changes[`env.${key}`] ?? (showSecrets[key] ? env[key] : maskValue(env[key]))}
                  onChange={(e) => onUpdate(`env.${key}`, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
                />
                <button
                  onClick={() => toggleSecret(key)}
                  className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {showSecrets[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Service URLs */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="text-lg font-semibold mb-4">Service URLs</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Ollama URL</label>
            <input
              type="text"
              value={changes["models.providers.ollama.baseUrl"] ?? config?.models?.providers?.ollama?.baseUrl ?? "http://localhost:11434/v1"}
              onChange={(e) => onUpdate("models.providers.ollama.baseUrl", e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">N8N URL</label>
            <input
              type="text"
              value={changes["env.N8N_BASE_URL"] ?? env.N8N_BASE_URL ?? ""}
              onChange={(e) => onUpdate("env.N8N_BASE_URL", e.target.value)}
              placeholder="http://localhost:5678"
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function GatewayTab({
  config,
  changes,
  onUpdate,
}: {
  config: any;
  changes: Record<string, any>;
  onUpdate: (path: string, value: any) => void;
}) {
  const gateway = config?.gateway || {};

  return (
    <div className="space-y-6">
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="text-lg font-semibold mb-4">Gateway Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Port</label>
            <input
              type="number"
              value={changes["gateway.port"] ?? gateway.port ?? 18789}
              onChange={(e) => onUpdate("gateway.port", parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bind Mode</label>
            <select
              value={changes["gateway.bind"] ?? gateway.bind ?? "lan"}
              onChange={(e) => onUpdate("gateway.bind", e.target.value)}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="localhost">Localhost only (127.0.0.1)</option>
              <option value="lan">LAN (0.0.0.0)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              LAN allows connections from other devices on your network
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Auth Mode</label>
            <select
              value={changes["gateway.auth.mode"] ?? gateway.auth?.mode ?? "token"}
              onChange={(e) => onUpdate("gateway.auth.mode", e.target.value)}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
            >
              <option value="token">Token auth</option>
              <option value="none">No auth (local only)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="text-lg font-semibold mb-4">Workspace</h3>
        
        <div>
          <label className="block text-sm font-medium mb-2">Agent Workspace Path</label>
          <input
            type="text"
            value={changes["agents.defaults.workspace"] ?? config?.agents?.defaults?.workspace ?? ""}
            onChange={(e) => onUpdate("agents.defaults.workspace", e.target.value)}
            placeholder="/path/to/workspace"
            className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Where the agent reads/writes files (AGENTS.md, MEMORY.md, etc.)
          </p>
        </div>
      </section>
    </div>
  );
}

function AdvancedTab({
  config,
  changes,
  onUpdate,
}: {
  config: any;
  changes: Record<string, any>;
  onUpdate: (path: string, value: any) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-6">
      {/* TTS */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="text-lg font-semibold mb-4">Text-to-Speech</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ElevenLabs Voice ID</label>
            <input
              type="text"
              value={changes["env.ELEVENLABS_VOICE_ID"] ?? config?.env?.ELEVENLABS_VOICE_ID ?? ""}
              onChange={(e) => onUpdate("env.ELEVENLABS_VOICE_ID", e.target.value)}
              placeholder="Voice ID"
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
            />
          </div>
        </div>
      </section>

      {/* Concurrency */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="text-lg font-semibold mb-4">Concurrency</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Max Concurrent Agents</label>
            <input
              type="number"
              value={changes["agents.defaults.maxConcurrent"] ?? config?.agents?.defaults?.maxConcurrent ?? 4}
              onChange={(e) => onUpdate("agents.defaults.maxConcurrent", parseInt(e.target.value))}
              min={1}
              max={16}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Subagents</label>
            <input
              type="number"
              value={changes["agents.defaults.subagents.maxConcurrent"] ?? config?.agents?.defaults?.subagents?.maxConcurrent ?? 8}
              onChange={(e) => onUpdate("agents.defaults.subagents.maxConcurrent", parseInt(e.target.value))}
              min={1}
              max={32}
              className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
            />
          </div>
        </div>
      </section>

      {/* Raw Config */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Raw Config</h3>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-sm text-primary hover:underline"
          >
            {showRaw ? "Hide" : "Show"}
          </button>
        </div>
        
        {showRaw && (
          <pre className="p-4 rounded-lg bg-background text-xs font-mono overflow-auto max-h-96">
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
      </section>

      {/* Danger Zone */}
      <section className="p-6 rounded-xl bg-destructive/10 border border-destructive/30">
        <h3 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h3>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              if (confirm("Restart the gateway? Active sessions will be interrupted.")) {
                fetch("/api/gateway", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "stop" }),
                }).then(() => {
                  setTimeout(() => {
                    fetch("/api/gateway", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "start" }),
                    });
                  }, 1000);
                });
              }
            }}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition-colors"
          >
            Restart Gateway
          </button>
          
          <button
            onClick={() => {
              if (confirm("⚠️ This will clear your local UI settings. OpenClaw config stays intact. Continue?")) {
                localStorage.clear();
                window.location.href = "/";
              }
            }}
            className="w-full py-3 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-lg font-medium transition-colors"
          >
            Reset UI Settings
          </button>
        </div>
      </section>
    </div>
  );
}

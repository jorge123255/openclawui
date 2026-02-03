"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Server,
  Key,
  Bell,
  Shield,
  Palette,
  Terminal,
  Save,
  RefreshCw,
  Check,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

interface Config {
  serverUrl: string;
  gatewayToken: string;
  anthropicKey: string;
  openaiKey: string;
  elevenLabsKey: string;
  notifications: boolean;
  theme: "dark" | "light" | "system";
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config>({
    serverUrl: "",
    gatewayToken: "",
    anthropicKey: "",
    openaiKey: "",
    elevenLabsKey: "",
    notifications: true,
    theme: "dark",
  });
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  function loadConfig() {
    const saved = localStorage.getItem("config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig((prev) => ({ ...prev, ...parsed }));
      } catch {}
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      localStorage.setItem("config", JSON.stringify(config));
      
      // If we have a gateway connection, sync settings
      if (config.serverUrl && config.gatewayToken) {
        try {
          await fetch(`http://${config.serverUrl}:18789/api/config`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Gateway-Token": config.gatewayToken,
            },
            body: JSON.stringify(config),
          });
        } catch {
          // Gateway might not be reachable, that's ok
        }
      }

      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  }

  function toggleShowToken(key: string) {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your OpenClaw instance
          </p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Gateway Connection */}
        <Section
          icon={Server}
          title="Gateway Connection"
          description="Connect to your OpenClaw server"
        >
          <div className="space-y-4">
            <InputField
              label="Server Address"
              placeholder="192.168.1.82 or localhost"
              value={config.serverUrl}
              onChange={(v) => setConfig({ ...config, serverUrl: v })}
              hint="IP or hostname of your OpenClaw server"
            />
            <InputField
              label="Gateway Token"
              placeholder="Your gateway token"
              value={config.gatewayToken}
              onChange={(v) => setConfig({ ...config, gatewayToken: v })}
              secret
              showSecret={showTokens.gateway}
              onToggleSecret={() => toggleShowToken("gateway")}
              hint={
                <span>
                  Run <code className="bg-background px-1 rounded text-xs">openclaw config get gateway.token</code> to get this
                </span>
              }
            />
          </div>
        </Section>

        {/* API Keys */}
        <Section
          icon={Key}
          title="API Keys"
          description="Authentication for AI providers"
        >
          <div className="space-y-4">
            <InputField
              label="Anthropic API Key"
              placeholder="sk-ant-..."
              value={config.anthropicKey}
              onChange={(v) => setConfig({ ...config, anthropicKey: v })}
              secret
              showSecret={showTokens.anthropic}
              onToggleSecret={() => toggleShowToken("anthropic")}
              hint={
                <a href="https://console.anthropic.com" target="_blank" className="text-primary hover:underline flex items-center gap-1">
                  Get key from Anthropic Console <ExternalLink className="w-3 h-3" />
                </a>
              }
            />
            <InputField
              label="OpenAI API Key"
              placeholder="sk-..."
              value={config.openaiKey}
              onChange={(v) => setConfig({ ...config, openaiKey: v })}
              secret
              showSecret={showTokens.openai}
              onToggleSecret={() => toggleShowToken("openai")}
              hint={
                <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:underline flex items-center gap-1">
                  Get key from OpenAI <ExternalLink className="w-3 h-3" />
                </a>
              }
            />
            <InputField
              label="ElevenLabs API Key"
              placeholder="..."
              value={config.elevenLabsKey}
              onChange={(v) => setConfig({ ...config, elevenLabsKey: v })}
              secret
              showSecret={showTokens.elevenlabs}
              onToggleSecret={() => toggleShowToken("elevenlabs")}
              hint="For text-to-speech with custom voices"
            />
          </div>
        </Section>

        {/* Notifications */}
        <Section
          icon={Bell}
          title="Notifications"
          description="How OpenClaw alerts you"
        >
          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified about important events
              </p>
            </div>
            <button
              onClick={() => setConfig({ ...config, notifications: !config.notifications })}
              className={`w-12 h-7 rounded-full transition-colors ${
                config.notifications ? "bg-accent" : "bg-muted"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  config.notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </Section>

        {/* Appearance */}
        <Section
          icon={Palette}
          title="Appearance"
          description="Customize the UI"
        >
          <div className="grid grid-cols-3 gap-3">
            {(["dark", "light", "system"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setConfig({ ...config, theme })}
                className={`p-4 rounded-xl border-2 capitalize transition-all ${
                  config.theme === theme
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </Section>

        {/* Danger Zone */}
        <Section
          icon={Shield}
          title="Danger Zone"
          description="Destructive actions"
          danger
        >
          <div className="space-y-3">
            <button
              onClick={() => {
                if (confirm("Reset the setup wizard? Your OpenClaw config stays intact.")) {
                  localStorage.removeItem("setupComplete");
                  window.location.href = "/";
                }
              }}
              className="w-full p-4 rounded-xl border border-border hover:border-destructive/50 text-left transition-colors"
            >
              <p className="font-medium">Restart Setup Wizard</p>
              <p className="text-sm text-muted-foreground">
                Go through setup again without losing data
              </p>
            </button>
            <button
              onClick={async () => {
                if (confirm("⚠️ FULL RESET: This will wipe all settings. Continue?")) {
                  localStorage.clear();
                  window.location.href = "/";
                }
              }}
              className="w-full p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-left hover:bg-destructive/20 transition-colors"
            >
              <p className="font-medium text-destructive">Full Reset</p>
              <p className="text-sm text-destructive/70">
                Clear all settings and start fresh
              </p>
            </button>
          </div>
        </Section>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-8 right-8">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Changes
        </button>
      </div>
    </main>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  danger,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-6 ${danger ? "border-destructive/30" : ""}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-5 h-5 ${danger ? "text-destructive" : "text-primary"}`} />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  secret,
  showSecret,
  onToggleSecret,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  secret?: boolean;
  showSecret?: boolean;
  onToggleSecret?: () => void;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="relative">
        <input
          type={secret && !showSecret ? "password" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors pr-20"
        />
        {secret && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              type="button"
              onClick={onToggleSecret}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              {showSecret ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
}

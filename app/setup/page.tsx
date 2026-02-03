"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  Cpu,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Key,
} from "lucide-react";

type Step = "installing" | "ai" | "channels" | "gateway" | "complete";

const STEPS: Step[] = ["installing", "ai", "channels", "gateway", "complete"];

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("installing");
  const [config, setConfig] = useState({
    deployment: "local" as const,
    // AI Provider
    aiProvider: "" as "anthropic" | "openai" | "ollama" | "",
    anthropicKey: "",
    openaiKey: "",
    ollamaUrl: "http://localhost:11434",
    // Channel
    channel: "" as "telegram" | "discord" | "",
    telegramToken: "",
    telegramAllowFrom: "",
    discordToken: "",
  });

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function nextStep() {
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next);
  }

  function prevStep() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev);
  }

  function completeSetup() {
    localStorage.setItem("setupComplete", "true");
    localStorage.setItem("config", JSON.stringify(config));
    router.push("/");
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-secondary">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <span className="font-semibold">OpenClaw Setup</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {currentStep === "installing" && (
            <StepInstalling
              key="installing"
              deployment={config.deployment}
              onComplete={() => nextStep()}
            />
          )}
          {currentStep === "ai" && (
            <StepAI
              key="ai"
              config={config}
              onChange={(updates) => setConfig({ ...config, ...updates })}
            />
          )}
          {currentStep === "channels" && (
            <StepChannels
              key="channels"
              config={config}
              onChange={(updates) => setConfig({ ...config, ...updates })}
            />
          )}
          {currentStep === "gateway" && (
            <StepGateway
              key="gateway"
              config={config}
              onComplete={() => nextStep()}
            />
          )}
          {currentStep === "complete" && (
            <StepComplete key="complete" config={config} />
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="p-6 flex items-center justify-between border-t border-border">
        <button
          onClick={prevStep}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {currentStep === "complete" ? (
          <button
            onClick={completeSetup}
            className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover rounded-lg font-semibold transition-colors"
          >
            Launch OpenClaw
            <Sparkles className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover rounded-lg font-semibold transition-colors"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </footer>
    </main>
  );
}

// Step Components

function StepWrapper({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl"
    >
      <h2 className="text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-8">{description}</p>
      {children}
    </motion.div>
  );
}

type OS = "macos" | "windows" | "linux" | "unknown";

function detectOS(): OS {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || "";
  
  if (platform.includes("mac") || ua.includes("mac")) return "macos";
  if (platform.includes("win") || ua.includes("win")) return "windows";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return "unknown";
}

function StepInstalling({
  onComplete,
}: {
  deployment: string;
  onComplete: () => void;
}) {
  const [os, setOs] = useState<OS>("unknown");
  const [checking, setChecking] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<"unknown" | "found" | "missing">("unknown");
  const [nodeVersion, setNodeVersion] = useState("");
  const [openclawStatus, setOpenclawStatus] = useState<"unknown" | "found" | "missing">("unknown");
  const [openclawVersion, setOpenclawVersion] = useState("");

  useEffect(() => {
    setOs(detectOS());
  }, []);

  async function checkInstallation() {
    setChecking(true);
    
    try {
      // Check Node.js
      const nodeRes = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-node" }),
      });
      const nodeData = await nodeRes.json();
      
      if (nodeData.installed) {
        setNodeStatus("found");
        setNodeVersion(`v${nodeData.node}`);
      } else {
        setNodeStatus("missing");
      }
      
      // Check OpenClaw
      const ocRes = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-openclaw" }),
      });
      const ocData = await ocRes.json();
      
      if (ocData.installed) {
        setOpenclawStatus("found");
        setOpenclawVersion(ocData.version || "installed");
      } else {
        setOpenclawStatus("missing");
      }
    } catch (e) {
      console.error("Check failed:", e);
    }
    
    setChecking(false);
  }

  const installCommands: Record<OS, { node: string; openclaw: string }> = {
    macos: {
      node: "brew install node",
      openclaw: "npm install -g openclaw",
    },
    windows: {
      node: "winget install OpenJS.NodeJS",
      openclaw: "npm install -g openclaw",
    },
    linux: {
      node: "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs",
      openclaw: "npm install -g openclaw",
    },
    unknown: {
      node: "# Install Node.js from https://nodejs.org",
      openclaw: "npm install -g openclaw",
    },
  };

  const osLabels: Record<OS, string> = {
    macos: "macOS",
    windows: "Windows", 
    linux: "Linux",
    unknown: "Your System",
  };

  const allReady = nodeStatus === "found" && openclawStatus === "found";

  return (
    <StepWrapper
      title="Install OpenClaw"
      description={`Detected: ${osLabels[os]}`}
    >
      <div className="space-y-4">
        {/* Node.js */}
        <div className={`p-4 rounded-xl border-2 ${
          nodeStatus === "found" ? "border-accent/50 bg-accent/10" :
          nodeStatus === "missing" ? "border-destructive/50 bg-destructive/10" :
          "border-border"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {nodeStatus === "found" && <CheckCircle2 className="w-5 h-5 text-accent" />}
              {nodeStatus === "missing" && <AlertCircle className="w-5 h-5 text-destructive" />}
              {nodeStatus === "unknown" && <Terminal className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">Node.js</span>
            </div>
            {nodeStatus === "found" && (
              <span className="text-sm text-muted-foreground">{nodeVersion}</span>
            )}
          </div>
          {nodeStatus !== "found" && (
            <div className="mt-2">
              <code className="block p-2 rounded bg-background text-sm font-mono select-all overflow-x-auto">
                {installCommands[os].node}
              </code>
            </div>
          )}
        </div>

        {/* OpenClaw */}
        <div className={`p-4 rounded-xl border-2 ${
          openclawStatus === "found" ? "border-accent/50 bg-accent/10" :
          openclawStatus === "missing" ? "border-destructive/50 bg-destructive/10" :
          "border-border"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {openclawStatus === "found" && <CheckCircle2 className="w-5 h-5 text-accent" />}
              {openclawStatus === "missing" && <AlertCircle className="w-5 h-5 text-destructive" />}
              {openclawStatus === "unknown" && <Bot className="w-5 h-5 text-muted-foreground" />}
              <span className="font-medium">OpenClaw</span>
            </div>
            {openclawStatus === "found" && (
              <span className="text-sm text-muted-foreground">{openclawVersion}</span>
            )}
          </div>
          {openclawStatus !== "found" && (
            <div className="mt-2">
              <code className="block p-2 rounded bg-background text-sm font-mono select-all">
                {installCommands[os].openclaw}
              </code>
              {os === "macos" && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 If npm fails, try: <code className="bg-background px-1 rounded">brew install openclaw</code>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Check Button */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={checkInstallation}
          disabled={checking}
          className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {checking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Terminal className="w-5 h-5" />
              Check Installation
            </>
          )}
        </button>
        
        {allReady && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onComplete}
            className="flex-1 py-3 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Skip for existing users */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have OpenClaw running?{" "}
        <button onClick={onComplete} className="text-primary hover:underline">
          Skip this step
        </button>
      </p>
    </StepWrapper>
  );
}

function StepAI({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    // Check if Ollama is running
    fetch("http://localhost:11434/api/tags")
      .then(() => setOllamaStatus("online"))
      .catch(() => setOllamaStatus("offline"));
  }, []);

  const providers = [
    { 
      id: "anthropic", 
      name: "Anthropic", 
      model: "Claude (Recommended)", 
      logo: "🧠",
      keyPlaceholder: "sk-ant-...",
      keyLink: "https://console.anthropic.com/account/keys"
    },
    { 
      id: "openai", 
      name: "OpenAI", 
      model: "GPT-4 / GPT-5", 
      logo: "🤖",
      keyPlaceholder: "sk-...",
      keyLink: "https://platform.openai.com/api-keys"
    },
    { 
      id: "ollama", 
      name: "Ollama", 
      model: "Local & Free", 
      logo: "🦙",
      free: true
    },
  ];

  return (
    <StepWrapper
      title="Choose your AI"
      description="Pick a provider and enter your API key"
    >
      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id}>
            <button
              onClick={() => onChange({ aiProvider: p.id })}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                config.aiProvider === p.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{p.logo}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.free && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        Free
                      </span>
                    )}
                    {p.id === "ollama" && ollamaStatus === "online" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        ✓ Running
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.model}</p>
                </div>
                {config.aiProvider === p.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </button>

            {/* API Key Input */}
            {config.aiProvider === p.id && p.id === "anthropic" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-card border border-border"
              >
                <label className="block text-sm font-medium mb-2">Anthropic API Key</label>
                <input
                  type="password"
                  placeholder={p.keyPlaceholder}
                  value={config.anthropicKey}
                  onChange={(e) => onChange({ anthropicKey: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
                />
                <a 
                  href={p.keyLink} 
                  target="_blank" 
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  Get your API key →
                </a>
              </motion.div>
            )}

            {config.aiProvider === p.id && p.id === "openai" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-card border border-border"
              >
                <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder={p.keyPlaceholder}
                  value={config.openaiKey}
                  onChange={(e) => onChange({ openaiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
                />
                <a 
                  href={p.keyLink} 
                  target="_blank" 
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  Get your API key →
                </a>
              </motion.div>
            )}

            {config.aiProvider === p.id && p.id === "ollama" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-card border border-border"
              >
                {ollamaStatus === "online" ? (
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Ollama is running on localhost:11434</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <span>Ollama not detected</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Install from{" "}
                      <a href="https://ollama.ai" target="_blank" className="text-primary underline">
                        ollama.ai
                      </a>
                      {" "}then run: <code className="bg-background px-1 rounded">ollama serve</code>
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </StepWrapper>
  );
}

function StepChannels({
  config,
  onChange,
}: {
  config: any;
  onChange: (updates: any) => void;
}) {
  const channels = [
    { 
      id: "telegram", 
      name: "Telegram", 
      icon: "📱",
      description: "Easiest to set up",
      recommended: true
    },
    { 
      id: "discord", 
      name: "Discord", 
      icon: "🎮",
      description: "Great for servers"
    },
  ];

  return (
    <StepWrapper
      title="Connect a chat channel"
      description="Where do you want to talk to your AI?"
    >
      <div className="space-y-3">
        {channels.map((c) => (
          <div key={c.id}>
            <button
              onClick={() => onChange({ channel: c.id })}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                config.channel === c.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{c.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    {c.recommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
                {config.channel === c.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </button>

            {/* Telegram Setup */}
            {config.channel === "telegram" && c.id === "telegram" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-card border border-border space-y-4"
              >
                <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                  <p className="font-medium mb-2">📝 How to get a Telegram Bot Token:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Open Telegram and search for <code className="bg-background px-1 rounded">@BotFather</code></li>
                    <li>Send <code className="bg-background px-1 rounded">/newbot</code> and follow prompts</li>
                    <li>Copy the token BotFather gives you</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bot Token</label>
                  <input
                    type="password"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={config.telegramToken}
                    onChange={(e) => onChange({ telegramToken: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Telegram User ID <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="123456789"
                    value={config.telegramAllowFrom}
                    onChange={(e) => onChange({ telegramAllowFrom: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Send <code className="bg-background px-1 rounded">/start</code> to <code className="bg-background px-1 rounded">@userinfobot</code> to get your ID
                  </p>
                </div>
              </motion.div>
            )}

            {/* Discord Setup */}
            {config.channel === "discord" && c.id === "discord" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-card border border-border space-y-4"
              >
                <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                  <p className="font-medium mb-2">📝 How to get a Discord Bot Token:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to <a href="https://discord.com/developers/applications" target="_blank" className="text-primary underline">Discord Developer Portal</a></li>
                    <li>Create New Application → Bot → Reset Token</li>
                    <li>Enable "Message Content Intent" under Bot settings</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bot Token</label>
                  <input
                    type="password"
                    placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.Gh..."
                    value={config.discordToken}
                    onChange={(e) => onChange({ discordToken: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
                  />
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground text-center">
        You can add more channels later in Settings
      </p>
    </StepWrapper>
  );
}

function StepGateway({
  config,
  onComplete,
}: {
  config: any;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "starting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function startSetup() {
    setStatus("saving");
    setError(null);

    try {
      // Build config to save
      const configPatch: Record<string, any> = {};

      // AI Provider
      if (config.aiProvider === "anthropic" && config.anthropicKey) {
        configPatch["env.vars.ANTHROPIC_API_KEY"] = config.anthropicKey;
        configPatch["agents.defaults.model.primary"] = "anthropic/claude-sonnet-4-20250514";
      } else if (config.aiProvider === "openai" && config.openaiKey) {
        configPatch["env.vars.OPENAI_API_KEY"] = config.openaiKey;
        configPatch["agents.defaults.model.primary"] = "openai/gpt-4o";
      } else if (config.aiProvider === "ollama") {
        configPatch["agents.defaults.model.primary"] = "ollama/llama3.2";
      }

      // Channel
      if (config.channel === "telegram" && config.telegramToken) {
        configPatch["channels.telegram.botToken"] = config.telegramToken;
        configPatch["channels.telegram.dmPolicy"] = "pairing";
        if (config.telegramAllowFrom) {
          configPatch["channels.telegram.allowFrom"] = [config.telegramAllowFrom];
        }
      } else if (config.channel === "discord" && config.discordToken) {
        configPatch["channels.discord.token"] = config.discordToken;
      }

      // Save config
      const saveRes = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-patch", config: configPatch }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save configuration");
      }

      setStatus("starting");

      // Start gateway
      const startRes = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      const startData = await startRes.json();

      if (startData.running) {
        setStatus("done");
      } else {
        throw new Error(startData.error || "Failed to start gateway");
      }
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <StepWrapper
      title="Start OpenClaw"
      description="Save your settings and launch the gateway"
    >
      <div className="space-y-4">
        {/* Summary */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">AI Provider</span>
            <span className="font-medium capitalize">{config.aiProvider || "Not set"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Channel</span>
            <span className="font-medium capitalize">{config.channel || "Not set"}</span>
          </div>
          {config.aiProvider && !["ollama"].includes(config.aiProvider) && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">API Key</span>
              <span className="font-medium text-accent">
                {(config.anthropicKey || config.openaiKey) ? "✓ Provided" : "⚠ Missing"}
              </span>
            </div>
          )}
          {config.channel === "telegram" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bot Token</span>
              <span className="font-medium text-accent">
                {config.telegramToken ? "✓ Provided" : "⚠ Missing"}
              </span>
            </div>
          )}
        </div>

        {/* Status */}
        {status === "saving" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Saving configuration...</span>
          </div>
        )}

        {status === "starting" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Starting gateway...</span>
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/30">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span>Gateway is running!</span>
          </div>
        )}

        {status === "error" && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Setup failed</span>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={startSetup}
              className="mt-3 text-sm text-destructive underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Action Button */}
        {status === "idle" && (
          <button
            onClick={startSetup}
            disabled={!config.aiProvider || !config.channel}
            className="w-full py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Launch OpenClaw
          </button>
        )}

        {status === "done" && (
          <button
            onClick={onComplete}
            className="w-full py-4 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </StepWrapper>
  );
}

function StepComplete({ config }: { config: any }) {
  const router = useRouter();

  return (
    <StepWrapper
      title="You're all set! 🎉"
      description="OpenClaw is running and ready"
    >
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-accent/10 border border-accent/30 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="font-bold text-lg mb-2">Your AI assistant is live!</h3>
          {config.channel === "telegram" && (
            <p className="text-muted-foreground">
              Open Telegram and send a message to your bot to start chatting
            </p>
          )}
          {config.channel === "discord" && (
            <p className="text-muted-foreground">
              Invite your bot to a server and mention it to start chatting
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <h4 className="font-medium">What's next?</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Send your first message in {config.channel}</li>
            <li>• Explore the dashboard to see activity</li>
            <li>• Add more channels in Settings</li>
          </ul>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full py-4 bg-primary hover:bg-primary-hover rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          Go to Dashboard
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </StepWrapper>
  );
}

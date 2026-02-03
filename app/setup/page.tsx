"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronRight,
  ChevronLeft,
  Check,
  MessageSquare,
  Mail,
  Calendar,
  Home,
  Cpu,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Terminal,
} from "lucide-react";

type Step = "installing" | "ai" | "channels" | "integrations" | "complete";

const STEPS: Step[] = ["installing", "ai", "channels", "integrations", "complete"];

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("installing");
  const [config, setConfig] = useState({
    deployment: "local" as const,
    aiProviders: [] as string[],
    channels: [] as string[],
    integrations: [] as string[],
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
              value={config.aiProviders}
              onChange={(v) => setConfig({ ...config, aiProviders: v })}
            />
          )}
          {currentStep === "channels" && (
            <StepChannels
              key="channels"
              value={config.channels}
              onChange={(v) => setConfig({ ...config, channels: v })}
            />
          )}
          {currentStep === "integrations" && (
            <StepIntegrations
              key="integrations"
              value={config.integrations}
              onChange={(v) => setConfig({ ...config, integrations: v })}
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
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  const providers = [
    { id: "anthropic", name: "Anthropic", model: "Claude Code", logo: "🧠", installable: true },
    { id: "openai", name: "OpenAI", model: "Codex CLI", logo: "🤖", installable: true },
    { id: "google", name: "Google", model: "Gemini", logo: "✨", installable: false },
    { id: "ollama", name: "Ollama", model: "Local Models", logo: "🦙", free: true, installable: false },
  ];

  async function toggle(id: string) {
    const provider = providers.find((p) => p.id === id);
    
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }

    // If installable, install the CLI
    if (provider?.installable && !installed[id]) {
      setInstalling(id);
      try {
        const res = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "install-provider", provider: id }),
        });
        const data = await res.json();
        if (data.success) {
          setInstalled((prev) => ({ ...prev, [id]: true }));
        }
      } catch (e) {
        console.error("Install failed:", e);
      }
      setInstalling(null);
    }

    onChange([...value, id]);
  }

  return (
    <StepWrapper
      title="Choose your AI providers"
      description="Select providers. We'll install their CLI tools automatically."
    >
      <div className="grid grid-cols-2 gap-3">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            disabled={installing === p.id}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              value.includes(p.id)
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            } ${installing === p.id ? "opacity-70" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{p.logo}</span>
              <div className="flex gap-1">
                {p.free && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                    Free
                  </span>
                )}
                {installed[p.id] && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                    ✓ Installed
                  </span>
                )}
              </div>
            </div>
            <h3 className="font-semibold flex items-center gap-2">
              {p.name}
              {installing === p.id && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </h3>
            <p className="text-sm text-muted-foreground">{p.model}</p>
            {p.installable && !installed[p.id] && !value.includes(p.id) && (
              <p className="text-xs text-primary mt-1">Click to install CLI</p>
            )}
          </button>
        ))}
      </div>

      {value.includes("anthropic") && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-medium">Claude Code CLI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You'll need to authenticate with: <code className="bg-background px-1 rounded">claude auth</code>
          </p>
        </motion.div>
      )}

      {value.includes("openai") && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="font-medium">OpenAI Codex CLI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Set your API key: <code className="bg-background px-1 rounded">export OPENAI_API_KEY=sk-...</code>
          </p>
        </motion.div>
      )}

      {value.includes("ollama") && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-accent" />
            <span className="font-medium">Ollama (Local)</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Run models locally for free. Get it at <a href="https://ollama.ai" target="_blank" className="text-accent underline">ollama.ai</a>
          </p>
        </motion.div>
      )}
    </StepWrapper>
  );
}

function StepChannels({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const channels = [
    { id: "telegram", name: "Telegram", icon: "📱" },
    { id: "discord", name: "Discord", icon: "🎮" },
    { id: "slack", name: "Slack", icon: "💼" },
    { id: "sms", name: "SMS", icon: "💬" },
    { id: "web", name: "Web Chat", icon: "🌐" },
  ];

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <StepWrapper
      title="How do you want to chat?"
      description="Choose where you'll interact with your AI assistant"
    >
      <div className="grid grid-cols-2 gap-3">
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              value.includes(c.id)
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="text-2xl mb-2 block">{c.icon}</span>
            <h3 className="font-semibold">{c.name}</h3>
          </button>
        ))}
      </div>
    </StepWrapper>
  );
}

function StepIntegrations({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const integrations = [
    { id: "email", name: "Email", description: "Gmail, Outlook", icon: Mail },
    { id: "calendar", name: "Calendar", description: "Google, Apple", icon: Calendar },
    { id: "smarthome", name: "Smart Home", description: "HomeKit, Google", icon: Home },
  ];

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <StepWrapper
      title="Connect your services"
      description="Optional: Link services for a smarter assistant"
    >
      <div className="space-y-3">
        {integrations.map((i) => (
          <button
            key={i.id}
            onClick={() => toggle(i.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              value.includes(i.id)
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <i.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{i.name}</h3>
                <p className="text-sm text-muted-foreground">{i.description}</p>
              </div>
              {value.includes(i.id) && <Check className="w-5 h-5 text-primary" />}
            </div>
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted-foreground text-center">
        You can skip this and add integrations later
      </p>
    </StepWrapper>
  );
}

function StepComplete({ config }: { config: any }) {
  return (
    <StepWrapper
      title="You're all set! 🎉"
      description="OpenClaw is ready to launch"
    >
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Deployment</span>
          <span className="font-medium capitalize">{config.deployment || "Not set"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">AI Providers</span>
          <span className="font-medium">{config.aiProviders.length} selected</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Channels</span>
          <span className="font-medium">{config.channels.length} selected</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Integrations</span>
          <span className="font-medium">{config.integrations.length} selected</span>
        </div>
      </div>
    </StepWrapper>
  );
}

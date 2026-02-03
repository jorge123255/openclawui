"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bot,
  Server,
  Cloud,
  ChevronRight,
  ChevronLeft,
  Check,
  MessageSquare,
  Mail,
  Calendar,
  Home,
  Cpu,
  Sparkles,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Terminal,
} from "lucide-react";

type Step = "deployment" | "installing" | "ai" | "channels" | "integrations" | "complete";

const STEPS: Step[] = ["deployment", "installing", "ai", "channels", "integrations", "complete"];

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("deployment");
  const [config, setConfig] = useState({
    deployment: "" as "local" | "remote" | "",
    serverUrl: "",
    gatewayToken: "",
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
          {currentStep === "deployment" && (
            <StepDeployment
              key="deployment"
              value={config.deployment}
              onChange={(v) => setConfig({ ...config, deployment: v })}
              serverUrl={config.serverUrl}
              onServerUrlChange={(v) => setConfig({ ...config, serverUrl: v })}
              gatewayToken={config.gatewayToken}
              onGatewayTokenChange={(v) => setConfig({ ...config, gatewayToken: v })}
            />
          )}
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

function StepDeployment({
  value,
  onChange,
  serverUrl,
  onServerUrlChange,
  gatewayToken,
  onGatewayTokenChange,
}: {
  value: string;
  onChange: (v: "local" | "remote") => void;
  serverUrl: string;
  onServerUrlChange: (v: string) => void;
  gatewayToken: string;
  onGatewayTokenChange: (v: string) => void;
}) {
  const options = [
    {
      id: "local",
      icon: Server,
      title: "This Machine",
      description: "Run OpenClaw directly on this computer",
      recommended: true,
    },
    {
      id: "remote",
      icon: Cloud,
      title: "Remote Server",
      description: "Connect to an existing OpenClaw server",
    },
  ];

  return (
    <StepWrapper
      title="Where is OpenClaw running?"
      description="Choose where your AI assistant lives"
    >
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id as any)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              value === opt.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <opt.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{opt.title}</h3>
                  {opt.recommended && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {opt.description}
                </p>
              </div>
              {value === opt.id && (
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Remote Server Config */}
      {value === "remote" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              Server Address
            </label>
            <input
              type="text"
              placeholder="e.g., 192.168.1.82 or myserver.local"
              value={serverUrl}
              onChange={(e) => onServerUrlChange(e.target.value)}
              className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              IP address or hostname of your OpenClaw server
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Gateway Token
            </label>
            <input
              type="password"
              placeholder="Paste your gateway token"
              value={gatewayToken}
              onChange={(e) => onGatewayTokenChange(e.target.value)}
              className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
            />
            <div className="mt-3 p-3 rounded-lg bg-card border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                Run this on your server to get the token:
              </p>
              <code className="block p-2 rounded bg-background text-sm font-mono text-accent select-all">
                openclaw config get gateway.token
              </code>
            </div>
          </div>
        </motion.div>
      )}

      {/* Local Install Info */}
      {value === "local" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 p-4 rounded-xl bg-card border border-border"
        >
          <p className="text-sm text-muted-foreground mb-2">
            We'll help you install OpenClaw on this machine. Make sure you have:
          </p>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-accent" />
              Node.js 18+ installed
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-accent" />
              npm or pnpm available
            </li>
          </ul>
        </motion.div>
      )}
    </StepWrapper>
  );
}

function StepInstalling({
  deployment,
  onComplete,
}: {
  deployment: string;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<"checking" | "installing" | "done" | "error">("checking");
  const [steps, setSteps] = useState([
    { id: "node", label: "Node.js & npm", status: "pending" as "pending" | "running" | "done" | "error", message: "" },
    { id: "openclaw", label: "OpenClaw", status: "pending" as "pending" | "running" | "done" | "error", message: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deployment === "local") {
      runInstallation();
    } else {
      // Remote server - skip installation
      onComplete();
    }
  }, [deployment]);

  async function runInstallation() {
    setStatus("checking");

    // Step 1: Check Node.js
    updateStep("node", "running", "Checking Node.js...");
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-node" }),
      });
      const data = await res.json();
      
      if (data.installed) {
        updateStep("node", "done", `Found Node ${data.node}, npm ${data.npm}`);
      } else {
        updateStep("node", "error", "Node.js not installed");
        setError("Please install Node.js from https://nodejs.org first, then restart setup.");
        setStatus("error");
        return;
      }
    } catch (e) {
      updateStep("node", "error", "Could not check Node.js");
      setError("Failed to check system requirements");
      setStatus("error");
      return;
    }

    // Step 2: Install OpenClaw
    setStatus("installing");
    updateStep("openclaw", "running", "Installing OpenClaw...");
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install-openclaw" }),
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.alreadyInstalled) {
          updateStep("openclaw", "done", `Already installed (${data.version})`);
        } else {
          updateStep("openclaw", "done", "Installed successfully!");
        }
      } else {
        updateStep("openclaw", "error", data.error || "Installation failed");
        setError(data.error || "Failed to install OpenClaw");
        setStatus("error");
        return;
      }
    } catch (e) {
      updateStep("openclaw", "error", "Installation failed");
      setError("Failed to install OpenClaw");
      setStatus("error");
      return;
    }

    setStatus("done");
  }

  function updateStep(id: string, status: "pending" | "running" | "done" | "error", message: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, message } : s))
    );
  }

  return (
    <StepWrapper
      title={status === "done" ? "All Set! ✓" : "Setting Up..."}
      description={
        status === "done"
          ? "OpenClaw is installed and ready"
          : "Installing required components"
      }
    >
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              step.status === "done"
                ? "border-accent/50 bg-accent/10"
                : step.status === "error"
                ? "border-destructive/50 bg-destructive/10"
                : step.status === "running"
                ? "border-primary/50 bg-primary/10"
                : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              {step.status === "running" && (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
              {step.status === "done" && (
                <CheckCircle2 className="w-5 h-5 text-accent" />
              )}
              {step.status === "error" && (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              {step.status === "pending" && (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="font-medium">{step.label}</p>
                {step.message && (
                  <p className="text-sm text-muted-foreground">{step.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-destructive underline"
          >
            Try Again
          </button>
        </div>
      )}

      {status === "done" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <button
            onClick={onComplete}
            className="w-full py-3 bg-accent hover:bg-accent-hover rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}
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

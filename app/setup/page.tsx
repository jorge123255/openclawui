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

// Detection state for existing setup
type DetectionState = {
  checked: boolean;
  openclawInstalled: boolean;
  gatewayRunning: boolean;
  anthropicAuth: boolean;
  openaiAuth: boolean;
  ollamaRunning: boolean;
  telegramConfigured: boolean;
  discordConfigured: boolean;
};

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("installing");
  const [detection, setDetection] = useState<DetectionState>({
    checked: false,
    openclawInstalled: false,
    gatewayRunning: false,
    anthropicAuth: false,
    openaiAuth: false,
    ollamaRunning: false,
    telegramConfigured: false,
    discordConfigured: false,
  });
  const [config, setConfig] = useState({
    deployment: "local" as const,
    // AI Provider
    aiProvider: "" as "anthropic" | "openai" | "ollama" | "",
    authMethod: "oauth" as "oauth" | "apikey",
    anthropicKey: "",
    openaiKey: "",
    ollamaUrl: "http://localhost:11434",
    // Channel
    channel: "" as "telegram" | "discord" | "",
    telegramToken: "",
    telegramAllowFrom: "",
    discordToken: "",
  });

  // Auto-detect existing setup on mount
  useEffect(() => {
    async function detectSetup() {
      const results: Partial<DetectionState> = { checked: true };

      // Check OpenClaw installed
      try {
        const res = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check-openclaw" }),
        });
        const data = await res.json();
        results.openclawInstalled = data.installed;
      } catch {
        results.openclawInstalled = false;
      }

      // Check gateway running
      try {
        const res = await fetch("/api/gateway", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status" }),
        });
        const data = await res.json();
        results.gatewayRunning = data.running;
      } catch {
        results.gatewayRunning = false;
      }

      // Check Anthropic auth
      try {
        const res = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check-auth", provider: "anthropic" }),
        });
        const data = await res.json();
        results.anthropicAuth = data.authenticated;
      } catch {
        results.anthropicAuth = false;
      }

      // Check OpenAI auth
      try {
        const res = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check-auth", provider: "openai" }),
        });
        const data = await res.json();
        results.openaiAuth = data.authenticated;
      } catch {
        results.openaiAuth = false;
      }

      // Check Ollama
      try {
        await fetch("http://localhost:11434/api/tags");
        results.ollamaRunning = true;
      } catch {
        results.ollamaRunning = false;
      }

      // Check existing channel config
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
          results.telegramConfigured = !!(telegramToken && telegramToken.length > 10);
          
          // Check Discord
          const discordToken = data.config?.channels?.discord?.token;
          results.discordConfigured = !!(discordToken && discordToken.length > 10);
        }
      } catch {
        results.telegramConfigured = false;
        results.discordConfigured = false;
      }

      setDetection(results as DetectionState);

      // Auto-select provider if one is authenticated
      if (results.anthropicAuth) {
        setConfig(c => ({ ...c, aiProvider: "anthropic" }));
      } else if (results.openaiAuth) {
        setConfig(c => ({ ...c, aiProvider: "openai" }));
      } else if (results.ollamaRunning) {
        setConfig(c => ({ ...c, aiProvider: "ollama" }));
      }

      // Auto-select channel if one is configured
      if (results.telegramConfigured) {
        setConfig(c => ({ ...c, channel: "telegram" }));
      } else if (results.discordConfigured) {
        setConfig(c => ({ ...c, channel: "discord" }));
      }

      // Skip to appropriate step if already set up
      if (results.openclawInstalled && (results.anthropicAuth || results.openaiAuth || results.ollamaRunning)) {
        setCurrentStep("channels");
      } else if (results.openclawInstalled) {
        setCurrentStep("ai");
      }
    }

    detectSetup();
  }, []);

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

      {/* Detection Banner */}
      {detection.checked && (detection.openclawInstalled || detection.anthropicAuth || detection.openaiAuth || detection.ollamaRunning || detection.gatewayRunning || detection.telegramConfigured || detection.discordConfigured) && (
        <div className="mx-6 mt-4 p-4 rounded-xl bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <span className="font-medium">Existing setup detected!</span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {detection.gatewayRunning && (
              <span className="px-2 py-1 rounded-full bg-accent/20 text-accent">✓ Gateway Running</span>
            )}
            {detection.anthropicAuth && (
              <span className="px-2 py-1 rounded-full bg-accent/20 text-accent">✓ Anthropic Auth</span>
            )}
            {detection.openaiAuth && (
              <span className="px-2 py-1 rounded-full bg-accent/20 text-accent">✓ OpenAI Auth</span>
            )}
            {detection.telegramConfigured && (
              <span className="px-2 py-1 rounded-full bg-accent/20 text-accent">✓ Telegram</span>
            )}
            {detection.discordConfigured && (
              <span className="px-2 py-1 rounded-full bg-accent/20 text-accent">✓ Discord</span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {currentStep === "installing" && (
            <StepInstalling
              key="installing"
              deployment={config.deployment}
              detection={detection}
              onComplete={() => nextStep()}
            />
          )}
          {currentStep === "ai" && (
            <StepAI
              key="ai"
              config={config}
              detection={detection}
              onChange={(updates) => setConfig({ ...config, ...updates })}
            />
          )}
          {currentStep === "channels" && (
            <StepChannels
              key="channels"
              config={config}
              detection={detection}
              onChange={(updates) => setConfig({ ...config, ...updates })}
            />
          )}
          {currentStep === "gateway" && (
            <StepGateway
              key="gateway"
              config={config}
              detection={detection}
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
  detection,
  onComplete,
}: {
  deployment: string;
  detection: DetectionState;
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
    // Use detection results if available
    if (detection.checked && detection.openclawInstalled) {
      setOpenclawStatus("found");
      setOpenclawVersion("detected");
      // Also check node
      checkInstallation();
    }
  }, [detection.checked]);

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
  detection,
  onChange,
}: {
  config: any;
  detection: DetectionState;
  onChange: (updates: any) => void;
}) {
  // Initialize from detection state
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">(
    detection.ollamaRunning ? "online" : "checking"
  );
  const [authStatus, setAuthStatus] = useState<Record<string, "checking" | "authenticated" | "none">>({
    anthropic: detection.anthropicAuth ? "authenticated" : "none",
    openai: detection.openaiAuth ? "authenticated" : "none",
  });
  const [checkingAuth, setCheckingAuth] = useState(false);

  useEffect(() => {
    // Check if Ollama is running (only if not already detected)
    if (!detection.ollamaRunning) {
      fetch("http://localhost:11434/api/tags")
        .then(() => setOllamaStatus("online"))
        .catch(() => setOllamaStatus("offline"));
    }
  }, [detection.ollamaRunning]);

  // Check existing auth when provider is selected
  async function checkAuth(provider: string) {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-auth", provider }),
      });
      const data = await res.json();
      setAuthStatus(prev => ({ ...prev, [provider]: data.authenticated ? "authenticated" : "none" }));
    } catch {
      setAuthStatus(prev => ({ ...prev, [provider]: "none" }));
    }
    setCheckingAuth(false);
  }

  useEffect(() => {
    if (config.aiProvider && config.aiProvider !== "ollama") {
      checkAuth(config.aiProvider);
    }
  }, [config.aiProvider]);

  const providers = [
    { 
      id: "anthropic", 
      name: "Anthropic", 
      model: "Claude (Recommended)", 
      logo: "🧠",
      authCmd: "claude auth",
      keyPlaceholder: "sk-ant-...",
      keyLink: "https://console.anthropic.com/account/keys"
    },
    { 
      id: "openai", 
      name: "OpenAI", 
      model: "GPT-4 / GPT-5", 
      logo: "🤖",
      authCmd: "codex auth",  
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
      description="Pick a provider and authenticate"
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
                    {authStatus[p.id] === "authenticated" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        ✓ Signed In
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

            {/* Auth Options for Anthropic/OpenAI */}
            {config.aiProvider === p.id && (p.id === "anthropic" || p.id === "openai") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 space-y-3"
              >
                {/* Already authenticated */}
                {authStatus[p.id] === "authenticated" && (
                  <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                    <div className="flex items-center gap-2 text-accent">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Already signed in to {p.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your existing authentication will be used.
                    </p>
                  </div>
                )}

                {/* Auth method tabs */}
                {authStatus[p.id] !== "authenticated" && (
                  <>
                    <div className="flex rounded-lg bg-secondary p-1">
                      <button
                        onClick={() => onChange({ authMethod: "oauth" })}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                          config.authMethod === "oauth"
                            ? "bg-card shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        🔐 Sign In (Recommended)
                      </button>
                      <button
                        onClick={() => onChange({ authMethod: "apikey" })}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                          config.authMethod === "apikey"
                            ? "bg-card shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        🔑 API Key
                      </button>
                    </div>

                    {/* OAuth Tab */}
                    {config.authMethod === "oauth" && (
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <p className="text-sm text-muted-foreground mb-3">
                          Run this command in your terminal to sign in:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 rounded-lg bg-background font-mono text-sm select-all">
                            {p.authCmd}
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText(p.authCmd || "")}
                            className="px-3 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                            title="Copy"
                          >
                            📋
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            After signing in, click to verify →
                          </p>
                          <button
                            onClick={() => checkAuth(p.id)}
                            disabled={checkingAuth}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {checkingAuth ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Check Status"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* API Key Tab */}
                    {config.authMethod === "apikey" && (
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <label className="block text-sm font-medium mb-2">
                          {p.name} API Key
                        </label>
                        <input
                          type="password"
                          placeholder={p.keyPlaceholder}
                          value={p.id === "anthropic" ? config.anthropicKey : config.openaiKey}
                          onChange={(e) => onChange(
                            p.id === "anthropic" 
                              ? { anthropicKey: e.target.value }
                              : { openaiKey: e.target.value }
                          )}
                          className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors font-mono text-sm"
                        />
                        <a 
                          href={p.keyLink} 
                          target="_blank" 
                          className="text-xs text-primary hover:underline mt-2 inline-block"
                        >
                          Get your API key →
                        </a>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Ollama */}
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
  detection,
  onChange,
}: {
  config: any;
  detection: DetectionState;
  onChange: (updates: any) => void;
}) {
  const channels = [
    { 
      id: "telegram", 
      name: "Telegram", 
      icon: "📱",
      description: "Easiest to set up",
      recommended: true,
      configured: detection.telegramConfigured
    },
    { 
      id: "discord", 
      name: "Discord", 
      icon: "🎮",
      description: "Great for servers",
      configured: detection.discordConfigured
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
                    {c.recommended && !c.configured && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        Recommended
                      </span>
                    )}
                    {c.configured && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        ✓ Configured
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
            {config.channel === "telegram" && c.id === "telegram" && c.configured && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-accent/10 border border-accent/30"
              >
                <div className="flex items-center gap-2 text-accent">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Telegram is already configured</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your existing bot token will be used. You can update it in Settings later.
                </p>
              </motion.div>
            )}

            {/* Telegram Setup - New Config */}
            {config.channel === "telegram" && c.id === "telegram" && !c.configured && (
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

            {/* Discord Setup - Already Configured */}
            {config.channel === "discord" && c.id === "discord" && c.configured && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-xl bg-accent/10 border border-accent/30"
              >
                <div className="flex items-center gap-2 text-accent">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Discord is already configured</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your existing bot token will be used. You can update it in Settings later.
                </p>
              </motion.div>
            )}

            {/* Discord Setup - New Config */}
            {config.channel === "discord" && c.id === "discord" && !c.configured && (
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
  detection,
  onComplete,
}: {
  config: any;
  detection: DetectionState;
  onComplete: () => void;
}) {
  // If gateway is already running and provider is auth'd, show as already done
  const [status, setStatus] = useState<"idle" | "saving" | "starting" | "done" | "error">(
    detection.gatewayRunning ? "done" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function startSetup() {
    setStatus("saving");
    setError(null);

    try {
      // Build config to save
      const configPatch: Record<string, any> = {};

      // AI Provider - handle both OAuth and API key auth
      if (config.aiProvider === "anthropic") {
        configPatch["agents.defaults.model.primary"] = "anthropic/claude-sonnet-4-20250514";
        // Only set API key if using apikey method and key is provided
        if (config.authMethod === "apikey" && config.anthropicKey) {
          configPatch["models.providers.anthropic.apiKey"] = config.anthropicKey;
          configPatch["models.providers.anthropic.baseUrl"] = "https://api.anthropic.com";
          configPatch["models.providers.anthropic.api"] = "anthropic-messages";
        }
        // If OAuth, the existing claude auth will be used automatically
      } else if (config.aiProvider === "openai") {
        configPatch["agents.defaults.model.primary"] = "openai/gpt-4o";
        // Only set API key if using apikey method and key is provided
        if (config.authMethod === "apikey" && config.openaiKey) {
          configPatch["models.providers.openai.apiKey"] = config.openaiKey;
          configPatch["models.providers.openai.baseUrl"] = "https://api.openai.com/v1";
          configPatch["models.providers.openai.api"] = "openai-completions";
        }
        // If OAuth, the existing codex auth will be used automatically
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
          {config.aiProvider && !["ollama"].includes(config.aiProvider) && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auth Method</span>
              <span className="font-medium">
                {config.authMethod === "oauth" ? "🔐 OAuth Sign In" : "🔑 API Key"}
              </span>
            </div>
          )}
          {config.aiProvider && !["ollama"].includes(config.aiProvider) && config.authMethod === "apikey" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">API Key</span>
              <span className={`font-medium ${(config.anthropicKey || config.openaiKey) ? "text-accent" : "text-destructive"}`}>
                {(config.anthropicKey || config.openaiKey) ? "✓ Provided" : "⚠ Missing"}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Channel</span>
            <span className="font-medium capitalize">{config.channel || "Not set"}</span>
          </div>
          {config.channel === "telegram" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bot Token</span>
              <span className={`font-medium ${config.telegramToken ? "text-accent" : "text-destructive"}`}>
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

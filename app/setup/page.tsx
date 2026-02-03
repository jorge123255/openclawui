"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bot,
  Server,
  Container,
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
} from "lucide-react";

type Step = "deployment" | "ai" | "channels" | "integrations" | "complete";

const STEPS: Step[] = ["deployment", "ai", "channels", "integrations", "complete"];

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("deployment");
  const [config, setConfig] = useState({
    deployment: "" as "local" | "docker" | "remote" | "",
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
}: {
  value: string;
  onChange: (v: "local" | "docker" | "remote") => void;
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
      id: "docker",
      icon: Container,
      title: "Docker Container",
      description: "Run in an isolated Docker environment",
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
      title="Where should OpenClaw run?"
      description="Choose how you want to deploy your AI assistant"
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
  const providers = [
    { id: "anthropic", name: "Anthropic", model: "Claude", logo: "🧠" },
    { id: "openai", name: "OpenAI", model: "GPT-4", logo: "🤖" },
    { id: "google", name: "Google", model: "Gemini", logo: "✨" },
    { id: "ollama", name: "Ollama", model: "Local Models", logo: "🦙", free: true },
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
      title="Choose your AI providers"
      description="Select one or more AI providers. You can always add more later."
    >
      <div className="grid grid-cols-2 gap-3">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              value.includes(p.id)
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{p.logo}</span>
              {p.free && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                  Free
                </span>
              )}
            </div>
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.model}</p>
          </button>
        ))}
      </div>

      {value.includes("ollama") && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-accent" />
            <span className="font-medium">Ollama Detected!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            We'll help you set up local models on the next screen.
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

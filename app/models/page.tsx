"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Bot,
  Cpu,
  ChevronLeft,
  Check,
  Loader2,
  RefreshCw,
  Zap,
  Star,
  AlertCircle,
  Settings,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Search,
  Library,
  X,
} from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  size?: string;
  contextWindow?: number;
  reasoning?: boolean;
  vision?: boolean;
  active?: boolean;
}

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
  };
}

export default function ModelsPage() {
  const [loading, setLoading] = useState(true);
  const [primaryModel, setPrimaryModel] = useState<string>("");
  const [subagentModel, setSubagentModel] = useState<string>("");
  const [configuredModels, setConfiguredModels] = useState<Model[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [saving, setSaving] = useState(false);
  const [pullModel, setPullModel] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<{ status: string; percent: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"models" | "browse" | "hierarchy">("models");

  useEffect(() => {
    loadConfig();
  }, []);

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
        // Get primary model
        const primary = data.config?.agents?.defaults?.model?.primary || "";
        setPrimaryModel(primary);
        
        // Get subagent model
        const subagent = data.config?.agents?.defaults?.model?.subagent || "";
        setSubagentModel(subagent);
        
        // Get Ollama URL
        const ollama = data.config?.models?.providers?.ollama;
        if (ollama?.baseUrl) {
          const url = ollama.baseUrl.replace("/v1", "");
          setOllamaUrl(url);
          checkOllama(url);
        } else {
          checkOllama("http://localhost:11434");
        }

        // Build configured models list
        const models: Model[] = [];
        
        // Add Anthropic models if configured
        const anthropicAuth = data.config?.auth?.profiles?.["anthropic:claude-cli"];
        if (anthropicAuth) {
          models.push(
            { id: "anthropic/claude-opus-4-5", name: "Claude Opus 4.5", provider: "Anthropic", contextWindow: 200000, reasoning: true },
            { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", contextWindow: 200000 },
          );
        }

        // Add OpenAI models if configured
        const openaiAuth = data.config?.auth?.profiles?.["openai-codex:codex-cli"];
        const openaiKey = data.config?.env?.OPENAI_API_KEY;
        if (openaiAuth || openaiKey) {
          models.push(
            { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", contextWindow: 128000, vision: true },
            { id: "openai-codex/gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "OpenAI Codex", contextWindow: 200000 },
          );
        }

        // Add configured Ollama models
        const ollamaModels = data.config?.models?.providers?.ollama?.models || [];
        for (const m of ollamaModels) {
          models.push({
            id: `ollama/${m.id}`,
            name: m.name || m.id,
            provider: "Ollama",
            contextWindow: m.contextWindow,
            reasoning: m.reasoning,
            vision: m.input?.includes("image"),
          });
        }

        setConfiguredModels(models);
      }
    } catch (e) {
      console.error("Failed to load config:", e);
    }
    setLoading(false);
  }

  async function checkOllama(url: string) {
    setOllamaStatus("checking");
    try {
      const res = await fetch(`${url}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        setOllamaModels(data.models || []);
        setOllamaStatus("online");
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
    }
  }

  async function setPrimary(modelId: string) {
    setSaving(true);
    try {
      await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "config-patch",
          config: { "agents.defaults.model.primary": modelId },
          restart: true, // Restart gateway for model changes to take effect
        }),
      });
      setPrimaryModel(modelId);
    } catch (e) {
      console.error("Failed to set primary model:", e);
    }
    setSaving(false);
  }

  async function pullOllamaModel() {
    if (!pullModel.trim()) return;
    setPulling(true);
    try {
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", url: ollamaUrl, model: pullModel }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh model list
        checkOllama(ollamaUrl);
        setPullModel("");
      } else {
        alert(`Failed to pull model: ${data.error}\n\nTry manually: ollama pull ${pullModel}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}\n\nTry manually: ollama pull ${pullModel}`);
    } finally {
      setPulling(false);
    }
  }

  function formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  }

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
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Cpu className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Models</h1>
              <p className="text-sm text-muted-foreground">
                Configure your AI providers
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadConfig()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("models")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "models"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary"
          }`}
        >
          <Cpu className="w-4 h-4" />
          Installed
        </button>
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "browse"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary"
          }`}
        >
          <Library className="w-4 h-4" />
          Browse Library
        </button>
        <button
          onClick={() => setActiveTab("hierarchy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "hierarchy"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary"
          }`}
        >
          <Zap className="w-4 h-4" />
          Model Hierarchy
        </button>
      </div>

      {activeTab === "hierarchy" ? (
        <ModelHierarchy
          primaryModel={primaryModel}
          subagentModel={subagentModel}
          configuredModels={configuredModels}
          ollamaModels={ollamaModels}
          onSetPrimary={setPrimary}
          onSetSubagent={async (modelId) => {
            setSaving(true);
            try {
              await fetch("/api/gateway", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "config-patch",
                  config: { "agents.defaults.model.subagent": modelId },
                  restart: true,
                }),
              });
              setSubagentModel(modelId);
            } catch (e) {
              console.error("Failed to set subagent model:", e);
            }
            setSaving(false);
          }}
          saving={saving}
        />
      ) : activeTab === "browse" ? (
        <OllamaLibrary
          ollamaUrl={ollamaUrl}
          installedModels={ollamaModels.map(m => m.name)}
          onInstall={async (modelName) => {
            setPullingModel(modelName);
            setPullProgress({ status: "Starting...", percent: 0 });
            try {
              const res = await fetch("/api/ollama/pull", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: ollamaUrl, model: modelName }),
              });
              
              if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to start pull");
              }
              
              const reader = res.body?.getReader();
              const decoder = new TextDecoder();
              
              if (reader) {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const text = decoder.decode(value);
                  const lines = text.split("\n").filter(l => l.startsWith("data: "));
                  
                  for (const line of lines) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.error) {
                        throw new Error(data.error);
                      }
                      if (data.done) {
                        setPullProgress({ status: "Complete!", percent: 100 });
                        checkOllama(ollamaUrl);
                      } else if (data.status) {
                        let percent = 0;
                        if (data.completed && data.total) {
                          percent = Math.round((data.completed / data.total) * 100);
                        }
                        setPullProgress({ 
                          status: data.status, 
                          percent: percent || pullProgress?.percent || 0 
                        });
                      }
                    } catch {}
                  }
                }
              }
            } catch (e: any) {
              alert(`Error pulling ${modelName}: ${e.message}`);
            }
            setPullingModel(null);
            setPullProgress(null);
          }}
          pullingModel={pullingModel}
          pullProgress={pullProgress}
        />
      ) : (
        <>
      {/* Primary Model */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Primary Model</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          This model handles your main conversations
        </p>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50">
          <Zap className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">{primaryModel || "Not set"}</p>
            <p className="text-sm text-muted-foreground">
              {configuredModels.find(m => m.id === primaryModel)?.provider || "Select a model below"}
            </p>
          </div>
          {saving && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </div>
      </div>

      {/* Configured Models */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Configured Models
        </h2>
        
        {configuredModels.length === 0 ? (
          <div className="p-6 rounded-xl bg-secondary/50 text-center">
            <p className="text-muted-foreground">No models configured yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run <code className="bg-background px-1 rounded">claude auth</code> or{" "}
              <code className="bg-background px-1 rounded">codex auth</code> to add providers
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configuredModels.map((model) => (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  primaryModel === model.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPrimary(model.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{model.name}</h3>
                      {primaryModel === model.id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{model.provider}</p>
                    <div className="flex gap-2 mt-2">
                      {model.contextWindow && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                          {(model.contextWindow / 1000).toFixed(0)}K context
                        </span>
                      )}
                      {model.reasoning && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                          Reasoning
                        </span>
                      )}
                      {model.vision && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                          Vision
                        </span>
                      )}
                    </div>
                  </div>
                  {primaryModel === model.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Ollama Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🦙 Ollama Models
            {ollamaStatus === "online" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                Connected
              </span>
            )}
            {ollamaStatus === "offline" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                Offline
              </span>
            )}
            {ollamaStatus === "checking" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </h2>
          <a
            href="https://ollama.ai"
            target="_blank"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Get Ollama <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {ollamaStatus === "offline" ? (
          <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Ollama not detected</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Make sure Ollama is running at <code className="bg-background px-1 rounded">{ollamaUrl}</code>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="flex-1 px-3 py-2 bg-background rounded-lg border border-border focus:border-primary outline-none text-sm font-mono"
              />
              <button
                onClick={() => checkOllama(ollamaUrl)}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : ollamaStatus === "online" ? (
          <div className="space-y-4">
            {/* Browse Library Button */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Library className="w-5 h-5" />
                    Want to add more models?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse the Ollama library and install with one click
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Browse Library
                </button>
              </div>
            </div>

            {/* Local Models */}
            {ollamaModels.length === 0 ? (
              <div className="p-8 rounded-xl bg-secondary/50 text-center">
                <div className="text-4xl mb-3">🦙</div>
                <p className="font-medium text-lg">No models installed yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Browse the library to find and install models
                </p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
                >
                  <Library className="w-4 h-4" />
                  Browse Library
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ollamaModels.map((model) => {
                  const modelId = `ollama/${model.name}`;
                  const isPrimary = primaryModel === modelId;
                  
                  return (
                    <motion.div
                      key={model.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isPrimary
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setPrimary(modelId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{model.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(model.size)}
                            {model.details?.parameter_size && ` • ${model.details.parameter_size}`}
                          </p>
                        </div>
                        {isPrimary && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Help Section */}
      <section className="p-6 rounded-xl bg-card border border-border">
        <h3 className="font-semibold mb-3">Adding More Models</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Anthropic:</strong> Run{" "}
            <code className="bg-secondary px-1 rounded">claude auth</code> in your terminal
          </p>
          <p>
            <strong className="text-foreground">OpenAI:</strong> Run{" "}
            <code className="bg-secondary px-1 rounded">codex auth</code> in your terminal
          </p>
          <p>
            <strong className="text-foreground">Ollama:</strong> Use the{" "}
            <button 
              onClick={() => setActiveTab("browse")} 
              className="text-primary hover:underline font-medium"
            >
              Browse Library
            </button>{" "}
            tab to discover and install models with one click
          </p>
        </div>
      </section>
        </>
      )}
    </main>
  );
}

// Model Hierarchy Component
interface ModelSlot {
  role: string;
  model: string;
  description: string;
}

const DEFAULT_ROLES = [
  { role: "primary", label: "🧠 Primary", description: "Main conversations, complex reasoning", color: "primary" },
  { role: "coding", label: "💻 Coding", description: "Code generation, debugging, refactoring", color: "blue" },
  { role: "research", label: "🔍 Research", description: "Web search, document analysis, summaries", color: "green" },
  { role: "vision", label: "👁️ Vision", description: "Image analysis, screenshots, visual tasks", color: "purple" },
  { role: "fast", label: "⚡ Fast", description: "Quick tasks, retries, batch operations", color: "yellow" },
];

function ModelHierarchy({
  primaryModel,
  subagentModel,
  configuredModels,
  ollamaModels,
  onSetPrimary,
  onSetSubagent,
  saving,
}: {
  primaryModel: string;
  subagentModel: string;
  configuredModels: Model[];
  ollamaModels: OllamaModel[];
  onSetPrimary: (id: string) => void;
  onSetSubagent: (id: string) => void;
  saving: boolean;
}) {
  const [slots, setSlots] = useState<ModelSlot[]>([]);
  const [savingSlots, setSavingSlots] = useState(false);

  // Load slots from config on mount
  useEffect(() => {
    loadSlots();
  }, []);

  async function loadSlots() {
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-get" }),
      });
      const data = await res.json();
      const hierarchy = data.config?.agents?.defaults?.model?.hierarchy || [];
      if (hierarchy.length > 0) {
        setSlots(hierarchy);
      }
    } catch (e) {
      console.error("Failed to load slots:", e);
    }
  }

  async function saveSlots(newSlots: ModelSlot[]) {
    setSavingSlots(true);
    try {
      await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "config-patch",
          config: { "agents.defaults.model.hierarchy": newSlots },
          // No restart needed - hierarchy is read at subagent spawn time
        }),
      });
      setSlots(newSlots);
    } catch (e) {
      console.error("Failed to save slots:", e);
    }
    setSavingSlots(false);
  }

  function addSlot(role: string) {
    const roleInfo = DEFAULT_ROLES.find(r => r.role === role);
    const newSlot: ModelSlot = {
      role,
      model: "",
      description: roleInfo?.description || "",
    };
    saveSlots([...slots, newSlot]);
  }

  function updateSlot(index: number, model: string) {
    const newSlots = [...slots];
    newSlots[index].model = model;
    saveSlots(newSlots);
  }

  function removeSlot(index: number) {
    const newSlots = slots.filter((_, i) => i !== index);
    saveSlots(newSlots);
  }

  // Combine all available models
  const allModels = [
    ...configuredModels,
    ...ollamaModels.map(m => ({
      id: `ollama/${m.name}`,
      name: m.name,
      provider: "Ollama",
    })),
  ];

  const usedRoles = slots.map(s => s.role);
  const availableRoles = DEFAULT_ROLES.filter(r => !usedRoles.includes(r.role) && r.role !== "primary");

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="p-6 rounded-xl bg-card border border-border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Model Hierarchy
        </h3>
        <p className="text-sm text-muted-foreground">
          Assign different models to different roles. The system will automatically pick the right model based on the task type.
          Add as many specialized models as you need!
        </p>
      </div>

      {/* Primary Model - Always shown */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              🧠 Primary Model
            </h3>
            <p className="text-sm text-muted-foreground">Main conversations, complex reasoning, final decisions</p>
          </div>
          {saving && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </div>
        
        <select
          value={primaryModel}
          onChange={(e) => onSetPrimary(e.target.value)}
          className="w-full px-4 py-3 bg-card rounded-xl border border-border focus:border-primary outline-none"
        >
          <option value="">Select primary model...</option>
          {allModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic Model Slots */}
      {slots.map((slot, index) => {
        const roleInfo = DEFAULT_ROLES.find(r => r.role === slot.role);
        return (
          <motion.div
            key={`${slot.role}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{roleInfo?.label || slot.role}</h3>
                <p className="text-sm text-muted-foreground">{slot.description || roleInfo?.description}</p>
              </div>
              <button
                onClick={() => removeSlot(index)}
                className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <select
              value={slot.model}
              onChange={(e) => updateSlot(index, e.target.value)}
              className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none"
            >
              <option value="">Use primary model</option>
              {allModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </motion.div>
        );
      })}

      {/* Add New Slot */}
      {availableRoles.length > 0 && (
        <div className="p-6 rounded-xl border-2 border-dashed border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Model Role
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableRoles.map((role) => (
              <button
                key={role.role}
                onClick={() => addSlot(role.role)}
                disabled={savingSlots}
                className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Presets */}
      <div className="p-6 rounded-xl bg-secondary/30 border border-border">
        <h3 className="font-semibold mb-3">🚀 Quick Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => {
              onSetPrimary("anthropic/claude-opus-4-5");
              saveSlots([
                { role: "coding", model: "openai-codex/gpt-5.2-codex", description: "Code tasks" },
                { role: "fast", model: "ollama/qwen3:8b", description: "Quick tasks" },
              ]);
            }}
            className="p-4 rounded-xl bg-card hover:bg-card/80 border border-border text-left transition-colors"
          >
            <p className="font-medium">💰 Cost Optimized</p>
            <p className="text-xs text-muted-foreground mt-1">
              Opus for thinking, Codex for code, Ollama for grunt work
            </p>
          </button>
          
          <button
            onClick={() => {
              onSetPrimary("anthropic/claude-sonnet-4-20250514");
              saveSlots([
                { role: "fast", model: "ollama/llama3.2:3b", description: "Quick tasks" },
              ]);
            }}
            className="p-4 rounded-xl bg-card hover:bg-card/80 border border-border text-left transition-colors"
          >
            <p className="font-medium">⚡ Speed Optimized</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sonnet for most tasks, fast local model for simple stuff
            </p>
          </button>
          
          <button
            onClick={() => {
              onSetPrimary("ollama/qwen3:32b");
              saveSlots([
                { role: "coding", model: "ollama/qwen2.5-coder:32b-instruct-q8_0", description: "Code tasks" },
                { role: "vision", model: "ollama/qwen2.5vl:32b-q4_K_M", description: "Vision tasks" },
                { role: "fast", model: "ollama/llama3.2:3b", description: "Quick tasks" },
              ]);
            }}
            className="p-4 rounded-xl bg-card hover:bg-card/80 border border-border text-left transition-colors"
          >
            <p className="font-medium">🏠 All Local (Free)</p>
            <p className="text-xs text-muted-foreground mt-1">
              100% Ollama - no API costs, full privacy
            </p>
          </button>
          
          <button
            onClick={() => {
              saveSlots([]);
            }}
            className="p-4 rounded-xl bg-card hover:bg-card/80 border border-border text-left transition-colors"
          >
            <p className="font-medium">🎯 Simple (Primary Only)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Just use primary model for everything
            </p>
          </button>
        </div>
      </div>

      {/* Current Configuration Summary */}
      <div className="p-6 rounded-xl bg-card border border-border">
        <h3 className="font-semibold mb-4">Current Configuration</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <span className="text-muted-foreground">🧠 Primary</span>
            <span className="font-mono text-xs">{primaryModel || "Not set"}</span>
          </div>
          {slots.map((slot, i) => {
            const roleInfo = DEFAULT_ROLES.find(r => r.role === slot.role);
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">{roleInfo?.label || slot.role}</span>
                <span className="font-mono text-xs">{slot.model || "(uses primary)"}</span>
              </div>
            );
          })}
          {slots.length === 0 && (
            <p className="text-center text-muted-foreground py-2">No additional roles configured</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Ollama Library Browser Component
interface LibraryModel {
  name: string;
  description: string;
  size: string;
  pulls: string;
  tags: string[];
  updated: string;
  capabilities: string[];
}

interface LibraryCategory {
  id: string;
  name: string;
  emoji: string;
}

function OllamaLibrary({
  ollamaUrl,
  installedModels,
  onInstall,
  pullingModel,
  pullProgress,
}: {
  ollamaUrl: string;
  installedModels: string[];
  onInstall: (modelName: string) => void;
  pullingModel: string | null;
  pullProgress: { status: string; percent: number } | null;
}) {
  const [models, setModels] = useState<LibraryModel[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, [selectedCategory]);

  async function loadLibrary() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      
      const res = await fetch(`/api/ollama/library?${params}`);
      const data = await res.json();
      setModels(data.models || []);
      setCategories(data.categories || []);
    } catch (e) {
      console.error("Failed to load library:", e);
    }
    setLoading(false);
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadLibrary();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function isInstalled(modelName: string): boolean {
    // Check if any installed model matches (with or without tag)
    return installedModels.some(m => 
      m === modelName || 
      m.startsWith(modelName + ":") ||
      modelName.startsWith(m.split(":")[0])
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No models found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => {
            const installed = isInstalled(model.name);
            const isPulling = pullingModel === model.name;
            
            return (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  installed
                    ? "border-accent/50 bg-accent/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate flex items-center gap-2">
                      🦙 {model.name}
                      {installed && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                          Installed
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {model.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-3 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                    {model.size}
                  </span>
                  {model.capabilities.includes("vision") && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                      👁️ Vision
                    </span>
                  )}
                  {model.capabilities.includes("code") && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      💻 Code
                    </span>
                  )}
                  {model.capabilities.includes("reasoning") && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                      🤔 Reasoning
                    </span>
                  )}
                  {model.capabilities.includes("embedding") && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      📊 Embedding
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {model.pulls} pulls
                  </span>
                  
                  {installed ? (
                    <span className="flex items-center gap-1 text-sm text-accent">
                      <Check className="w-4 h-4" />
                      Ready
                    </span>
                  ) : isPulling ? (
                    <div className="flex-1 ml-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground truncate max-w-[150px]">
                          {pullProgress?.status || "Starting..."}
                        </span>
                        <span className="text-primary font-medium">
                          {pullProgress?.percent || 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${pullProgress?.percent || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onInstall(model.name)}
                      disabled={!!pullingModel}
                      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Install
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      <div className="p-4 rounded-xl bg-secondary/30 text-sm text-muted-foreground">
        <p>
          💡 Models are pulled from your Ollama server at <code className="bg-background px-1 rounded">{ollamaUrl}</code>.
          Large models may take several minutes to download.
        </p>
      </div>
    </div>
  );
}

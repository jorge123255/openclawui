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
  const [configuredModels, setConfiguredModels] = useState<Model[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [saving, setSaving] = useState(false);
  const [pullModel, setPullModel] = useState("");
  const [pulling, setPulling] = useState(false);

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
            {/* Pull Model */}
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pullModel}
                  onChange={(e) => setPullModel(e.target.value)}
                  placeholder="Model name (e.g., llama3.2, qwen2.5-coder:32b)"
                  className="flex-1 px-3 py-2 bg-background rounded-lg border border-border focus:border-primary outline-none text-sm"
                />
                <button
                  onClick={pullOllamaModel}
                  disabled={pulling || !pullModel.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                >
                  {pulling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Pull Model
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Browse models at{" "}
                <a href="https://ollama.ai/library" target="_blank" className="text-primary hover:underline">
                  ollama.ai/library
                </a>
              </p>
            </div>

            {/* Local Models */}
            {ollamaModels.length === 0 ? (
              <div className="p-6 rounded-xl bg-secondary/50 text-center">
                <p className="text-muted-foreground">No models installed yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pull a model above to get started
                </p>
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
            <strong className="text-foreground">Ollama:</strong> Install from{" "}
            <a href="https://ollama.ai" target="_blank" className="text-primary hover:underline">
              ollama.ai
            </a>{" "}
            then run <code className="bg-secondary px-1 rounded">ollama pull &lt;model&gt;</code>
          </p>
        </div>
      </section>
    </main>
  );
}

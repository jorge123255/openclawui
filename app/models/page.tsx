"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  Zap,
  Download,
  Trash2,
  Play,
  Search,
  RefreshCw,
  ChevronDown,
  GripVertical,
  ExternalLink,
  Check,
  Loader2,
} from "lucide-react";

interface HardwareInfo {
  gpu: string;
  vram: string;
  ram: string;
  cpu: string;
}

interface LocalModel {
  name: string;
  size: string;
  modified: string;
  digest: string;
}

interface OllamaModel {
  name: string;
  description: string;
  size: string;
  tags: string[];
  pulls: string;
}

export default function ModelsPage() {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [searchQuery, setSearchQuery] = useState("");
  const [pulling, setPulling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"installed" | "browse">("installed");

  useEffect(() => {
    detectHardware();
    checkOllama();
  }, []);

  async function detectHardware() {
    // In a real implementation, this would call a backend API
    // that runs system commands to detect hardware
    setHardware({
      gpu: "NVIDIA RTX 3090",
      vram: "24 GB",
      ram: "64 GB",
      cpu: "AMD Ryzen 9 5900X",
    });
  }

  async function checkOllama() {
    try {
      const res = await fetch("/api/ollama/api/tags");
      if (res.ok) {
        const data = await res.json();
        setLocalModels(data.models || []);
        setOllamaStatus("online");
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
    }
    setLoading(false);
  }

  async function pullModel(modelName: string) {
    setPulling(modelName);
    try {
      // In real implementation, this would stream the pull progress
      await fetch("/api/ollama/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });
      // Refresh models list
      await checkOllama();
    } catch (error) {
      console.error("Failed to pull model:", error);
    }
    setPulling(null);
  }

  async function deleteModel(modelName: string) {
    if (!confirm(`Delete ${modelName}?`)) return;
    try {
      await fetch("/api/ollama/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modelName }),
      });
      await checkOllama();
    } catch (error) {
      console.error("Failed to delete model:", error);
    }
  }

  // Popular models for browsing
  const popularModels: OllamaModel[] = [
    { name: "llama3.2:3b", description: "Fast & efficient", size: "2.0 GB", tags: ["fast", "chat"], pulls: "1.2M" },
    { name: "llama3.1:8b", description: "Great all-rounder", size: "4.7 GB", tags: ["balanced"], pulls: "890K" },
    { name: "qwen3:8b", description: "Strong reasoning", size: "4.9 GB", tags: ["reasoning", "tools"], pulls: "450K" },
    { name: "qwen2.5-coder:7b", description: "Coding specialist", size: "4.4 GB", tags: ["code"], pulls: "320K" },
    { name: "deepseek-r1:14b", description: "Deep reasoning", size: "8.9 GB", tags: ["reasoning"], pulls: "180K" },
    { name: "gemma2:9b", description: "Google's Gemma", size: "5.4 GB", tags: ["chat"], pulls: "150K" },
    { name: "mistral:7b", description: "Fast & capable", size: "4.1 GB", tags: ["chat"], pulls: "980K" },
    { name: "codellama:13b", description: "Code generation", size: "7.4 GB", tags: ["code"], pulls: "420K" },
  ];

  const filteredModels = popularModels.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">AI Models</h1>
          <p className="text-sm text-muted-foreground">
            Manage your local and cloud AI models
          </p>
        </div>
      </header>

      {/* Hardware Info */}
      {hardware && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Your Hardware
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HardwareStat icon={Zap} label="GPU" value={hardware.gpu} />
            <HardwareStat icon={HardDrive} label="VRAM" value={hardware.vram} highlight />
            <HardwareStat icon={HardDrive} label="RAM" value={hardware.ram} />
            <HardwareStat icon={Cpu} label="CPU" value={hardware.cpu} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            💡 With {hardware.vram} VRAM, you can run models up to ~20B parameters smoothly
          </p>
        </motion.div>
      )}

      {/* Ollama Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦙</span>
          <div>
            <h2 className="font-semibold">Ollama</h2>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  ollamaStatus === "online"
                    ? "bg-accent"
                    : ollamaStatus === "offline"
                    ? "bg-destructive"
                    : "bg-yellow-500 animate-pulse"
                }`}
              />
              <span className="text-muted-foreground capitalize">{ollamaStatus}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkOllama}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <a
            href="https://ollama.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary-hover rounded-lg text-sm transition-colors"
          >
            Get Ollama
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("installed")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "installed"
              ? "bg-primary text-white"
              : "bg-secondary hover:bg-secondary-hover"
          }`}
        >
          Installed ({localModels.length})
        </button>
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "browse"
              ? "bg-primary text-white"
              : "bg-secondary hover:bg-secondary-hover"
          }`}
        >
          Browse Models
        </button>
      </div>

      {activeTab === "installed" ? (
        /* Installed Models */
        <div className="space-y-3">
          {localModels.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-muted-foreground mb-4">No models installed yet</p>
              <button
                onClick={() => setActiveTab("browse")}
                className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              >
                Browse Models
              </button>
            </div>
          ) : (
            localModels.map((model) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <div className="cursor-grab">
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{model.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {model.size} • Modified {model.modified}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-accent/20 text-accent transition-colors">
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteModel(model.name)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* Browse Models */
        <div>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* Model Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModels.map((model) => {
              const isInstalled = localModels.some((m) => m.name === model.name);
              const isPulling = pulling === model.name;

              return (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{model.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {model.description}
                      </p>
                    </div>
                    {isInstalled && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/20 text-accent">
                        <Check className="w-3 h-3" />
                        Installed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {model.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-full bg-secondary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {model.size} • {model.pulls} pulls
                    </div>
                    {!isInstalled && (
                      <button
                        onClick={() => pullModel(model.name)}
                        disabled={isPulling}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        {isPulling ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Pulling...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Pull
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <a
              href="https://ollama.ai/library"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse all models on ollama.ai →
            </a>
          </div>
        </div>
      )}

      {/* AI Priority Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          AI Priority Order
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Drag to reorder. Higher priority models are used first.
        </p>

        <div className="glass rounded-2xl p-4 space-y-2">
          <PriorityItem rank={1} name="Claude Opus" provider="Anthropic" active />
          <PriorityItem rank={2} name="GPT-4" provider="OpenAI" />
          <PriorityItem rank={3} name="qwen3:8b" provider="Ollama (Local)" />
        </div>
      </div>
    </main>
  );
}

function HardwareStat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl ${
        highlight ? "bg-primary/20 border border-primary/30" : "bg-secondary"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="font-semibold truncate">{value}</p>
    </div>
  );
}

function PriorityItem({
  rank,
  name,
  provider,
  active,
}: {
  rank: number;
  name: string;
  provider: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl ${
        active ? "bg-primary/10 border border-primary/30" : "bg-background"
      }`}
    >
      <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
        {rank}
      </span>
      <div className="flex-1">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{provider}</p>
      </div>
      {active && <Zap className="w-4 h-4 text-primary" />}
    </div>
  );
}

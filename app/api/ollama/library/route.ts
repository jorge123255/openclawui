import { NextResponse } from "next/server";

// Cache the library for 1 hour
let libraryCache: { models: OllamaLibraryModel[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface OllamaLibraryModel {
  name: string;
  description: string;
  size: string;
  pulls: string;
  tags: string[];
  updated: string;
  capabilities: string[];
}

// Popular/featured models with metadata (curated list)
const FEATURED_MODELS: OllamaLibraryModel[] = [
  // General Purpose
  { name: "llama3.2", description: "Meta's latest Llama model, great all-rounder", size: "2GB", pulls: "50M+", tags: ["general", "fast"], updated: "2025-01", capabilities: ["chat"] },
  { name: "llama3.1:8b", description: "Llama 3.1 8B - balanced performance", size: "4.7GB", pulls: "30M+", tags: ["general"], updated: "2024-07", capabilities: ["chat"] },
  { name: "llama3.1:70b", description: "Llama 3.1 70B - near GPT-4 performance", size: "40GB", pulls: "5M+", tags: ["general", "powerful"], updated: "2024-07", capabilities: ["chat"] },
  { name: "qwen3:8b", description: "Alibaba's Qwen3 - excellent for tool use", size: "4.9GB", pulls: "10M+", tags: ["general", "tools"], updated: "2025-01", capabilities: ["chat", "tools"] },
  { name: "qwen3:32b", description: "Qwen3 32B - powerful reasoning", size: "19GB", pulls: "2M+", tags: ["general", "powerful"], updated: "2025-01", capabilities: ["chat", "tools"] },
  { name: "gemma2:9b", description: "Google's Gemma 2 - efficient and capable", size: "5.5GB", pulls: "8M+", tags: ["general"], updated: "2024-06", capabilities: ["chat"] },
  { name: "gemma2:27b", description: "Gemma 2 27B - stronger reasoning", size: "16GB", pulls: "3M+", tags: ["general", "powerful"], updated: "2024-06", capabilities: ["chat"] },
  { name: "mistral", description: "Mistral 7B - fast and efficient", size: "4.1GB", pulls: "20M+", tags: ["general", "fast"], updated: "2024-03", capabilities: ["chat"] },
  { name: "mixtral:8x7b", description: "Mixtral MoE - expert mixture model", size: "26GB", pulls: "5M+", tags: ["general", "powerful"], updated: "2024-01", capabilities: ["chat"] },
  { name: "phi4", description: "Microsoft Phi-4 - small but mighty", size: "8.4GB", pulls: "3M+", tags: ["general", "efficient"], updated: "2024-12", capabilities: ["chat"] },
  
  // Coding
  { name: "qwen2.5-coder:7b", description: "Qwen Coder 7B - fast code completion", size: "4.7GB", pulls: "5M+", tags: ["coding", "fast"], updated: "2024-11", capabilities: ["code"] },
  { name: "qwen2.5-coder:32b", description: "Qwen Coder 32B - powerful code generation", size: "19GB", pulls: "2M+", tags: ["coding", "powerful"], updated: "2024-11", capabilities: ["code"] },
  { name: "codellama:7b", description: "Meta's Code Llama 7B", size: "3.8GB", pulls: "10M+", tags: ["coding"], updated: "2024-01", capabilities: ["code"] },
  { name: "codellama:34b", description: "Code Llama 34B - advanced coding", size: "19GB", pulls: "2M+", tags: ["coding", "powerful"], updated: "2024-01", capabilities: ["code"] },
  { name: "deepseek-coder-v2:16b", description: "DeepSeek Coder v2 - competitive with GPT-4", size: "9GB", pulls: "3M+", tags: ["coding", "powerful"], updated: "2024-06", capabilities: ["code"] },
  { name: "starcoder2:7b", description: "BigCode StarCoder2 - trained on code", size: "4GB", pulls: "2M+", tags: ["coding"], updated: "2024-02", capabilities: ["code"] },
  
  // Vision
  { name: "llava:7b", description: "LLaVA - vision + language", size: "4.5GB", pulls: "5M+", tags: ["vision"], updated: "2024-03", capabilities: ["chat", "vision"] },
  { name: "llava:13b", description: "LLaVA 13B - better vision understanding", size: "8GB", pulls: "2M+", tags: ["vision"], updated: "2024-03", capabilities: ["chat", "vision"] },
  { name: "qwen2.5vl:7b", description: "Qwen Vision 7B - fast image analysis", size: "5GB", pulls: "1M+", tags: ["vision", "fast"], updated: "2024-11", capabilities: ["chat", "vision"] },
  { name: "qwen2.5vl:32b", description: "Qwen Vision 32B - detailed analysis", size: "19GB", pulls: "500K+", tags: ["vision", "powerful"], updated: "2024-11", capabilities: ["chat", "vision"] },
  { name: "bakllava", description: "BakLLaVA - efficient vision model", size: "4.1GB", pulls: "1M+", tags: ["vision"], updated: "2024-02", capabilities: ["chat", "vision"] },
  
  // Reasoning
  { name: "deepseek-r1:7b", description: "DeepSeek R1 7B - reasoning focused", size: "4.7GB", pulls: "2M+", tags: ["reasoning"], updated: "2025-01", capabilities: ["chat", "reasoning"] },
  { name: "deepseek-r1:70b", description: "DeepSeek R1 70B - powerful reasoning", size: "42GB", pulls: "500K+", tags: ["reasoning", "powerful"], updated: "2025-01", capabilities: ["chat", "reasoning"] },
  { name: "qwq:32b", description: "Qwen QwQ - thinking/reasoning model", size: "19GB", pulls: "1M+", tags: ["reasoning"], updated: "2024-12", capabilities: ["chat", "reasoning"] },
  
  // Embedding
  { name: "nomic-embed-text", description: "Nomic embeddings - 8K context", size: "274MB", pulls: "5M+", tags: ["embedding"], updated: "2024-03", capabilities: ["embedding"] },
  { name: "mxbai-embed-large", description: "MixedBread embeddings - high quality", size: "670MB", pulls: "2M+", tags: ["embedding"], updated: "2024-04", capabilities: ["embedding"] },
  { name: "all-minilm", description: "Sentence transformers - fast embeddings", size: "45MB", pulls: "3M+", tags: ["embedding", "fast"], updated: "2024-01", capabilities: ["embedding"] },
  
  // Small/Fast
  { name: "tinyllama", description: "TinyLlama 1.1B - extremely fast", size: "637MB", pulls: "5M+", tags: ["tiny", "fast"], updated: "2024-01", capabilities: ["chat"] },
  { name: "phi3:mini", description: "Phi-3 Mini - small but capable", size: "2.2GB", pulls: "3M+", tags: ["small", "fast"], updated: "2024-04", capabilities: ["chat"] },
  { name: "qwen2:0.5b", description: "Qwen2 0.5B - ultra light", size: "352MB", pulls: "2M+", tags: ["tiny", "fast"], updated: "2024-06", capabilities: ["chat"] },
  
  // Uncensored/Roleplay
  { name: "dolphin-mixtral:8x7b", description: "Dolphin Mixtral - uncensored", size: "26GB", pulls: "2M+", tags: ["uncensored"], updated: "2024-02", capabilities: ["chat"] },
  { name: "openhermes", description: "OpenHermes - helpful assistant", size: "4.1GB", pulls: "3M+", tags: ["assistant"], updated: "2024-01", capabilities: ["chat"] },
  { name: "neural-chat", description: "Intel Neural Chat - conversational", size: "4.1GB", pulls: "2M+", tags: ["chat"], updated: "2024-01", capabilities: ["chat"] },
];

// Categories for filtering
const MODEL_CATEGORIES = [
  { id: "all", name: "All Models", emoji: "📦" },
  { id: "general", name: "General Purpose", emoji: "🧠" },
  { id: "coding", name: "Coding", emoji: "💻" },
  { id: "vision", name: "Vision", emoji: "👁️" },
  { id: "reasoning", name: "Reasoning", emoji: "🤔" },
  { id: "embedding", name: "Embedding", emoji: "📊" },
  { id: "fast", name: "Fast/Small", emoji: "⚡" },
  { id: "powerful", name: "Powerful", emoji: "💪" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";
  const search = searchParams.get("search")?.toLowerCase() || "";

  // Use curated list (API doesn't provide good metadata)
  let models = FEATURED_MODELS;

  // Filter by category
  if (category && category !== "all") {
    models = models.filter(m => m.tags.includes(category));
  }

  // Filter by search
  if (search) {
    models = models.filter(m => 
      m.name.toLowerCase().includes(search) ||
      m.description.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({
    models,
    categories: MODEL_CATEGORIES,
    total: FEATURED_MODELS.length,
  });
}

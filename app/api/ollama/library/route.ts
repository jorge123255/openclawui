import { NextResponse } from "next/server";

// Cache the library
let libraryCache: { models: OllamaLibraryModel[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface OllamaLibraryModel {
  name: string;
  description: string;
  size: string;
  pulls?: string;
  tags: string[];
  capabilities: string[];
}

// Curated descriptions for popular models
const MODEL_DESCRIPTIONS: Record<string, { description: string; tags: string[]; capabilities: string[] }> = {
  // General Purpose
  "llama3.2": { description: "Meta's Llama 3.2 - fast and efficient, great all-rounder", tags: ["general", "fast"], capabilities: ["chat"] },
  "llama3.1": { description: "Meta's Llama 3.1 - balanced performance and quality", tags: ["general"], capabilities: ["chat"] },
  "llama3": { description: "Meta's Llama 3 - solid general purpose model", tags: ["general"], capabilities: ["chat"] },
  "llama2": { description: "Meta's Llama 2 - classic reliable model", tags: ["general"], capabilities: ["chat"] },
  "qwen3": { description: "Alibaba Qwen3 - excellent for tool use and reasoning", tags: ["general", "tools"], capabilities: ["chat", "tools"] },
  "qwen2.5": { description: "Alibaba Qwen 2.5 - strong multilingual support", tags: ["general"], capabilities: ["chat"] },
  "qwen2": { description: "Alibaba Qwen 2 - efficient and capable", tags: ["general"], capabilities: ["chat"] },
  "qwen": { description: "Alibaba Qwen - versatile assistant model", tags: ["general"], capabilities: ["chat"] },
  "gemma2": { description: "Google Gemma 2 - efficient and high quality", tags: ["general"], capabilities: ["chat"] },
  "gemma": { description: "Google Gemma - lightweight and fast", tags: ["general", "fast"], capabilities: ["chat"] },
  "mistral": { description: "Mistral AI 7B - fast and efficient", tags: ["general", "fast"], capabilities: ["chat"] },
  "mixtral": { description: "Mistral Mixtral MoE - mixture of experts model", tags: ["general", "powerful"], capabilities: ["chat"] },
  "phi4": { description: "Microsoft Phi-4 - small but mighty", tags: ["general", "fast"], capabilities: ["chat"] },
  "phi3": { description: "Microsoft Phi-3 - efficient reasoning", tags: ["general", "fast"], capabilities: ["chat"] },
  "phi": { description: "Microsoft Phi - compact and capable", tags: ["general", "fast"], capabilities: ["chat"] },
  "aya": { description: "Cohere Aya - multilingual model", tags: ["general", "multilingual"], capabilities: ["chat"] },
  "command-r": { description: "Cohere Command-R - retrieval augmented generation", tags: ["general", "rag"], capabilities: ["chat"] },
  "vicuna": { description: "LMSYS Vicuna - fine-tuned on conversations", tags: ["general"], capabilities: ["chat"] },
  "nous-hermes": { description: "Nous Hermes - helpful and detailed", tags: ["general"], capabilities: ["chat"] },
  "openhermes": { description: "OpenHermes - helpful assistant", tags: ["general"], capabilities: ["chat"] },
  "neural-chat": { description: "Intel Neural Chat - conversational model", tags: ["general"], capabilities: ["chat"] },
  "zephyr": { description: "HuggingFace Zephyr - helpful and harmless", tags: ["general"], capabilities: ["chat"] },
  "yi": { description: "01.AI Yi - strong Chinese and English", tags: ["general", "multilingual"], capabilities: ["chat"] },
  "solar": { description: "Upstage Solar - Korean-optimized model", tags: ["general", "multilingual"], capabilities: ["chat"] },
  "granite": { description: "IBM Granite - enterprise-focused", tags: ["general"], capabilities: ["chat"] },
  "falcon": { description: "TII Falcon - trained on refined web data", tags: ["general"], capabilities: ["chat"] },
  
  // Coding
  "qwen2.5-coder": { description: "Qwen Coder - excellent code generation", tags: ["coding"], capabilities: ["code"] },
  "codellama": { description: "Meta Code Llama - trained on code", tags: ["coding"], capabilities: ["code"] },
  "deepseek-coder": { description: "DeepSeek Coder - competitive with GPT-4 for code", tags: ["coding", "powerful"], capabilities: ["code"] },
  "deepseek-coder-v2": { description: "DeepSeek Coder v2 - improved code generation", tags: ["coding", "powerful"], capabilities: ["code"] },
  "starcoder": { description: "BigCode StarCoder - multi-language code", tags: ["coding"], capabilities: ["code"] },
  "starcoder2": { description: "BigCode StarCoder2 - improved code model", tags: ["coding"], capabilities: ["code"] },
  "codegemma": { description: "Google CodeGemma - code-focused Gemma", tags: ["coding"], capabilities: ["code"] },
  "magicoder": { description: "MagiCoder - OSS-instruct trained", tags: ["coding"], capabilities: ["code"] },
  "codebooga": { description: "CodeBooga - code generation model", tags: ["coding"], capabilities: ["code"] },
  "phind-codellama": { description: "Phind CodeLlama - fine-tuned for coding", tags: ["coding"], capabilities: ["code"] },
  "wizardcoder": { description: "WizardCoder - instruction-tuned coder", tags: ["coding"], capabilities: ["code"] },
  "sqlcoder": { description: "Defog SQLCoder - SQL generation specialist", tags: ["coding"], capabilities: ["code"] },
  "codeqwen": { description: "CodeQwen - Qwen for code", tags: ["coding"], capabilities: ["code"] },
  "stable-code": { description: "Stability AI Stable Code - code completion", tags: ["coding"], capabilities: ["code"] },
  
  // Vision
  "llava": { description: "LLaVA - vision + language understanding", tags: ["vision"], capabilities: ["chat", "vision"] },
  "llava-llama3": { description: "LLaVA with Llama 3 - improved vision", tags: ["vision"], capabilities: ["chat", "vision"] },
  "llava-phi3": { description: "LLaVA with Phi-3 - efficient vision", tags: ["vision", "fast"], capabilities: ["chat", "vision"] },
  "bakllava": { description: "BakLLaVA - efficient vision model", tags: ["vision"], capabilities: ["chat", "vision"] },
  "moondream": { description: "Moondream - tiny vision model", tags: ["vision", "fast"], capabilities: ["chat", "vision"] },
  "minicpm-v": { description: "MiniCPM-V - compact vision model", tags: ["vision", "fast"], capabilities: ["chat", "vision"] },
  "qwen2-vl": { description: "Qwen2-VL - vision-language model", tags: ["vision"], capabilities: ["chat", "vision"] },
  "qwen2.5-vl": { description: "Qwen 2.5 Vision - detailed image analysis", tags: ["vision"], capabilities: ["chat", "vision"] },
  "llama3.2-vision": { description: "Llama 3.2 Vision - multimodal Llama", tags: ["vision"], capabilities: ["chat", "vision"] },
  "internvl2": { description: "InternVL2 - strong vision understanding", tags: ["vision"], capabilities: ["chat", "vision"] },
  
  // Reasoning
  "deepseek-r1": { description: "DeepSeek R1 - reasoning focused model", tags: ["reasoning"], capabilities: ["chat", "reasoning"] },
  "qwq": { description: "Qwen QwQ - thinking/reasoning model", tags: ["reasoning"], capabilities: ["chat", "reasoning"] },
  "marco-o1": { description: "Marco-O1 - chain of thought reasoning", tags: ["reasoning"], capabilities: ["chat", "reasoning"] },
  "exaone": { description: "LG ExaOne - Korean reasoning model", tags: ["reasoning"], capabilities: ["chat", "reasoning"] },
  
  // Embedding
  "nomic-embed-text": { description: "Nomic embeddings - 8K context, high quality", tags: ["embedding"], capabilities: ["embedding"] },
  "mxbai-embed-large": { description: "MixedBread embeddings - excellent retrieval", tags: ["embedding"], capabilities: ["embedding"] },
  "all-minilm": { description: "Sentence transformers - fast embeddings", tags: ["embedding", "fast"], capabilities: ["embedding"] },
  "snowflake-arctic-embed": { description: "Snowflake Arctic - retrieval optimized", tags: ["embedding"], capabilities: ["embedding"] },
  "bge-m3": { description: "BGE-M3 - multilingual embeddings", tags: ["embedding", "multilingual"], capabilities: ["embedding"] },
  "bge-large": { description: "BGE Large - high quality embeddings", tags: ["embedding"], capabilities: ["embedding"] },
  "paraphrase-multilingual": { description: "Paraphrase - multilingual sentence embeddings", tags: ["embedding", "multilingual"], capabilities: ["embedding"] },
  
  // Small/Tiny
  "tinyllama": { description: "TinyLlama 1.1B - extremely fast and tiny", tags: ["tiny", "fast"], capabilities: ["chat"] },
  "tinydolphin": { description: "TinyDolphin - small helpful model", tags: ["tiny", "fast"], capabilities: ["chat"] },
  "stablelm2": { description: "StableLM 2 - stable and small", tags: ["small", "fast"], capabilities: ["chat"] },
  "stablelm-zephyr": { description: "StableLM Zephyr - small chat model", tags: ["small", "fast"], capabilities: ["chat"] },
  
  // Uncensored/Creative
  "dolphin-mixtral": { description: "Dolphin Mixtral - uncensored MoE", tags: ["uncensored"], capabilities: ["chat"] },
  "dolphin-llama3": { description: "Dolphin Llama 3 - uncensored assistant", tags: ["uncensored"], capabilities: ["chat"] },
  "dolphin-phi": { description: "Dolphin Phi - small uncensored model", tags: ["uncensored", "fast"], capabilities: ["chat"] },
  "wizard-vicuna-uncensored": { description: "Wizard Vicuna - uncensored helpful model", tags: ["uncensored"], capabilities: ["chat"] },
  "samantha-mistral": { description: "Samantha - friendly uncensored assistant", tags: ["uncensored"], capabilities: ["chat"] },
  
  // Specialized
  "medllama2": { description: "MedLlama2 - medical knowledge", tags: ["medical"], capabilities: ["chat"] },
  "meditron": { description: "Meditron - medical domain model", tags: ["medical"], capabilities: ["chat"] },
  "nous-hermes2-mixtral": { description: "Nous Hermes 2 Mixtral - strong instruction following", tags: ["general", "powerful"], capabilities: ["chat"] },
  "wizardlm2": { description: "WizardLM 2 - instruction-tuned", tags: ["general"], capabilities: ["chat"] },
  "starling-lm": { description: "Starling - RLHF tuned model", tags: ["general"], capabilities: ["chat"] },
  "orca-mini": { description: "Orca Mini - small reasoning model", tags: ["small", "fast"], capabilities: ["chat"] },
  "orca2": { description: "Microsoft Orca 2 - careful reasoning", tags: ["general"], capabilities: ["chat"] },
  "yarn-llama2": { description: "Yarn Llama 2 - extended context", tags: ["general", "long-context"], capabilities: ["chat"] },
  "yarn-mistral": { description: "Yarn Mistral - extended context", tags: ["general", "long-context"], capabilities: ["chat"] },
  "llama-pro": { description: "Llama Pro - enhanced Llama", tags: ["general"], capabilities: ["chat"] },
  "everythinglm": { description: "EverythingLM - long context model", tags: ["general", "long-context"], capabilities: ["chat"] },
  "openchat": { description: "OpenChat - open source chat model", tags: ["general"], capabilities: ["chat"] },
  "notux": { description: "Notux - MoE model", tags: ["general"], capabilities: ["chat"] },
  "megadolphin": { description: "MegaDolphin - large context dolphin", tags: ["general", "long-context"], capabilities: ["chat"] },
  "dbrx": { description: "Databricks DBRX - MoE model", tags: ["general", "powerful"], capabilities: ["chat"] },
  "glm4": { description: "GLM-4 - ChatGLM latest", tags: ["general"], capabilities: ["chat"] },
  "athene-v2": { description: "Athene v2 - chat model", tags: ["general"], capabilities: ["chat"] },
  "internlm2": { description: "InternLM 2 - Shanghai AI model", tags: ["general"], capabilities: ["chat"] },
  "reflection": { description: "Reflection - self-correcting model", tags: ["general", "reasoning"], capabilities: ["chat"] },
  "reader-lm": { description: "Reader LM - document reading", tags: ["general"], capabilities: ["chat"] },
  "smollm": { description: "SmolLM - very small model", tags: ["tiny", "fast"], capabilities: ["chat"] },
  "smollm2": { description: "SmolLM 2 - improved tiny model", tags: ["tiny", "fast"], capabilities: ["chat"] },
  "llama3-groq-tool-use": { description: "Llama 3 Groq - optimized for tools", tags: ["tools"], capabilities: ["chat", "tools"] },
  "firefunction-v2": { description: "FireFunction - function calling", tags: ["tools"], capabilities: ["chat", "tools"] },
  "nemotron": { description: "NVIDIA Nemotron - instruction model", tags: ["general"], capabilities: ["chat"] },
  "nemotron-mini": { description: "NVIDIA Nemotron Mini - small version", tags: ["small", "fast"], capabilities: ["chat"] },
};

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
  { id: "tools", name: "Tool Use", emoji: "🔧" },
  { id: "uncensored", name: "Uncensored", emoji: "🔓" },
];

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function getModelInfo(name: string): { description: string; tags: string[]; capabilities: string[] } {
  // Try exact match first
  if (MODEL_DESCRIPTIONS[name]) {
    return MODEL_DESCRIPTIONS[name];
  }
  
  // Try base name (without size/quant suffix)
  const baseName = name.split(":")[0].split("-")[0];
  if (MODEL_DESCRIPTIONS[baseName]) {
    return MODEL_DESCRIPTIONS[baseName];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(MODEL_DESCRIPTIONS)) {
    if (name.startsWith(key) || name.includes(key)) {
      return value;
    }
  }
  
  // Infer from name
  const tags: string[] = ["general"];
  const capabilities: string[] = ["chat"];
  let description = `${name} model`;
  
  if (name.includes("code") || name.includes("coder")) {
    tags.push("coding");
    capabilities.push("code");
    description = "Code generation model";
  }
  if (name.includes("embed")) {
    tags.length = 0;
    tags.push("embedding");
    capabilities.length = 0;
    capabilities.push("embedding");
    description = "Text embedding model";
  }
  if (name.includes("vision") || name.includes("vl") || name.includes("llava")) {
    tags.push("vision");
    capabilities.push("vision");
    description = "Vision-language model";
  }
  if (name.includes("uncensored") || name.includes("dolphin")) {
    tags.push("uncensored");
    description = "Uncensored model";
  }
  
  return { description, tags, capabilities };
}

// Popular models with sizes (curated list of most commonly used)
const POPULAR_MODELS: { name: string; size: string }[] = [
  // General Purpose - Small/Fast
  { name: "llama3.2:1b", size: "1.3 GB" },
  { name: "llama3.2:3b", size: "2.0 GB" },
  { name: "llama3.2", size: "2.0 GB" },
  { name: "llama3.1:8b", size: "4.7 GB" },
  { name: "llama3.1:70b", size: "40 GB" },
  { name: "llama3.1:405b", size: "229 GB" },
  { name: "qwen3:0.6b", size: "0.5 GB" },
  { name: "qwen3:1.7b", size: "1.1 GB" },
  { name: "qwen3:4b", size: "2.6 GB" },
  { name: "qwen3:8b", size: "5.2 GB" },
  { name: "qwen3:14b", size: "9.0 GB" },
  { name: "qwen3:32b", size: "20 GB" },
  { name: "qwen3:72b", size: "47 GB" },
  { name: "qwen2.5:0.5b", size: "0.4 GB" },
  { name: "qwen2.5:1.5b", size: "1.0 GB" },
  { name: "qwen2.5:3b", size: "1.9 GB" },
  { name: "qwen2.5:7b", size: "4.7 GB" },
  { name: "qwen2.5:14b", size: "9.0 GB" },
  { name: "qwen2.5:32b", size: "20 GB" },
  { name: "qwen2.5:72b", size: "47 GB" },
  { name: "gemma2:2b", size: "1.6 GB" },
  { name: "gemma2:9b", size: "5.5 GB" },
  { name: "gemma2:27b", size: "16 GB" },
  { name: "mistral:7b", size: "4.1 GB" },
  { name: "mixtral:8x7b", size: "26 GB" },
  { name: "mixtral:8x22b", size: "80 GB" },
  { name: "phi4:14b", size: "8.4 GB" },
  { name: "phi3:mini", size: "2.2 GB" },
  { name: "phi3:medium", size: "7.9 GB" },
  { name: "tinyllama:1b", size: "0.6 GB" },
  
  // Coding
  { name: "qwen2.5-coder:0.5b", size: "0.4 GB" },
  { name: "qwen2.5-coder:1.5b", size: "1.0 GB" },
  { name: "qwen2.5-coder:3b", size: "1.9 GB" },
  { name: "qwen2.5-coder:7b", size: "4.7 GB" },
  { name: "qwen2.5-coder:14b", size: "9.0 GB" },
  { name: "qwen2.5-coder:32b", size: "20 GB" },
  { name: "codellama:7b", size: "3.8 GB" },
  { name: "codellama:13b", size: "7.4 GB" },
  { name: "codellama:34b", size: "19 GB" },
  { name: "codellama:70b", size: "39 GB" },
  { name: "deepseek-coder:1.3b", size: "0.8 GB" },
  { name: "deepseek-coder:6.7b", size: "3.8 GB" },
  { name: "deepseek-coder:33b", size: "19 GB" },
  { name: "deepseek-coder-v2:16b", size: "9.0 GB" },
  { name: "starcoder2:3b", size: "1.7 GB" },
  { name: "starcoder2:7b", size: "4.0 GB" },
  { name: "starcoder2:15b", size: "9.0 GB" },
  { name: "codegemma:2b", size: "1.6 GB" },
  { name: "codegemma:7b", size: "5.0 GB" },
  
  // Vision
  { name: "llava:7b", size: "4.5 GB" },
  { name: "llava:13b", size: "8.0 GB" },
  { name: "llava:34b", size: "20 GB" },
  { name: "llava-llama3:8b", size: "5.5 GB" },
  { name: "qwen2.5-vl:3b", size: "2.4 GB" },
  { name: "qwen2.5-vl:7b", size: "5.0 GB" },
  { name: "qwen2.5-vl:32b", size: "20 GB" },
  { name: "qwen2.5-vl:72b", size: "47 GB" },
  { name: "llama3.2-vision:11b", size: "8.0 GB" },
  { name: "llama3.2-vision:90b", size: "55 GB" },
  { name: "moondream:1.8b", size: "1.7 GB" },
  { name: "bakllava:7b", size: "4.1 GB" },
  { name: "minicpm-v:8b", size: "5.5 GB" },
  
  // Reasoning
  { name: "deepseek-r1:1.5b", size: "1.1 GB" },
  { name: "deepseek-r1:7b", size: "4.7 GB" },
  { name: "deepseek-r1:8b", size: "4.9 GB" },
  { name: "deepseek-r1:14b", size: "9.0 GB" },
  { name: "deepseek-r1:32b", size: "20 GB" },
  { name: "deepseek-r1:70b", size: "43 GB" },
  { name: "qwq:32b", size: "20 GB" },
  { name: "marco-o1:7b", size: "4.7 GB" },
  
  // Embedding
  { name: "nomic-embed-text", size: "0.3 GB" },
  { name: "mxbai-embed-large", size: "0.7 GB" },
  { name: "all-minilm", size: "0.05 GB" },
  { name: "snowflake-arctic-embed:22m", size: "0.05 GB" },
  { name: "snowflake-arctic-embed:33m", size: "0.07 GB" },
  { name: "snowflake-arctic-embed:110m", size: "0.2 GB" },
  { name: "snowflake-arctic-embed:335m", size: "0.6 GB" },
  { name: "bge-m3", size: "1.2 GB" },
  { name: "bge-large", size: "0.7 GB" },
  
  // Uncensored
  { name: "dolphin-mixtral:8x7b", size: "26 GB" },
  { name: "dolphin-llama3:8b", size: "4.7 GB" },
  { name: "dolphin-llama3:70b", size: "40 GB" },
  { name: "dolphin-phi:2.7b", size: "1.6 GB" },
  { name: "wizard-vicuna-uncensored:7b", size: "3.8 GB" },
  { name: "wizard-vicuna-uncensored:13b", size: "7.4 GB" },
  
  // Other popular
  { name: "openhermes:7b", size: "4.1 GB" },
  { name: "nous-hermes:7b", size: "4.1 GB" },
  { name: "nous-hermes2:10.7b", size: "6.1 GB" },
  { name: "neural-chat:7b", size: "4.1 GB" },
  { name: "zephyr:7b", size: "4.1 GB" },
  { name: "yi:6b", size: "3.5 GB" },
  { name: "yi:34b", size: "19 GB" },
  { name: "solar:10.7b", size: "6.1 GB" },
  { name: "orca-mini:3b", size: "1.9 GB" },
  { name: "orca-mini:7b", size: "3.8 GB" },
  { name: "orca-mini:13b", size: "7.4 GB" },
  { name: "vicuna:7b", size: "3.8 GB" },
  { name: "vicuna:13b", size: "7.4 GB" },
  { name: "openchat:7b", size: "4.1 GB" },
  { name: "starling-lm:7b", size: "4.1 GB" },
  { name: "wizardlm2:7b", size: "4.1 GB" },
  { name: "wizardlm2:8x22b", size: "80 GB" },
  { name: "command-r:35b", size: "20 GB" },
  { name: "command-r-plus:104b", size: "60 GB" },
  { name: "aya:8b", size: "4.8 GB" },
  { name: "aya:35b", size: "20 GB" },
  { name: "granite-code:3b", size: "2.0 GB" },
  { name: "granite-code:8b", size: "4.6 GB" },
  { name: "granite-code:20b", size: "12 GB" },
  { name: "granite-code:34b", size: "20 GB" },
];

async function fetchOllamaLibrary(): Promise<OllamaLibraryModel[]> {
  // Check cache
  if (libraryCache && Date.now() - libraryCache.timestamp < CACHE_TTL) {
    return libraryCache.models;
  }

  const models: OllamaLibraryModel[] = [];
  const addedNames = new Set<string>();
  
  // First add all curated popular models
  for (const m of POPULAR_MODELS) {
    const info = getModelInfo(m.name);
    models.push({
      name: m.name,
      description: info.description,
      size: m.size,
      tags: info.tags,
      capabilities: info.capabilities,
    });
    addedNames.add(m.name);
  }

  // Then fetch featured models from Ollama API and add any new ones
  try {
    const res = await fetch("https://ollama.com/api/tags", {
      signal: AbortSignal.timeout(10000),
    });
    
    if (res.ok) {
      const data = await res.json();
      for (const m of data.models || []) {
        if (!addedNames.has(m.name)) {
          const info = getModelInfo(m.name);
          models.push({
            name: m.name,
            description: info.description,
            size: formatSize(m.size),
            tags: info.tags,
            capabilities: info.capabilities,
            pulls: "Featured",
          });
          addedNames.add(m.name);
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch Ollama featured models:", e);
  }
    
  // Cache results
  libraryCache = { models, timestamp: Date.now() };
  
  return models;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";
  const search = searchParams.get("search")?.toLowerCase() || "";

  let models = await fetchOllamaLibrary();

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
    total: models.length,
  });
}

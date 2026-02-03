/**
 * Ollama API Client
 * Handles communication with local Ollama instance
 */

const OLLAMA_BASE_URL = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaTag {
  models: OllamaModel[];
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

/**
 * Check if Ollama is running
 */
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * List installed models
 */
export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  if (!res.ok) throw new Error("Failed to fetch models");
  const data: OllamaTag = await res.json();
  return data.models || [];
}

/**
 * Pull a model from Ollama registry
 */
export async function pullModel(
  name: string,
  onProgress?: (progress: PullProgress) => void
): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, stream: true }),
  });

  if (!res.ok) throw new Error("Failed to pull model");
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const progress: PullProgress = JSON.parse(line);
        onProgress?.(progress);
      } catch {
        // Ignore parse errors
      }
    }
  }
}

/**
 * Delete a model
 */
export async function deleteModel(name: string): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) throw new Error("Failed to delete model");
}

/**
 * Get model info
 */
export async function showModel(name: string): Promise<any> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/show`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) throw new Error("Failed to get model info");
  return res.json();
}

/**
 * Format model size for display
 */
export function formatModelSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

/**
 * Estimate if model will fit in VRAM
 */
export function estimateVRAMUsage(parameterSize: string): number {
  // Rough estimate: 4-bit quantized models use ~0.5GB per billion params
  const match = parameterSize.match(/(\d+(?:\.\d+)?)\s*(B|b)/);
  if (!match) return 0;
  const params = parseFloat(match[1]);
  return params * 0.5; // GB for Q4 quantization
}

/**
 * Model recommendations based on VRAM
 */
export function getRecommendedModels(vramGB: number): string[] {
  if (vramGB >= 24) {
    return ["qwen2.5-coder:32b", "deepseek-r1:32b", "llama3.1:70b"];
  }
  if (vramGB >= 16) {
    return ["qwen3:14b", "deepseek-r1:14b", "codellama:13b"];
  }
  if (vramGB >= 8) {
    return ["qwen3:8b", "llama3.1:8b", "mistral:7b"];
  }
  if (vramGB >= 4) {
    return ["llama3.2:3b", "phi3:3b", "gemma2:2b"];
  }
  return ["llama3.2:1b", "qwen2:0.5b"];
}

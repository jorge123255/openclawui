/**
 * Hardware Detection
 * Detects system hardware for model recommendations
 */

export interface HardwareInfo {
  cpu: {
    model: string;
    cores: number;
  };
  memory: {
    total: number; // GB
    available: number; // GB
  };
  gpu: {
    name: string;
    vram: number; // GB
    type: "nvidia" | "amd" | "apple" | "intel" | "none";
  } | null;
}

/**
 * Detect hardware via API endpoint
 * This calls a server-side endpoint that runs system commands
 */
export async function detectHardware(): Promise<HardwareInfo> {
  try {
    const res = await fetch("/api/system/hardware");
    if (!res.ok) throw new Error("Failed to detect hardware");
    return await res.json();
  } catch {
    // Return mock data for development
    return getMockHardware();
  }
}

/**
 * Mock hardware for development/demo
 */
export function getMockHardware(): HardwareInfo {
  return {
    cpu: {
      model: "Apple M2 Pro",
      cores: 12,
    },
    memory: {
      total: 32,
      available: 24,
    },
    gpu: {
      name: "Apple M2 Pro GPU",
      vram: 32, // Unified memory
      type: "apple",
    },
  };
}

/**
 * Get model recommendations based on hardware
 */
export function getModelRecommendations(hardware: HardwareInfo): {
  recommended: string[];
  maxParams: string;
  notes: string[];
} {
  const vram = hardware.gpu?.vram || 0;
  const ram = hardware.memory.total;
  const gpuType = hardware.gpu?.type || "none";

  const notes: string[] = [];
  let maxParams: string;
  let recommended: string[];

  // Apple Silicon uses unified memory
  if (gpuType === "apple") {
    const effectiveVram = Math.min(vram, ram * 0.75);
    notes.push("Apple Silicon uses unified memory - RAM and VRAM are shared");

    if (effectiveVram >= 24) {
      maxParams = "32B+";
      recommended = ["qwen2.5-coder:32b", "deepseek-r1:32b", "llama3.1:70b"];
    } else if (effectiveVram >= 16) {
      maxParams = "14B";
      recommended = ["qwen3:14b", "llama3.1:8b", "codellama:13b"];
    } else {
      maxParams = "8B";
      recommended = ["llama3.2:3b", "phi3:3b", "mistral:7b"];
    }
  }
  // NVIDIA GPUs
  else if (gpuType === "nvidia") {
    notes.push("NVIDIA GPU detected - full CUDA acceleration available");

    if (vram >= 24) {
      maxParams = "32B+";
      recommended = ["qwen2.5-coder:32b", "deepseek-r1:32b", "codellama:34b"];
    } else if (vram >= 16) {
      maxParams = "14B";
      recommended = ["qwen3:14b", "deepseek-r1:14b", "llama3.1:8b"];
    } else if (vram >= 8) {
      maxParams = "8B";
      recommended = ["qwen3:8b", "llama3.1:8b", "mistral:7b"];
    } else {
      maxParams = "3B";
      recommended = ["llama3.2:3b", "phi3:3b"];
      notes.push("Consider a larger GPU for better model support");
    }
  }
  // AMD GPUs
  else if (gpuType === "amd") {
    notes.push("AMD GPU detected - ROCm acceleration may be available");

    if (vram >= 16) {
      maxParams = "14B";
      recommended = ["llama3.1:8b", "mistral:7b", "codellama:7b"];
    } else {
      maxParams = "8B";
      recommended = ["llama3.2:3b", "phi3:3b"];
    }
  }
  // CPU only
  else {
    notes.push("No GPU detected - models will run on CPU (slower)");
    notes.push("Consider using smaller models for better performance");

    if (ram >= 32) {
      maxParams = "8B";
      recommended = ["llama3.2:3b", "phi3:3b", "gemma2:2b"];
    } else {
      maxParams = "3B";
      recommended = ["llama3.2:1b", "qwen2:0.5b"];
    }
  }

  return { recommended, maxParams, notes };
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

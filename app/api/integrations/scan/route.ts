import { NextResponse } from "next/server";

// Common service locations to scan
const SCAN_TARGETS = [
  {
    id: "ollama",
    name: "Ollama",
    locations: [
      "http://localhost:11434",
      "http://127.0.0.1:11434",
      "http://192.168.1.10:11434", // Common homelab
    ],
    testPath: "/api/tags",
    configKey: "models.providers.ollama.baseUrl",
  },
  {
    id: "n8n",
    name: "N8N",
    locations: [
      "http://localhost:5678",
      "http://127.0.0.1:5678",
      "http://192.168.1.13:5678", // George's N8N
    ],
    testPath: "/healthz",
    configKey: "env.N8N_BASE_URL",
  },
  {
    id: "mcp",
    name: "MCP Tools Server",
    locations: [
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://192.168.1.91:3000", // George's MCP
    ],
    testPath: "/mcp",
    testBody: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", params: {}, id: 1 }),
    configKey: "env.MCP_SERVER_URL",
  },
  {
    id: "homeassistant",
    name: "Home Assistant",
    locations: [
      "http://localhost:8123",
      "http://homeassistant.local:8123",
      "http://192.168.1.100:8123",
    ],
    testPath: "/api/",
    configKey: "env.HOMEASSISTANT_URL",
  },
  {
    id: "unifi",
    name: "UniFi Protect",
    locations: [
      "https://192.168.1.1",
      "https://192.168.1.15", // George's UniFi
      "https://unifi.local",
    ],
    testPath: "/proxy/protect/api",
    configKey: "env.UNIFI_PROTECT_HOST",
  },
];

export async function POST(request: Request) {
  const { action } = await request.json();

  if (action === "scan") {
    return await scanNetwork();
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function scanNetwork() {
  const results: any[] = [];

  for (const target of SCAN_TARGETS) {
    let found = false;
    let foundUrl = "";

    for (const url of target.locations) {
      try {
        const testUrl = `${url}${target.testPath}`;
        const options: RequestInit = {
          method: target.testBody ? "POST" : "GET",
          signal: AbortSignal.timeout(2000), // 2 second timeout per check
          headers: target.testBody ? { "Content-Type": "application/json" } : {},
        };
        
        if (target.testBody) {
          options.body = target.testBody;
        }

        const res = await fetch(testUrl, options);
        
        // For HTTPS with self-signed certs, we might get errors but service is there
        if (res.ok || res.status === 401 || res.status === 403) {
          found = true;
          foundUrl = url;
          break;
        }
      } catch (e: any) {
        // Connection refused or timeout - try next
        // But if it's a cert error, the service might be there
        if (e.cause?.code === "CERT_HAS_EXPIRED" || e.cause?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
          found = true;
          foundUrl = url;
          break;
        }
      }
    }

    results.push({
      id: target.id,
      name: target.name,
      found,
      url: foundUrl,
      configKey: target.configKey,
    });
  }

  return NextResponse.json({
    success: true,
    services: results,
    foundCount: results.filter(r => r.found).length,
  });
}

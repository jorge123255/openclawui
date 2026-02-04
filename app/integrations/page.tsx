"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plug,
  ChevronLeft,
  RefreshCw,
  Loader2,
  Check,
  X,
  ExternalLink,
  Settings,
  Play,
  Pause,
  Zap,
  Server,
  Workflow,
  Shield,
  Camera,
  MessageSquare,
  Cloud,
  Database,
  Plus,
  ChevronRight,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: "connected" | "disconnected" | "error" | "checking";
  category: string;
  configKey?: string;
  docsUrl?: string;
}

interface ScanResult {
  id: string;
  name: string;
  found: boolean;
  url: string;
  configKey: string;
}

interface WizardStep {
  service: string;
  name: string;
  fields: { key: string; label: string; type: string; placeholder: string; required?: boolean }[];
}

const WIZARD_CONFIGS: Record<string, WizardStep> = {
  ollama: {
    service: "ollama",
    name: "Ollama",
    fields: [
      { key: "models.providers.ollama.baseUrl", label: "Ollama URL", type: "url", placeholder: "http://localhost:11434", required: true },
    ],
  },
  n8n: {
    service: "n8n",
    name: "N8N",
    fields: [
      { key: "env.N8N_BASE_URL", label: "N8N URL", type: "url", placeholder: "http://localhost:5678", required: true },
      { key: "env.N8N_API_KEY", label: "API Key", type: "password", placeholder: "Your N8N API key", required: true },
    ],
  },
  elevenlabs: {
    service: "elevenlabs",
    name: "ElevenLabs",
    fields: [
      { key: "env.ELEVENLABS_API_KEY", label: "API Key", type: "password", placeholder: "sk_...", required: true },
      { key: "env.ELEVENLABS_VOICE_ID", label: "Voice ID (optional)", type: "text", placeholder: "Voice ID for TTS" },
    ],
  },
  "unifi-protect": {
    service: "unifi-protect",
    name: "UniFi Protect",
    fields: [
      { key: "env.UNIFI_PROTECT_HOST", label: "Protect URL", type: "url", placeholder: "https://192.168.1.1", required: true },
      { key: "env.UNIFI_PROTECT_API_KEY", label: "API Key", type: "password", placeholder: "Your API key", required: true },
    ],
  },
  "browser-use": {
    service: "browser-use",
    name: "Browser Use",
    fields: [
      { key: "skills.entries.browser-use.apiKey", label: "API Key", type: "password", placeholder: "bu_...", required: true },
    ],
  },
  mcp: {
    service: "mcp",
    name: "MCP Tools Server",
    fields: [
      { key: "env.MCP_SERVER_URL", label: "Server URL", type: "url", placeholder: "http://localhost:3000", required: true },
    ],
  },
};

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({});
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [n8nWorkflows, setN8nWorkflows] = useState<any[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"services" | "n8n" | "mcp">("services");
  
  // Scan & Wizard state
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardService, setWizardService] = useState<string | null>(null);
  const [wizardValues, setWizardValues] = useState<Record<string, string>>({});
  const [wizardSaving, setWizardSaving] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    
    // Load config
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-get" }),
      });
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        buildIntegrationsList(data.config);
      }
    } catch (e) {
      console.error("Failed to load config:", e);
    }

    // Load N8N workflows
    await loadN8nWorkflows();
    
    // Load MCP tools
    await loadMcpTools();
    
    setLoading(false);
  }

  async function scanForServices() {
    setScanning(true);
    setScanResults([]);
    
    try {
      const res = await fetch("/api/integrations/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = await res.json();
      if (data.services) {
        setScanResults(data.services.filter((s: ScanResult) => s.found));
      }
    } catch (e) {
      console.error("Scan failed:", e);
    }
    
    setScanning(false);
  }

  function openWizard(serviceId: string, prefillUrl?: string) {
    setWizardService(serviceId);
    const wizard = WIZARD_CONFIGS[serviceId];
    if (wizard && prefillUrl) {
      const urlField = wizard.fields.find(f => f.type === "url");
      if (urlField) {
        setWizardValues({ [urlField.key]: prefillUrl });
      }
    } else {
      setWizardValues({});
    }
    setShowWizard(true);
  }

  async function saveWizard() {
    if (!wizardService) return;
    
    setWizardSaving(true);
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "config-patch", config: wizardValues }),
      });
      const data = await res.json();
      
      if (data.success) {
        setShowWizard(false);
        setWizardService(null);
        setWizardValues({});
        await loadIntegrations(); // Refresh
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setWizardSaving(false);
  }

  function buildIntegrationsList(cfg: any) {
    const env = cfg.env || {};
    const list: Integration[] = [
      {
        id: "n8n",
        name: "N8N",
        description: "Workflow automation platform",
        icon: Workflow,
        status: env.N8N_BASE_URL && env.N8N_API_KEY ? "connected" : "disconnected",
        category: "automation",
        configKey: "env.N8N_BASE_URL",
        docsUrl: "https://docs.n8n.io",
      },
      {
        id: "ollama",
        name: "Ollama",
        description: "Local AI models",
        icon: Server,
        status: cfg.models?.providers?.ollama?.baseUrl ? "connected" : "disconnected",
        category: "ai",
        configKey: "models.providers.ollama.baseUrl",
        docsUrl: "https://ollama.ai",
      },
      {
        id: "elevenlabs",
        name: "ElevenLabs",
        description: "Text-to-speech",
        icon: MessageSquare,
        status: env.ELEVENLABS_API_KEY ? "connected" : "disconnected",
        category: "media",
        configKey: "env.ELEVENLABS_API_KEY",
        docsUrl: "https://elevenlabs.io",
      },
      {
        id: "unifi-protect",
        name: "UniFi Protect",
        description: "Security cameras",
        icon: Camera,
        status: env.UNIFI_PROTECT_API_KEY ? "connected" : "disconnected",
        category: "security",
        configKey: "env.UNIFI_PROTECT_API_KEY",
        docsUrl: "https://ui.com/camera-security",
      },
      {
        id: "browser-use",
        name: "Browser Use",
        description: "Cloud browser automation",
        icon: Cloud,
        status: cfg.skills?.entries?.["browser-use"]?.apiKey ? "connected" : "disconnected",
        category: "automation",
        configKey: "skills.entries.browser-use.apiKey",
        docsUrl: "https://browser-use.com",
      },
      {
        id: "mcp-tools",
        name: "MCP Tools Server",
        description: "External tools via MCP protocol",
        icon: Database,
        status: "checking",
        category: "tools",
        docsUrl: "https://modelcontextprotocol.io",
      },
    ];
    
    setIntegrations(list);
  }

  async function loadN8nWorkflows() {
    const env = config.env || {};
    if (!env.N8N_BASE_URL || !env.N8N_API_KEY) {
      setN8nWorkflows([]);
      return;
    }

    try {
      const res = await fetch("/api/integrations/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-workflows" }),
      });
      const data = await res.json();
      if (data.workflows) {
        setN8nWorkflows(data.workflows);
      }
    } catch (e) {
      console.error("Failed to load N8N workflows:", e);
    }
  }

  async function loadMcpTools() {
    try {
      const res = await fetch("/api/integrations/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-tools" }),
      });
      const data = await res.json();
      if (data.tools) {
        setMcpTools(data.tools);
        // Update MCP status
        setIntegrations(prev => prev.map(i => 
          i.id === "mcp-tools" 
            ? { ...i, status: data.tools.length > 0 ? "connected" : "disconnected" }
            : i
        ));
      }
    } catch (e) {
      setIntegrations(prev => prev.map(i => 
        i.id === "mcp-tools" ? { ...i, status: "disconnected" } : i
      ));
    }
  }

  async function triggerN8nWorkflow(workflowId: string) {
    try {
      const res = await fetch("/api/integrations/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger", workflowId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Workflow triggered!");
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  }

  const tabs = [
    { id: "services", label: "Services", icon: Plug },
    { id: "n8n", label: "N8N Workflows", icon: Workflow },
    { id: "mcp", label: "MCP Tools", icon: Database },
  ];

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
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Plug className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Integrations</h1>
              <p className="text-sm text-muted-foreground">
                Connect external services
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scanForServices}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover transition-colors"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Auto-Detect
          </button>
          <button
            onClick={() => loadIntegrations()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      {/* Scan Results Banner */}
      {scanResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-accent/20 border border-accent/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-accent" />
            <span className="font-medium">Found {scanResults.length} services on your network!</span>
            <button
              onClick={() => setScanResults([])}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {scanResults.map((result) => (
              <button
                key={result.id}
                onClick={() => openWizard(result.id, result.url)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors text-sm"
              >
                <span className="font-medium">{result.name}</span>
                <span className="text-muted-foreground">{result.url}</span>
                <Plus className="w-4 h-4 text-accent" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Wizard Modal */}
      {showWizard && wizardService && WIZARD_CONFIGS[wizardService] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
          >
            <h2 className="text-xl font-bold mb-2">
              Connect {WIZARD_CONFIGS[wizardService].name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your connection details below
            </p>

            <div className="space-y-4">
              {WIZARD_CONFIGS[wizardService].fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium mb-2">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <input
                    type={field.type === "password" ? "password" : "text"}
                    value={wizardValues[field.key] || ""}
                    onChange={(e) => setWizardValues({ ...wizardValues, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowWizard(false);
                  setWizardService(null);
                }}
                className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveWizard}
                disabled={wizardSaving}
                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover font-medium transition-colors flex items-center justify-center gap-2"
              >
                {wizardSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
            />
          ))}
          
          {/* Add New */}
          <div className="p-6 rounded-xl border-2 border-dashed border-border">
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground mb-4">
              <Plus className="w-8 h-8" />
              <span className="font-medium text-foreground">Add Integration</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(WIZARD_CONFIGS).map(([id, config]) => (
                <button
                  key={id}
                  onClick={() => openWizard(id)}
                  className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors"
                >
                  {config.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* N8N Tab */}
      {activeTab === "n8n" && (
        <div className="space-y-6">
          {!config.env?.N8N_BASE_URL ? (
            <div className="p-12 rounded-xl bg-secondary/50 text-center">
              <Workflow className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">N8N not configured</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your N8N URL and API key in Settings
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary rounded-lg hover:bg-primary-hover transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configure N8N
              </Link>
            </div>
          ) : n8nWorkflows.length === 0 ? (
            <div className="p-12 rounded-xl bg-secondary/50 text-center">
              <Workflow className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No workflows found</p>
              <p className="text-sm text-muted-foreground">
                Create workflows in N8N to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {n8nWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="p-4 rounded-xl bg-card border border-border flex items-center gap-4"
                >
                  <div className={`w-3 h-3 rounded-full ${workflow.active ? "bg-accent" : "bg-muted"}`} />
                  <div className="flex-1">
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workflow.active ? "Active" : "Inactive"} • ID: {workflow.id}
                    </p>
                  </div>
                  <button
                    onClick={() => triggerN8nWorkflow(workflow.id)}
                    disabled={!workflow.active}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Trigger
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MCP Tab */}
      {activeTab === "mcp" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-2">MCP Tools Server</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect to external tool servers via the Model Context Protocol
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Server:</span>
              <code className="px-2 py-1 rounded bg-secondary font-mono">
                {config.env?.MCP_SERVER_URL || "http://192.168.1.91:3000"}
              </code>
            </div>
          </div>

          {mcpTools.length === 0 ? (
            <div className="p-12 rounded-xl bg-secondary/50 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No MCP tools available</p>
              <p className="text-sm text-muted-foreground">
                Make sure your MCP server is running
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {mcpTools.length} tools available across {new Set(mcpTools.map((t: any) => t.category)).size} categories
              </p>
              
              {/* Group by category */}
              {Array.from(new Set(mcpTools.map((t: any) => t.category || "other"))).map((category) => (
                <div key={category as string} className="space-y-2">
                  <h4 className="font-medium capitalize">{category as string}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {mcpTools
                      .filter((t: any) => (t.category || "other") === category)
                      .slice(0, 6)
                      .map((tool: any) => (
                        <div
                          key={tool.name}
                          className="p-3 rounded-lg bg-secondary/50 text-sm"
                        >
                          <p className="font-medium truncate">{tool.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tool.description || "No description"}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusColors = {
    connected: "bg-accent text-accent",
    disconnected: "bg-muted text-muted-foreground",
    error: "bg-destructive text-destructive",
    checking: "bg-yellow-500 text-yellow-500",
  };

  const statusLabels = {
    connected: "Connected",
    disconnected: "Not configured",
    error: "Error",
    checking: "Checking...",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <integration.icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{integration.name}</h3>
            {integration.docsUrl && (
              <a
                href={integration.docsUrl}
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {integration.description}
          </p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[integration.status].split(" ")[0]}`} />
            <span className={`text-xs ${statusColors[integration.status].split(" ")[1]}`}>
              {statusLabels[integration.status]}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border flex justify-end">
        <Link
          href="/settings"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Configure <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}

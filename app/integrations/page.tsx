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

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({});
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [n8nWorkflows, setN8nWorkflows] = useState<any[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"services" | "n8n" | "mcp">("services");

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

        <button
          onClick={() => loadIntegrations()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

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
          <Link
            href="/settings"
            className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <Plus className="w-8 h-8" />
            <span className="font-medium">Add Integration</span>
            <span className="text-sm">Configure in Settings</span>
          </Link>
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

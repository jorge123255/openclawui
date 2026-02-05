"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ChevronLeft,
  Mail,
  Calendar,
  Github,
  CheckSquare,
  StickyNote,
  MessageSquare,
  Home,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Settings,
  Loader2,
  Plus,
  Zap,
  Shield,
  Cloud,
  Server,
  Save,
  AlertTriangle,
} from "lucide-react";

interface Permission {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  requiresApproval?: boolean;
}

interface ConnectionSettings {
  model: string;
  permissions: Permission[];
  approvalRules: string[];
}

interface Connection {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  skill: string;
  status: "connected" | "disconnected" | "checking";
  setupUrl?: string;
  configKey?: string;
  defaultPermissions: Permission[];
  settings?: ConnectionSettings;
}

// Default permissions by connection type
const CONNECTION_PERMISSIONS: Record<string, Permission[]> = {
  google: [
    { id: "read_emails", label: "Read emails", description: "View inbox and email content", enabled: true },
    { id: "search_emails", label: "Search emails", description: "Search through your emails", enabled: true },
    { id: "draft_emails", label: "Draft emails", description: "Create email drafts", enabled: true, requiresApproval: true },
    { id: "send_emails", label: "Send emails", description: "Send emails on your behalf", enabled: false },
    { id: "delete_emails", label: "Delete emails", description: "Move emails to trash", enabled: false },
    { id: "read_calendar", label: "Read calendar", description: "View calendar events", enabled: true },
    { id: "create_events", label: "Create events", description: "Add new calendar events", enabled: true, requiresApproval: true },
    { id: "delete_events", label: "Delete events", description: "Remove calendar events", enabled: false },
    { id: "read_contacts", label: "Read contacts", description: "Access your contacts", enabled: true },
    { id: "read_drive", label: "Read Drive", description: "Access Google Drive files", enabled: true },
  ],
  github: [
    { id: "read_repos", label: "Read repos", description: "View repository content", enabled: true },
    { id: "read_issues", label: "Read issues", description: "View issues and discussions", enabled: true },
    { id: "create_issues", label: "Create issues", description: "Open new issues", enabled: true, requiresApproval: true },
    { id: "comment_issues", label: "Comment on issues", description: "Add comments to issues/PRs", enabled: true, requiresApproval: true },
    { id: "read_prs", label: "Read PRs", description: "View pull requests", enabled: true },
    { id: "create_prs", label: "Create PRs", description: "Open pull requests", enabled: false },
    { id: "merge_prs", label: "Merge PRs", description: "Merge pull requests", enabled: false },
    { id: "push_code", label: "Push code", description: "Push commits to repos", enabled: false },
  ],
  "apple-reminders": [
    { id: "read_reminders", label: "Read reminders", description: "View your reminders", enabled: true },
    { id: "create_reminders", label: "Create reminders", description: "Add new reminders", enabled: true },
    { id: "complete_reminders", label: "Complete reminders", description: "Mark reminders as done", enabled: true },
    { id: "delete_reminders", label: "Delete reminders", description: "Remove reminders", enabled: false },
  ],
  things: [
    { id: "read_tasks", label: "Read tasks", description: "View your tasks", enabled: true },
    { id: "create_tasks", label: "Create tasks", description: "Add new tasks", enabled: true },
    { id: "complete_tasks", label: "Complete tasks", description: "Mark tasks as done", enabled: true },
    { id: "delete_tasks", label: "Delete tasks", description: "Remove tasks", enabled: false },
  ],
  imessage: [
    { id: "read_messages", label: "Read messages", description: "View message history", enabled: true },
    { id: "search_messages", label: "Search messages", description: "Search through messages", enabled: true },
    { id: "send_messages", label: "Send messages", description: "Send new messages", enabled: false },
  ],
};

// Example approval rules
const EXAMPLE_RULES = [
  "Always show me emails before deleting",
  "Draft replies but ask before sending",
  "Don't touch messages older than 7 days",
  "Summarize what you're about to do first",
  "Never delete without my explicit 'yes'",
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: "google",
      name: "Google Workspace",
      description: "Gmail, Calendar, Contacts, Drive",
      icon: Mail,
      color: "red",
      skill: "gog",
      status: "checking",
      configKey: "GOOGLE_CREDENTIALS",
      defaultPermissions: CONNECTION_PERMISSIONS.google,
    },
    {
      id: "github",
      name: "GitHub",
      description: "Repos, Issues, PRs, Actions",
      icon: Github,
      color: "gray",
      skill: "github",
      status: "checking",
      defaultPermissions: CONNECTION_PERMISSIONS.github,
    },
    {
      id: "apple-reminders",
      name: "Apple Reminders",
      description: "Lists, tasks, due dates",
      icon: CheckSquare,
      color: "orange",
      skill: "apple-reminders",
      status: "checking",
      defaultPermissions: CONNECTION_PERMISSIONS["apple-reminders"],
    },
    {
      id: "things",
      name: "Things 3",
      description: "Projects, todos, areas",
      icon: CheckSquare,
      color: "blue",
      skill: "things-mac",
      status: "checking",
      defaultPermissions: CONNECTION_PERMISSIONS.things,
    },
    {
      id: "imessage",
      name: "iMessage",
      description: "Messages, chats, send texts",
      icon: MessageSquare,
      color: "green",
      skill: "imsg",
      status: "checking",
      defaultPermissions: CONNECTION_PERMISSIONS.imessage,
    },
  ]);

  const [showSettings, setShowSettings] = useState<string | null>(null);
  // setupLoading no longer needed - replaced by setup wizard
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Setup wizard state
  const [showSetup, setShowSetup] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<string>("init");
  const [setupData, setSetupData] = useState<any>({});
  const [setupError, setSetupError] = useState<string>("");
  const [setupMessage, setSetupMessage] = useState<string>("");
  const [setupAuthUrl, setSetupAuthUrl] = useState<string>("");
  const [setupWorking, setSetupWorking] = useState(false);
  
  // Settings form state
  const [selectedModel, setSelectedModel] = useState("auto");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [approvalRules, setApprovalRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");

  // Available models
  const [cloudModels, setCloudModels] = useState<string[]>([]);
  const [localModels, setLocalModels] = useState<string[]>([]);

  useEffect(() => {
    checkConnections();
    loadAvailableModels();
    loadSavedSettings();
  }, []);

  // Auto-trigger setup steps
  useEffect(() => {
    if (!showSetup || setupStep !== "init") return;
    if (showSetup === "google") googleCheckCredentials();
    else if (showSetup === "github") githubInit();
    else if (["apple-reminders", "things", "imessage"].includes(showSetup)) simpleSetup(showSetup);
  }, [showSetup, setupStep]);

  async function loadAvailableModels() {
    // Cloud models (from config)
    setCloudModels([
      "anthropic/claude-opus-4-5",
      "anthropic/claude-sonnet-4-20250514",
      "openai/gpt-4o",
      "openai-codex/gpt-5.2-codex",
      "google/gemini-2.0-flash",
    ]);

    // Local models from Ollama
    try {
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "models", url: "http://192.168.1.10:11434" }),
      });
      const data = await res.json();
      if (data.models) {
        setLocalModels(data.models.map((m: any) => `ollama/${m.name}`));
      }
    } catch {
      setLocalModels(["ollama/qwen3:8b", "ollama/llama3.2:3b"]);
    }
  }

  async function loadSavedSettings() {
    try {
      const res = await fetch("/api/connections/settings");
      const data = await res.json();
      if (data.settings) {
        // Update connections with saved settings
        setConnections(prev => prev.map(conn => ({
          ...conn,
          settings: data.settings[conn.id] || undefined
        })));
      }
    } catch {
      // No saved settings
    }
  }

  function openSettings(conn: Connection) {
    setShowSettings(conn.id);
    // Load existing settings or defaults
    const settings = conn.settings || {
      model: "auto",
      permissions: conn.defaultPermissions,
      approvalRules: [],
    };
    setSelectedModel(settings.model);
    setPermissions([...settings.permissions]);
    setApprovalRules([...settings.approvalRules]);
  }

  async function saveSettings() {
    if (!showSettings) return;
    setSavingSettings(true);
    
    try {
      const settings: ConnectionSettings = {
        model: selectedModel,
        permissions,
        approvalRules,
      };

      await fetch("/api/connections/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          service: showSettings,
          settings 
        }),
      });

      // Update local state
      setConnections(prev => prev.map(conn => 
        conn.id === showSettings 
          ? { ...conn, settings } 
          : conn
      ));

      setShowSettings(null);
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    }
    setSavingSettings(false);
  }

  function togglePermission(id: string) {
    setPermissions(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
  }

  function toggleApproval(id: string) {
    setPermissions(prev => prev.map(p => 
      p.id === id ? { ...p, requiresApproval: !p.requiresApproval } : p
    ));
  }

  function addRule() {
    if (newRule.trim()) {
      setApprovalRules(prev => [...prev, newRule.trim()]);
      setNewRule("");
    }
  }

  function removeRule(index: number) {
    setApprovalRules(prev => prev.filter((_, i) => i !== index));
  }

  async function checkConnections() {
    const updated: Connection[] = await Promise.all(
      connections.map(async (conn): Promise<Connection> => {
        try {
          const res = await fetch(`/api/connections/check?service=${conn.id}`);
          const data = await res.json();
          return { ...conn, status: data.connected ? "connected" : "disconnected" };
        } catch {
          return { ...conn, status: "disconnected" };
        }
      })
    );
    setConnections(updated);
  }

  function openSetupWizard(id: string) {
    setShowSetup(id);
    setSetupStep("init");
    setSetupData({});
    setSetupError("");
    setSetupMessage("");
    setSetupAuthUrl("");
    setSetupWorking(false);
  }

  function closeSetupWizard() {
    setShowSetup(null);
    setSetupStep("init");
    setSetupData({});
    setSetupError("");
    setSetupMessage("");
    setSetupAuthUrl("");
    setSetupWorking(false);
    checkConnections();
  }

  async function setupApiCall(service: string, step: string, data: any = {}) {
    setSetupWorking(true);
    setSetupError("");
    try {
      const res = await fetch("/api/connections/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, step, data }),
      });
      const result = await res.json();
      setSetupWorking(false);
      return result;
    } catch (e: any) {
      setSetupWorking(false);
      setSetupError(e.message);
      return { error: e.message };
    }
  }

  // ── Google setup flow ──
  async function googleCheckCredentials() {
    const result = await setupApiCall("google", "check-credentials");
    if (result.hasCreds) {
      setSetupStep("google-email");
    } else {
      setSetupStep("google-credentials");
    }
  }

  async function googleSaveCredentials() {
    const json = setupData.credentialsJson;
    if (!json?.trim()) { setSetupError("Paste the credentials JSON"); return; }
    try { JSON.parse(json); } catch { setSetupError("Invalid JSON"); return; }
    
    const result = await setupApiCall("google", "save-credentials", { credentialsJson: json });
    if (result.success) {
      setSetupStep("google-email");
      setSetupMessage("Credentials saved!");
    } else {
      setSetupError(result.error || "Failed to save credentials");
    }
  }

  async function googleStartAuth() {
    const email = setupData.email;
    if (!email?.includes("@")) { setSetupError("Enter a valid email"); return; }
    
    const result = await setupApiCall("google", "start-auth", { email });
    if (result.authUrl) {
      setSetupAuthUrl(result.authUrl);
      setSetupStep("google-authorize");
      setSetupMessage(result.message || "");
    } else {
      setSetupError(result.error || "Failed to get auth URL");
    }
  }

  async function googleCompleteAuth() {
    const redirectUrl = setupData.redirectUrl;
    if (!redirectUrl?.includes("http")) { setSetupError("Paste the redirect URL from your browser"); return; }
    
    const result = await setupApiCall("google", "complete-auth", { redirectUrl });
    if (result.success) {
      setSetupStep("success");
      setSetupMessage(result.message || "Connected!");
    } else {
      setSetupError(result.error || "Auth completion failed");
    }
  }

  // ── GitHub setup flow ──
  async function githubInit() {
    const result = await setupApiCall("github", "init");
    if (result.error) {
      setSetupError(result.error);
    } else {
      setSetupAuthUrl(result.authUrl || "");
      setSetupStep("github-token");
      setSetupMessage(result.message || "");
    }
  }

  async function githubComplete() {
    const token = setupData.token;
    if (!token?.trim()) { setSetupError("Paste your token"); return; }
    
    const result = await setupApiCall("github", "complete", { token: token.trim() });
    if (result.success) {
      setSetupStep("success");
      setSetupMessage(result.message || "Connected!");
    } else {
      setSetupError(result.error || "Auth failed");
    }
  }

  // ── Simple services (permission-based) ──
  async function simpleSetup(service: string) {
    const result = await setupApiCall(service, "init");
    if (result.success) {
      setSetupStep("success");
      setSetupMessage(result.message || "Connected!");
    } else {
      setSetupStep("instructions");
      setSetupError(result.error || "Setup required");
      setSetupData((prev: any) => ({ ...prev, steps: result.steps }));
    }
  }

  const colorClasses: Record<string, string> = {
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    gray: "from-gray-500/20 to-gray-500/5 border-gray-500/30",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  };

  const currentConnection = connections.find(c => c.id === showSettings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Connections</h1>
                  <p className="text-sm text-gray-400">
                    Link your services
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={checkConnections}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-green-400">
              {connections.filter(c => c.status === "connected").length}
            </div>
            <div className="text-sm text-gray-400">Connected</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {connections.filter(c => c.status === "checking").length}
            </div>
            <div className="text-sm text-gray-400">Checking</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-gray-400">
              {connections.filter(c => c.status === "disconnected").length}
            </div>
            <div className="text-sm text-gray-400">Available</div>
          </div>
        </div>

        {/* Connections Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {connections.map((conn) => (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-xl bg-gradient-to-br ${colorClasses[conn.color]} border transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <conn.icon className="w-8 h-8" />
                  <div>
                    <h3 className="font-semibold">{conn.name}</h3>
                    <p className="text-sm text-gray-400">{conn.description}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                  conn.status === "connected"
                    ? "bg-green-500/20 text-green-400"
                    : conn.status === "checking"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {conn.status === "connected" ? (
                    <><Check className="w-3 h-3" /> Connected</>
                  ) : conn.status === "checking" ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Checking</>
                  ) : (
                    <><X className="w-3 h-3" /> Not connected</>
                  )}
                </div>
              </div>

              {/* Privacy indicator */}
              {conn.settings && (
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-gray-400">
                    {conn.settings.model === "auto" ? "Auto model" : conn.settings.model.split("/")[1]}
                    {" • "}
                    {conn.settings.permissions.filter(p => p.enabled).length} permissions
                    {conn.settings.approvalRules.length > 0 && ` • ${conn.settings.approvalRules.length} rules`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                {conn.status === "connected" ? (
                  <>
                    <Link
                      href={`/${conn.id}`}
                      className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-center transition-colors"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => openSettings(conn)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                      title="Privacy & Permissions"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openSetupWizard(conn.id)}
                    className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Connect
                  </button>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Skill: <code className="bg-white/10 px-1 rounded">{conn.skill}</code>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-400">Coming Soon</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Notion", icon: StickyNote, color: "gray" },
              { name: "HomeKit", icon: Home, color: "orange" },
              { name: "Obsidian", icon: StickyNote, color: "purple" },
            ].map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-xl bg-white/5 border border-white/10 opacity-50"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-6 h-6 text-gray-500" />
                  <span className="text-gray-500">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Setup Wizard Modal */}
      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeSetupWizard}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      Connect {connections.find(c => c.id === showSetup)?.name}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {setupStep === "success" ? "All done!" : "Follow the steps below"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Error display */}
                {setupError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {setupError}
                  </div>
                )}

                {/* Success state */}
                {setupStep === "success" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-lg font-semibold text-green-400">{setupMessage}</p>
                    <button
                      onClick={closeSetupWizard}
                      className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {/* ── GOOGLE FLOW ── */}
                {showSetup === "google" && setupStep === "init" && (
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-400" />
                    <p className="text-gray-400">Checking credentials...</p>
                  </div>
                )}

                {showSetup === "google" && setupStep === "google-credentials" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-2">Step 1: Create OAuth Credentials</p>
                      <ol className="list-decimal list-inside text-gray-400 space-y-1">
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-400 underline">Google Cloud Console</a></li>
                        <li>Create a project (or select existing)</li>
                        <li>Click &quot;Create Credentials&quot; → &quot;OAuth client ID&quot;</li>
                        <li>Application type: &quot;Desktop app&quot;</li>
                        <li>Download the JSON file</li>
                        <li>Paste the JSON contents below</li>
                      </ol>
                    </div>
                    <textarea
                      value={setupData.credentialsJson || ""}
                      onChange={(e) => setSetupData((p: any) => ({ ...p, credentialsJson: e.target.value }))}
                      placeholder='Paste the credentials JSON here (starts with {"installed":...})'
                      rows={6}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white resize-none"
                    />
                    <button
                      onClick={googleSaveCredentials}
                      disabled={setupWorking}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Credentials
                    </button>
                  </div>
                )}

                {showSetup === "google" && setupStep === "google-email" && (
                  <div className="space-y-4">
                    {setupMessage && (
                      <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                        ✓ {setupMessage}
                      </div>
                    )}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-1">Step 2: Enter your Gmail address</p>
                      <p className="text-gray-400">This will start the OAuth authorization flow.</p>
                    </div>
                    <input
                      type="email"
                      value={setupData.email || ""}
                      onChange={(e) => setSetupData((p: any) => ({ ...p, email: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && googleStartAuth()}
                      placeholder="you@gmail.com"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                    />
                    <button
                      onClick={googleStartAuth}
                      disabled={setupWorking}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Start Authorization
                    </button>
                  </div>
                )}

                {showSetup === "google" && setupStep === "google-authorize" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-1">Step 3: Authorize in your browser</p>
                      <p className="text-gray-400">{setupMessage}</p>
                    </div>
                    <a
                      href={setupAuthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-center transition-colors text-blue-400"
                    >
                      <ExternalLink className="w-4 h-4 inline mr-2" />
                      Open Google Sign-In
                    </a>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm text-gray-400 mb-2">After authorizing, paste the redirect URL from your browser:</p>
                      <input
                        type="text"
                        value={setupData.redirectUrl || ""}
                        onChange={(e) => setSetupData((p: any) => ({ ...p, redirectUrl: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && googleCompleteAuth()}
                        placeholder="https://localhost/..."
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono"
                      />
                    </div>
                    <button
                      onClick={googleCompleteAuth}
                      disabled={setupWorking}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Complete Authorization
                    </button>
                  </div>
                )}

                {/* ── GITHUB FLOW ── */}
                {showSetup === "github" && setupStep === "init" && (
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-400">Checking GitHub CLI...</p>
                  </div>
                )}

                {showSetup === "github" && setupStep === "github-token" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-1">Create a Personal Access Token</p>
                      <p className="text-gray-400">{setupMessage}</p>
                    </div>
                    <a
                      href={setupAuthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-center transition-colors text-blue-400"
                    >
                      <ExternalLink className="w-4 h-4 inline mr-2" />
                      Open GitHub → Create Token
                    </a>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm text-gray-400 mb-2">Paste your token here:</p>
                      <input
                        type="password"
                        value={setupData.token || ""}
                        onChange={(e) => setSetupData((p: any) => ({ ...p, token: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && githubComplete()}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono"
                      />
                    </div>
                    <button
                      onClick={githubComplete}
                      disabled={setupWorking}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Connect GitHub
                    </button>
                  </div>
                )}

                {/* ── SIMPLE SERVICES (Reminders, Things, iMessage) ── */}
                {(showSetup === "apple-reminders" || showSetup === "things" || showSetup === "imessage") && setupStep === "init" && (
                  <div className="text-center py-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-400">Checking access...</p>
                  </div>
                )}

                {setupStep === "instructions" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-yellow-400 mb-2">Manual Setup Required</p>
                      <p className="text-gray-400 mb-3">{setupError}</p>
                      {setupData.steps && (
                        <ol className="list-decimal list-inside text-gray-400 space-y-1">
                          {setupData.steps.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                    <button
                      onClick={() => { setSetupStep("init"); setSetupError(""); }}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Check Again
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {setupStep !== "success" && (
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={closeSetupWizard}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && currentConnection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSettings(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{currentConnection.name} Settings</h2>
                    <p className="text-sm text-gray-400">Privacy controls & permissions</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Model Selection */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    AI Model for this data
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Choose which model processes your {currentConnection.name} data. Local models keep data on your machine.
                  </p>
                  
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="auto">🔄 Auto (use primary model)</option>
                    
                    <optgroup label="☁️ Cloud Models">
                      {cloudModels.map(m => (
                        <option key={m} value={m}>☁️ {m}</option>
                      ))}
                    </optgroup>
                    
                    <optgroup label="🏠 Local Models (Private)">
                      {localModels.slice(0, 10).map(m => (
                        <option key={m} value={m}>🏠 {m}</option>
                      ))}
                    </optgroup>
                  </select>

                  {selectedModel.startsWith("ollama/") && (
                    <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Data stays local - never sent to cloud
                    </div>
                  )}

                  {selectedModel !== "auto" && !selectedModel.startsWith("ollama/") && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      Data will be sent to cloud API
                    </div>
                  )}
                </div>

                {/* Permissions */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    Permissions
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Control what Bob can do with your {currentConnection.name} data
                  </p>
                  
                  <div className="space-y-2">
                    {permissions.map((perm) => (
                      <div
                        key={perm.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          perm.enabled
                            ? "bg-white/5 border-white/20"
                            : "bg-white/[0.02] border-white/10 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => togglePermission(perm.id)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                perm.enabled
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-white/30"
                              }`}
                            >
                              {perm.enabled && <Check className="w-3 h-3" />}
                            </button>
                            <div>
                              <div className="font-medium text-sm">{perm.label}</div>
                              <div className="text-xs text-gray-500">{perm.description}</div>
                            </div>
                          </div>
                          
                          {perm.enabled && (
                            <button
                              onClick={() => toggleApproval(perm.id)}
                              className={`px-2 py-1 rounded text-xs transition-colors ${
                                perm.requiresApproval
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-white/10 text-gray-400 hover:bg-white/20"
                              }`}
                            >
                              {perm.requiresApproval ? "⚠️ Needs Approval" : "Auto"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approval Rules */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Custom Approval Rules
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Add custom rules for how Bob should handle sensitive actions
                  </p>

                  {/* Existing rules */}
                  <div className="space-y-2 mb-3">
                    {approvalRules.map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                      >
                        <span className="flex-1 text-sm">{rule}</span>
                        <button
                          onClick={() => removeRule(i)}
                          className="p-1 hover:bg-white/10 rounded text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new rule */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addRule()}
                      placeholder="e.g., Always ask before deleting anything"
                      className="flex-1 p-2 bg-white/5 border border-white/10 rounded-lg text-sm"
                    />
                    <button
                      onClick={addRule}
                      disabled={!newRule.trim()}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg text-sm"
                    >
                      Add
                    </button>
                  </div>

                  {/* Example rules */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Examples (click to add):</p>
                    <div className="flex flex-wrap gap-1">
                      {EXAMPLE_RULES.filter(r => !approvalRules.includes(r)).slice(0, 3).map((rule) => (
                        <button
                          key={rule}
                          onClick={() => setApprovalRules(prev => [...prev, rule])}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400"
                        >
                          + {rule}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
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
  Camera,
  Music,
  Mic,
  Image,
  Hash,
  MessageCircle,
  AtSign,
  BookOpen,
  LayoutGrid,
  Lightbulb,
  Speaker,
  Puzzle,
  Trash2,
} from "lucide-react";

// ── Icon mapping ──
const ICON_MAP: Record<string, any> = {
  "mail": Mail,
  "calendar": Calendar,
  "github": Github,
  "check-square": CheckSquare,
  "sticky-note": StickyNote,
  "message-square": MessageSquare,
  "home": Home,
  "camera": Camera,
  "music": Music,
  "mic": Mic,
  "image": Image,
  "hash": Hash,
  "message-circle": MessageCircle,
  "at-sign": AtSign,
  "book-open": BookOpen,
  "layout-grid": LayoutGrid,
  "lightbulb": Lightbulb,
  "speaker": Speaker,
  "puzzle": Puzzle,
  "zap": Zap,
  "shield": Shield,
};

interface Connection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  skill: string;
  category: string;
  authType: string;
  status: "connected" | "disconnected" | "checking";
  setupSteps?: string[];
  source?: "user" | "builtin";
}

const COLOR_CLASSES: Record<string, string> = {
  red: "from-red-500/20 to-red-500/5 border-red-500/30",
  gray: "from-gray-500/20 to-gray-500/5 border-gray-500/30",
  orange: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
  blue: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
  green: "from-green-500/20 to-green-500/5 border-green-500/30",
  purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  productivity: "📋 Productivity",
  developer: "💻 Developer",
  communication: "💬 Communication",
  social: "🌐 Social",
  media: "🎵 Media",
  "smart-home": "🏠 Smart Home",
  security: "🔒 Security",
  other: "⚡ Other",
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, connected: 0, disconnected: 0 });

  // Setup wizard state
  const [showSetup, setShowSetup] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<string>("init");
  const [setupData, setSetupData] = useState<any>({});
  const [setupError, setSetupError] = useState<string>("");
  const [setupMessage, setSetupMessage] = useState<string>("");
  const [setupAuthUrl, setSetupAuthUrl] = useState<string>("");
  const [setupWorking, setSetupWorking] = useState(false);

  const fetchConnections = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/connections/installed");
      const data = await res.json();
      if (data.connections) {
        setConnections(data.connections);
        setStats({
          total: data.totalInstalled || 0,
          connected: data.connected || 0,
          disconnected: data.disconnected || 0,
        });
      }
    } catch (e) {
      console.error("Failed to fetch connections:", e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // ── Setup wizard functions ──
  function openSetupWizard(conn: Connection) {
    setShowSetup(conn.id);
    setSetupStep("init");
    setSetupData({ connection: conn });
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
    fetchConnections(true);
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

  // ── Google flow ──
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
      setSetupError(result.error || "Failed");
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
    if (!redirectUrl?.includes("http")) { setSetupError("Paste the redirect URL"); return; }
    const result = await setupApiCall("google", "complete-auth", { redirectUrl });
    if (result.success) {
      setSetupStep("success");
      setSetupMessage(result.message || "Connected!");
    } else {
      setSetupError(result.error || "Failed");
    }
  }

  // ── GitHub flow ──
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

  // ── Generic service check ──
  async function simpleSetup(service: string) {
    const result = await setupApiCall(service, "init");
    if (result.success) {
      setSetupStep("success");
      setSetupMessage(result.message || "Connected!");
    } else {
      setSetupStep("instructions");
      setSetupError(result.error || "Setup required");
      setSetupData((prev: any) => ({ ...prev, steps: result.steps || prev.connection?.setupSteps }));
    }
  }

  // ── Edit modal state ──
  const [showEdit, setShowEdit] = useState<Connection | null>(null);
  const [editWorking, setEditWorking] = useState(false);

  function openEditModal(conn: Connection) {
    setShowEdit(conn);
  }

  async function disconnectService(conn: Connection) {
    if (!confirm(`Disconnect ${conn.name}? This will remove auth credentials for this service.`)) return;
    setEditWorking(true);
    try {
      const res = await fetch("/api/connections/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: conn.id, step: "disconnect" }),
      });
      const data = await res.json();
      if (data.success || data.error?.includes("not")) {
        setShowEdit(null);
        fetchConnections(true);
      } else {
        alert(data.error || "Failed to disconnect");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setEditWorking(false);
  }

  async function confirmUninstall(conn: Connection) {
    if (!confirm(`Uninstall ${conn.name} skill? This removes the skill from your workspace.`)) return;
    try {
      const res = await fetch("/api/connections/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: conn.id, step: "uninstall", data: { skill: conn.skill } }),
      });
      const data = await res.json();
      if (data.success) {
        fetchConnections(true);
      } else {
        alert(data.error || "Failed to uninstall");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  }

  // Auto-trigger setup steps
  useEffect(() => {
    if (!showSetup || setupStep !== "init") return;
    const conn = connections.find(c => c.id === showSetup);
    if (!conn) return;

    if (showSetup === "google") {
      googleCheckCredentials();
    } else if (showSetup === "github") {
      githubInit();
    } else if (conn.authType === "system-permission" || conn.authType === "app-required") {
      simpleSetup(showSetup);
    } else if (conn.authType === "none") {
      setSetupStep("success");
      setSetupMessage("Already connected! No setup needed.");
    } else {
      // Generic: show manual steps
      setSetupStep("instructions");
      setSetupData((prev: any) => ({ ...prev, steps: conn.setupSteps }));
      setSetupError(
        conn.authType === "token" ? "Authentication required" :
        conn.authType === "api-key" ? "API key required" :
        "Setup required"
      );
    }
  }, [showSetup]);

  // Split: active (connected OR user-installed) vs available (builtin + disconnected)
  const activeConnections = connections.filter(
    c => c.status === "connected" || c.source === "user"
  );
  const availableConnections = connections.filter(
    c => c.status === "disconnected" && c.source === "builtin"
  );

  const [showAvailable, setShowAvailable] = useState(false);

  // Group active connections by category
  const grouped = activeConnections.reduce((acc, conn) => {
    const cat = conn.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(conn);
    return acc;
  }, {} as Record<string, Connection[]>);

  const currentConn = connections.find(c => c.id === showSetup);
  const IconFor = (name: string) => ICON_MAP[name] || Puzzle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Connections</h1>
                  <p className="text-sm text-gray-400">
                    External services &amp; integrations
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => fetchConnections(true)}
              disabled={refreshing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-green-400">
              {activeConnections.filter(c => c.status === "connected").length}
            </div>
            <div className="text-sm text-gray-400">Connected</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {activeConnections.filter(c => c.status === "disconnected").length}
            </div>
            <div className="text-sm text-gray-400">Needs Setup</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Skills</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">Scanning installed skills...</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-16">
            <Puzzle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-4">No skills installed yet</p>
            <Link href="/skills" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              Browse Skills
            </Link>
          </div>
        ) : (
          /* Grouped by category */
          Object.entries(grouped).map(([category, conns]) => (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-gray-300">
                {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {conns.map((conn) => {
                  const Icon = IconFor(conn.icon);
                  return (
                    <motion.div
                      key={conn.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl bg-gradient-to-br ${COLOR_CLASSES[conn.color] || COLOR_CLASSES.gray} border transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon className="w-6 h-6 flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold text-sm">{conn.name}</h3>
                            <p className="text-xs text-gray-400">{conn.description}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                          conn.status === "connected"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {conn.status === "connected" ? (
                            <><Check className="w-3 h-3" /> OK</>
                          ) : (
                            <><X className="w-3 h-3" /> Setup</>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {conn.status === "connected" ? (
                          <>
                            <div className="flex-1 py-1.5 px-3 bg-green-500/10 rounded-lg text-xs text-center text-green-400">
                              ✓ Connected
                            </div>
                            <button
                              onClick={() => openEditModal(conn)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                              title="Edit connection"
                            >
                              <Settings className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openSetupWizard(conn)}
                              className="flex-1 py-1.5 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-center transition-colors flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Connect
                            </button>
                            {conn.source === "user" && (
                              <button
                                onClick={() => confirmUninstall(conn)}
                                className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Uninstall skill"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <code className="bg-white/10 px-1 rounded">{conn.skill}</code>
                        <span className={`px-1.5 py-0.5 rounded-full ${
                          conn.source === "user"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : "bg-white/5 text-gray-500 border border-white/10"
                        }`}>
                          {conn.source === "user" ? "installed" : "built-in"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Available to Set Up (collapsed) */}
        {!loading && availableConnections.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowAvailable(!showAvailable)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors mb-4"
            >
              <span className="text-sm font-semibold">
                {showAvailable ? "▼" : "▶"} Available to Set Up ({availableConnections.length})
              </span>
            </button>
            {showAvailable && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableConnections.map((conn) => {
                  const Icon = IconFor(conn.icon);
                  return (
                    <div
                      key={conn.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3"
                    >
                      <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-400">{conn.name}</p>
                        <p className="text-xs text-gray-600 truncate">{conn.description}</p>
                      </div>
                      <button
                        onClick={() => openSetupWizard(conn)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400 transition-colors flex-shrink-0"
                      >
                        Setup
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Link to Skills Store */}
        {!loading && (
          <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-gray-400 mb-3">Want more connections? Install skills from the store.</p>
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Browse Skills Store
            </Link>
          </div>
        )}
      </main>

      {/* ── Edit/Manage Modal ── */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEdit(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  {(() => { const I = IconFor(showEdit.icon); return <I className="w-6 h-6 text-green-400" />; })()}
                  <div>
                    <h2 className="text-lg font-semibold">{showEdit.name}</h2>
                    <p className="text-sm text-green-400">Connected</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Skill</span>
                    <code className="text-gray-300">{showEdit.skill}</code>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Auth Type</span>
                    <span className="text-gray-300">{showEdit.authType}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Source</span>
                    <span className="text-gray-300">{showEdit.source === "user" ? "User installed" : "Built-in"}</span>
                  </div>
                </div>

                {/* Reconnect */}
                <button
                  onClick={() => { setShowEdit(null); openSetupWizard(showEdit); }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect / Re-authenticate
                </button>

                {/* Disconnect */}
                {showEdit.authType !== "none" && (
                  <button
                    onClick={() => disconnectService(showEdit)}
                    disabled={editWorking}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {editWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Disconnect
                  </button>
                )}

                {/* Uninstall (user-installed only) */}
                {showEdit.source === "user" && (
                  <button
                    onClick={() => { const c = showEdit; setShowEdit(null); confirmUninstall(c); }}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Uninstall Skill
                  </button>
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex justify-end">
                <button onClick={() => setShowEdit(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Setup Wizard Modal ── */}
      <AnimatePresence>
        {showSetup && currentConn && (
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
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    {(() => { const I = IconFor(currentConn.icon); return <I className="w-6 h-6 text-purple-400" />; })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Connect {currentConn.name}</h2>
                    <p className="text-sm text-gray-400">
                      {setupStep === "success" ? "All done!" : `Auth: ${currentConn.authType}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* Error */}
                {setupError && setupStep !== "instructions" && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {setupError}
                  </div>
                )}

                {/* Success */}
                {setupStep === "success" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-lg font-semibold text-green-400">{setupMessage}</p>
                    <button onClick={closeSetupWizard} className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                      Done
                    </button>
                  </div>
                )}

                {/* Loading */}
                {setupStep === "init" && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-400" />
                    <p className="text-gray-400">Checking...</p>
                  </div>
                )}

                {/* ── GOOGLE ── */}
                {showSetup === "google" && setupStep === "google-credentials" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-2">Step 1: Create OAuth Credentials</p>
                      <ol className="list-decimal list-inside text-gray-400 space-y-1">
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-400 underline">Google Cloud Console</a></li>
                        <li>Create a project (or select existing)</li>
                        <li>Enable Gmail, Calendar, Drive APIs</li>
                        <li>Create Credentials → OAuth client ID → Desktop app</li>
                        <li>Download JSON and paste below</li>
                      </ol>
                    </div>
                    <textarea
                      value={setupData.credentialsJson || ""}
                      onChange={(e) => setSetupData((p: any) => ({ ...p, credentialsJson: e.target.value }))}
                      placeholder='{"installed":{"client_id":"...","client_secret":"..."}}'
                      rows={5}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white resize-none"
                    />
                    <button onClick={googleSaveCredentials} disabled={setupWorking}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2">
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Credentials
                    </button>
                  </div>
                )}

                {showSetup === "google" && setupStep === "google-email" && (
                  <div className="space-y-4">
                    {setupMessage && (
                      <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">✓ {setupMessage}</div>
                    )}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-1">Step 2: Enter your Gmail</p>
                      <p className="text-gray-400">This starts the OAuth authorization.</p>
                    </div>
                    <input type="email" value={setupData.email || ""}
                      onChange={(e) => setSetupData((p: any) => ({ ...p, email: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && googleStartAuth()}
                      placeholder="you@gmail.com"
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white" />
                    <button onClick={googleStartAuth} disabled={setupWorking}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2">
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Start Authorization
                    </button>
                  </div>
                )}

                {showSetup === "google" && setupStep === "google-authorize" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-1">Step 3: Authorize</p>
                      <p className="text-gray-400">{setupMessage}</p>
                    </div>
                    <a href={setupAuthUrl} target="_blank" rel="noopener noreferrer"
                      className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-center text-blue-400">
                      <ExternalLink className="w-4 h-4 inline mr-2" />Open Google Sign-In
                    </a>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm text-gray-400 mb-2">After authorizing, paste the redirect URL:</p>
                      <input type="text" value={setupData.redirectUrl || ""}
                        onChange={(e) => setSetupData((p: any) => ({ ...p, redirectUrl: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && googleCompleteAuth()}
                        placeholder="https://localhost/..."
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono" />
                    </div>
                    <button onClick={googleCompleteAuth} disabled={setupWorking}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2">
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Complete Authorization
                    </button>
                  </div>
                )}

                {/* ── GITHUB ── */}
                {showSetup === "github" && setupStep === "github-token" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-blue-400 mb-1">Create a Personal Access Token</p>
                      <p className="text-gray-400">{setupMessage}</p>
                    </div>
                    <a href={setupAuthUrl} target="_blank" rel="noopener noreferrer"
                      className="block w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg text-center text-blue-400">
                      <ExternalLink className="w-4 h-4 inline mr-2" />Open GitHub → Create Token
                    </a>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm text-gray-400 mb-2">Paste your token:</p>
                      <input type="password" value={setupData.token || ""}
                        onChange={(e) => setSetupData((p: any) => ({ ...p, token: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && githubComplete()}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono" />
                    </div>
                    <button onClick={githubComplete} disabled={setupWorking}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2">
                      {setupWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Connect GitHub
                    </button>
                  </div>
                )}

                {/* ── INSTRUCTIONS (generic) ── */}
                {setupStep === "instructions" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                      <p className="font-semibold text-yellow-400 mb-2">Setup Required</p>
                      <p className="text-gray-400 mb-3">{setupError}</p>
                      {(setupData.steps || currentConn?.setupSteps) && (
                        <ol className="list-decimal list-inside text-gray-400 space-y-1">
                          {(setupData.steps || currentConn?.setupSteps || []).map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                    <button onClick={() => { setSetupStep("init"); setSetupError(""); }}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />Check Again
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {setupStep !== "success" && (
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <button onClick={closeSetupWizard} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  Search,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Check,
  Package,
  Globe,
  Folder,
  Star,
  Code,
  Terminal,
  Cpu,
  MessageSquare,
  Camera,
  Music,
  Calendar,
  Mail,
  Cloud,
  Home,
  ShoppingBag,
  Grid,
  List,
  ChevronRight,
  X,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Skill {
  name: string;
  slug?: string;
  description: string;
  version?: string;
  homepage?: string;
  url?: string;
  author?: string;
  installed?: boolean;
  category?: string;
}

interface StoreCategory {
  name: string;
  id: string;
  count: number;
  skills: Skill[];
}

const CATEGORY_ICONS: Record<string, string> = {
  "apple-apps--services": "🍎",
  "smart-home--iot": "🏠",
  "calendar--scheduling": "📅",
  "communication": "💬",
  "media--streaming": "🎵",
  "notes--pkm": "📝",
  "search--research": "🔍",
  "ai--llms": "🤖",
  "coding-agents--ides": "💻",
  "web--frontend-development": "🌐",
  "devops--cloud": "☁️",
  "browser--automation": "🔄",
  "cli-utilities": "⌨️",
  "productivity--tasks": "✅",
  "finance": "💰",
  "health--fitness": "❤️",
  "shopping--e-commerce": "🛒",
  "security--passwords": "🔐",
  "gaming": "🎮",
  "pdf--documents": "📄",
  "git--github": "🐙",
  "image--video-generation": "🎨",
  "speech--transcription": "🎤",
  "transportation": "🚗",
  "personal-development": "📚",
  "marketing--sales": "📈",
  "data--analytics": "📊",
  "self-hosted--automation": "🖥️",
  "ios--macos-development": "📱",
  "moltbook": "📓",
  "clawdbot-tools": "🛠️",
};

export default function SkillsPage() {
  const [loading, setLoading] = useState(true);
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "store">("installed");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const [installSuccess, setInstallSuccess] = useState<string | null>(null);
  const [configSkill, setConfigSkill] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => {
    loadInstalledSkills();
  }, []);

  useEffect(() => {
    if (activeTab === "store" && storeCategories.length === 0) {
      loadStoreSkills();
    }
  }, [activeTab]);

  async function loadInstalledSkills() {
    setLoading(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await res.json();
      if (data.skills) {
        setInstalledSkills(data.skills);
      }
    } catch (e) {
      console.error("Failed to load skills:", e);
    }
    setLoading(false);
  }

  async function loadStoreSkills() {
    setStoreLoading(true);
    try {
      const url = selectedCategory
        ? `/api/skills/store?category=${selectedCategory}`
        : "/api/skills/store";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStoreCategories(data.categories || []);
      }
    } catch (e) {
      console.error("Failed to load store:", e);
    }
    setStoreLoading(false);
  }

  async function installSkill(slug: string) {
    setInstalling(slug);
    setInstallSuccess(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", name: slug }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallSuccess(slug);
        await loadInstalledSkills();
        setTimeout(() => setInstallSuccess(null), 5000);
      } else {
        alert(`Failed to install: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setInstalling(null);
  }

  async function openConfig(skillName: string) {
    setConfigLoading(true);
    setConfigSkill(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "configure", name: skillName }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSkill(data.skill);
      } else {
        alert(data.error || "Could not load skill config");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
    setConfigLoading(false);
  }

  async function uninstallSkill(name: string) {
    if (!confirm(`Uninstall skill "${name}"?`)) return;
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "uninstall", name }),
      });
      const data = await res.json();
      if (data.success) {
        await loadInstalledSkills();
      } else {
        alert(`Failed to uninstall: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  }

  const filteredInstalled = installedSkills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [clawHubResults, setClawHubResults] = useState<Skill[]>([]);
  const [searchingClawHub, setSearchingClawHub] = useState(false);

  // Search ClawHub when query changes (debounced)
  useEffect(() => {
    if (activeTab !== "store" || !searchQuery || searchQuery.length < 2) {
      setClawHubResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingClawHub(true);
      try {
        const res = await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "search", query: searchQuery }),
        });
        const data = await res.json();
        if (data.success && data.skills) {
          setClawHubResults(data.skills);
        }
      } catch {}
      setSearchingClawHub(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const filteredStoreSkills = searchQuery
    ? clawHubResults.length > 0 
      ? clawHubResults 
      : storeCategories.flatMap(c => c.skills).filter(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : [];

  const isInstalled = (slug: string) =>
    installedSkills.some(s => s.name === slug || s.name.includes(slug));

  const totalStoreSkills = storeCategories.reduce((acc, c) => acc + c.count, 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Skills</h1>
                  <p className="text-sm text-gray-400">
                    {installedSkills.length} installed • {totalStoreSkills}+ in store
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => activeTab === "installed" ? loadInstalledSkills() : loadStoreSkills()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading || storeLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab("installed"); setSelectedCategory(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === "installed" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              Installed
            </button>
            <button
              onClick={() => setActiveTab("store")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === "store" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Store
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "installed" ? "Search installed..." : "Search 1700+ skills..."}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-yellow-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Success Banner */}
        <AnimatePresence>
          {installSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center gap-2"
            >
              <Check className="w-5 h-5 text-green-400" />
              <span>Successfully installed <strong>{installSuccess}</strong>!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Installed Tab */}
        {activeTab === "installed" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstalled.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No skills installed yet</p>
                <button
                  onClick={() => setActiveTab("store")}
                  className="mt-4 text-yellow-400 hover:underline"
                >
                  Browse the store →
                </button>
              </div>
            ) : (
              filteredInstalled.map((skill) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{skill.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openConfig(skill.name)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-yellow-400 transition-colors"
                        title="Configure"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => uninstallSkill(skill.name)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                        title="Uninstall"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{skill.description}</p>
                  {skill.version && (
                    <div className="mt-2 text-xs text-gray-500">v{skill.version}</div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Store Tab */}
        {activeTab === "store" && (
          <>
            {/* Category breadcrumb */}
            {selectedCategory && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-yellow-400 hover:underline"
                >
                  All Categories
                </button>
                <ChevronRight className="w-4 h-4 text-gray-500" />
                <span>{storeCategories.find(c => c.id === selectedCategory)?.name}</span>
              </div>
            )}

            {storeLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            ) : searchQuery ? (
              /* Search results */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {searchingClawHub ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching ClawHub...
                      </span>
                    ) : (
                      `${filteredStoreSkills.length} results for "${searchQuery}"`
                    )}
                  </h3>
                  {clawHubResults.length > 0 && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      via ClawHub
                    </span>
                  )}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStoreSkills.slice(0, 30).map((skill) => (
                    <SkillCard
                      key={skill.slug}
                      skill={skill}
                      installed={isInstalled(skill.slug || skill.name)}
                      installing={installing === (skill.author ? `${skill.author}/${skill.slug}` : skill.slug)}
                      onInstall={() => installSkill(skill.author ? `${skill.author}/${skill.slug}` : (skill.slug || skill.name))}
                    />
                  ))}
                </div>
              </div>
            ) : selectedCategory ? (
              /* Skills in category */
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeCategories
                  .find(c => c.id === selectedCategory)
                  ?.skills.map((skill) => (
                    <SkillCard
                      key={skill.slug}
                      skill={skill}
                      installed={isInstalled(skill.slug || skill.name)}
                      installing={installing === (skill.author ? `${skill.author}/${skill.slug}` : skill.slug)}
                      onInstall={() => installSkill(skill.author ? `${skill.author}/${skill.slug}` : (skill.slug || skill.name))}
                    />
                  ))}
              </div>
            ) : (
              /* Category grid */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {storeCategories.map((cat) => (
                  <motion.button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 transition-all text-left group"
                  >
                    <div className="text-2xl mb-2">
                      {CATEGORY_ICONS[cat.id] || "📦"}
                    </div>
                    <h3 className="font-semibold truncate">{cat.name}</h3>
                    <p className="text-sm text-gray-400">{cat.count} skills</p>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>

    {/* Config Modal */}
    <AnimatePresence>
      {(configSkill || configLoading) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setConfigSkill(null); setConfigLoading(false); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {configLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-yellow-400" />
                <p className="text-gray-400">Loading configuration...</p>
              </div>
            ) : configSkill ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Settings className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{configSkill.name}</h2>
                      <p className="text-sm text-gray-400">{configSkill.description}</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[55vh]">
                  {/* Status */}
                  <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
                    configSkill.allMet
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  }`}>
                    {configSkill.allMet ? (
                      <><CheckCircle className="w-4 h-4" /> All requirements met — ready to use!</>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /> Some requirements need attention</>
                    )}
                  </div>

                  {/* Requirements */}
                  {configSkill.checks?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Requirements</h3>
                      <div className="space-y-2">
                        {configSkill.checks.map((check: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg border ${
                            check.met ? "bg-white/5 border-white/10" : "bg-red-500/10 border-red-500/30"
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {check.met ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <X className="w-4 h-4 text-red-400" />
                                )}
                                <span className="text-sm">
                                  {check.type === "bin" ? `CLI: ${check.name}` : `Env: ${check.name}`}
                                </span>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                check.met ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                              }`}>
                                {check.met ? "Found" : "Missing"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Install Steps */}
                  {configSkill.installSteps?.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Install Commands</h3>
                      <div className="space-y-2">
                        {configSkill.installSteps.map((step: any, i: number) => (
                          <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-sm text-gray-300 mb-1">{step.label}</p>
                            {step.formula && (
                              <code className="text-xs bg-black/30 px-2 py-1 rounded text-yellow-400 block">
                                brew install {step.formula}
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Start */}
                  {configSkill.quickStart && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Quick Start</h3>
                      <pre className="p-3 bg-black/30 rounded-lg text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                        {configSkill.quickStart}
                      </pre>
                    </div>
                  )}

                  {/* No config needed */}
                  {configSkill.checks?.length === 0 && !configSkill.installSteps?.length && (
                    <div className="text-center py-4 text-gray-400">
                      <p>No special configuration needed.</p>
                      <p className="text-sm mt-1">This skill works out of the box!</p>
                    </div>
                  )}

                  {/* Path */}
                  <div className="text-xs text-gray-500">
                    Path: <code className="bg-white/5 px-1 rounded">{configSkill.path}</code>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setConfigSkill(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

function SkillCard({
  skill,
  installed,
  installing,
  onInstall,
}: {
  skill: Skill;
  installed: boolean;
  installing: boolean;
  onInstall: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold">{skill.name}</h3>
          {skill.author && (
            <div className="text-xs text-gray-500">by {skill.author}</div>
          )}
        </div>
        {skill.url && (
          <a
            href={skill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
        {skill.description || "No description"}
      </p>
      <button
        onClick={onInstall}
        disabled={installed || installing}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
          installed
            ? "bg-green-500/20 text-green-400 cursor-default"
            : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
        }`}
      >
        {installing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : installed ? (
          <>
            <Check className="w-4 h-4" />
            Installed
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Install
          </>
        )}
      </button>
    </motion.div>
  );
}

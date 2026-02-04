"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";

interface Skill {
  name: string;
  description: string;
  version?: string;
  homepage?: string;
  installed: boolean;
  category?: string;
  icon?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  "ai": Cpu,
  "automation": Code,
  "browser": Globe,
  "calendar": Calendar,
  "camera": Camera,
  "chat": MessageSquare,
  "cli": Terminal,
  "cloud": Cloud,
  "email": Mail,
  "media": Music,
  "default": Package,
};

export default function SkillsPage() {
  const [loading, setLoading] = useState(true);
  const [installedSkills, setInstalledSkills] = useState<Skill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "browse">("installed");
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    setLoading(true);
    try {
      // Load installed skills from API
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await res.json();
      if (data.skills) {
        setInstalledSkills(data.skills);
      }

      // Load available skills from ClawdHub
      const hubRes = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "browse" }),
      });
      const hubData = await hubRes.json();
      if (hubData.skills) {
        setAvailableSkills(hubData.skills);
      }
    } catch (e) {
      console.error("Failed to load skills:", e);
    }
    setLoading(false);
  }

  const [installSuccess, setInstallSuccess] = useState<string | null>(null);

  async function installSkill(name: string) {
    setInstalling(name);
    setInstallSuccess(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", name }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallSuccess(name);
        await loadSkills();
        // Auto-hide success message after 5 seconds
        setTimeout(() => setInstallSuccess(null), 5000);
      } else {
        alert(`Failed to install: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setInstalling(null);
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
        await loadSkills();
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

  const filteredAvailable = availableSkills.filter(s =>
    !installedSkills.some(i => i.name === s.name) &&
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Skills</h1>
              <p className="text-sm text-muted-foreground">
                {installedSkills.length} installed
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSkills()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href="https://clawdhub.com"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition-colors"
          >
            <Globe className="w-4 h-4" />
            ClawdHub
          </a>
        </div>
      </header>

      {/* Success Banner */}
      {installSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-6 p-4 rounded-xl bg-accent/20 border border-accent/30 flex items-center gap-3"
        >
          <Check className="w-5 h-5 text-accent" />
          <div className="flex-1">
            <p className="font-medium text-accent">Installed "{installSuccess}" successfully!</p>
            <p className="text-sm text-muted-foreground">✓ No restart required — skill is ready to use immediately</p>
          </div>
          <button
            onClick={() => setInstallSuccess(null)}
            className="p-1 rounded hover:bg-accent/20 transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills..."
          className="w-full pl-12 pr-4 py-3 bg-secondary rounded-xl border border-border focus:border-primary outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("installed")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === "installed"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary"
          }`}
        >
          <Folder className="w-4 h-4" />
          Installed ({filteredInstalled.length})
        </button>
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === "browse"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary"
          }`}
        >
          <Globe className="w-4 h-4" />
          Browse ClawdHub
        </button>
      </div>

      {/* Content */}
      {activeTab === "installed" ? (
        <div className="space-y-4">
          {filteredInstalled.length === 0 ? (
            <div className="p-12 rounded-xl bg-secondary/50 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No skills installed</p>
              <p className="text-sm text-muted-foreground mb-4">
                Browse ClawdHub to find and install skills
              </p>
              <button
                onClick={() => setActiveTab("browse")}
                className="px-4 py-2 bg-primary rounded-lg hover:bg-primary-hover transition-colors"
              >
                Browse Skills
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInstalled.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onUninstall={() => uninstallSkill(skill.name)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAvailable.length === 0 ? (
            <div className="p-12 rounded-xl bg-secondary/50 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No skills found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Check back later for new skills"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAvailable.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onInstall={() => installSkill(skill.name)}
                  installing={installing === skill.name}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Featured Categories */}
      {activeTab === "browse" && !searchQuery && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { name: "AI & Models", icon: Cpu, query: "ai" },
              { name: "Automation", icon: Code, query: "automation" },
              { name: "Browser", icon: Globe, query: "browser" },
              { name: "Communication", icon: MessageSquare, query: "chat" },
              { name: "Media", icon: Camera, query: "media" },
              { name: "Productivity", icon: Calendar, query: "productivity" },
            ].map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSearchQuery(cat.query)}
                className="p-4 rounded-xl bg-card hover:bg-card/80 border border-border text-center transition-colors"
              >
                <cat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{cat.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help */}
      <div className="mt-8 p-6 rounded-xl bg-card border border-border">
        <h3 className="font-semibold mb-3">Installing Skills Manually</h3>
        <p className="text-sm text-muted-foreground mb-3">
          You can also install skills via the command line:
        </p>
        <code className="block p-3 rounded-lg bg-secondary text-sm font-mono">
          clawdhub install &lt;skill-name&gt;
        </code>
        <p className="text-xs text-muted-foreground mt-3">
          Skills are installed to your workspace&apos;s <code className="bg-secondary px-1 rounded">skills/</code> directory.
        </p>
      </div>
    </main>
  );
}

function SkillCard({
  skill,
  onInstall,
  onUninstall,
  installing,
}: {
  skill: Skill;
  onInstall?: () => void;
  onUninstall?: () => void;
  installing?: boolean;
}) {
  const IconComponent = CATEGORY_ICONS[skill.category || "default"] || Package;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{skill.name}</h3>
            {skill.installed && (
              <Check className="w-4 h-4 text-accent flex-shrink-0" />
            )}
          </div>
          {skill.version && (
            <p className="text-xs text-muted-foreground">v{skill.version}</p>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
        {skill.description || "No description available"}
      </p>

      <div className="flex items-center gap-2 mt-4">
        {skill.homepage && (
          <a
            href={skill.homepage}
            target="_blank"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="View docs"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        
        <div className="flex-1" />

        {onUninstall && (
          <button
            onClick={onUninstall}
            className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
            title="Uninstall"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {onInstall && (
          <button
            onClick={onInstall}
            disabled={installing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {installing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install
          </button>
        )}
      </div>
    </motion.div>
  );
}

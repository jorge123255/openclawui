"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Zap,
  Calendar,
  Mail,
  Github,
  Brain,
  Activity,
  Shield,
  Plug,
  Cpu,
  X,
  Command,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  icon: any;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: CommandItem[] = [
    { id: "home", label: "Go to Dashboard", icon: Home, action: () => router.push("/"), keywords: ["home", "dashboard"], shortcut: "⌘H" },
    { id: "chat", label: "Open Chat", icon: MessageSquare, action: () => router.push("/chat"), keywords: ["chat", "message", "talk"] },
    { id: "skills", label: "Browse Skills", icon: Sparkles, action: () => router.push("/skills"), keywords: ["skills", "store", "install"] },
    { id: "connections", label: "Manage Connections", icon: Zap, action: () => router.push("/connections"), keywords: ["connections", "integrations", "google", "github"] },
    { id: "models", label: "AI Models", icon: Cpu, action: () => router.push("/models"), keywords: ["models", "ai", "ollama", "claude", "gpt"] },
    { id: "settings", label: "Settings", icon: Settings, action: () => router.push("/settings"), keywords: ["settings", "config", "preferences"] },
    { id: "memory", label: "Memory", icon: Brain, action: () => router.push("/memory"), keywords: ["memory", "search", "files"] },
    { id: "sessions", label: "Sessions", icon: Activity, action: () => router.push("/sessions"), keywords: ["sessions", "conversations"] },
    { id: "logs", label: "View Logs", icon: Shield, action: () => router.push("/logs"), keywords: ["logs", "history", "transcripts"] },
    { id: "email", label: "Email", icon: Mail, action: () => router.push("/email"), keywords: ["email", "inbox", "gmail"] },
    { id: "calendar", label: "Calendar", icon: Calendar, action: () => router.push("/calendar"), keywords: ["calendar", "events", "schedule"] },
    { id: "github", label: "GitHub", icon: Github, action: () => router.push("/github"), keywords: ["github", "repos", "prs"] },
  ];

  const filteredCommands = query
    ? commands.filter(cmd =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.keywords?.some(k => k.includes(query.toLowerCase()))
      )
    : commands;

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
      setQuery("");
      setSelectedIndex(0);
    }

    function handleClose() {
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Open with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setQuery("");
        setSelectedIndex(0);
      }
    }

    window.addEventListener("open-command-palette", handleOpen);
    window.addEventListener("close-modal", handleClose);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-command-palette", handleOpen);
      window.removeEventListener("close-modal", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="w-5 h-5 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-white/5 rounded">
                  <Command className="w-3 h-3" />K
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No commands found
                  </div>
                ) : (
                  filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-white/10 text-white"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <cmd.icon className="w-5 h-5" />
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-white/10 text-xs text-gray-500 flex items-center justify-between">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

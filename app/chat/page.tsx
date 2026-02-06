"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Highlight, themes } from "prism-react-renderer";
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  Mic,
  MicOff,
  Play,
  Pencil,
  Download,
  RefreshCw,
  Package,
  Terminal as TerminalIcon,
  Paperclip,
  Eye,
  Search,
  X,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import dynamic from "next/dynamic";

const EmbeddedTerminal = dynamic(() => import("../components/Terminal"), { ssr: false });
const HtmlPreview = dynamic(() => import("../components/HtmlPreview"), { ssr: false });
const FileUpload = dynamic(() => import("../components/FileUpload"), { ssr: false });
const AgentMode = dynamic(() => import("../components/AgentMode"), { ssr: false });
const NotebookMode = dynamic(() => import("../components/NotebookMode"), { ssr: false });
const DesignMode = dynamic(() => import("../components/DesignMode"), { ssr: false });
const ProjectPanel = dynamic(() => import("../components/ProjectPanel"), { ssr: false });
const DiffViewer = dynamic(() => import("@/app/components/DiffViewer"), { ssr: false });
const MultiAgentMode = dynamic(() => import("../components/MultiAgentMode"), { ssr: false });

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
}

interface MessageSegment {
  type: "text" | "code";
  content: string;
  language?: string;
}

interface AssistantInfo {
  name: string;
  avatar: string;
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function getPrismLanguage(lang: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    node: "javascript",
    ts: "typescript",
    py: "python",
    python3: "python",
    sh: "bash",
    shell: "bash",
    zsh: "bash",
    rb: "ruby",
    rs: "rust",
    kt: "kotlin",
    kts: "kotlin",
    golang: "go",
    "c++": "cpp",
    pl: "perl",
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
}

function getDefaultFilename(lang: string): string {
  const map: Record<string, string> = {
    python: "script.py",
    py: "script.py",
    python3: "script.py",
    javascript: "script.js",
    js: "script.js",
    node: "script.js",
    typescript: "script.ts",
    ts: "script.ts",
    bash: "script.sh",
    sh: "script.sh",
    shell: "script.sh",
    zsh: "script.sh",
    go: "main.go",
    golang: "main.go",
    rust: "main.rs",
    rs: "main.rs",
    c: "main.c",
    cpp: "main.cpp",
    "c++": "main.cpp",
    java: "Main.java",
    kotlin: "script.kts",
    kt: "script.kts",
    kts: "script.kts",
    php: "script.php",
    ruby: "script.rb",
    rb: "script.rb",
    perl: "script.pl",
    pl: "script.pl",
    lua: "script.lua",
    swift: "main.swift",
    r: "script.R",
  };
  return map[lang.toLowerCase()] || `script.${lang}`;
}

function detectMissingModule(output: string, lang: string): string | null {
  if (["python", "py", "python3"].includes(lang)) {
    const match = output.match(
      /ModuleNotFoundError: No module named '([^']+)'/,
    );
    return match ? match[1] : null;
  }
  if (["javascript", "js", "node", "typescript", "ts"].includes(lang)) {
    const match = output.match(/Cannot find module '([^']+)'/);
    return match ? match[1] : null;
  }
  return null;
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function parseMessageContent(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      content: match[2].replace(/\n$/, ""),
      language: match[1] || "code",
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content });
  }

  return segments;
}

function renderMarkdownText(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  html = html.replace(
    /`([^`\n]+)`/g,
    '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>',
  );

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

  html = html.replace(
    /^### (.+)$/gm,
    '<div style="font-size:1.1em;font-weight:700;margin:12px 0 4px">$1</div>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<div style="font-size:1.2em;font-weight:700;margin:14px 0 4px">$1</div>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<div style="font-size:1.35em;font-weight:700;margin:16px 0 6px">$1</div>',
  );

  html = html.replace(
    /^[\-\*] (.+)$/gm,
    '<div style="padding-left:16px">• $1</div>',
  );

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline">$1</a>',
  );

  html = html.replace(/\n/g, "<br>");

  return html;
}

function renderMarkdownTextLight(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  html = html.replace(
    /`([^`\n]+)`/g,
    '<code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>',
  );

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

  html = html.replace(
    /^### (.+)$/gm,
    '<div style="font-size:1.1em;font-weight:700;margin:12px 0 4px">$1</div>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<div style="font-size:1.2em;font-weight:700;margin:14px 0 4px">$1</div>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<div style="font-size:1.35em;font-weight:700;margin:16px 0 6px">$1</div>',
  );

  html = html.replace(
    /^[\-\*] (.+)$/gm,
    '<div style="padding-left:16px">• $1</div>',
  );

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline">$1</a>',
  );

  html = html.replace(/\n/g, "<br>");

  return html;
}

// ─── CodeBlock component ─────────────────────────────────────────────────────

function CodeBlock({ code, language, onPreviewHtml, codeTheme }: { code: string; language: string; onPreviewHtml?: (html: string) => void; codeTheme?: "dark" | "light" }) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installOutput, setInstallOutput] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    success: boolean;
    output: string;
    exitCode: number;
    elapsed: number;
  } | null>(null);
  const [showOutput, setShowOutput] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = codeTheme !== "light";
  const displayLang = language || "code";
  const displayCode = editedCode !== code ? editedCode : code;
  const hasBeenRun = output !== null;

  const canRun = [
    "python", "py", "python3", "javascript", "js", "node", "typescript", "ts",
    "bash", "sh", "shell", "zsh", "ruby", "rb", "go", "golang", "rust", "rs",
    "c", "cpp", "c++", "swift", "java", "kotlin", "kt", "kts", "php", "perl",
    "pl", "lua", "r",
  ].includes(displayLang.toLowerCase());

  const canPreview = ["html", "htm", "svg"].includes(displayLang.toLowerCase());

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [editing, editedCode]);

  async function copyCode() {
    await navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runCode() {
    setRunning(true);
    setOutput(null);
    setShowOutput(true);
    setInstallOutput(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: displayCode, language: displayLang }),
      });
      const data = await res.json();
      setOutput(data);
    } catch (e: any) {
      setOutput({ success: false, output: e.message, exitCode: 1, elapsed: 0 });
    }
    setRunning(false);
  }

  async function saveToFile() {
    const defaultName = getDefaultFilename(displayLang);
    const filename = window.prompt("Save as:", defaultName);
    if (!filename) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: displayCode, filename }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  }

  async function installAndRetry(pkg: string) {
    setInstalling(true);
    setInstallOutput(null);
    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg, language: displayLang }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallOutput(`✓ Installed ${pkg}. Re-running...`);
        setInstalling(false);
        await runCode();
      } else {
        setInstallOutput(`✗ Install failed: ${data.error}`);
        setInstalling(false);
      }
    } catch (e: any) {
      setInstallOutput(`✗ Install error: ${e.message}`);
      setInstalling(false);
    }
  }

  const missingModule =
    output && !output.success ? detectMissingModule(output.output, displayLang) : null;

  const prismLang = getPrismLanguage(displayLang);

  const borderColor = isDark ? "border-white/10" : "border-gray-300";
  const headerBg = isDark ? "bg-white/5" : "bg-gray-100";
  const langColor = isDark ? "text-gray-400" : "text-gray-500";
  const btnHover = isDark ? "hover:bg-white/10" : "hover:bg-gray-200";
  const btnText = isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900";
  const codeBg = isDark ? "#1e1e2e" : "#fafafa";

  return (
    <div className={`my-3 rounded-lg overflow-hidden border ${borderColor}`}>
      {/* Header bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${headerBg} border-b ${borderColor}`}>
        <span className={`text-xs font-mono ${langColor}`}>{displayLang}</span>
        <div className="flex items-center gap-1">
          {canRun && (
            <button
              onClick={runCode}
              disabled={running}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${btnHover} text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors`}
              title={hasBeenRun ? "Re-run code" : "Run code"}
            >
              {running ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : hasBeenRun ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              <span>{running ? "Running..." : hasBeenRun ? "Re-run" : "Run"}</span>
            </button>
          )}
          <button
            onClick={() => {
              if (editing) {
                setEditing(false);
              } else {
                setEditedCode(displayCode);
                setEditing(true);
              }
            }}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${btnHover} ${btnText} transition-colors`}
            title={editing ? "Done editing" : "Edit code"}
          >
            {editing ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Pencil className="w-3 h-3" />
            )}
            <span>{editing ? "Done" : "Edit"}</span>
          </button>
          <button
            onClick={saveToFile}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${btnHover} ${btnText} transition-colors`}
            title="Save to file"
          >
            <Download className="w-3 h-3" />
            <span>
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved!"
                  : saveStatus === "error"
                    ? "Error!"
                    : "Save"}
            </span>
          </button>
          {canPreview && (
            <button
              onClick={() => onPreviewHtml?.(displayCode)}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${btnHover} text-purple-400 hover:text-purple-300 transition-colors`}
              title="Preview HTML"
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          )}
          <button
            onClick={copyCode}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${btnHover} ${btnText} transition-colors`}
            title="Copy code"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Code content */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={editedCode}
          onChange={(e) => setEditedCode(e.target.value)}
          className={`w-full p-3 text-sm leading-relaxed font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 border-0 ${
            isDark ? "bg-[#1e1e2e] text-gray-100" : "bg-[#fafafa] text-gray-900"
          }`}
          style={{ minHeight: "80px" }}
          spellCheck={false}
        />
      ) : (
        <Highlight
          theme={isDark ? themes.nightOwl : themes.github}
          code={displayCode}
          language={prismLang}
        >
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="p-3 overflow-x-auto text-sm leading-relaxed m-0"
              style={{ ...style, background: codeBg }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      )}

      {/* Output panel */}
      {output && (
        <div className={`border-t ${borderColor}`}>
          <button
            onClick={() => setShowOutput(!showOutput)}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs ${headerBg} ${btnHover} transition-colors`}
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform ${showOutput ? "rotate-90" : ""}`}
            />
            <span className={output.success ? "text-green-400" : "text-red-400"}>
              {output.success ? "✓" : "✗"} Exit {output.exitCode}
            </span>
            <span className="text-gray-500 ml-auto">{output.elapsed}ms</span>
          </button>
          {showOutput && (
            <div>
              <pre className={`p-3 overflow-x-auto text-xs leading-relaxed max-h-64 overflow-y-auto ${
                isDark ? "bg-black/40 text-gray-300" : "bg-gray-50 text-gray-700"
              }`}>
                {output.output || "(no output)"}
              </pre>

              {missingModule && (
                <div className={`px-3 py-2 bg-yellow-500/10 border-t ${borderColor} flex items-center gap-2`}>
                  <Package className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="text-xs text-yellow-300">
                    Missing module:{" "}
                    <strong className="text-yellow-200">{missingModule}</strong>
                  </span>
                  <button
                    onClick={() => installAndRetry(missingModule)}
                    disabled={installing}
                    className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 disabled:opacity-50 transition-colors"
                  >
                    {installing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Package className="w-3 h-3" />
                    )}
                    <span>{installing ? "Installing..." : "Install & Retry"}</span>
                  </button>
                </div>
              )}

              {installOutput && (
                <pre className={`px-3 py-2 text-xs border-t ${borderColor} ${
                  isDark ? "bg-black/30 text-gray-400" : "bg-gray-50 text-gray-600"
                }`}>
                  {installOutput}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main chat page ──────────────────────────────────────────────────────────

export default function ChatPage() {
  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");

  // UI state
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<AssistantInfo>({ name: "Assistant", avatar: "🤖" });
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ filename: string; textContent?: string | null } | null>(null);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showDesignMode, setShowDesignMode] = useState(false);
  const [showMultiAgent, setShowMultiAgent] = useState(false);
  const [agentTask, setAgentTask] = useState<string | null>(null);

  // Project panel state
  const [showProject, setShowProject] = useState(false);
  const [projectContext, setProjectContext] = useState<string>("");
  const [projectAnalysis, setProjectAnalysis] = useState<any>(null);

  // Diff viewer & checkpoints state
  const [diffView, setDiffView] = useState<null | { filePath: string; isNew: boolean; diff: string; oldContent: string; newContent: string; stats: { additions: number; deletions: number } }>(null);
  const [diffEditId, setDiffEditId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Command approval state
  const [commandResults, setCommandResults] = useState<Record<string, { output: string; code: number; status: 'running' | 'done' | 'denied' }>>({});

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Always-allow commands state
  const [allowedCommands, setAllowedCommands] = useState<{exact: string[], prefixes: string[]}>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('allowed-commands') || '{"exact":[],"prefixes":[]}'); } catch { return {exact:[], prefixes:[]}; }
    }
    return {exact:[], prefixes:[]};
  });
  const autoRanCommandsRef = useRef<Set<string>>(new Set());
  const [showAllowedManager, setShowAllowedManager] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const tabInputRef = useRef<HTMLInputElement>(null);

  // Derived: active session and messages
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const isDark = theme === "dark";

  // ── Update messages helper ──────────────────────────────────────────────────

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: updater(s.messages) }
        : s
    ));
  }, [activeSessionId]);

  // ── Session management ──────────────────────────────────────────────────────

  function createNewSession() {
    const maxNum = sessions.reduce((max, s) => {
      const match = s.name.match(/^Chat (\d+)$/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: `Chat ${maxNum + 1}`,
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  }

  function deleteSession(id: string) {
    if (sessions.length <= 1) return;
    if (!confirm("Delete this chat session?")) return;
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (id === activeSessionId && filtered.length > 0) {
        setActiveSessionId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }

  function renameSession(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name: trimmed } : s));
    setEditingTabId(null);
    setEditingTabName("");
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Load assistant info
    fetch("/api/assistant")
      .then((res) => res.json())
      .then((data) => setAssistant(data))
      .catch(() => {});

    // Load theme
    const savedTheme = localStorage.getItem("chat-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }

    // Load sessions from localStorage
    const savedSessions = localStorage.getItem("chat-sessions");
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        if (parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        } else {
          // Empty array – create default
          const defaultSession: ChatSession = { id: "default", name: "Chat 1", messages: [], createdAt: new Date() };
          setSessions([defaultSession]);
          setActiveSessionId("default");
        }
      } catch {
        const defaultSession: ChatSession = { id: "default", name: "Chat 1", messages: [], createdAt: new Date() };
        setSessions([defaultSession]);
        setActiveSessionId("default");
      }
    } else {
      // No sessions saved – check for legacy messages
      const legacyMessages = localStorage.getItem("chat-messages");
      let migratedMessages: Message[] = [];
      if (legacyMessages) {
        try {
          migratedMessages = JSON.parse(legacyMessages).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        } catch {}
      }
      const defaultSession: ChatSession = {
        id: "default",
        name: "Chat 1",
        messages: migratedMessages,
        createdAt: new Date(),
      };
      setSessions([defaultSession]);
      setActiveSessionId("default");
    }

    // Check for speech recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("chat-sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom on message changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus tab rename input
  useEffect(() => {
    if (editingTabId && tabInputRef.current) {
      tabInputRef.current.focus();
      tabInputRef.current.select();
    }
  }, [editingTabId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }

  function showNotification(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, {
        body: body.substring(0, 100),
        icon: "/icon-192.svg",
        tag: "chat-reply",
      });
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  const displayMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // ── Send message ────────────────────────────────────────────────────────────

  async function sendMessage() {
    if (!input.trim() || loading) return;

    // Detect agent mode: "agent: <task>" or "/agent <task>"
    const agentMatch = input.trim().match(/^(?:agent:|\/agent)\s+(.+)/i);
    if (agentMatch) {
      const task = agentMatch[1];
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
        timestamp: new Date(),
      };
      updateMessages(prev => [...prev, userMessage]);
      setInput("");
      setAgentTask(task);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // We need the updated messages list for the API call
    const updatedMessages = [...messages, userMessage];
    updateMessages(() => updatedMessages);
    setInput("");
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionKey: "webchat-ui",
          stream: true,
          projectContext: projectContext || undefined,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let accumulated = "";

        // Add placeholder assistant message
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: [...updatedMessages, { id: assistantId, role: "assistant" as const, content: "", timestamp: new Date(), streaming: true }] }
            : s
        ));
        setLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                // Support multiple SSE formats: OpenAI (choices[0].delta.content), simple (token/content/text)
                const token =
                  parsed.choices?.[0]?.delta?.content ||
                  parsed.delta?.content ||
                  parsed.token ||
                  parsed.content ||
                  parsed.text ||
                  "";
                if (token) {
                  accumulated += token;
                }
              } catch {
                accumulated += data;
              }
            } else if (line.trim() && !line.startsWith(":") && !line.startsWith("event:")) {
              accumulated += line;
            }
          }

          const accCopy = accumulated;
          setSessions(prev => prev.map(s =>
            s.id === activeSessionId
              ? { ...s, messages: s.messages.map(m => m.id === assistantId ? { ...m, content: accCopy } : m) }
              : s
          ));
        }

        // Mark streaming complete
        setSessions(prev => prev.map(s =>
          s.id === activeSessionId
            ? { ...s, messages: s.messages.map(m => m.id === assistantId ? { ...m, streaming: false } : m) }
            : s
        ));
        if (accumulated) {
          showNotification(`${assistant.name} replied`, accumulated);
        }
      } else {
        const data = await res.json();

        if (data.success && data.response) {
          const assistantMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          setSessions(prev => prev.map(s =>
            s.id === activeSessionId
              ? { ...s, messages: [...updatedMessages, assistantMessage] }
              : s
          ));
          showNotification(`${assistant.name} replied`, data.response);
        } else {
          const errorMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: `⚠️ Error: ${data.error || "Failed to get response"}`,
            timestamp: new Date(),
          };
          setSessions(prev => prev.map(s =>
            s.id === activeSessionId
              ? { ...s, messages: [...updatedMessages, errorMessage] }
              : s
          ));
        }
        setLoading(false);
      }
    } catch (e: any) {
      const errorMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: `⚠️ Connection error: ${e.message}`,
        timestamp: new Date(),
      };
      const currentMsgs = sessions.find(s => s.id === activeSessionId)?.messages || updatedMessages;
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...currentMsgs, errorMessage] }
          : s
      ));
      setLoading(false);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  function clearChat() {
    if (confirm("Clear all messages in this session?")) {
      updateMessages(() => []);
    }
  }

  async function copyMessage(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  // Command approval helpers
  async function runApprovedCommand(commandId: string, command: string) {
    setCommandResults(prev => ({ ...prev, [commandId]: { output: '', code: 0, status: 'running' } }));
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: command, language: 'bash' }),
      });
      const data = await res.json();
      setCommandResults(prev => ({
        ...prev,
        [commandId]: { output: data.output || data.error || '', code: data.exitCode || 0, status: 'done' }
      }));
    } catch (e: any) {
      setCommandResults(prev => ({
        ...prev,
        [commandId]: { output: e.message, code: 1, status: 'done' }
      }));
    }
  }

  function denyCommand(commandId: string) {
    setCommandResults(prev => ({ ...prev, [commandId]: { output: '', code: 0, status: 'denied' } }));
  }

  // Always-allow helpers
  function isCommandAllowed(cmd: string): boolean {
    const trimmed = cmd.trim();
    if (allowedCommands.exact.includes(trimmed)) return true;
    const base = trimmed.split(/\s+/)[0];
    return allowedCommands.prefixes.includes(base);
  }

  function alwaysAllowCommand(commandId: string, command: string) {
    runApprovedCommand(commandId, command);
    const trimmed = command.trim();
    const updated = { ...allowedCommands, exact: Array.from(new Set([...allowedCommands.exact, trimmed])) };
    setAllowedCommands(updated);
    localStorage.setItem('allowed-commands', JSON.stringify(updated));
  }

  function alwaysAllowPrefix(commandId: string, command: string) {
    const base = command.trim().split(/\s+/)[0];
    runApprovedCommand(commandId, command);
    const updated = { ...allowedCommands, prefixes: Array.from(new Set([...allowedCommands.prefixes, base])) };
    setAllowedCommands(updated);
    localStorage.setItem('allowed-commands', JSON.stringify(updated));
  }

  function removeAllowedExact(cmd: string) {
    const updated = { ...allowedCommands, exact: allowedCommands.exact.filter(c => c !== cmd) };
    setAllowedCommands(updated);
    localStorage.setItem('allowed-commands', JSON.stringify(updated));
  }

  function removeAllowedPrefix(prefix: string) {
    const updated = { ...allowedCommands, prefixes: allowedCommands.prefixes.filter(p => p !== prefix) };
    setAllowedCommands(updated);
    localStorage.setItem('allowed-commands', JSON.stringify(updated));
  }

  function clearAllAllowed() {
    const updated = { exact: [], prefixes: [] };
    setAllowedCommands(updated);
    localStorage.setItem('allowed-commands', JSON.stringify(updated));
  }

  // ── Diff viewer & checkpoint helpers ────────────────────────────────────────

  const projectPath = projectAnalysis?.path || null;

  async function showDiff(filePath: string, newContent: string, editId?: string) {
    const res = await fetch("/api/project/diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath, newContent }),
    });
    const data = await res.json();
    if (data.error) return;
    setDiffView(data);
    setDiffEditId(editId || null);
  }

  async function applyDiff() {
    if (!diffView) return;
    const res = await fetch("/api/project/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: diffView.filePath, content: diffView.newContent }),
    });
    const data = await res.json();
    if (diffEditId) {
      setCommandResults(prev => ({
        ...prev,
        [diffEditId]: { output: data.ok ? `Written to ${diffView.filePath}` : (data.error || 'Failed'), code: data.ok ? 0 : 1, status: 'done' }
      }));
    }
    setDiffView(null);
    setDiffEditId(null);
  }

  function rejectDiff() {
    if (diffEditId) {
      setCommandResults(prev => ({ ...prev, [diffEditId]: { output: '', code: 0, status: 'denied' } }));
    }
    setDiffView(null);
    setDiffEditId(null);
  }

  async function createCheckpoint(name?: string) {
    if (!projectPath) return;
    const res = await fetch("/api/project/checkpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath, action: "create", name }),
    });
    const data = await res.json();
    if (data.ok) loadCheckpoints();
  }

  async function loadCheckpoints() {
    if (!projectPath) return;
    const res = await fetch(`/api/project/checkpoint?path=${encodeURIComponent(projectPath)}`);
    const data = await res.json();
    if (data.checkpoints) setCheckpoints(data.checkpoints);
  }

  async function revertToCheckpoint(checkpointId: string) {
    if (!confirm(`Revert to ${checkpointId}? Current changes will be stashed.`)) return;
    const res = await fetch("/api/project/checkpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath, action: "revert", checkpointId }),
    });
    const data = await res.json();
    if (data.ok) loadCheckpoints();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ── Theme classes ───────────────────────────────────────────────────────────

  const cls = {
    page: isDark
      ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
      : "bg-gradient-to-br from-gray-100 via-white to-gray-100 text-gray-900",
    header: isDark ? "border-white/10 bg-black/20" : "border-gray-200 bg-white/80",
    headerText: isDark ? "text-white" : "text-gray-900",
    headerSub: isDark ? "text-gray-400" : "text-gray-500",
    headerBtn: isDark
      ? "hover:bg-white/10 text-gray-400 hover:text-white"
      : "hover:bg-gray-200 text-gray-500 hover:text-gray-900",
    headerBtnDanger: isDark
      ? "hover:bg-white/10 text-gray-400 hover:text-red-400"
      : "hover:bg-gray-200 text-gray-500 hover:text-red-500",
    tabBar: isDark ? "border-white/10 bg-black/10" : "border-gray-200 bg-gray-50",
    tabActive: isDark
      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
      : "bg-blue-100 text-blue-700 border border-blue-300",
    tabInactive: isDark
      ? "text-gray-400 hover:text-white hover:bg-white/5"
      : "text-gray-500 hover:text-gray-900 hover:bg-gray-200",
    tabNew: isDark ? "text-gray-500 hover:text-white hover:bg-white/5" : "text-gray-400 hover:text-gray-900 hover:bg-gray-200",
    searchBar: isDark ? "border-white/10 bg-black/10" : "border-gray-200 bg-gray-50",
    searchInput: isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400",
    userBubble: isDark ? "bg-blue-600 text-white" : "bg-blue-600 text-white",
    assistantBubble: isDark ? "bg-white/10 text-gray-100" : "bg-gray-200 text-gray-900",
    userTime: isDark ? "text-blue-200" : "text-blue-200",
    assistantTime: isDark ? "text-gray-500" : "text-gray-400",
    emptyText: isDark ? "text-gray-500" : "text-gray-400",
    loadingBubble: isDark ? "bg-white/10" : "bg-gray-200",
    loadingText: isDark ? "text-gray-400" : "text-gray-500",
    inputArea: isDark ? "border-white/10 bg-black/20" : "border-gray-200 bg-white/80",
    inputField: isDark
      ? "bg-white/5 border-white/10 focus:border-blue-500/50 placeholder-gray-500 text-white"
      : "bg-gray-100 border-gray-300 focus:border-blue-500 placeholder-gray-400 text-gray-900",
    terminalBtn: (active: boolean) => active
      ? (isDark ? "bg-green-600/20 border-green-500/30 text-green-400" : "bg-green-100 border-green-400 text-green-700")
      : (isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10" : "bg-gray-100 border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-200"),
    micBtn: (active: boolean) => active
      ? "bg-red-600 text-white animate-pulse"
      : (isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10" : "bg-gray-100 border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-200"),
    attachBg: isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200",
    attachText: isDark ? "text-blue-300" : "text-blue-600",
    attachClose: isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500",
    footerText: isDark ? "text-gray-500" : "text-gray-400",
    copyBtn: isDark ? "bg-gray-800" : "bg-white shadow-sm border border-gray-200",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  // Notebook mode takes over the whole page
  if (showNotebook) {
    return <NotebookMode onClose={() => setShowNotebook(false)} />;
  }

  // Design mode takes over the whole page
  if (showDesignMode) {
    return <DesignMode onClose={() => setShowDesignMode(false)} />;
  }

  // Multi-agent mode takes over the whole page
  if (showMultiAgent) {
    return <MultiAgentMode isDark={isDark} onClose={() => setShowMultiAgent(false)} />;
  }

  return (
    <div className={`h-screen md:h-screen flex flex-col ${cls.page}`} style={{ height: '100dvh' }}>
      {/* Header */}
      <header className={`border-b ${cls.header} backdrop-blur-sm shrink-0`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className={`p-2 ${cls.headerBtn} rounded-lg transition-colors`}>
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className={`text-lg font-semibold ${cls.headerText}`}>
                    Chat with {assistant.name}
                  </h1>
                  <p className={`text-xs ${cls.headerSub}`}>
                    {messages.length} messages
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Theme toggle */}
              <button
                onClick={() => {
                  const next = theme === "dark" ? "light" : "dark";
                  setTheme(next);
                  localStorage.setItem("chat-theme", next);
                }}
                className={`p-2 ${cls.headerBtn} rounded-lg transition-colors`}
                title="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-2 ${cls.headerBtn} rounded-lg transition-colors`}
                title="Search messages"
              >
                <Search className="w-5 h-5" />
              </button>
              {/* Clear chat */}
              <button
                onClick={clearChat}
                className={`p-2 ${cls.headerBtnDanger} rounded-lg transition-colors`}
                title="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search bar */}
      {searchOpen && (
        <div className={`px-4 py-2 border-b ${cls.searchBar}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <Search className={`w-4 h-4 ${cls.headerSub}`} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className={`flex-1 bg-transparent text-sm focus:outline-none ${cls.searchInput}`}
              autoFocus
            />
            {searchQuery && (
              <span className={`text-xs ${cls.headerSub}`}>
                {messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length} results
              </span>
            )}
            <button
              onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
              className={`p-1 ${cls.headerBtn} rounded`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className={`flex items-center gap-1 px-4 py-2 border-b ${cls.tabBar} overflow-x-auto`}>
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => setActiveSessionId(session.id)}
            onDoubleClick={() => {
              setEditingTabId(session.id);
              setEditingTabName(session.name);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
              session.id === activeSessionId ? cls.tabActive : cls.tabInactive
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            {editingTabId === session.id ? (
              <input
                ref={tabInputRef}
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onBlur={() => renameSession(session.id, editingTabName)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameSession(session.id, editingTabName);
                  if (e.key === "Escape") { setEditingTabId(null); setEditingTabName(""); }
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent text-sm focus:outline-none w-20 border-b border-current"
              />
            ) : (
              <span>{session.name}</span>
            )}
            {sessions.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="ml-1 p-0.5 hover:bg-red-500/20 rounded"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </button>
        ))}
        <button
          onClick={createNewSession}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm ${cls.tabNew}`}
          title="New chat"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 overflow-hidden">
        {showProject && (
          <ProjectPanel
            onClose={() => setShowProject(false)}
            onFileOpen={(path, content) => {
              const fileName = path.split("/").pop();
              setInput(`Here's the file ${fileName}:\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``);
            }}
            onProjectLoaded={(analysis) => {
              setProjectAnalysis(analysis);
              setProjectContext(analysis.summary);
              updateMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: "assistant" as const,
                content: `📂 **Project loaded: ${analysis.name}**\n\n` +
                  `${analysis.framework ? `**Framework:** ${analysis.framework}\n` : ""}` +
                  `**Language:** ${analysis.language}\n` +
                  `**Files:** ${analysis.totalFiles} (${(analysis.totalSize / 1024).toFixed(0)}KB)\n` +
                  `${analysis.routes.length ? `**Routes:** ${analysis.routes.length}\n` : ""}` +
                  `${analysis.components.length ? `**Components:** ${analysis.components.length}\n` : ""}` +
                  `\nI've analyzed the codebase. Ask me anything about it or tell me what to change!`,
                timestamp: new Date(),
              }]);
            }}
          />
        )}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {displayMessages.length === 0 && !searchQuery ? (
            <div className={`flex flex-col items-center justify-center h-64 ${cls.emptyText}`}>
              <div className="text-5xl mb-4">{assistant.avatar}</div>
              <p className="text-lg">Hey! I&apos;m {assistant.name}</p>
              <p className="text-sm mt-2">Ask me anything...</p>
            </div>
          ) : displayMessages.length === 0 && searchQuery ? (
            <div className={`flex flex-col items-center justify-center h-64 ${cls.emptyText}`}>
              <Search className="w-10 h-10 mb-4 opacity-50" />
              <p className="text-lg">No messages found</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <AnimatePresence>
              {displayMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user" ? cls.userBubble : cls.assistantBubble
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="relative">
                        {parseMessageContent(msg.content).map((segment, segIdx) => {
                          // Check if this is a shell command that needs approval
                          const isShellCommand = segment.type === "code" && ['bash', 'sh', 'shell', 'zsh', 'terminal'].includes(segment.language?.toLowerCase() || '');
                          const commandId = `${msg.id}-${segIdx}`;
                          const cmdResult = commandResults[commandId];

                          if (isShellCommand) {
                            // Auto-run allowed commands
                            const isAllowed = isCommandAllowed(segment.content);
                            if (isAllowed && !cmdResult && !autoRanCommandsRef.current.has(commandId)) {
                              autoRanCommandsRef.current.add(commandId);
                              setTimeout(() => runApprovedCommand(commandId, segment.content), 0);
                            }
                            const baseCmd = segment.content.trim().split(/\s+/)[0];

                            return (
                              <div key={segIdx} className={`my-2 rounded-lg border ${
                                cmdResult?.status === 'denied'
                                  ? 'border-red-500/20 bg-red-500/5'
                                  : cmdResult?.status === 'done'
                                  ? 'border-green-500/20 bg-green-500/5'
                                  : isAllowed
                                  ? 'border-blue-500/20 bg-blue-500/5'
                                  : 'border-yellow-500/30 bg-yellow-500/5'
                              } overflow-hidden`}>
                                {/* Command header */}
                                <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                                    </svg>
                                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Terminal Command</span>
                                    {isAllowed && (
                                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">⚡ Auto-approved</span>
                                    )}
                                  </div>
                                  {!cmdResult && !isAllowed && (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => runApprovedCommand(commandId, segment.content)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors"
                                      >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        Run
                                      </button>
                                      <button
                                        onClick={() => alwaysAllowCommand(commandId, segment.content)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs rounded-md transition-colors"
                                        title="Run and always allow this exact command"
                                      >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                        Always Allow
                                      </button>
                                      <button
                                        onClick={() => denyCommand(commandId)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-md transition-colors"
                                      >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        Deny
                                      </button>
                                      <span className="text-gray-600 mx-0.5">·</span>
                                      <button
                                        onClick={() => alwaysAllowPrefix(commandId, segment.content)}
                                        className="text-[10px] text-gray-500 hover:text-blue-400 transition-colors"
                                        title={`Allow all ${baseCmd} commands`}
                                      >
                                        Allow all <code className="bg-white/5 px-1 rounded">{baseCmd}</code>
                                      </button>
                                    </div>
                                  )}
                                  {cmdResult?.status === 'running' && (
                                    <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                      Running...
                                    </div>
                                  )}
                                  {cmdResult?.status === 'done' && (
                                    <span className={`text-xs ${cmdResult.code === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {cmdResult.code === 0 ? '✓ Completed' : `✗ Exit code ${cmdResult.code}`}
                                    </span>
                                  )}
                                  {cmdResult?.status === 'denied' && (
                                    <span className="text-xs text-red-400">✗ Denied</span>
                                  )}
                                </div>

                                {/* Command content */}
                                <pre className={`px-3 py-2 text-sm font-mono overflow-x-auto ${
                                  cmdResult?.status === 'denied' ? 'opacity-50 line-through' : isDark ? 'text-gray-200' : 'text-gray-800'
                                }`}>
                                  <code>{segment.content}</code>
                                </pre>

                                {/* Output */}
                                {cmdResult?.status === 'done' && cmdResult.output && (
                                  <div className="border-t border-white/10">
                                    <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wide">Output</div>
                                    <pre className={`px-3 py-2 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {cmdResult.output}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Check if code block represents a file edit (first line is a filepath comment)
                          if (segment.type === "code") {
                            const lines = segment.content.split("\n");
                            const firstLine = lines[0]?.trim() || "";
                            const filePathMatch = firstLine.match(/^(?:\/\/|#|--|\/\*)\s*(?:filepath|file|path):\s*(.+?)(?:\s*\*\/)?$/i);
                            const editId = `edit-${msg.id}-${segIdx}`;

                            if (filePathMatch) {
                              const editFilePath = filePathMatch[1].trim();
                              const editContent = lines.slice(1).join("\n");
                              const editResult = commandResults[editId];

                              return (
                                <div key={segIdx} className={`my-2 rounded-lg border ${
                                  editResult?.status === 'denied'
                                    ? 'border-red-500/20 bg-red-500/5'
                                    : editResult?.status === 'done'
                                    ? 'border-green-500/20 bg-green-500/5'
                                    : 'border-purple-500/30 bg-purple-500/5'
                                } overflow-hidden`}>
                                  <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                      </svg>
                                      <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>File Edit</span>
                                      <code className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-purple-300">{editFilePath.split("/").pop()}</code>
                                    </div>
                                    {!editResult && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => showDiff(editFilePath, editContent, editId)}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-md transition-colors"
                                        >
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v18M3 12h18" /></svg>
                                          Review Diff
                                        </button>
                                        <button
                                          onClick={async () => {
                                            setCommandResults(prev => ({ ...prev, [editId]: { output: '', code: 0, status: 'running' } }));
                                            const res = await fetch("/api/project/apply", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ filePath: editFilePath, content: editContent }),
                                            });
                                            const data = await res.json();
                                            setCommandResults(prev => ({
                                              ...prev,
                                              [editId]: { output: data.ok ? `Written to ${editFilePath}` : data.error, code: data.ok ? 0 : 1, status: 'done' }
                                            }));
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors"
                                        >
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                          Apply
                                        </button>
                                        <button
                                          onClick={() => denyCommand(editId)}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded-md transition-colors"
                                        >
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                    {editResult?.status === 'running' && (
                                      <span className="text-xs text-yellow-400">Writing...</span>
                                    )}
                                    {editResult?.status === 'done' && (
                                      <span className={`text-xs ${editResult.code === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {editResult.code === 0 ? '✓ Applied' : '✗ Failed'}
                                      </span>
                                    )}
                                    {editResult?.status === 'denied' && (
                                      <span className="text-xs text-red-400">✗ Rejected</span>
                                    )}
                                  </div>
                                  <div className={`px-3 py-1 text-[10px] font-mono border-b ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-100'}`}>{editFilePath}</div>
                                  <pre className={`px-3 py-2 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto ${
                                    editResult?.status === 'denied' ? 'opacity-50' : isDark ? 'text-gray-300' : 'text-gray-700'
                                  }`}>
                                    <code>{editContent}</code>
                                  </pre>
                                  {editResult?.status === 'done' && editResult.output && (
                                    <div className="border-t border-white/10 px-3 py-1.5 text-xs text-gray-400">{editResult.output}</div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <CodeBlock
                                key={segIdx}
                                code={segment.content}
                                language={segment.language || "code"}
                                onPreviewHtml={setHtmlPreview}
                                codeTheme={theme}
                              />
                            );
                          }
                          return (
                            <div
                              key={segIdx}
                              className="whitespace-pre-wrap break-words"
                              dangerouslySetInnerHTML={{
                                __html: isDark
                                  ? renderMarkdownText(segment.content)
                                  : renderMarkdownTextLight(segment.content),
                              }}
                            />
                          );
                        })}
                        {msg.streaming && (
                          <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    )}
                    <div className={`text-xs mt-1 ${msg.role === "user" ? cls.userTime : cls.assistantTime}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className={`absolute -right-2 -top-2 p-1.5 ${cls.copyBtn} rounded-lg opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                      {copied === msg.id ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className={`w-3 h-3 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                      )}
                    </button>
                  </div>
                  {msg.role === "user" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className={`${cls.loadingBubble} rounded-2xl px-4 py-3`}>
                <div className={`flex items-center gap-2 ${cls.loadingText}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Agent Mode */}
          {agentTask && (
            <div className="px-4">
              <AgentMode
                task={agentTask}
                onComplete={(result) => {
                  updateMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: result,
                    timestamp: new Date(),
                  }]);
                  setAgentTask(null);
                }}
                onCancel={() => setAgentTask(null)}
              />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      </div>

      {/* HTML Preview Panel */}
      {htmlPreview && (
        <HtmlPreview html={htmlPreview} onClose={() => setHtmlPreview(null)} />
      )}

      {/* Allowed Commands Manager */}
      {showAllowedManager && (
        <div className={`border-t ${isDark ? 'border-white/10 bg-gray-900/95' : 'border-gray-200 bg-white/95'} backdrop-blur-sm`}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Allowed Commands</span>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  ({allowedCommands.exact.length} exact, {allowedCommands.prefixes.length} prefixes)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(allowedCommands.exact.length > 0 || allowedCommands.prefixes.length > 0) && (
                  <button
                    onClick={clearAllAllowed}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowAllowedManager(false)}
                  className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {allowedCommands.exact.length === 0 && allowedCommands.prefixes.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} py-1`}>
                No commands allowed yet. Click &quot;Always Allow&quot; on a command approval card to add one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {allowedCommands.prefixes.map(prefix => (
                  <span key={`p-${prefix}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                    isDark ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}>
                    <span className="font-mono">{prefix} *</span>
                    <button onClick={() => removeAllowedPrefix(prefix)} className="hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {allowedCommands.exact.map(cmd => (
                  <span key={`e-${cmd}`} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                    isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    <span className="font-mono truncate max-w-[200px]">{cmd}</span>
                    <button onClick={() => removeAllowedExact(cmd)} className="hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terminal Panel */}
      {showTerminal && (
        <EmbeddedTerminal onClose={() => setShowTerminal(false)} />
      )}

      {/* Checkpoint Panel */}
      {showCheckpoints && projectPath && (
        <div className="relative">
          <div className="absolute bottom-2 left-4 right-4 max-w-md bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-40 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-sm font-medium text-white">Checkpoints</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const name = prompt("Checkpoint name (optional):");
                    createCheckpoint(name || undefined);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Create
                </button>
                <button onClick={() => setShowCheckpoints(false)} className="p-1 hover:bg-white/10 rounded">
                  <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {checkpoints.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-gray-500">No checkpoints yet. Create one before making changes.</div>
              ) : (
                checkpoints.map(cp => (
                  <div key={cp.id} className="flex items-center justify-between px-3 py-2 hover:bg-white/5 border-b border-white/5 last:border-0">
                    <div>
                      <div className="text-xs text-white">{cp.name}</div>
                      <div className="text-[10px] text-gray-500">{new Date(cp.date).toLocaleString()}</div>
                    </div>
                    <button
                      onClick={() => revertToCheckpoint(cp.id)}
                      className="text-[10px] px-2 py-0.5 text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
                    >
                      Revert
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`border-t ${cls.inputArea} backdrop-blur-sm shrink-0`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Attached file indicator */}
          {attachedFile && (
            <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 ${cls.attachBg} border rounded-lg text-sm`}>
              <Paperclip className="w-3.5 h-3.5 text-blue-400" />
              <span className={`${cls.attachText} truncate`}>{attachedFile.filename}</span>
              <button onClick={() => setAttachedFile(null)} className={`ml-auto ${cls.attachClose}`}>✕</button>
            </div>
          )}
          <FileUpload onFileUploaded={(file) => {
            setAttachedFile(file);
            if (file.textContent) {
              setInput(prev => prev || `[Attached: ${file.filename}]\n`);
            }
          }}>
            <div className="flex gap-2 sm:gap-3">
              {speechSupported && (
                <button
                  onClick={toggleListening}
                  className={`px-3 py-3 rounded-xl transition-colors border ${cls.micBtn(isListening)}`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`px-3 py-3 rounded-xl transition-colors border ${cls.terminalBtn(showTerminal)}`}
                title={showTerminal ? "Hide terminal" : "Open terminal"}
              >
                <TerminalIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowAllowedManager(!showAllowedManager)}
                className={`px-3 py-3 rounded-xl transition-colors border ${
                  showAllowedManager
                    ? (isDark ? "bg-blue-600/20 border-blue-500/30 text-blue-400" : "bg-blue-100 border-blue-400 text-blue-700")
                    : (isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30" : "bg-gray-100 border-gray-300 text-gray-500 hover:text-blue-600 hover:bg-blue-50")
                }`}
                title="Manage allowed commands"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </button>
              <button
                onClick={() => setShowNotebook(true)}
                className="px-3 py-3 rounded-xl transition-colors border bg-white/5 border-white/10 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30"
                title="Notebook mode"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                </svg>
              </button>
              <button
                onClick={() => setShowMultiAgent(true)}
                className="px-3 py-3 rounded-xl transition-colors border bg-white/5 border-white/10 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/30"
                title="Multi-Agent TDD"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><circle cx="12" cy="16" r="3" />
                  <line x1="10" y1="9.5" x2="12" y2="13.5" /><line x1="14" y1="9.5" x2="12" y2="13.5" />
                </svg>
              </button>
              <button
                onClick={() => setShowDesignMode(true)}
                className="px-3 py-3 rounded-xl transition-colors border bg-white/5 border-white/10 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30"
                title="Design mode"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <circle cx="12" cy="10" r="2" />
                </svg>
              </button>
              <button
                onClick={() => setShowProject(!showProject)}
                className={`px-3 py-3 rounded-xl transition-colors border ${
                  showProject
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30"
                }`}
                title="Open project"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              {projectPath && (
                <button
                  onClick={() => { setShowCheckpoints(!showCheckpoints); if (!showCheckpoints) loadCheckpoints(); }}
                  className={`px-3 py-3 rounded-xl transition-colors border relative ${
                    showCheckpoints
                      ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30"
                  }`}
                  title="Checkpoints"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {checkpoints.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] text-white flex items-center justify-center">
                      {checkpoints.length}
                    </span>
                  )}
                </button>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Type a message..."}
                rows={1}
                className={`flex-1 px-4 py-3 border rounded-xl resize-none focus:outline-none ${cls.inputField}`}
                style={{ minHeight: "48px", maxHeight: "120px" }}
                disabled={loading}
              />
              <button
                onClick={() => {
                  if (!input.trim()) return;
                  setShowMultiAgent(true);
                  // Pass the input as initial task via sessionStorage
                  sessionStorage.setItem("multiAgentTask", input.trim());
                  setInput("");
                }}
                disabled={!input.trim() || loading}
                className="px-3 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Build with Multi-Agent TDD (Opus + Codex)"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><circle cx="12" cy="16" r="3" />
                </svg>
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </FileUpload>
          <p className={`text-xs ${cls.footerText} mt-2 text-center`}>
            {speechSupported ? "Tap mic to speak • " : ""}Enter to send,
            Shift+Enter for new line • Drop files to attach
          </p>
        </div>
      </div>

      {/* Diff Viewer Modal */}
      {diffView && (
        <DiffViewer
          {...diffView}
          onApprove={applyDiff}
          onReject={rejectDiff}
          onClose={() => { setDiffView(null); setDiffEditId(null); }}
        />
      )}
    </div>
  );
}

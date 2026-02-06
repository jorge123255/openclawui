"use client";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

const PixelOffice = dynamic(() => import("./PixelOffice"), { ssr: false });

interface AgentEvent {
  type: string;
  agent?: string;
  role?: string;
  action?: string;
  content?: string;
  code?: string;
  tests?: string;
  testResults?: { passed: number; failed: number; total: number; output: string };
  round?: number;
  finalCode?: string;
  plan?: string;
}

interface AgentState {
  id: string;
  role: string;
  emoji: string;
  status: "idle" | "thinking" | "coding" | "reviewing" | "running" | "done" | "error";
  thought?: string;
  color: string;
}

interface Props {
  isDark: boolean;
  onClose: () => void;
}

const AGENT_CONFIGS: Record<string, { emoji: string; color: string; title: string }> = {
  boss: { emoji: "🧠", color: "#a78bfa", title: "Opus (Boss)" },
  worker: { emoji: "💻", color: "#60a5fa", title: "Codex (Worker)" },
  tester: { emoji: "🧪", color: "#34d399", title: "Test Runner" },
};

export default function MultiAgentMode({ isDark, onClose }: Props) {
  const [task, setTask] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    boss: { id: "boss", role: "Boss", emoji: "🧠", status: "idle", color: "#a78bfa" },
    worker: { id: "worker", role: "Worker", emoji: "💻", status: "idle", color: "#60a5fa" },
    tester: { id: "tester", role: "Tests", emoji: "🧪", status: "idle", color: "#34d399" },
  });
  const [currentRound, setCurrentRound] = useState(0);
  const [finalCode, setFinalCode] = useState<string | null>(null);
  const [finalTests, setFinalTests] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(true);
  const [currentCode, setCurrentCode] = useState("");
  const [currentTests, setCurrentTests] = useState("");
  const [testResults, setTestResults] = useState<AgentEvent["testResults"] | null>(null);
  const [bossModel, setBossModel] = useState("anthropic/claude-opus-4-6");
  const [workerModel, setWorkerModel] = useState("openai-codex/gpt-5.3-codex");
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const updateAgent = (id: string, updates: Partial<AgentState>) => {
    setAgents((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const startMultiAgent = async () => {
    if (!task.trim() || isRunning) return;
    setIsRunning(true);
    setEvents([]);
    setCurrentRound(0);
    setFinalCode(null);
    setFinalTests(null);
    setCurrentCode("");
    setCurrentTests("");
    setTestResults(null);

    // Reset agents
    Object.keys(agents).forEach((id) => updateAgent(id, { status: "idle", thought: undefined }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/multi-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: task.trim(),
          mode: "tdd",
          models: { boss: bossModel, worker: workerModel },
        }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const event: AgentEvent = JSON.parse(data);
            setEvents((prev) => [...prev, event]);
            handleEvent(event);
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setEvents((prev) => [...prev, { type: "error", content: err.message }]);
      }
    } finally {
      setIsRunning(false);
      Object.keys(agents).forEach((id) => updateAgent(id, { status: "idle", thought: undefined }));
    }
  };

  const handleEvent = (event: AgentEvent) => {
    switch (event.type) {
      case "agent_start":
        if (event.agent) {
          const statusMap: Record<string, AgentState["status"]> = {
            planning: "thinking",
            coding: "coding",
            fixing: "coding",
            reviewing: "reviewing",
            running: "running",
            diagnosing: "thinking",
          };
          updateAgent(event.agent, {
            status: statusMap[event.action || ""] || "thinking",
            thought: undefined,
          });
        }
        break;
      case "agent_thinking":
        if (event.agent) {
          updateAgent(event.agent, { thought: event.content });
        }
        break;
      case "agent_message":
        if (event.agent) {
          updateAgent(event.agent, { status: "done", thought: undefined });
        }
        break;
      case "code_update":
        if (event.code) setCurrentCode(event.code);
        if (event.tests) setCurrentTests(event.tests);
        break;
      case "test_run":
        if (event.testResults) {
          setTestResults(event.testResults);
          updateAgent("tester", {
            status: event.testResults.failed === 0 ? "done" : "error",
            thought: event.testResults.failed === 0
              ? `✅ ${event.testResults.passed} passed`
              : `❌ ${event.testResults.failed} failed`,
          });
        }
        break;
      case "round":
        setCurrentRound(event.round || 0);
        break;
      case "complete":
        if (event.finalCode) setFinalCode(event.finalCode);
        if (event.tests) setFinalTests(event.tests);
        break;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsRunning(false);
  };

  const bg = isDark ? "bg-gray-900" : "bg-gray-50";
  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const border = isDark ? "border-gray-700" : "border-gray-200";
  const text = isDark ? "text-gray-100" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const codeBg = isDark ? "bg-gray-950" : "bg-gray-100";

  return (
    <div className={`flex flex-col h-full ${bg} ${text}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${border}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <h2 className="font-bold text-lg">Multi-Agent TDD</h2>
            <p className={`text-sm ${textMuted}`}>Opus boss • Codex workers • Test-driven</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentRound > 0 && (
            <span className={`text-sm px-2 py-1 rounded ${isDark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-700"}`}>
              Round {currentRound}/5
            </span>
          )}
          <button onClick={onClose} className={`p-2 rounded hover:${isDark ? "bg-gray-700" : "bg-gray-200"}`}>✕</button>
        </div>
      </div>

      {/* Pixel Art Office */}
      <div className={`px-4 py-3 border-b ${border}`}>
        <PixelOffice
          activity={{
            boss: agents.boss.status === "thinking" ? (currentRound === 0 ? "planning" : "diagnosing")
              : agents.boss.status === "reviewing" ? "reviewing"
              : agents.boss.status === "done" && events.some(e => e.content?.includes("APPROVED")) ? "approved"
              : agents.boss.status === "done" ? "feedback"
              : "idle",
            worker: agents.worker.status === "coding" ? (currentRound <= 1 ? "coding" : "fixing")
              : agents.worker.status === "done" ? "done"
              : "idle",
            tester: agents.tester.status === "running" ? "running"
              : agents.tester.status === "done" ? "passed"
              : agents.tester.status === "error" ? "failed"
              : "idle",
          }}
          round={currentRound}
          isDark={isDark}
          thought={
            Object.values(agents).find(a => a.thought)
              ? { agent: Object.values(agents).find(a => a.thought)!.id, text: Object.values(agents).find(a => a.thought)!.thought! }
              : null
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Event Log */}
        <div className={`flex-1 overflow-y-auto p-4 border-r ${border}`}>
          {events.length === 0 && !isRunning && (
            <div className={`text-center py-12 ${textMuted}`}>
              <div className="text-6xl mb-4">👥</div>
              <p className="text-lg font-medium mb-2">Multi-Agent TDD Mode</p>
              <p className="text-sm max-w-md mx-auto">
                Describe what you want to build. Opus will plan and write tests,
                Codex will implement, and they&apos;ll iterate until it&apos;s perfect.
              </p>
            </div>
          )}

          {events.map((event, i) => (
            <EventCard key={i} event={event} isDark={isDark} />
          ))}
          <div ref={eventsEndRef} />
        </div>

        {/* Code Panel */}
        {showCode && (currentCode || currentTests || finalCode) && (
          <div className={`w-[45%] flex flex-col overflow-hidden`}>
            {/* Tabs */}
            <div className={`flex border-b ${border}`}>
              <button className={`px-4 py-2 text-sm font-medium border-b-2 ${
                isDark ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-600"
              }`}>
                {finalCode ? "✅ Final Code" : "💻 Code"}
              </button>
              {(currentTests || finalTests) && (
                <button className={`px-4 py-2 text-sm font-medium ${textMuted}`}>
                  🧪 Tests
                </button>
              )}
              {testResults && (
                <div className={`ml-auto px-4 py-2 text-sm ${
                  testResults.failed === 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {testResults.failed === 0 ? "✅" : "❌"} {testResults.passed}P / {testResults.failed}F
                </div>
              )}
            </div>
            {/* Code Content */}
            <div className={`flex-1 overflow-auto p-4 ${codeBg}`}>
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                <code>{finalCode || currentCode || "Waiting for code..."}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`p-4 border-t ${border}`}>
        {/* Model Selectors */}
        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧠 Boss:</span>
            <select
              value={bossModel}
              onChange={(e) => setBossModel(e.target.value)}
              className={`text-xs px-2 py-1 rounded ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}
              disabled={isRunning}
            >
              <option value="anthropic/claude-opus-4-6">Claude Opus 4.6</option>
              <option value="openai-codex/gpt-5.3-codex">GPT-5.3 Codex</option>
              <option value="openai-codex/gpt-5.2-codex">GPT-5.2 Codex</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">💻 Worker:</span>
            <select
              value={workerModel}
              onChange={(e) => setWorkerModel(e.target.value)}
              className={`text-xs px-2 py-1 rounded ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}
              disabled={isRunning}
            >
              <option value="openai-codex/gpt-5.3-codex">GPT-5.3 Codex</option>
              <option value="openai-codex/gpt-5.2-codex">GPT-5.2 Codex</option>
              <option value="anthropic/claude-opus-4-6">Claude Opus 4.6</option>
              <option value="ollama/qwen2.5-coder:32b-instruct-q8_0">Qwen 2.5 Coder 32B</option>
              <option value="ollama/qwen3:32b">Qwen 3 32B</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && startMultiAgent()}
            placeholder="Describe what you want to build..."
            className={`flex-1 px-4 py-3 rounded-lg border ${
              isDark ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500" : "bg-white border-gray-300 placeholder-gray-400"
            } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            disabled={isRunning}
          />
          {isRunning ? (
            <button onClick={stop} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
              Stop
            </button>
          ) : (
            <button
              onClick={startMultiAgent}
              disabled={!task.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              🚀 Build
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// === Agent Character Component ===
function AgentCharacter({ agent, isDark }: { agent: AgentState; isDark: boolean }) {
  const isActive = agent.status !== "idle" && agent.status !== "done" && agent.status !== "error";
  const config = AGENT_CONFIGS[agent.id] || { emoji: "🤖", color: "#888", title: agent.role };

  const statusEmoji: Record<string, string> = {
    idle: "💤",
    thinking: "🤔",
    coding: "⌨️",
    reviewing: "🔍",
    running: "▶️",
    done: "✅",
    error: "❌",
  };

  const statusLabel: Record<string, string> = {
    idle: "Idle",
    thinking: "Thinking...",
    coding: "Coding...",
    reviewing: "Reviewing...",
    running: "Running...",
    done: "Done",
    error: "Error",
  };

  return (
    <div className="flex flex-col items-center gap-2 relative" style={{ minWidth: 120 }}>
      {/* Thought Bubble */}
      {agent.thought && (
        <div
          className={`absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl text-xs max-w-48 text-center shadow-lg z-10 ${
            isDark ? "bg-gray-700 text-gray-200" : "bg-white text-gray-800 border border-gray-200"
          }`}
          style={{
            animation: "fadeInUp 0.3s ease-out",
          }}
        >
          {agent.thought}
          {/* Bubble tail */}
          <div
            className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${
              isDark ? "bg-gray-700" : "bg-white border-b border-r border-gray-200"
            }`}
          />
        </div>
      )}

      {/* Avatar */}
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 ${
          isActive ? "scale-110 shadow-lg" : "scale-100"
        }`}
        style={{
          background: `${config.color}22`,
          border: `2px solid ${isActive ? config.color : "transparent"}`,
          animation: isActive ? "pulse 2s infinite" : "none",
        }}
      >
        {config.emoji}
      </div>

      {/* Name */}
      <span className="text-xs font-medium" style={{ color: config.color }}>
        {config.title}
      </span>

      {/* Status */}
      <div className="flex items-center gap-1">
        <span className="text-xs">{statusEmoji[agent.status]}</span>
        <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {statusLabel[agent.status]}
        </span>
      </div>
    </div>
  );
}

// === Event Card Component ===
function EventCard({ event, isDark }: { event: AgentEvent; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const config = event.agent ? AGENT_CONFIGS[event.agent] : null;

  if (event.type === "agent_thinking" || event.type === "agent_start") return null;

  if (event.type === "round") {
    return (
      <div className={`flex items-center gap-3 my-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        <div className="flex-1 h-px bg-current opacity-20" />
        <span className="text-sm font-medium">Round {event.round}</span>
        <div className="flex-1 h-px bg-current opacity-20" />
      </div>
    );
  }

  if (event.type === "test_run") {
    const r = event.testResults!;
    const allPass = r.failed === 0 && r.passed > 0;
    return (
      <div className={`my-3 p-3 rounded-lg border ${
        allPass
          ? isDark ? "border-green-800 bg-green-900/20" : "border-green-200 bg-green-50"
          : isDark ? "border-red-800 bg-red-900/20" : "border-red-200 bg-red-50"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{allPass ? "✅" : "❌"}</span>
          <span className="font-medium text-sm">
            Test Results: {r.passed} passed, {r.failed} failed
          </span>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs underline opacity-60">
          {expanded ? "Hide output" : "Show output"}
        </button>
        {expanded && (
          <pre className={`mt-2 text-xs p-2 rounded overflow-x-auto ${isDark ? "bg-gray-950" : "bg-gray-100"}`}>
            {r.output}
          </pre>
        )}
      </div>
    );
  }

  if (event.type === "complete") {
    return (
      <div className={`my-3 p-4 rounded-lg border-2 ${
        isDark ? "border-green-600 bg-green-900/20" : "border-green-400 bg-green-50"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎉</span>
          <span className="font-bold text-lg">Build Complete!</span>
        </div>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Code approved by the Boss and all tests passing.
        </p>
      </div>
    );
  }

  if (event.type === "error") {
    return (
      <div className={`my-3 p-3 rounded-lg border ${isDark ? "border-red-800 bg-red-900/20" : "border-red-200 bg-red-50"}`}>
        <span className="text-sm">⚠️ {event.content}</span>
      </div>
    );
  }

  if (event.type === "agent_message") {
    const isLong = (event.content?.length || 0) > 300;
    return (
      <div className="my-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">{config?.emoji || "🤖"}</span>
          <span className="font-medium text-sm" style={{ color: config?.color }}>
            {config?.title || event.role}
          </span>
          <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
            {event.action}
          </span>
        </div>
        <div
          className={`text-sm pl-8 ${isDark ? "text-gray-300" : "text-gray-700"} ${
            isLong && !expanded ? "max-h-32 overflow-hidden relative" : ""
          }`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {event.content}
          {isLong && !expanded && (
            <div className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t ${
              isDark ? "from-gray-900" : "from-gray-50"
            }`} />
          )}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-xs ml-8 mt-1 underline ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  }

  return null;
}

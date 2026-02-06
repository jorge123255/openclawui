"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Terminal as TerminalIcon, X, Minus, Maximize2 } from "lucide-react";

interface TerminalLine {
  type: "input" | "output" | "error";
  content: string;
  elapsed?: number;
}

export default function EmbeddedTerminal({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", content: "Terminal ready. Type commands below." },
  ]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [cwd, setCwd] = useState("~");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [minimized, setMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [minimized]);

  async function runCommand() {
    if (!input.trim() || running) return;
    const cmd = input.trim();
    setInput("");
    setRunning(true);
    setHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);

    setLines(prev => [...prev, { type: "input", content: `$ ${cmd}` }]);

    // Handle cd locally
    if (cmd.startsWith("cd ")) {
      const dir = cmd.slice(3).trim();
      setCwd(dir.startsWith("/") ? dir : cwd === "~" ? `~/${dir}` : `${cwd}/${dir}`);
      setLines(prev => [...prev, { type: "output", content: "" }]);
      setRunning(false);
      return;
    }
    if (cmd === "clear") {
      setLines([]);
      setRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, cwd: cwd === "~" ? undefined : cwd }),
      });
      const data = await res.json();
      
      if (data.output) {
        setLines(prev => [...prev, { 
          type: data.exitCode === 0 ? "output" : "error", 
          content: data.output.trimEnd(),
          elapsed: data.elapsed,
        }]);
      }
    } catch (e: any) {
      setLines(prev => [...prev, { type: "error", content: e.message }]);
    }
    setRunning(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx >= 0) {
        const newIdx = historyIdx + 1;
        if (newIdx >= history.length) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(newIdx);
          setInput(history[newIdx]);
        }
      }
    }
  }

  if (minimized) {
    return (
      <div 
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 bg-gray-900 border border-white/20 rounded-lg px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition-colors z-50 shadow-xl"
      >
        <TerminalIcon className="w-4 h-4 text-green-400" />
        <span className="text-sm text-gray-300">Terminal</span>
      </div>
    );
  }

  return (
    <div className="border-t border-white/20 bg-[#0d1117] flex flex-col" style={{ height: "280px" }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-white/10">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-gray-400 font-mono">Terminal — {cwd}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/10 rounded transition-colors">
            <Minus className="w-3 h-3 text-gray-400" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded transition-colors">
            <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Output */}
      <div ref={outputRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className={
            line.type === "input" ? "text-blue-400" : 
            line.type === "error" ? "text-red-400" : "text-gray-300"
          }>
            <pre className="whitespace-pre-wrap m-0">{line.content}</pre>
          </div>
        ))}
        {running && (
          <div className="text-yellow-400 animate-pulse">Running...</div>
        )}
      </div>
      
      {/* Input */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t border-white/10 bg-[#0d1117]">
        <span className="text-green-400 text-xs font-mono">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-gray-200 text-xs font-mono focus:outline-none placeholder-gray-600"
          placeholder="Type a command..."
          disabled={running}
          autoFocus
        />
      </div>
    </div>
  );
}

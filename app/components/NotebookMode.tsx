"use client";

import { useState, useRef } from "react";
import { Plus, Play, Trash2, ChevronUp, ChevronDown, Type, Code, Loader2 } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";

interface NotebookCell {
  id: string;
  type: "code" | "markdown";
  content: string;
  language: string;
  output?: string;
  exitCode?: number;
  elapsed?: number;
  running?: boolean;
}

export default function NotebookMode({ onClose }: { onClose: () => void }) {
  const [cells, setCells] = useState<NotebookCell[]>([
    { id: "1", type: "code", content: "print('Hello, Notebook!')", language: "python" },
  ]);
  const [activeCell, setActiveCell] = useState("1");

  function addCell(afterId: string, type: "code" | "markdown" = "code") {
    const newCell: NotebookCell = {
      id: Date.now().toString(),
      type,
      content: "",
      language: "python",
    };
    setCells(prev => {
      const idx = prev.findIndex(c => c.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newCell);
      return next;
    });
    setActiveCell(newCell.id);
  }

  function deleteCell(id: string) {
    if (cells.length <= 1) return;
    setCells(prev => prev.filter(c => c.id !== id));
    if (activeCell === id) {
      setActiveCell(cells[0].id === id ? cells[1]?.id : cells[0].id);
    }
  }

  function moveCell(id: string, direction: "up" | "down") {
    setCells(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (direction === "up" && idx > 0) {
        const next = [...prev];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        return next;
      }
      if (direction === "down" && idx < prev.length - 1) {
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      }
      return prev;
    });
  }

  function updateCell(id: string, updates: Partial<NotebookCell>) {
    setCells(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  async function runCell(id: string) {
    const cell = cells.find(c => c.id === id);
    if (!cell || cell.type !== "code") return;
    
    updateCell(id, { running: true, output: undefined, exitCode: undefined });
    
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cell.content, language: cell.language }),
      });
      const data = await res.json();
      updateCell(id, {
        running: false,
        output: data.output || data.error || "(no output)",
        exitCode: data.exitCode,
        elapsed: data.elapsed,
      });
    } catch (e: any) {
      updateCell(id, { running: false, output: e.message, exitCode: 1 });
    }
  }

  async function runAll() {
    for (const cell of cells) {
      if (cell.type === "code") {
        await runCell(cell.id);
      }
    }
  }

  function getPrismLanguage(lang: string): string {
    const map: Record<string, string> = {
      js: "javascript", node: "javascript", py: "python", python3: "python",
      sh: "bash", shell: "bash", rb: "ruby", rs: "rust", kt: "kotlin",
      golang: "go", "c++": "cpp",
    };
    return map[lang.toLowerCase()] || lang.toLowerCase();
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <Code className="w-5 h-5 text-purple-400" />
          <h1 className="font-semibold">Notebook</h1>
          <span className="text-xs text-gray-500">{cells.length} cells</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAll}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Run All
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {cells.map((cell, idx) => (
          <div
            key={cell.id}
            className={`rounded-lg border transition-colors ${
              activeCell === cell.id
                ? "border-blue-500/40 bg-blue-500/5"
                : "border-white/10 bg-white/5"
            }`}
            onClick={() => setActiveCell(cell.id)}
          >
            {/* Cell toolbar */}
            <div className="flex items-center justify-between px-3 py-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-8">[{idx + 1}]</span>
                {cell.type === "code" ? (
                  <select
                    value={cell.language}
                    onChange={(e) => updateCell(cell.id, { language: e.target.value })}
                    className="bg-transparent text-xs text-gray-400 focus:outline-none cursor-pointer"
                  >
                    {["python", "javascript", "typescript", "bash", "go", "rust", "c", "cpp", "swift", "java", "kotlin", "php", "perl", "lua", "ruby", "r"].map(l => (
                      <option key={l} value={l} className="bg-gray-800">{l}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">Markdown</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {cell.type === "code" && (
                  <button onClick={() => runCell(cell.id)} disabled={cell.running}
                    className="p-1 hover:bg-white/10 rounded text-green-400 disabled:opacity-50">
                    {cell.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={() => moveCell(cell.id, "up")} className="p-1 hover:bg-white/10 rounded text-gray-400">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveCell(cell.id, "down")} className="p-1 hover:bg-white/10 rounded text-gray-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteCell(cell.id)} className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cell content */}
            <div className="p-3">
              {activeCell === cell.id ? (
                <textarea
                  value={cell.content}
                  onChange={(e) => updateCell(cell.id, { content: e.target.value })}
                  className="w-full bg-transparent font-mono text-sm resize-none focus:outline-none min-h-[60px] text-gray-200"
                  placeholder={cell.type === "code" ? "# Write code here..." : "Write markdown here..."}
                  style={{ height: Math.max(60, cell.content.split("\n").length * 20 + 20) }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (cell.type === "code") runCell(cell.id);
                    }
                  }}
                />
              ) : cell.type === "code" ? (
                <Highlight theme={themes.nightOwl} code={cell.content || " "} language={getPrismLanguage(cell.language)}>
                  {({ style, tokens, getLineProps, getTokenProps }) => (
                    <pre className="text-sm !bg-transparent m-0" style={{...style, background: "transparent"}}>
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
              ) : (
                <div className="text-sm text-gray-300 whitespace-pre-wrap">{cell.content || "Empty cell"}</div>
              )}
            </div>

            {/* Output */}
            {cell.output !== undefined && (
              <div className="border-t border-white/5 px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs ${cell.exitCode === 0 ? "text-green-400" : "text-red-400"}`}>
                    {cell.exitCode === 0 ? "✓" : "✗"} Exit {cell.exitCode}
                  </span>
                  {cell.elapsed && <span className="text-xs text-gray-500">{cell.elapsed}ms</span>}
                </div>
                <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap max-h-40 overflow-y-auto">{cell.output}</pre>
              </div>
            )}

            {/* Add cell button */}
            <div className="flex justify-center py-1 opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <button onClick={() => addCell(cell.id, "code")}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded hover:bg-white/10 text-gray-500">
                  <Plus className="w-3 h-3" /> Code
                </button>
                <button onClick={() => addCell(cell.id, "markdown")}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded hover:bg-white/10 text-gray-500">
                  <Plus className="w-3 h-3" /> Text
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

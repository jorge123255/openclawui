"use client";
import { useState } from "react";

interface DiffViewerProps {
  filePath: string;
  isNew: boolean;
  diff: string;
  oldContent: string;
  newContent: string;
  stats: { additions: number; deletions: number };
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function DiffViewer({ filePath, isNew, diff, oldContent, newContent, stats, onApprove, onReject, onClose }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");
  
  const fileName = filePath.split("/").pop() || filePath;
  
  // Parse diff lines for coloring
  const diffLines = diff.split("\n").map((line, i) => {
    let type: "add" | "remove" | "context" | "header" = "context";
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) type = "header";
    else if (line.startsWith("+")) type = "add";
    else if (line.startsWith("-")) type = "remove";
    return { line, type, num: i };
  });

  // Split view: pair old and new lines
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[90vw] max-w-5xl h-[80vh] bg-gray-900 rounded-xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18M3 12h18" />
              </svg>
              <span className="text-sm font-medium text-white">{fileName}</span>
              {isNew && <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">NEW</span>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-400">+{stats.additions}</span>
              <span className="text-red-400">-{stats.deletions}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-md border border-white/10 overflow-hidden">
              <button
                onClick={() => setViewMode("unified")}
                className={`px-2 py-1 text-xs ${viewMode === "unified" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >Unified</button>
              <button
                onClick={() => setViewMode("split")}
                className={`px-2 py-1 text-xs ${viewMode === "split" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              >Split</button>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* File path */}
        <div className="px-4 py-1.5 text-xs text-gray-500 font-mono border-b border-white/5 bg-gray-950">
          {filePath}
        </div>
        
        {/* Diff content */}
        <div className="flex-1 overflow-auto font-mono text-xs">
          {viewMode === "unified" ? (
            <table className="w-full">
              <tbody>
                {diffLines.map(({ line, type, num }) => (
                  <tr key={num} className={
                    type === "add" ? "bg-green-500/10" :
                    type === "remove" ? "bg-red-500/10" :
                    type === "header" ? "bg-blue-500/5" : ""
                  }>
                    <td className="w-8 text-right pr-2 text-gray-600 select-none border-r border-white/5">{num + 1}</td>
                    <td className={`pl-2 pr-4 py-0 whitespace-pre ${
                      type === "add" ? "text-green-400" :
                      type === "remove" ? "text-red-400" :
                      type === "header" ? "text-blue-400" : "text-gray-400"
                    }`}>{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full">
              {/* Old */}
              <div className="flex-1 border-r border-white/10 overflow-auto">
                <div className="px-2 py-1 text-[10px] text-red-400/60 uppercase tracking-wide border-b border-white/5 sticky top-0 bg-gray-900">Before</div>
                {oldLines.map((line, i) => (
                  <div key={i} className="px-2 py-0 text-gray-400 whitespace-pre hover:bg-white/5">
                    <span className="inline-block w-8 text-right pr-2 text-gray-600 select-none">{i + 1}</span>
                    {line}
                  </div>
                ))}
              </div>
              {/* New */}
              <div className="flex-1 overflow-auto">
                <div className="px-2 py-1 text-[10px] text-green-400/60 uppercase tracking-wide border-b border-white/5 sticky top-0 bg-gray-900">After</div>
                {newLines.map((line, i) => (
                  <div key={i} className="px-2 py-0 text-gray-400 whitespace-pre hover:bg-white/5">
                    <span className="inline-block w-8 text-right pr-2 text-gray-600 select-none">{i + 1}</span>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer with actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-gray-900/80">
          <span className="text-xs text-gray-500">Review changes before applying</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

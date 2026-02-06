"use client";

import { useState } from "react";
import { X, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

export default function HtmlPreview({ html, onClose }: { html: string; onClose: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);

  // Create a blob URL for the HTML
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  return (
    <div className={`${fullscreen ? "fixed inset-0 z-50" : "border-t border-white/20"} bg-white flex flex-col`}
         style={fullscreen ? {} : { height: "400px" }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-white/10">
        <span className="text-xs text-gray-400">HTML Preview</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => window.open(url, "_blank")}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </button>
          <button 
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {fullscreen ? <Minimize2 className="w-3 h-3 text-gray-400" /> : <Maximize2 className="w-3 h-3 text-gray-400" />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded transition-colors">
            <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Preview iframe */}
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="HTML Preview"
      />
    </div>
  );
}

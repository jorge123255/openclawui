"use client";
import { useState, useEffect, useRef } from "react";

interface SimDevice {
  name: string;
  udid: string;
  state: string;
  runtime: string;
}

interface SwiftFile {
  path: string;
  content: string;
}

interface Props {
  isDark: boolean;
  onClose: () => void;
}

export default function AppStudio({ isDark, onClose }: Props) {
  const [xcodeInstalled, setXcodeInstalled] = useState<boolean | null>(null);
  const [simulators, setSimulators] = useState<SimDevice[]>([]);
  const [selectedSim, setSelectedSim] = useState<string>("");
  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [files, setFiles] = useState<SwiftFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [building, setBuilding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [buildOutput, setBuildOutput] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"ios" | "tvos">("ios");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [browsePath, setBrowsePath] = useState("/Users/gszulc");
  const [browseEntries, setBrowseEntries] = useState<string[]>([]);
  const [externalProjectPath, setExternalProjectPath] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const bg = isDark ? "bg-gray-900" : "bg-gray-50";
  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const border = isDark ? "border-gray-700" : "border-gray-200";
  const text = isDark ? "text-gray-100" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const codeBg = isDark ? "bg-gray-950" : "bg-gray-100";

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function checkStatus() {
    try {
      const res = await fetch("/api/app-studio?action=status");
      const data = await res.json();
      setXcodeInstalled(data.xcodeInstalled);
      if (data.xcodeInstalled) {
        loadSimulators();
        loadProjects();
      }
    } catch {
      setXcodeInstalled(false);
    }
  }

  async function loadSimulators() {
    try {
      const res = await fetch("/api/app-studio?action=simulators");
      const data = await res.json();
      setSimulators(data.simulators || []);
      // Auto-select first iPhone
      const iphone = data.simulators?.find((s: SimDevice) => s.name.includes("iPhone"));
      if (iphone) setSelectedSim(iphone.udid);
    } catch {}
  }

  async function loadProjects() {
    try {
      const res = await fetch("/api/app-studio?action=projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {}
  }

  async function loadFiles(project: string) {
    try {
      const res = await fetch(`/api/app-studio?action=files&project=${encodeURIComponent(project)}`);
      const data = await res.json();
      setFiles(data.files || []);
      if (data.files?.length > 0) {
        const content = data.files.find((f: SwiftFile) => f.path.includes("ContentView"));
        if (content) {
          setActiveFile(content.path);
          setCode(content.content);
        } else {
          setActiveFile(data.files[0].path);
          setCode(data.files[0].content);
        }
      }
    } catch {}
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newProjectName.trim(), platform }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowNewProject(false);
        setNewProjectName("");
        await loadProjects();
        setActiveProject(newProjectName.trim());
        await loadFiles(newProjectName.trim());
        addChat("system", `Created ${platform === "tvos" ? "tvOS" : "iOS"} project: ${newProjectName.trim()}`);
      }
    } catch {}
  }

  async function openProject(name: string) {
    setActiveProject(name);
    setExternalProjectPath(null);
    await loadFiles(name);
    addChat("system", `Opened project: ${name}`);
  }

  async function browseDir(path: string) {
    setBrowsePath(path);
    try {
      const res = await fetch("/api/project/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      setBrowseEntries(data.entries || []);
    } catch {
      setBrowseEntries([]);
    }
  }

  async function openExternalProject(path: string) {
    setShowBrowse(false);
    setExternalProjectPath(path);
    setActiveProject(path.split("/").pop() || path);
    addChat("system", `Opened external project: ${path}`);
    // Load Swift files from external path
    try {
      const res = await fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "openExternal", path }),
      });
      const data = await res.json();
      setFiles(data.files || []);
      if (data.files?.length > 0) {
        const content = data.files.find((f: SwiftFile) => f.path.includes("ContentView"));
        const first = content || data.files[0];
        setActiveFile(first.path);
        setCode(first.content);
        addChat("system", `Found ${data.files.length} Swift files`);
      } else {
        addChat("system", "No .swift files found in this project");
      }
    } catch {
      addChat("system", "Failed to scan project");
    }
  }

  async function buildAndRun() {
    if ((!activeProject && !externalProjectPath) || !selectedSim) return;
    setBuilding(true);
    setBuildOutput(null);
    addChat("system", "🔨 Building...");
    try {
      // Boot simulator first
      await fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "boot", udid: selectedSim }),
      });

      const buildPayload: Record<string, string> = { action: "build", simulator: selectedSim };
      if (externalProjectPath) {
        buildPayload.externalPath = externalProjectPath;
      } else if (activeProject) {
        buildPayload.project = activeProject;
      }
      const res = await fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload),
      });
      const data = await res.json();
      setBuildOutput(data.output);
      if (data.success) {
        addChat("system", `✅ Build succeeded (${(data.duration / 1000).toFixed(1)}s)`);
        // Take screenshot
        await takeScreenshot();
      } else {
        addChat("system", `❌ Build failed:\n${data.output?.slice(-500)}`);
      }
    } catch (e: any) {
      addChat("system", `❌ Build error: ${e.message}`);
    } finally {
      setBuilding(false);
    }
  }

  async function takeScreenshot() {
    if (!selectedSim) return;
    try {
      const res = await fetch(`/api/app-studio?action=screenshot&udid=${selectedSim}`);
      const data = await res.json();
      if (data.path) {
        setScreenshotUrl(`/api/upload?path=${encodeURIComponent(data.path)}&t=${Date.now()}`);
      }
    } catch {}
  }

  async function aiEditCode() {
    if (!instruction.trim() || !code || !activeFile) return;
    setAiLoading(true);
    addChat("user", instruction);
    try {
      // Build project context - all file names + current file content
      const projectContext = files.map(f => f.path).join(", ");
      const res = await fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "aiEdit",
          project: activeProject,
          externalPath: externalProjectPath,
          file: activeFile,
          instruction: instruction.trim(),
          currentCode: code,
          projectFiles: projectContext,
        }),
      });
      const data = await res.json();
      if (data.ok && data.code) {
        setCode(data.code);
        addChat("assistant", `Updated ${activeFile}. Hit Build to see the changes!`);
        setInstruction("");
      } else {
        addChat("assistant", `Failed to edit: ${data.error || "unknown error"}`);
      }
    } catch (e: any) {
      addChat("assistant", `Error: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  }

  function addChat(role: string, text: string) {
    setChatHistory((prev) => [...prev, { role, text }]);
  }

  function saveFile() {
    if (!activeFile) return;
    if (externalProjectPath) {
      // Save to external project path
      fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editFile", externalPath: externalProjectPath, file: activeFile, content: code }),
      });
    } else if (activeProject) {
      fetch("/api/app-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editFile", project: activeProject, file: activeFile, content: code }),
      });
    }
    addChat("system", `💾 Saved ${activeFile}`);
  }

  // ── No Xcode Screen ──
  if (xcodeInstalled === false) {
    return (
      <div className={`flex flex-col h-full ${bg} ${text} items-center justify-center`}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">📱</div>
          <h2 className="text-2xl font-bold mb-3">App Studio</h2>
          <p className={`${textMuted} mb-6`}>
            Xcode is required to build iOS and tvOS apps. Install it from the Mac App Store.
          </p>
          <div className={`p-4 rounded-lg ${codeBg} text-left mb-6`}>
            <p className="text-sm font-mono mb-2">To install Xcode:</p>
            <p className="text-sm font-mono text-blue-400">1. Open Mac App Store</p>
            <p className="text-sm font-mono text-blue-400">2. Search for &quot;Xcode&quot;</p>
            <p className="text-sm font-mono text-blue-400">3. Install (~30GB)</p>
            <p className="text-sm font-mono text-blue-400 mt-2">Then run: sudo xcode-select -s /Applications/Xcode.app</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={checkStatus} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              🔄 Check Again
            </button>
            <button onClick={onClose} className={`px-4 py-2 rounded-lg border ${border}`}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (xcodeInstalled === null) {
    return (
      <div className={`flex flex-col h-full ${bg} ${text} items-center justify-center`}>
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <p>Checking for Xcode...</p>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className={`flex flex-col h-full ${bg} ${text}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-3 border-b ${border} shrink-0`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <h2 className="font-bold">App Studio</h2>
            <p className={`text-xs ${textMuted}`}>
              {activeProject ? `${activeProject} • ${platform.toUpperCase()}` : "Visual iOS/tvOS Builder"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Simulator Picker */}
          <select
            value={selectedSim}
            onChange={(e) => setSelectedSim(e.target.value)}
            className={`text-xs px-2 py-1 rounded ${isDark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"} border`}
          >
            <option value="">Select Simulator</option>
            {simulators.filter(s => platform === "tvos" ? s.name.includes("TV") : s.name.includes("iPhone") || s.name.includes("iPad")).map((s) => (
              <option key={s.udid} value={s.udid}>
                {s.name} ({s.state})
              </option>
            ))}
          </select>
          {activeProject && (
            <button
              onClick={buildAndRun}
              disabled={building || !selectedSim}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              {building ? "🔨 Building..." : "▶ Build & Run"}
            </button>
          )}
          <button onClick={onClose} className={`p-1 rounded hover:${isDark ? "bg-gray-700" : "bg-gray-200"}`}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Phone/TV Preview */}
        <div className={`w-[35%] flex flex-col items-center justify-center p-4 border-r ${border} ${isDark ? "bg-gray-950" : "bg-gray-100"}`}>
          {!activeProject ? (
            // Project picker
            <div className="text-center">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="font-bold text-lg mb-4">Choose a Project</h3>
              
              {projects.map((p) => (
                <button
                  key={p}
                  onClick={() => openProject(p)}
                  className={`block w-full px-4 py-2 mb-2 rounded-lg border ${border} ${cardBg} hover:border-blue-500 text-left`}
                >
                  📁 {p}
                </button>
              ))}
              
              {!showNewProject && !showBrowse ? (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowNewProject(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + New Project
                  </button>
                  <button
                    onClick={() => { setShowBrowse(true); browseDir(browsePath); }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    📂 Open Existing
                  </button>
                </div>
              ) : showBrowse ? (
                <div className={`mt-4 p-3 rounded-lg border ${border} ${cardBg} max-h-64 overflow-hidden flex flex-col`}>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => {
                        const parent = browsePath.split("/").slice(0, -1).join("/") || "/";
                        browseDir(parent);
                      }}
                      className={`px-2 py-1 text-xs rounded border ${border} hover:bg-blue-500/20`}
                    >
                      ⬆ Up
                    </button>
                    <span className={`text-xs ${textMuted} truncate flex-1`}>{browsePath}</span>
                    <button
                      onClick={() => setShowBrowse(false)}
                      className={`px-2 py-1 text-xs rounded border ${border}`}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 space-y-1">
                    {browseEntries.map((entry) => {
                      const isDir = entry.endsWith("/");
                      const name = entry.replace(/\/$/, "");
                      const isXcodeProj = name.endsWith(".xcodeproj") || name.endsWith(".xcworkspace");
                      const fullPath = `${browsePath}/${name}`;
                      return (
                        <div key={entry} className="flex items-center gap-2">
                          <button
                            onClick={() => isDir ? browseDir(fullPath) : null}
                            className={`flex-1 text-left px-2 py-1 text-sm rounded truncate ${
                              isXcodeProj
                                ? "text-blue-400 font-medium"
                                : isDir
                                ? "hover:bg-white/5"
                                : `${textMuted} cursor-default`
                            }`}
                          >
                            {isDir ? "📁" : isXcodeProj ? "🔨" : "📄"} {name}
                          </button>
                          {isDir && (
                            <button
                              onClick={() => openExternalProject(fullPath)}
                              className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 shrink-0"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {browseEntries.length === 0 && (
                      <p className={`text-sm ${textMuted} text-center py-4`}>Empty directory</p>
                    )}
                  </div>
                  <button
                    onClick={() => openExternalProject(browsePath)}
                    className="mt-2 w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    📂 Open This Folder as Project
                  </button>
                </div>
              ) : (
                <div className={`mt-4 p-4 rounded-lg border ${border} ${cardBg}`}>
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name..."
                    className={`w-full px-3 py-2 rounded border ${border} ${isDark ? "bg-gray-800" : "bg-white"} mb-2`}
                  />
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setPlatform("ios")}
                      className={`flex-1 px-3 py-1 rounded text-sm ${platform === "ios" ? "bg-blue-600 text-white" : `border ${border}`}`}
                    >
                      📱 iOS
                    </button>
                    <button
                      onClick={() => setPlatform("tvos")}
                      className={`flex-1 px-3 py-1 rounded text-sm ${platform === "tvos" ? "bg-purple-600 text-white" : `border ${border}`}`}
                    >
                      📺 tvOS
                    </button>
                  </div>
                  <button onClick={createProject} className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                    Create
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Phone/TV frame with screenshot
            <div className="relative">
              {/* Device frame */}
              <div
                className={`rounded-[2rem] border-4 ${isDark ? "border-gray-600" : "border-gray-400"} overflow-hidden ${
                  platform === "tvos" ? "w-[400px] h-[225px]" : "w-[220px] h-[440px]"
                } ${isDark ? "bg-black" : "bg-gray-900"}`}
              >
                {/* Notch (iOS only) */}
                {platform === "ios" && (
                  <div className="w-20 h-5 bg-black rounded-b-xl mx-auto" />
                )}
                
                {screenshotUrl ? (
                  <img
                    src={screenshotUrl}
                    alt="App preview"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(0);
                      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(0);
                      addChat("system", `Tapped at (${x}%, ${y}%) — describe what you want to change!`);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{platform === "tvos" ? "📺" : "📱"}</div>
                      <p className="text-xs">Build & Run to see preview</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Home indicator */}
              {platform === "ios" && (
                <div className="w-24 h-1 bg-gray-500 rounded-full mx-auto mt-1" />
              )}
            </div>
          )}
        </div>

        {/* Middle: Code Editor */}
        <div className={`w-[35%] flex flex-col border-r ${border}`}>
          {/* File tabs */}
          <div className={`flex border-b ${border} overflow-x-auto`}>
            {files.map((f) => (
              <button
                key={f.path}
                onClick={() => { setActiveFile(f.path); setCode(f.content); }}
                className={`px-3 py-2 text-xs whitespace-nowrap border-r ${border} ${
                  activeFile === f.path
                    ? isDark ? "bg-gray-800 text-blue-400" : "bg-blue-50 text-blue-600"
                    : textMuted
                }`}
              >
                {f.path.split("/").pop()}
              </button>
            ))}
          </div>
          {/* Code */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`flex-1 p-3 text-sm font-mono resize-none ${codeBg} ${text} focus:outline-none`}
            spellCheck={false}
          />
          <div className={`flex gap-2 p-2 border-t ${border}`}>
            <button onClick={saveFile} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
              💾 Save
            </button>
            <button
              onClick={buildAndRun}
              disabled={building}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              ▶ Build
            </button>
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="w-[30%] flex flex-col">
          <div className={`p-3 border-b ${border}`}>
            <h3 className="font-bold text-sm">🤖 AI Assistant</h3>
            <p className={`text-xs ${textMuted}`}>Describe UI changes, tap the preview to select elements</p>
          </div>
          
          <div className={`flex-1 overflow-y-auto p-3 space-y-3`}>
            {chatHistory.length === 0 && (
              <div className={`text-center py-8 ${textMuted}`}>
                <p className="text-sm">Tell me what to change:</p>
                <p className="text-xs mt-2 italic">&quot;Make the title red&quot;</p>
                <p className="text-xs italic">&quot;Add a settings tab&quot;</p>
                <p className="text-xs italic">&quot;Make it look like Netflix&quot;</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`text-sm ${
                msg.role === "user" ? "text-blue-400" :
                msg.role === "assistant" ? (isDark ? "text-green-400" : "text-green-600") :
                textMuted
              }`}>
                <span className="font-bold">
                  {msg.role === "user" ? "You: " : msg.role === "assistant" ? "AI: " : ""}
                </span>
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          <div className={`p-3 border-t ${border}`}>
            <div className="flex gap-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && aiEditCode()}
                placeholder="Describe the change..."
                className={`flex-1 px-3 py-2 rounded border ${border} text-sm ${isDark ? "bg-gray-800" : "bg-white"}`}
                disabled={aiLoading}
              />
              <button
                onClick={aiEditCode}
                disabled={aiLoading || !instruction.trim()}
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {aiLoading ? "..." : "✨"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Play, Square, CheckCircle, XCircle, Loader2, ChevronRight } from "lucide-react";

interface AgentStep {
  id: string;
  type: "thinking" | "code" | "running" | "output" | "error" | "fix" | "success";
  content: string;
  language?: string;
  timestamp: Date;
  elapsed?: number;
}

interface AgentModeProps {
  task: string;
  onComplete: (result: string) => void;
  onCancel: () => void;
}

export default function AgentMode({ task, onComplete, onCancel }: AgentModeProps) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [running, setRunning] = useState(true);
  const [iteration, setIteration] = useState(0);
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  useEffect(() => {
    runAgent();
    return () => { abortRef.current = true; };
  }, []);

  function addStep(step: Omit<AgentStep, "id" | "timestamp">) {
    const newStep = { ...step, id: Date.now().toString(), timestamp: new Date() };
    setSteps(prev => [...prev, newStep]);
    return newStep;
  }

  async function runAgent() {
    const maxIterations = 5;
    let currentCode = "";
    let lastError = "";

    addStep({ type: "thinking", content: `Working on: ${task}` });

    for (let i = 0; i < maxIterations; i++) {
      if (abortRef.current) break;
      setIteration(i + 1);

      // Step 1: Ask the AI to write/fix code
      addStep({ type: "thinking", content: i === 0 ? "Writing code..." : `Fixing error (attempt ${i + 1})...` });

      try {
        const prompt = i === 0
          ? `Write code to accomplish this task. Return ONLY a code block with the language tag. Task: ${task}`
          : `The code had this error:\n\`\`\`\n${lastError}\n\`\`\`\n\nFix the code. Return ONLY the complete fixed code block with language tag. Original code:\n\`\`\`\n${currentCode}\n\`\`\``;

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, sessionKey: "agent-mode" }),
        });
        const chatData = await chatRes.json();
        
        if (!chatData.success) {
          addStep({ type: "error", content: `AI error: ${chatData.error}` });
          break;
        }

        // Extract code block from response
        const codeMatch = chatData.response.match(/```(\w*)\n?([\s\S]*?)```/);
        if (!codeMatch) {
          addStep({ type: "success", content: chatData.response });
          onComplete(chatData.response);
          setRunning(false);
          return;
        }

        const language = codeMatch[1] || "python";
        currentCode = codeMatch[2].trim();
        addStep({ type: "code", content: currentCode, language });

        // Step 2: Run the code
        addStep({ type: "running", content: "Executing..." });
        
        const runRes = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: currentCode, language }),
        });
        const runData = await runRes.json();

        if (runData.success || runData.exitCode === 0) {
          addStep({ type: "output", content: runData.output || "(no output)", elapsed: runData.elapsed });
          addStep({ type: "success", content: "✅ Code executed successfully!" });
          onComplete(`Task completed!\n\nCode:\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\nOutput:\n${runData.output}`);
          setRunning(false);
          return;
        } else {
          lastError = runData.output || runData.error || "Unknown error";
          addStep({ type: "error", content: lastError, elapsed: runData.elapsed });
          
          if (i < maxIterations - 1) {
            addStep({ type: "fix", content: "Analyzing error and fixing..." });
          }
        }
      } catch (e: any) {
        addStep({ type: "error", content: e.message });
        break;
      }
    }

    if (!abortRef.current) {
      addStep({ type: "error", content: `Failed after ${maxIterations} attempts.` });
      onComplete(`Agent couldn't complete the task after ${maxIterations} attempts.`);
      setRunning(false);
    }
  }

  function getStepIcon(type: AgentStep["type"]) {
    switch (type) {
      case "thinking": return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case "code": return <ChevronRight className="w-4 h-4 text-purple-400" />;
      case "running": return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case "output": return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "error": return <XCircle className="w-4 h-4 text-red-400" />;
      case "fix": return <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />;
      case "success": return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  }

  function getStepColor(type: AgentStep["type"]) {
    switch (type) {
      case "thinking": return "border-blue-500/20 bg-blue-500/5";
      case "code": return "border-purple-500/20 bg-purple-500/5";
      case "running": return "border-yellow-500/20 bg-yellow-500/5";
      case "output": return "border-green-500/20 bg-green-500/5";
      case "error": return "border-red-500/20 bg-red-500/5";
      case "fix": return "border-orange-500/20 bg-orange-500/5";
      case "success": return "border-green-500/20 bg-green-500/5";
    }
  }

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-purple-500/10 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">Agent Mode</span>
          {running && (
            <span className="text-xs text-purple-400/60">Iteration {iteration}/5</span>
          )}
        </div>
        {running ? (
          <button
            onClick={() => { abortRef.current = true; setRunning(false); onCancel(); }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        ) : (
          <span className="text-xs text-green-400">Complete</span>
        )}
      </div>

      {/* Steps */}
      <div className="max-h-96 overflow-y-auto p-3 space-y-2">
        {steps.map(step => (
          <div key={step.id} className={`flex gap-2 p-2 rounded-lg border ${getStepColor(step.type)}`}>
            <div className="shrink-0 mt-0.5">{getStepIcon(step.type)}</div>
            <div className="flex-1 min-w-0">
              {step.type === "code" ? (
                <pre className="text-xs font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                  <code>{step.content}</code>
                </pre>
              ) : (
                <pre className="text-sm whitespace-pre-wrap text-gray-300">{step.content}</pre>
              )}
              {step.elapsed && (
                <span className="text-xs text-gray-500 mt-1">{step.elapsed}ms</span>
              )}
            </div>
          </div>
        ))}
        <div ref={stepsEndRef} />
      </div>
    </div>
  );
}

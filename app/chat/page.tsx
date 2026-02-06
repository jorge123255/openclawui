"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MessageSquare,
  ChevronLeft,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  Mic,
  MicOff,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

function renderMarkdown(text: string): string {
  // 1. Escape HTML entities first (sanitize)
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // 2. Code blocks (``` ... ```) — must come before inline code
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre style="background:#1e1e2e;border-radius:8px;padding:12px 16px;overflow-x:auto;margin:8px 0;font-size:0.85em;line-height:1.5"><code>${code.replace(/\n$/, "")}</code></pre>`;
  });

  // 3. Inline code (`...`)
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>');

  // 4. Bold (**...**)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 5. Italic (*...*) — but not inside already-processed bold
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

  // 6. Headings (### ... , ## ... , # ...)
  html = html.replace(/^### (.+)$/gm, '<div style="font-size:1.1em;font-weight:700;margin:12px 0 4px">$1</div>');
  html = html.replace(/^## (.+)$/gm, '<div style="font-size:1.2em;font-weight:700;margin:14px 0 4px">$1</div>');
  html = html.replace(/^# (.+)$/gm, '<div style="font-size:1.35em;font-weight:700;margin:16px 0 6px">$1</div>');

  // 7. Unordered list items (- item or * item)
  html = html.replace(/^[\-\*] (.+)$/gm, '<div style="padding-left:16px">• $1</div>');

  // 8. Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#60a5fa;text-decoration:underline">$1</a>');

  // 9. Line breaks (preserve newlines outside of pre blocks)
  // Split by pre blocks to avoid double-processing
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/g);
  html = parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // pre block, leave alone
      return part.replace(/\n/g, "<br>");
    })
    .join("");

  return html;
}

interface AssistantInfo {
  name: string;
  avatar: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<AssistantInfo>({ name: "Assistant", avatar: "🤖" });
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load assistant info from config
    fetch("/api/assistant")
      .then((res) => res.json())
      .then((data) => setAssistant(data))
      .catch(() => {});
      
    // Load messages from localStorage
    const saved = localStorage.getItem("chat-messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch {}
    }

    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem("chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();

    try {
      // Try streaming first
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionKey: "webchat-ui",
          stream: true,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
        // Streaming response
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let accumulated = "";

        // Add placeholder assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            streaming: true,
          },
        ]);
        setLoading(false); // hide "Thinking..." since we have a streaming bubble

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Handle SSE format: lines starting with "data: "
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.token || parsed.content || parsed.text || parsed.delta?.content) {
                  accumulated += parsed.token || parsed.content || parsed.text || parsed.delta?.content || "";
                }
              } catch {
                // Not JSON, treat as raw text
                accumulated += data;
              }
            } else if (line.trim() && !line.startsWith(":") && !line.startsWith("event:")) {
              // Raw streaming text (not SSE)
              accumulated += line;
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
        }

        // Mark streaming complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        );
        if (accumulated) {
          showNotification(`${assistant.name} replied`, accumulated);
        }
      } else {
        // Non-streaming JSON response (fallback)
        const data = await res.json();

        if (data.success && data.response) {
          const assistantMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          showNotification(`${assistant.name} replied`, data.response);
        } else {
          const errorMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: `⚠️ Error: ${data.error || "Failed to get response"}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
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
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  function clearChat() {
    if (confirm("Clear all messages?")) {
      setMessages([]);
      localStorage.removeItem("chat-messages");
    }
  }

  async function copyMessage(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Chat with {assistant.name}</h1>
                  <p className="text-xs text-gray-400">
                    {messages.length} messages
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="text-5xl mb-4">{assistant.avatar}</div>
              <p className="text-lg">Hey! I'm {assistant.name}</p>
              <p className="text-sm mt-2">Ask me anything...</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white/10 text-gray-100"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="relative">
                        <div
                          className="whitespace-pre-wrap break-words prose prose-invert prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                        {msg.streaming && (
                          <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        msg.role === "user" ? "text-blue-200" : "text-gray-500"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </div>
                    <button
                      onClick={() => copyMessage(msg.content, msg.id)}
                      className="absolute -right-2 -top-2 p-1.5 bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied === msg.id ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
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
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2 sm:gap-3">
            {speechSupported && (
              <button
                onClick={toggleListening}
                className={`px-3 py-3 rounded-xl transition-colors ${
                  isListening
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Type a message..."}
              rows={1}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-blue-500/50 placeholder-gray-500"
              style={{ minHeight: "48px", maxHeight: "120px" }}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {speechSupported ? "Tap mic to speak • " : ""}Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

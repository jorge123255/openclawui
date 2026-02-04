"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mail,
  ChevronLeft,
  RefreshCw,
  Star,
  Trash2,
  Archive,
  Loader2,
  Inbox,
  Send,
  AlertCircle,
} from "lucide-react";

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
}

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");

  useEffect(() => {
    loadEmails();
  }, [tab]);

  async function loadEmails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/email?folder=${tab}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
      } else {
        setError(data.error || "Failed to load emails");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffHours < 48) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Mail className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Email</h1>
                  <p className="text-sm text-gray-400">
                    {emails.filter(e => e.unread).length} unread
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadEmails}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("inbox")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === "inbox" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Inbox
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === "sent" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            Sent
          </button>
        </div>

        {/* Email List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>{error}</p>
            <Link href="/connections" className="mt-4 text-blue-400 hover:underline">
              Connect Google Account →
            </Link>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Mail className="w-12 h-12 mb-4 opacity-50" />
            <p>No emails</p>
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((email, i) => (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                  email.unread
                    ? "bg-white/10 border-white/20"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium truncate ${email.unread ? "text-white" : "text-gray-300"}`}>
                        {email.from}
                      </span>
                      {email.starred && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <div className={`truncate ${email.unread ? "font-medium" : "text-gray-400"}`}>
                      {email.subject}
                    </div>
                    <div className="text-sm text-gray-500 truncate mt-1">
                      {email.snippet}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(email.date)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

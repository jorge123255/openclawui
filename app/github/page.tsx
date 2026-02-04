"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Github,
  ChevronLeft,
  RefreshCw,
  GitPullRequest,
  AlertCircle,
  Bell,
  Star,
  GitFork,
  Eye,
  Loader2,
  ExternalLink,
  Check,
  X,
  Clock,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  repo: string;
  type: string;
  reason: string;
  url: string;
  updatedAt: string;
  unread: boolean;
}

interface PullRequest {
  id: string;
  title: string;
  repo: string;
  number: number;
  state: string;
  draft: boolean;
  author: string;
  url: string;
  createdAt: string;
  additions: number;
  deletions: number;
}

export default function GitHubPage() {
  const [tab, setTab] = useState<"notifications" | "prs">("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github?type=${tab}`);
      const data = await res.json();
      if (data.success) {
        if (tab === "notifications") {
          setNotifications(data.notifications || []);
        } else {
          setPrs(data.prs || []);
        }
      } else {
        setError(data.error || "Failed to load data");
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
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "PullRequest": return GitPullRequest;
      case "Issue": return AlertCircle;
      default: return Bell;
    }
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
                <div className="p-2 bg-gray-500/20 rounded-lg">
                  <Github className="w-6 h-6 text-gray-300" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">GitHub</h1>
                  <p className="text-sm text-gray-400">
                    {tab === "notifications" 
                      ? `${notifications.filter(n => n.unread).length} unread`
                      : `${prs.length} open PRs`
                    }
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadData}
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
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("notifications")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === "notifications" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
          <button
            onClick={() => setTab("prs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              tab === "prs" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            Pull Requests
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>{error}</p>
            <Link href="/connections" className="mt-4 text-blue-400 hover:underline">
              Connect GitHub →
            </Link>
          </div>
        ) : tab === "notifications" ? (
          notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Bell className="w-12 h-12 mb-4 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, i) => {
                const Icon = getTypeIcon(notif.type);
                return (
                  <motion.a
                    key={notif.id}
                    href={notif.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`block p-4 rounded-xl border transition-colors ${
                      notif.unread
                        ? "bg-white/10 border-white/20"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500">{notif.repo}</span>
                          <span className="text-xs text-gray-600">{notif.reason}</span>
                        </div>
                        <div className={`truncate ${notif.unread ? "font-medium" : "text-gray-400"}`}>
                          {notif.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {formatDate(notif.updatedAt)}
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          )
        ) : (
          prs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <GitPullRequest className="w-12 h-12 mb-4 opacity-50" />
              <p>No open pull requests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prs.map((pr, i) => (
                <motion.a
                  key={pr.id}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <GitPullRequest className={`w-5 h-5 mt-0.5 ${pr.draft ? "text-gray-500" : "text-green-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500">{pr.repo}</span>
                        <span className="text-xs text-gray-600">#{pr.number}</span>
                        {pr.draft && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">Draft</span>
                        )}
                      </div>
                      <div className="font-medium truncate">{pr.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{pr.author}</span>
                        <span className="text-green-400">+{pr.additions}</span>
                        <span className="text-red-400">-{pr.deletions}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {formatDate(pr.createdAt)}
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

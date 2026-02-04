"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  MessageSquare,
  Bot,
  User,
  Zap,
  Bell,
  Clock,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "message" | "session" | "cron" | "alert" | "system";
  title: string;
  detail?: string;
  timestamp: Date;
}

interface LiveActivityProps {
  maxItems?: number;
}

export default function LiveActivity({ maxItems = 5 }: LiveActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Try to connect to gateway WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = 18789;
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    function connect() {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
          // Subscribe to activity stream
          ws?.send(JSON.stringify({
            type: "subscribe",
            channels: ["activity"],
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "activity" || msg.type === "message" || msg.type === "session") {
              const item: ActivityItem = {
                id: `${Date.now()}-${Math.random()}`,
                type: msg.type,
                title: msg.title || msg.type,
                detail: msg.detail || msg.content?.substring(0, 50),
                timestamp: new Date(),
              };
              setActivities((prev) => [item, ...prev].slice(0, maxItems));
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          // Reconnect after 5s
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => ws?.close();
      } catch {}
    }

    connect();

    // Also poll for recent activity as fallback
    async function pollActivity() {
      try {
        const res = await fetch("/api/activity?limit=5");
        const data = await res.json();
        if (data.success && data.activities) {
          setActivities(data.activities.map((a: any) => ({
            ...a,
            id: a.id || `${Date.now()}-${Math.random()}`,
            timestamp: new Date(a.timestamp || Date.now()),
          })));
        }
      } catch {}
    }

    pollActivity();
    const pollInterval = setInterval(pollActivity, 30000);

    return () => {
      ws?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
    };
  }, [maxItems]);

  function getIcon(type: string) {
    switch (type) {
      case "message": return MessageSquare;
      case "session": return Bot;
      case "cron": return Clock;
      case "alert": return Bell;
      default: return Activity;
    }
  }

  function getColor(type: string) {
    switch (type) {
      case "message": return "text-blue-400";
      case "session": return "text-green-400";
      case "cron": return "text-orange-400";
      case "alert": return "text-red-400";
      default: return "text-gray-400";
    }
  }

  function formatTime(date: Date): string {
    const now = new Date();
    const diffSec = (now.getTime() - date.getTime()) / 1000;
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live Activity
        </h3>
        <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No recent activity
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {activities.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 p-2 rounded-lg bg-white/5"
                >
                  <Icon className={`w-4 h-4 mt-0.5 ${getColor(item.type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.title}</div>
                    {item.detail && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.detail}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(item.timestamp)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

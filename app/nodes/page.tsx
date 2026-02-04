"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Smartphone,
  ChevronLeft,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Camera,
  MapPin,
  Bell,
  Check,
  X,
  Clock,
  Play,
  Volume2,
} from "lucide-react";

interface Node {
  id: string;
  name: string;
  platform?: string;
  lastSeen?: string;
  online?: boolean;
  capabilities?: string[];
  version?: string;
}

export default function NodesPage() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [pendingNodes, setPendingNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadNodes();
  }, []);

  async function loadNodes() {
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await res.json();
      if (data.nodes) {
        setNodes(data.nodes);
      }
      if (data.pending) {
        setPendingNodes(data.pending);
      }
    } catch (e) {
      console.error("Failed to load nodes:", e);
    }
    setLoading(false);
  }

  async function approveNode(requestId: string) {
    setActionLoading(requestId);
    try {
      await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", requestId }),
      });
      await loadNodes();
    } catch (e) {
      console.error("Failed to approve node:", e);
    }
    setActionLoading(null);
  }

  async function rejectNode(requestId: string) {
    setActionLoading(requestId);
    try {
      await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", requestId }),
      });
      await loadNodes();
    } catch (e) {
      console.error("Failed to reject node:", e);
    }
    setActionLoading(null);
  }

  async function nodeAction(nodeId: string, command: string) {
    setActionLoading(`${nodeId}-${command}`);
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invoke", nodeId, command }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Command sent: ${command}`);
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setActionLoading(null);
  }

  function formatLastSeen(timestamp: string | undefined): string {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nodes</h1>
              <p className="text-sm text-muted-foreground">
                {nodes.length} paired devices
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { setLoading(true); loadNodes(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      {/* Pending Approvals */}
      {pendingNodes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            Pending Approvals
          </h2>
          <div className="space-y-3">
            {pendingNodes.map((node) => (
              <motion.div
                key={node.requestId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{node.name || "Unknown Device"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {node.platform || "Unknown"} • Requesting access
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => rejectNode(node.requestId)}
                      disabled={actionLoading === node.requestId}
                      className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                    >
                      {actionLoading === node.requestId ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => approveNode(node.requestId)}
                      disabled={actionLoading === node.requestId}
                      className="p-2 rounded-lg hover:bg-accent/20 text-accent transition-colors"
                    >
                      {actionLoading === node.requestId ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Paired Nodes */}
      {nodes.length === 0 ? (
        <div className="p-12 rounded-xl bg-secondary/50 text-center">
          <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No devices paired</p>
          <p className="text-sm text-muted-foreground mb-4">
            Install the OpenClaw app on your phone and scan the QR code to pair
          </p>
          <p className="text-xs text-muted-foreground">
            Run <code className="bg-background px-1 rounded">openclaw devices pair</code> to get a pairing code
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-xl bg-card border-2 transition-all cursor-pointer ${
                selectedNode === node.id
                  ? "border-primary"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  node.online ? "bg-accent/20" : "bg-muted"
                }`}>
                  <Smartphone className={`w-6 h-6 ${node.online ? "text-accent" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{node.name}</h3>
                    {node.online ? (
                      <Wifi className="w-4 h-4 text-accent" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {node.platform || "Unknown"} {node.version && `• v${node.version}`}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {formatLastSeen(node.lastSeen)}
                  </div>
                </div>
              </div>

              {/* Capabilities / Actions */}
              {selectedNode === node.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 pt-4 border-t border-border"
                >
                  <p className="text-sm text-muted-foreground mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); nodeAction(node.id, "ping"); }}
                      disabled={!node.online || actionLoading === `${node.id}-ping`}
                      className="flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-sm transition-colors"
                    >
                      {actionLoading === `${node.id}-ping` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4" />
                      )}
                      Ping
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nodeAction(node.id, "getLocation"); }}
                      disabled={!node.online || actionLoading === `${node.id}-getLocation`}
                      className="flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-sm transition-colors"
                    >
                      {actionLoading === `${node.id}-getLocation` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      Location
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nodeAction(node.id, "speak"); }}
                      disabled={!node.online || actionLoading === `${node.id}-speak`}
                      className="flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-sm transition-colors"
                    >
                      {actionLoading === `${node.id}-speak` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      Speak
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nodeAction(node.id, "getInstalledApps"); }}
                      disabled={!node.online || actionLoading === `${node.id}-getInstalledApps`}
                      className="flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-sm transition-colors"
                    >
                      {actionLoading === `${node.id}-getInstalledApps` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Apps
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Help */}
      <section className="mt-8 p-6 rounded-xl bg-card border border-border">
        <h3 className="font-semibold mb-3">Pairing a New Device</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>1. Install the <strong className="text-foreground">OpenClaw</strong> app on your phone</p>
          <p>2. Run <code className="bg-secondary px-1 rounded">openclaw devices pair</code> to generate a QR code</p>
          <p>3. Scan the QR code with the app</p>
          <p>4. Approve the pairing request above</p>
        </div>
      </section>
    </main>
  );
}

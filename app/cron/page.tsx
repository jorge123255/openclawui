"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Clock,
  ChevronLeft,
  RefreshCw,
  Loader2,
  Play,
  Pause,
  Trash2,
  Plus,
  Calendar,
  Zap,
  Check,
  X,
  Edit,
} from "lucide-react";

interface CronJob {
  id: string;
  name?: string;
  schedule: {
    kind: "at" | "every" | "cron";
    expr?: string;
    everyMs?: number;
    atMs?: number;
  };
  payload: {
    kind: string;
    text?: string;
    message?: string;
  };
  sessionTarget: "main" | "isolated";
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  delivery?: {
    mode: "announce" | "none";
  };
  cleanup?: string;
}

export default function CronPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJob, setNewJob] = useState({
    name: "",
    scheduleKind: "every" as "at" | "every" | "cron",
    everyMinutes: 60,
    cronExpr: "0 9 * * *",
    atTime: "",
    payloadText: "",
    sessionTarget: "main" as "main" | "isolated",
    deliveryMode: "announce" as "announce" | "none",
    autoDelete: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await res.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error("Failed to load cron jobs:", e);
    }
    setLoading(false);
  }

  async function toggleJob(jobId: string, enabled: boolean) {
    try {
      await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", jobId, patch: { enabled } }),
      });
      await loadJobs();
    } catch (e) {
      console.error("Failed to toggle job:", e);
    }
  }

  async function deleteJob(jobId: string) {
    if (!confirm("Delete this cron job?")) return;
    
    try {
      await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", jobId }),
      });
      await loadJobs();
    } catch (e) {
      console.error("Failed to delete job:", e);
    }
  }

  async function runJob(jobId: string) {
    try {
      await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", jobId }),
      });
      alert("Job triggered!");
    } catch (e) {
      console.error("Failed to run job:", e);
    }
  }

  async function addJob() {
    setSaving(true);
    
    const schedule: any = { kind: newJob.scheduleKind };
    if (newJob.scheduleKind === "every") {
      schedule.everyMs = newJob.everyMinutes * 60 * 1000;
    } else if (newJob.scheduleKind === "cron") {
      schedule.expr = newJob.cronExpr;
    } else if (newJob.scheduleKind === "at") {
      schedule.atMs = new Date(newJob.atTime).getTime();
    }

    const job: any = {
      name: newJob.name || undefined,
      schedule,
      payload: {
        kind: newJob.sessionTarget === "main" ? "systemEvent" : "agentTurn",
        text: newJob.payloadText,
        message: newJob.payloadText,
      },
      sessionTarget: newJob.sessionTarget,
      enabled: true,
    };

    // Add delivery mode if isolated session
    if (newJob.sessionTarget === "isolated") {
      job.delivery = { mode: newJob.deliveryMode };
    }

    // Add cleanup setting if auto-delete is disabled for one-time jobs
    if (newJob.scheduleKind === "at" && !newJob.autoDelete) {
      job.cleanup = "keep";
    }

    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", job }),
      });
      const data = await res.json();
      
      if (data.success) {
        setShowAddModal(false);
        setNewJob({
          name: "",
          scheduleKind: "every",
          everyMinutes: 60,
          cronExpr: "0 9 * * *",
          atTime: "",
          payloadText: "",
          sessionTarget: "main",
          deliveryMode: "announce",
          autoDelete: true,
        });
        await loadJobs();
      } else {
        alert(`Failed to add job: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setSaving(false);
  }

  function formatSchedule(job: CronJob): string {
    const s = job.schedule;
    if (s.kind === "every" && s.everyMs) {
      const mins = s.everyMs / 60000;
      if (mins < 60) return `Every ${mins} min`;
      if (mins < 1440) return `Every ${mins / 60} hours`;
      return `Every ${mins / 1440} days`;
    }
    if (s.kind === "cron" && s.expr) return `Cron: ${s.expr}`;
    if (s.kind === "at" && s.atMs) return `At: ${new Date(s.atMs).toLocaleString()}`;
    return "Unknown";
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
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Clock className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Cron Jobs</h1>
              <p className="text-sm text-muted-foreground">
                {jobs.length} scheduled tasks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Job
          </button>
          <button
            onClick={() => { setLoading(true); loadJobs(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="p-12 rounded-xl bg-secondary/50 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No cron jobs</p>
          <p className="text-sm text-muted-foreground mb-4">
            Schedule tasks to run automatically
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            Create First Job
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-card border border-border"
            >
              <div className="flex items-start gap-4">
                <div className={`w-3 h-3 rounded-full mt-2 ${job.enabled ? "bg-accent" : "bg-muted"}`} />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{job.name || job.id}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      job.sessionTarget === "main" 
                        ? "bg-blue-500/20 text-blue-400" 
                        : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {job.sessionTarget}
                    </span>
                    {job.delivery && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        {job.delivery.mode}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatSchedule(job)}
                    </span>
                    {job.nextRun && (
                      <span>Next: {new Date(job.nextRun).toLocaleString()}</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2 truncate">
                    {job.payload.text || job.payload.message || "No message"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runJob(job.id)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    title="Run now"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleJob(job.id, !job.enabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      job.enabled ? "hover:bg-yellow-500/20 text-yellow-500" : "hover:bg-accent/20 text-accent"
                    }`}
                    title={job.enabled ? "Disable" : "Enable"}
                  >
                    {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6"
          >
            <h2 className="text-xl font-bold mb-6">Create Cron Job</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name (optional)</label>
                <input
                  type="text"
                  value={newJob.name}
                  onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                  placeholder="My reminder"
                  className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Schedule Type</label>
                <div className="flex gap-2">
                  {(["every", "cron", "at"] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => setNewJob({ ...newJob, scheduleKind: kind })}
                      className={`flex-1 py-2 rounded-lg capitalize transition-colors ${
                        newJob.scheduleKind === kind
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {kind === "at" ? "One-time" : kind}
                    </button>
                  ))}
                </div>
              </div>

              {newJob.scheduleKind === "every" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Interval (minutes)</label>
                  <input
                    type="number"
                    value={newJob.everyMinutes}
                    onChange={(e) => setNewJob({ ...newJob, everyMinutes: parseInt(e.target.value) || 60 })}
                    min={1}
                    className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
                  />
                </div>
              )}

              {newJob.scheduleKind === "cron" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Cron Expression</label>
                  <input
                    type="text"
                    value={newJob.cronExpr}
                    onChange={(e) => setNewJob({ ...newJob, cronExpr: e.target.value })}
                    placeholder="0 9 * * *"
                    className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: "0 9 * * *" = 9 AM daily
                  </p>
                </div>
              )}

              {newJob.scheduleKind === "at" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newJob.atTime}
                    onChange={(e) => setNewJob({ ...newJob, atTime: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={newJob.payloadText}
                  onChange={(e) => setNewJob({ ...newJob, payloadText: e.target.value })}
                  placeholder="What should the agent do?"
                  rows={3}
                  className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:border-primary outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Session</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewJob({ ...newJob, sessionTarget: "main" })}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      newJob.sessionTarget === "main"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    Main Session
                  </button>
                  <button
                    onClick={() => setNewJob({ ...newJob, sessionTarget: "isolated" })}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      newJob.sessionTarget === "isolated"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    Isolated
                  </button>
                </div>
              </div>

              {/* Delivery Mode - only show for isolated sessions */}
              {newJob.sessionTarget === "isolated" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Delivery Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewJob({ ...newJob, deliveryMode: "announce" })}
                      className={`flex-1 py-2 rounded-lg transition-colors ${
                        newJob.deliveryMode === "announce"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      Announce
                    </button>
                    <button
                      onClick={() => setNewJob({ ...newJob, deliveryMode: "none" })}
                      className={`flex-1 py-2 rounded-lg transition-colors ${
                        newJob.deliveryMode === "none"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      None
                    </button>
                  </div>
                </div>
              )}

              {/* Auto-delete toggle - only show for one-time jobs */}
              {newJob.scheduleKind === "at" && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoDelete"
                    checked={newJob.autoDelete}
                    onChange={(e) => setNewJob({ ...newJob, autoDelete: e.target.checked })}
                    className="w-5 h-5 rounded accent-primary"
                  />
                  <label htmlFor="autoDelete" className="text-sm font-medium cursor-pointer">
                    Delete after run
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addJob}
                disabled={saving || !newJob.payloadText}
                className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-hover font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Job
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

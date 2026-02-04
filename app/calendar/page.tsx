"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  attendees?: number;
  allDay?: boolean;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadEvents();
  }, [selectedDate]);

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await fetch(`/api/calendar?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
      } else {
        setError(data.error || "Failed to load events");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateHeader(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  }

  function changeDate(delta: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
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
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Calendar</h1>
                  <p className="text-sm text-gray-400">
                    {events.length} event{events.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadEvents}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Date Navigator */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-lg font-semibold hover:text-blue-400 transition-colors"
          >
            {formatDateHeader(selectedDate)}
          </button>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4" />
            <p>{error}</p>
            <Link href="/connections" className="mt-4 text-blue-400 hover:underline">
              Connect Google Calendar →
            </Link>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p>No events scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-1 h-full bg-blue-500 rounded-full self-stretch" />
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{event.summary}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {event.allDay ? (
                          "All day"
                        ) : (
                          `${formatTime(event.start)} - ${formatTime(event.end)}`
                        )}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                      {event.attendees && event.attendees > 1 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.attendees} attendees
                        </div>
                      )}
                    </div>
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

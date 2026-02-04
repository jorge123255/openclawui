"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command, X } from "lucide-react";

export default function KeyboardHint() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const hasDismissed = localStorage.getItem("keyboard-hint-dismissed");
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    // Show after 3 seconds
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("keyboard-hint-dismissed", "true");
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-white/10 rounded-full shadow-lg">
            <div className="flex items-center gap-1 text-sm text-gray-300">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded flex items-center gap-0.5 font-mono text-xs">
                <Command className="w-3 h-3" />K
              </kbd>
              <span>for quick navigation</span>
            </div>
            <button
              onClick={dismiss}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

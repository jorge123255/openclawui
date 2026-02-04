"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

const shortcuts: ShortcutHandler[] = [];

export function registerShortcut(shortcut: ShortcutHandler) {
  shortcuts.push(shortcut);
  return () => {
    const index = shortcuts.indexOf(shortcut);
    if (index > -1) shortcuts.splice(index, 1);
  };
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      // Allow Escape in inputs
      if (e.key !== "Escape") return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const metaMatch = shortcut.meta ? e.metaKey : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && metaMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        shortcut.handler();
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribes = [
      // Navigation shortcuts
      registerShortcut({
        key: "h",
        ctrl: true,
        handler: () => router.push("/"),
        description: "Go to Home",
      }),
      registerShortcut({
        key: "k",
        ctrl: true,
        handler: () => {
          // Trigger command palette (if we add one)
          const event = new CustomEvent("open-command-palette");
          window.dispatchEvent(event);
        },
        description: "Open command palette",
      }),
      registerShortcut({
        key: "/",
        handler: () => {
          // Focus search if visible
          const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        },
        description: "Focus search",
      }),
      registerShortcut({
        key: "Escape",
        handler: () => {
          // Blur active element
          (document.activeElement as HTMLElement)?.blur();
          // Close any open modals
          const event = new CustomEvent("close-modal");
          window.dispatchEvent(event);
        },
        description: "Close/unfocus",
      }),
    ];

    return () => unsubscribes.forEach(unsub => unsub());
  }, [router]);
}

export function getShortcutsList() {
  return shortcuts.map(s => ({
    key: s.key,
    modifiers: [
      s.ctrl && "Ctrl",
      s.meta && "⌘",
      s.shift && "Shift",
      s.alt && "Alt",
    ].filter(Boolean).join("+"),
    description: s.description,
  }));
}

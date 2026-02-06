"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo,
  Download,
  Upload,
  Image,
  Palette,
  Type,
  Move,
  Maximize,
  X,
  Send,
  Plus,
  Copy,
  Loader2,
  Layers,
  Code,
  ChevronDown,
  ChevronRight,
  GripVertical,
  RotateCcw,
  FileCode,
  Layout,
  CreditCard,
  LayoutDashboard,
  FolderOpen,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DesignModeProps {
  onClose: () => void;
  initialHtml?: string;
}

interface SelectedElement {
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  innerHTML: string;
  styles: Record<string, string>;
  selector: string;
  outerHTML: string;
  rect?: { top: number; left: number; bottom: number; right: number };
}

type Viewport = "desktop" | "tablet" | "mobile";

interface StarterTemplate {
  name: string;
  icon: React.ReactNode;
  html: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BLANK_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #0f172a; color: #e2e8f0; }
  </style>
</head>
<body>
  <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem;">Hello, World</h1>
  <p style="color: #94a3b8; font-size: 1.1rem; line-height: 1.6; max-width: 600px;">
    Click any element to select it, then describe what changes you want. 
    Or just tell me what to build!
  </p>
  <button style="margin-top: 1.5rem; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
    Get Started
  </button>
</body>
</html>`;

const LANDING_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
  </style>
</head>
<body>
  <nav style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
    <span style="font-size: 1.25rem; font-weight: 700; color: #3b82f6;">Brand</span>
    <div style="display: flex; gap: 1.5rem;">
      <a href="#" style="color: #94a3b8; text-decoration: none; font-size: 0.9rem;">Features</a>
      <a href="#" style="color: #94a3b8; text-decoration: none; font-size: 0.9rem;">Pricing</a>
      <a href="#" style="color: #94a3b8; text-decoration: none; font-size: 0.9rem;">About</a>
    </div>
  </nav>
  <header style="text-align: center; padding: 6rem 2rem;">
    <h1 style="font-size: 3.5rem; font-weight: 800; margin-bottom: 1.5rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
      Build Something Amazing
    </h1>
    <p style="color: #94a3b8; font-size: 1.25rem; max-width: 600px; margin: 0 auto 2rem; line-height: 1.7;">
      The fastest way to go from idea to production. Start building today with our powerful platform.
    </p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <button style="padding: 14px 28px; background: #3b82f6; color: white; border: none; border-radius: 10px; font-size: 1rem; cursor: pointer; font-weight: 600;">Get Started Free</button>
      <button style="padding: 14px 28px; background: transparent; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; font-size: 1rem; cursor: pointer;">Learn More</button>
    </div>
  </header>
  <section style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; padding: 4rem 2rem; max-width: 1000px; margin: 0 auto;">
    <div style="padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 8px; margin-bottom: 1rem;"></div>
      <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Lightning Fast</h3>
      <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">Optimized for speed from the ground up.</p>
    </div>
    <div style="padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="width: 40px; height: 40px; background: #8b5cf6; border-radius: 8px; margin-bottom: 1rem;"></div>
      <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Secure by Default</h3>
      <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">Enterprise-grade security built in.</p>
    </div>
    <div style="padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <div style="width: 40px; height: 40px; background: #10b981; border-radius: 8px; margin-bottom: 1rem;"></div>
      <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">Scale Easily</h3>
      <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6;">Grows with you from zero to millions.</p>
    </div>
  </section>
</body>
</html>`;

const DASHBOARD_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; min-height: 100vh; }
  </style>
</head>
<body>
  <aside style="width: 240px; background: #1e293b; border-right: 1px solid rgba(255,255,255,0.1); padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.25rem;">
    <div style="font-size: 1.1rem; font-weight: 700; color: #3b82f6; padding: 0.5rem; margin-bottom: 1rem;">Dashboard</div>
    <a href="#" style="padding: 0.5rem 0.75rem; border-radius: 6px; background: rgba(59,130,246,0.15); color: #3b82f6; text-decoration: none; font-size: 0.9rem;">Overview</a>
    <a href="#" style="padding: 0.5rem 0.75rem; border-radius: 6px; color: #94a3b8; text-decoration: none; font-size: 0.9rem;">Analytics</a>
    <a href="#" style="padding: 0.5rem 0.75rem; border-radius: 6px; color: #94a3b8; text-decoration: none; font-size: 0.9rem;">Users</a>
    <a href="#" style="padding: 0.5rem 0.75rem; border-radius: 6px; color: #94a3b8; text-decoration: none; font-size: 0.9rem;">Settings</a>
  </aside>
  <main style="flex: 1; padding: 2rem;">
    <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem;">Overview</h1>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
      <div style="padding: 1.5rem; background: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">Total Users</div>
        <div style="font-size: 2rem; font-weight: 700;">12,847</div>
        <div style="font-size: 0.8rem; color: #10b981; margin-top: 0.25rem;">+12.5%</div>
      </div>
      <div style="padding: 1.5rem; background: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">Revenue</div>
        <div style="font-size: 2rem; font-weight: 700;">$48.2k</div>
        <div style="font-size: 0.8rem; color: #10b981; margin-top: 0.25rem;">+8.1%</div>
      </div>
      <div style="padding: 1.5rem; background: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem;">Active Now</div>
        <div style="font-size: 2rem; font-weight: 700;">573</div>
        <div style="font-size: 0.8rem; color: #f97316; margin-top: 0.25rem;">-2.3%</div>
      </div>
    </div>
    <div style="background: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 1.5rem;">
      <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Recent Activity</h2>
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
          <span style="font-size: 0.9rem;">New user signup</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">2 min ago</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
          <span style="font-size: 0.9rem;">Payment received</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">15 min ago</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
          <span style="font-size: 0.9rem;">Server scaled up</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">1 hr ago</span>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`;

const CARD_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  </style>
</head>
<body>
  <div style="width: 380px; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px rgba(0,0,0,0.3);">
    <div style="height: 200px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center;">
      <span style="font-size: 3rem;">🎨</span>
    </div>
    <div style="padding: 1.5rem;">
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Beautiful Card</h2>
      <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.25rem;">
        A versatile card component with image, text, and action. Customize it however you like.
      </p>
      <div style="display: flex; gap: 0.75rem;">
        <button style="flex: 1; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-weight: 500;">Primary</button>
        <button style="flex: 1; padding: 10px; background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; font-size: 0.9rem; cursor: pointer;">Secondary</button>
      </div>
    </div>
  </div>
</body>
</html>`;

const INSPECTOR_SCRIPT = `
<script>
(function() {
  let prevHover = null;

  document.addEventListener('mouseover', function(e) {
    if (e.target === document.body || e.target === document.documentElement) return;
    if (prevHover && prevHover !== e.target && !prevHover._ditb_selected) {
      prevHover.style.outline = '';
    }
    if (!e.target._ditb_selected) {
      e.target.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
    }
    prevHover = e.target;
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (!e.target._ditb_selected) {
      e.target.style.outline = '';
    }
  }, true);

  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!e.shiftKey) {
      document.querySelectorAll('[data-ditb-selected]').forEach(function(el) {
        el.style.outline = '';
        el._ditb_selected = false;
        delete el.dataset.ditbSelected;
      });
    }

    if (e.target._ditb_selected) {
      e.target.style.outline = '';
      e.target._ditb_selected = false;
      delete e.target.dataset.ditbSelected;
    } else {
      e.target.dataset.ditbSelected = 'true';
      e.target._ditb_selected = true;
      e.target.style.outline = '2px solid #f97316';
    }

    var allSelected = document.querySelectorAll('[data-ditb-selected]');
    var elements = Array.from(allSelected).map(function(el) {
      var computed = window.getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: Array.from(el.classList),
        text: (el.textContent || '').slice(0, 100),
        innerHTML: (el.innerHTML || '').slice(0, 500),
        styles: {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          padding: computed.padding,
          margin: computed.margin,
          borderRadius: computed.borderRadius,
          width: rect.width.toFixed(0) + 'px',
          height: rect.height.toFixed(0) + 'px',
          display: computed.display,
          position: computed.position,
        },
        selector: buildSelector(el),
        outerHTML: (el.outerHTML || '').slice(0, 300),
        rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right }
      };
    });

    if (elements.length === 0) {
      window.parent.postMessage({ type: 'element-deselected' }, '*');
    } else if (elements.length === 1) {
      window.parent.postMessage({ type: 'element-selected', data: elements[0] }, '*');
    } else {
      window.parent.postMessage({ type: 'elements-selected', data: elements }, '*');
    }
  }, true);

  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    var path = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      path += '.' + el.className.trim().split(/\\s+/).join('.');
    }
    return path;
  }
})();
</script>`;

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function injectInspector(html: string): string {
  const bodyCloseIdx = html.lastIndexOf("</body>");
  if (bodyCloseIdx !== -1) {
    return html.slice(0, bodyCloseIdx) + INSPECTOR_SCRIPT + html.slice(bodyCloseIdx);
  }
  return html + INSPECTOR_SCRIPT;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DesignMode({ onClose, initialHtml }: DesignModeProps) {
  /* ---- State ---- */
  const [html, setHtml] = useState(initialHtml || "");
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!initialHtml);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [editingHtml, setEditingHtml] = useState(false);
  const [editHtmlValue, setEditHtmlValue] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [refImageOpacity, setRefImageOpacity] = useState(0.4);
  const [splitPercent, setSplitPercent] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [popover, setPopover] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [popoverInput, setPopoverInput] = useState("");
  const [multiSelect, setMultiSelect] = useState<SelectedElement[]>([]);
  const [showProjectBrowser, setShowProjectBrowser] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  const [projectFiles, setProjectFiles] = useState<Array<{ path: string; name: string; isDir: boolean }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const instructionRef = useRef<HTMLTextAreaElement>(null);

  /* ---- Templates ---- */
  const templates: StarterTemplate[] = [
    { name: "Blank Page", icon: <FileCode className="w-6 h-6" />, html: BLANK_HTML },
    { name: "Landing Page", icon: <Layout className="w-6 h-6" />, html: LANDING_HTML },
    { name: "Dashboard", icon: <LayoutDashboard className="w-6 h-6" />, html: DASHBOARD_HTML },
    { name: "Card Component", icon: <CreditCard className="w-6 h-6" />, html: CARD_HTML },
  ];

  /* ---- Push HTML to history and update ---- */
  const pushHtml = useCallback(
    (newHtml: string) => {
      setHtmlHistory((prev) => {
        const next = [...prev, html];
        if (next.length > 50) next.shift();
        return next;
      });
      setHtml(newHtml);
      setIframeKey((k) => k + 1);
    },
    [html],
  );

  /* ---- Undo ---- */
  const undo = useCallback(() => {
    if (htmlHistory.length === 0) return;
    const prev = htmlHistory[htmlHistory.length - 1];
    setHtmlHistory((h) => h.slice(0, -1));
    setHtml(prev);
    setIframeKey((k) => k + 1);
    setSelectedElement(null);
  }, [htmlHistory]);

  /* ---- Listen for messages from iframe ---- */
  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.data?.type === "element-selected") {
        setSelectedElement(e.data.data as SelectedElement);
        setMultiSelect([]);
        setEditHtmlValue(e.data.data.outerHTML);
        setEditingHtml(false);
        // Calculate popover position
        const iframe = iframeRef.current;
        if (iframe && e.data.data.rect) {
          const iframeRect = iframe.getBoundingClientRect();
          const elemRect = e.data.data.rect;
          setPopover({
            x: iframeRect.left + elemRect.left,
            y: iframeRect.top + elemRect.bottom + 8,
            visible: true,
          });
        }
        setPopoverInput("");
      } else if (e.data?.type === "elements-selected") {
        setMultiSelect(e.data.data as SelectedElement[]);
        setSelectedElement(null);
        setPopover(null);
      } else if (e.data?.type === "element-deselected") {
        setSelectedElement(null);
        setMultiSelect([]);
        setPopover(null);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /* ---- Auto-scroll chat ---- */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  /* ---- Draggable split ---- */
  useEffect(() => {
    if (!isDragging) return;

    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(25, Math.min(75, pct)));
    }
    function onMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  /* ---- Send design instruction to API ---- */
  async function sendInstruction(overrideMsg?: string) {
    const msg = overrideMsg || instruction.trim();
    if (!msg || loading) return;
    setInstruction("");
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          instruction: msg,
          selectedElement: selectedElement
            ? {
                selector: selectedElement.selector,
                tag: selectedElement.tag,
                outerHTML: selectedElement.outerHTML,
                styles: selectedElement.styles,
              }
            : null,
          multiSelect: multiSelect.length > 1
            ? multiSelect.map((el) => ({
                selector: el.selector,
                tag: el.tag,
                outerHTML: el.outerHTML,
                styles: el.styles,
              }))
            : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${res.status} — ${errText.slice(0, 200)}` },
        ]);
        return;
      }

      const data = await res.json();

      if (data.html) {
        pushHtml(data.html);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.message || "Done! Preview updated." },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.message || "No changes made." },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      setSelectedElement(null);
    }
  }

  /* ---- Export ---- */
  function exportHtml() {
    navigator.clipboard.writeText(html).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }

  /* ---- Reference image ---- */
  function handleRefImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  /* ---- Template selection ---- */
  function selectTemplate(t: StarterTemplate) {
    pushHtml(t.html);
    setShowTemplates(false);
    setSelectedElement(null);
  }

  /* ---- Import HTML ---- */
  function doImport() {
    if (!importText.trim()) return;
    pushHtml(importText.trim());
    setShowImport(false);
    setImportText("");
    setSelectedElement(null);
  }

  /* ---- Load project files ---- */
  async function loadProject() {
    if (!projectPath.trim()) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/design/files?dir=${encodeURIComponent(projectPath)}`);
      const data = await res.json();
      setProjectFiles(data.files || []);
    } catch {}
    setLoadingFiles(false);
  }

  async function loadProjectFile(filePath: string) {
    try {
      const fullPath = `${projectPath}/${filePath}`;
      const res = await fetch("/api/design/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fullPath }),
      });
      const data = await res.json();
      if (data.content) {
        if (data.content.includes("<html") || data.content.includes("<!DOCTYPE")) {
          pushHtml(data.content);
        } else {
          pushHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family: system-ui; padding: 20px; background: #0f172a; color: #e2e8f0; }</style></head><body>${data.content}</body></html>`);
        }
        setShowProjectBrowser(false);
      }
    } catch {}
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  /* ---- Template picker overlay ---- */
  if (showTemplates) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-orange-400" />
            <h1 className="font-semibold">Design Mode</h1>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Back to Chat
          </button>
        </div>

        {/* Template grid */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-center mb-2">Choose a Template</h2>
            <p className="text-gray-400 text-center mb-8">
              Pick a starting point, then use AI to design whatever you want.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => selectTemplate(t)}
                  className="group flex flex-col items-center gap-3 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/40 transition-all duration-200"
                >
                  <div className="p-3 rounded-lg bg-white/5 group-hover:bg-blue-500/10 transition-colors">
                    {t.icon}
                  </div>
                  <span className="font-medium">{t.name}</span>
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs text-center mt-6">
              Or paste your own HTML —{" "}
              <button
                onClick={() => {
                  setShowTemplates(false);
                  setShowImport(true);
                }}
                className="text-blue-400 hover:underline"
              >
                Import
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Import modal ---- */
  const importModal = showImport && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-white/10 p-6 w-full max-w-xl shadow-2xl">
        <h3 className="text-lg font-semibold mb-3">Import HTML</h3>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste your HTML here..."
          className="w-full h-64 bg-gray-900 text-sm font-mono text-gray-200 rounded-lg border border-white/10 p-3 focus:outline-none focus:border-blue-500/50 resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => {
              setShowImport(false);
              setImportText("");
            }}
            className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={doImport}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );

  /* ---- Style properties to render ---- */
  const styleEntries: { label: string; key: string; icon?: React.ReactNode }[] = [
    { label: "Color", key: "color", icon: <Palette className="w-3 h-3" /> },
    { label: "Background", key: "backgroundColor", icon: <Palette className="w-3 h-3" /> },
    { label: "Font Size", key: "fontSize", icon: <Type className="w-3 h-3" /> },
    { label: "Font Weight", key: "fontWeight", icon: <Type className="w-3 h-3" /> },
    { label: "Padding", key: "padding", icon: <Move className="w-3 h-3" /> },
    { label: "Margin", key: "margin", icon: <Move className="w-3 h-3" /> },
    { label: "Border Radius", key: "borderRadius" },
    { label: "Width", key: "width", icon: <Maximize className="w-3 h-3" /> },
    { label: "Height", key: "height", icon: <Maximize className="w-3 h-3" /> },
    { label: "Display", key: "display" },
    { label: "Position", key: "position" },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white select-none">
      {importModal}

      {/* Element popover (mini chat box) */}
      {popover?.visible && (
        <div
          className="fixed z-50 bg-gray-800 border border-orange-500/30 rounded-xl shadow-2xl p-3 w-80"
          style={{ left: popover.x, top: popover.y }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-orange-400 font-mono">
              &lt;{selectedElement?.tag}&gt;
            </span>
            {selectedElement?.text && (
              <span className="text-xs text-gray-500 truncate">
                &quot;{selectedElement.text.slice(0, 30)}&quot;
              </span>
            )}
            <button onClick={() => setPopover(null)} className="ml-auto text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={popoverInput}
              onChange={(e) => setPopoverInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && popoverInput.trim()) {
                  sendInstruction(popoverInput);
                  setPopover(null);
                }
              }}
              placeholder="Make it blue, bigger, etc..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              autoFocus
            />
            <button
              onClick={() => {
                if (popoverInput.trim()) {
                  sendInstruction(popoverInput);
                  setPopover(null);
                }
              }}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
            >
              Go
            </button>
          </div>
        </div>
      )}

      {/* Project browser modal */}
      {showProjectBrowser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 border border-white/10 rounded-2xl p-6 w-[500px] max-h-[600px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Open Project</h3>
            <div className="flex gap-2 mb-4">
              <input
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="/path/to/project"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                onKeyDown={(e) => e.key === "Enter" && loadProject()}
              />
              <button onClick={loadProject} className="px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-500">
                Browse
              </button>
            </div>
            {loadingFiles && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {projectFiles.map((f, i) => (
                <button
                  key={i}
                  onClick={() => !f.isDir && loadProjectFile(f.path)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 ${
                    f.isDir ? "text-gray-500" : "text-gray-300 hover:bg-white/10 cursor-pointer"
                  }`}
                  style={{ paddingLeft: `${(f.path.split("/").length - 1) * 16 + 12}px` }}
                >
                  {f.isDir ? <FolderOpen className="w-3.5 h-3.5 text-blue-400" /> : <FileCode className="w-3.5 h-3.5 text-green-400" />}
                  {f.name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowProjectBrowser(false)} className="mt-4 px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for reference images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleRefImage(f);
          e.target.value = "";
        }}
      />

      {/* ============ TOOLBAR ============ */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-orange-400" />
          <span className="font-semibold text-sm">Design Mode</span>
        </div>

        <div className="flex items-center gap-1">
          {/* New */}
          <ToolbarBtn
            icon={<Plus className="w-4 h-4" />}
            label="New"
            onClick={() => setShowTemplates(true)}
          />
          {/* Import */}
          <ToolbarBtn
            icon={<Upload className="w-4 h-4" />}
            label="Import"
            onClick={() => setShowImport(true)}
          />
          {/* Project */}
          <ToolbarBtn
            icon={<FolderOpen className="w-4 h-4" />}
            label="Project"
            onClick={() => setShowProjectBrowser(true)}
          />
          {/* Export */}
          <ToolbarBtn
            icon={copyFeedback ? <Copy className="w-4 h-4 text-green-400" /> : <Download className="w-4 h-4" />}
            label={copyFeedback ? "Copied!" : "Export"}
            onClick={exportHtml}
          />
          {/* Undo */}
          <ToolbarBtn
            icon={<Undo className="w-4 h-4" />}
            label={`Undo (${htmlHistory.length})`}
            onClick={undo}
            disabled={htmlHistory.length === 0}
          />
          {/* Ref Image */}
          <ToolbarBtn
            icon={<Image className="w-4 h-4" />}
            label="Ref Image"
            onClick={() => {
              if (referenceImage) {
                setReferenceImage(null);
              } else {
                fileInputRef.current?.click();
              }
            }}
            active={!!referenceImage}
          />

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Viewport toggles */}
          <ViewportBtn
            icon={<Monitor className="w-4 h-4" />}
            active={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
            title="Desktop"
          />
          <ViewportBtn
            icon={<Tablet className="w-4 h-4" />}
            active={viewport === "tablet"}
            onClick={() => setViewport("tablet")}
            title="Tablet (768px)"
          />
          <ViewportBtn
            icon={<Smartphone className="w-4 h-4" />}
            active={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
            title="Mobile (375px)"
          />

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* ============ MAIN SPLIT PANE ============ */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* ---- LEFT PANEL ---- */}
        <div
          className="flex flex-col border-r border-white/10 overflow-hidden"
          style={{ width: `${splitPercent}%` }}
        >
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <Layers className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  Select an element in the preview, then describe what you want to change.
                </p>
                <p className="text-xs mt-1 text-gray-600">
                  Or just type what you want to build!
                </p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600/20 text-blue-100 border border-blue-500/20"
                      : "bg-white/5 text-gray-300 border border-white/5"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-xl px-3 py-2 text-sm text-gray-400 border border-white/5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Designing...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Multi-select badge */}
          {multiSelect.length > 1 && (
            <div className="border-t border-white/10 bg-black/20 shrink-0">
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-300">{multiSelect.length} elements selected</span>
                </div>
                <div className="mt-2 space-y-1">
                  {multiSelect.map((el, i) => (
                    <div key={i} className="text-xs text-gray-400 font-mono">
                      &lt;{el.tag}&gt; {el.text?.slice(0, 30)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected element properties */}
          {selectedElement && (
            <div className="border-t border-white/10 bg-black/20 shrink-0 max-h-[40%] overflow-y-auto">
              <button
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Code className="w-3 h-3" />
                  {`<${selectedElement.tag}>`}
                  {selectedElement.id && (
                    <span className="text-blue-400">#{selectedElement.id}</span>
                  )}
                  {selectedElement.classes.length > 0 && (
                    <span className="text-green-400">
                      .{selectedElement.classes.join(".")}
                    </span>
                  )}
                </span>
                {propertiesOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {propertiesOpen && (
                <div className="px-4 pb-3 space-y-2">
                  {/* Text preview */}
                  {selectedElement.text && (
                    <div className="text-xs text-gray-500 truncate italic">
                      &ldquo;{selectedElement.text.slice(0, 80)}&rdquo;
                    </div>
                  )}

                  {/* CSS Properties grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {styleEntries.map(({ label, key, icon }) => (
                      <div key={key} className="flex items-center gap-1.5 text-xs">
                        {icon && <span className="text-gray-500">{icon}</span>}
                        <span className="text-gray-500 w-16 shrink-0 truncate">
                          {label}
                        </span>
                        <span className="text-gray-300 truncate font-mono text-[10px]">
                          {selectedElement.styles[key] || "—"}
                        </span>
                        {(key === "color" || key === "backgroundColor") &&
                          selectedElement.styles[key] && (
                            <span
                              className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                              style={{ background: selectedElement.styles[key] }}
                            />
                          )}
                      </div>
                    ))}
                  </div>

                  {/* Edit HTML toggle */}
                  <div>
                    <button
                      onClick={() => {
                        setEditingHtml(!editingHtml);
                        setEditHtmlValue(selectedElement.outerHTML);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                    >
                      <Code className="w-3 h-3" />
                      {editingHtml ? "Hide HTML" : "Edit HTML"}
                    </button>
                    {editingHtml && (
                      <textarea
                        value={editHtmlValue}
                        onChange={(e) => setEditHtmlValue(e.target.value)}
                        className="w-full mt-1 h-24 bg-gray-900 text-[11px] font-mono text-gray-300 rounded-md border border-white/10 p-2 focus:outline-none focus:border-blue-500/50 resize-y"
                      />
                    )}
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      "Make it bigger",
                      "Add shadow",
                      "Round corners",
                      "Center it",
                      "Change color",
                    ].map((action) => (
                      <button
                        key={action}
                        onClick={() => {
                          setInstruction(action);
                          setTimeout(() => instructionRef.current?.focus(), 0);
                        }}
                        className="px-2 py-0.5 text-[10px] rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-white/10 p-3 shrink-0 bg-black/10">
            <div className="flex gap-2">
              <textarea
                ref={instructionRef}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendInstruction();
                  }
                }}
                placeholder={
                  selectedElement
                    ? `Describe changes to <${selectedElement.tag}>...`
                    : "Describe what to build or change..."
                }
                rows={2}
                className="flex-1 bg-gray-800 text-sm rounded-lg border border-white/10 px-3 py-2 focus:outline-none focus:border-blue-500/40 resize-none text-gray-200 placeholder:text-gray-600"
              />
              <button
                onClick={() => sendInstruction()}
                disabled={loading || !instruction.trim()}
                className="px-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 self-end"
                style={{ height: "38px" }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ---- DRAGGABLE DIVIDER ---- */}
        <div
          className={`w-1.5 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors shrink-0 relative group ${
            isDragging ? "bg-blue-500/50" : "bg-transparent"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 text-gray-500" />
          </div>
        </div>

        {/* ---- RIGHT PANEL (PREVIEW) ---- */}
        <div
          className="flex-1 flex items-start justify-center overflow-auto bg-gray-950 p-4 relative"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) handleRefImage(file);
          }}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.startsWith("image/")) {
                const file = items[i].getAsFile();
                if (file) handleRefImage(file);
              }
            }
          }}
        >
          {/* Reference image overlay */}
          {referenceImage && (
            <div className="absolute inset-4 pointer-events-none z-10 flex items-center justify-center">
              <div className="relative w-full h-full">
                <img
                  src={referenceImage}
                  alt="Reference"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: refImageOpacity }}
                />
                {/* Opacity control */}
                <div className="absolute bottom-2 right-2 pointer-events-auto flex items-center gap-2 bg-gray-900/90 rounded-lg px-3 py-1.5 border border-white/10">
                  <span className="text-[10px] text-gray-400">Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={refImageOpacity * 100}
                    onChange={(e) => setRefImageOpacity(Number(e.target.value) / 100)}
                    className="w-20 h-1 accent-blue-500"
                  />
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="text-gray-400 hover:text-red-400 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Viewport info */}
          {viewport !== "desktop" && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-[10px] text-gray-600 bg-gray-900/80 px-2 py-0.5 rounded-full border border-white/5">
              {VIEWPORT_WIDTHS[viewport]}
            </div>
          )}

          {/* Iframe */}
          {html ? (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              srcDoc={injectInspector(html)}
              className="bg-white/0 border border-white/10 rounded-lg shadow-2xl transition-all duration-300 ease-in-out"
              style={{
                width: VIEWPORT_WIDTHS[viewport],
                maxWidth: "100%",
                height: "100%",
                minHeight: "400px",
              }}
              sandbox="allow-scripts"
              title="Design Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              No HTML to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar Button Components                                          */
/* ------------------------------------------------------------------ */

function ToolbarBtn({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
        active
          ? "bg-orange-500/20 text-orange-300"
          : disabled
            ? "text-gray-600 cursor-not-allowed"
            : "text-gray-400 hover:text-white hover:bg-white/10"
      }`}
      title={label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function ViewportBtn({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? "bg-blue-500/20 text-blue-400"
          : "text-gray-500 hover:text-white hover:bg-white/10"
      }`}
      title={title}
    >
      {icon}
    </button>
  );
}

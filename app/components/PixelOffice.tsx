"use client";
import { useRef, useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentActivity {
  boss: "idle" | "planning" | "reviewing" | "diagnosing" | "approved" | "feedback";
  worker: "idle" | "coding" | "fixing" | "done";
  tester: "idle" | "running" | "passed" | "failed";
}

interface Props {
  activity: AgentActivity;
  round: number;
  isDark: boolean;
  thought?: { agent: string; text: string } | null;
}

// ─── Color Palette ──────────────────────────────────────────────────────────

const PAL = {
  // Office
  floor: "#3b3253",
  floorLight: "#4a4068",
  wall: "#2a2040",
  wallAccent: "#352a50",
  desk: "#8b6b4a",
  deskDark: "#6b4f35",
  deskLight: "#a88860",
  // Characters
  bossHair: "#f5d670",
  bossSuit: "#5b4fa0",
  bossSuitLight: "#7b6fc0",
  bossShirt: "#e8e0f0",
  bossSkin: "#fad0a0",
  workerHair: "#4a3520",
  workerHoodie: "#4080d0",
  workerHoodieLight: "#60a0e8",
  workerSkin: "#e8b888",
  // Objects
  monitor: "#1a1a2e",
  monitorGlow: "#40d080",
  monitorCode: "#60e8a0",
  monitorError: "#e05050",
  whiteboard: "#e8e4e0",
  whiteboardFrame: "#888078",
  coffee: "#6b4030",
  coffeeLight: "#8b6050",
  steam: "rgba(255,255,255,0.3)",
  // UI
  bubbleBg: "#ffffff",
  bubbleText: "#222222",
  testGreen: "#40d080",
  testRed: "#e05050",
  testYellow: "#e8c840",
  serverLed: "#40d080",
  serverLedOff: "#303030",
};

// ─── Pixel Drawing Helpers ──────────────────────────────────────────────────

function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x * size), Math.floor(y * size), size, size);
}

function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x * size), Math.floor(y * size), w * size, h * size);
}

// ─── Sprite Definitions ─────────────────────────────────────────────────────

function drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frame: number, facing: "left" | "right" | "front" = "front") {
  // Hair
  drawRect(ctx, x + 1, y, 4, 1, s, PAL.bossHair);
  drawRect(ctx, x, y + 1, 6, 1, s, PAL.bossHair);
  // Face
  drawRect(ctx, x + 1, y + 2, 4, 2, s, PAL.bossSkin);
  // Eyes
  if (facing === "front") {
    drawPixel(ctx, x + 2, y + 2, s, "#333");
    drawPixel(ctx, x + 4, y + 2, s, "#333");
  } else {
    const ex = facing === "right" ? 1 : 0;
    drawPixel(ctx, x + 2 + ex, y + 2, s, "#333");
    drawPixel(ctx, x + 4 + ex, y + 2, s, "#333");
  }
  // Mouth - varies with frame
  if (frame % 4 < 2) {
    drawPixel(ctx, x + 3, y + 3, s, "#c08070");
  }
  // Shirt collar
  drawRect(ctx, x + 2, y + 4, 2, 1, s, PAL.bossShirt);
  // Suit
  drawRect(ctx, x, y + 4, 2, 3, s, PAL.bossSuit);
  drawRect(ctx, x + 4, y + 4, 2, 3, s, PAL.bossSuit);
  drawRect(ctx, x + 2, y + 5, 2, 2, s, PAL.bossSuitLight);
  // Arms - typing animation
  if (frame % 2 === 0) {
    drawPixel(ctx, x - 1, y + 5, s, PAL.bossSkin);
    drawPixel(ctx, x + 6, y + 6, s, PAL.bossSkin);
  } else {
    drawPixel(ctx, x - 1, y + 6, s, PAL.bossSkin);
    drawPixel(ctx, x + 6, y + 5, s, PAL.bossSkin);
  }
  // Legs
  drawPixel(ctx, x + 1, y + 7, s, PAL.bossSuit);
  drawPixel(ctx, x + 4, y + 7, s, PAL.bossSuit);
  // Shoes
  drawPixel(ctx, x + 1, y + 8, s, "#333");
  drawPixel(ctx, x + 4, y + 8, s, "#333");
}

function drawWorker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frame: number, isTyping: boolean) {
  // Hair
  drawRect(ctx, x + 1, y, 4, 2, s, PAL.workerHair);
  drawPixel(ctx, x, y + 1, s, PAL.workerHair);
  // Headphones
  drawPixel(ctx, x, y, s, "#555");
  drawPixel(ctx, x + 5, y, s, "#555");
  drawRect(ctx, x + 1, y - 1, 4, 1, s, "#555");
  // Face
  drawRect(ctx, x + 1, y + 2, 4, 2, s, PAL.workerSkin);
  // Eyes - blink occasionally
  if (frame % 12 < 10) {
    drawPixel(ctx, x + 2, y + 2, s, "#333");
    drawPixel(ctx, x + 4, y + 2, s, "#333");
  }
  // Hoodie
  drawRect(ctx, x, y + 4, 6, 3, s, PAL.workerHoodie);
  drawRect(ctx, x + 2, y + 4, 2, 1, s, PAL.workerHoodieLight);
  // Arms - typing animation
  if (isTyping) {
    if (frame % 3 === 0) {
      drawPixel(ctx, x - 1, y + 5, s, PAL.workerSkin);
      drawPixel(ctx, x + 6, y + 6, s, PAL.workerSkin);
    } else if (frame % 3 === 1) {
      drawPixel(ctx, x - 1, y + 6, s, PAL.workerSkin);
      drawPixel(ctx, x + 6, y + 5, s, PAL.workerSkin);
    } else {
      drawPixel(ctx, x - 1, y + 5, s, PAL.workerSkin);
      drawPixel(ctx, x + 6, y + 5, s, PAL.workerSkin);
    }
  } else {
    drawPixel(ctx, x - 1, y + 6, s, PAL.workerSkin);
    drawPixel(ctx, x + 6, y + 6, s, PAL.workerSkin);
  }
  // Legs
  drawPixel(ctx, x + 1, y + 7, s, "#3050a0");
  drawPixel(ctx, x + 4, y + 7, s, "#3050a0");
  // Shoes
  drawPixel(ctx, x + 1, y + 8, s, "#666");
  drawPixel(ctx, x + 4, y + 8, s, "#666");
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Back
  drawRect(ctx, x, y, 1, 5, s, "#444");
  drawRect(ctx, x + 1, y, 5, 1, s, "#555");
  // Seat
  drawRect(ctx, x, y + 5, 6, 1, s, "#555");
  // Legs
  drawPixel(ctx, x, y + 6, s, "#444");
  drawPixel(ctx, x + 5, y + 6, s, "#444");
  // Wheels
  drawPixel(ctx, x - 1, y + 7, s, "#333");
  drawPixel(ctx, x + 6, y + 7, s, "#333");
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, s: number) {
  // Desktop surface
  drawRect(ctx, x, y, w, 2, s, PAL.desk);
  drawRect(ctx, x, y, w, 1, s, PAL.deskLight);
  // Front panel
  drawRect(ctx, x, y + 2, w, 3, s, PAL.deskDark);
  // Legs
  drawRect(ctx, x + 1, y + 5, 1, 3, s, PAL.deskDark);
  drawRect(ctx, x + w - 2, y + 5, 1, 3, s, PAL.deskDark);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, lines: number, frame: number) {
  // Monitor body
  drawRect(ctx, x, y, 8, 6, s, "#333");
  drawRect(ctx, x + 1, y + 1, 6, 4, s, PAL.monitor);
  // Screen glow
  drawRect(ctx, x + 1, y + 1, 6, 4, s, color + "15");
  // Code lines
  for (let i = 0; i < Math.min(lines, 3); i++) {
    const lineW = 2 + ((frame + i * 3) % 3);
    drawRect(ctx, x + 2, y + 1.5 + i, lineW, 0.7, s, color);
  }
  // Stand
  drawRect(ctx, x + 3, y + 6, 2, 1, s, "#555");
  drawRect(ctx, x + 2, y + 7, 4, 0.5, s, "#555");
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hasContent: boolean, frame: number) {
  // Frame
  drawRect(ctx, x, y, 16, 10, s, PAL.whiteboardFrame);
  drawRect(ctx, x + 0.5, y + 0.5, 15, 9, s, PAL.whiteboard);
  // Content
  if (hasContent) {
    // Diagram lines
    drawRect(ctx, x + 2, y + 2, 4, 0.5, s, "#4060d0");
    drawRect(ctx, x + 8, y + 2, 5, 0.5, s, "#d04040");
    drawRect(ctx, x + 2, y + 4, 6, 0.5, s, "#40a060");
    drawRect(ctx, x + 3, y + 6, 3, 0.5, s, "#a040a0");
    drawRect(ctx, x + 8, y + 5, 4, 0.5, s, "#4060d0");
    // Arrow
    drawPixel(ctx, x + 6, y + 3, s, "#333");
    drawPixel(ctx, x + 7, y + 3, s, "#333");
  }
  // Marker tray
  drawRect(ctx, x + 2, y + 10, 12, 0.5, s, "#666");
  // Markers
  drawRect(ctx, x + 3, y + 10, 1.5, 0.4, s, "#d04040");
  drawRect(ctx, x + 5, y + 10, 1.5, 0.4, s, "#4060d0");
  drawRect(ctx, x + 7, y + 10, 1.5, 0.4, s, "#40a060");
}

function drawCoffeeMug(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frame: number) {
  drawRect(ctx, x, y, 3, 3, s, PAL.coffee);
  drawRect(ctx, x, y, 3, 1, s, PAL.coffeeLight);
  drawPixel(ctx, x + 3, y + 1, s, PAL.coffee);
  // Steam
  if (frame % 8 < 4) {
    drawPixel(ctx, x + 1, y - 1, s, PAL.steam);
  }
  if (frame % 8 >= 4) {
    drawPixel(ctx, x + 2, y - 1, s, PAL.steam);
    drawPixel(ctx, x + 1, y - 2, s, PAL.steam);
  }
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frame: number, isRunning: boolean) {
  // Rack body
  drawRect(ctx, x, y, 6, 14, s, "#2a2a3a");
  drawRect(ctx, x + 0.5, y + 0.5, 5, 13, s, "#1a1a2a");
  // Server slots
  for (let i = 0; i < 4; i++) {
    drawRect(ctx, x + 1, y + 1 + i * 3, 4, 2, s, "#252535");
    // LED lights
    const ledOn = isRunning && ((frame + i * 2) % 6 < 4);
    drawPixel(ctx, x + 1.5, y + 1.5 + i * 3, s, ledOn ? PAL.serverLed : PAL.serverLedOff);
    drawPixel(ctx, x + 2.5, y + 1.5 + i * 3, s, isRunning ? PAL.testYellow : PAL.serverLedOff);
  }
}

function drawTestScreen(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, status: "idle" | "running" | "passed" | "failed", frame: number) {
  // TV mounted on wall
  drawRect(ctx, x, y, 12, 8, s, "#333");
  drawRect(ctx, x + 0.5, y + 0.5, 11, 7, s, "#111");
  // Mount
  drawRect(ctx, x + 5, y + 8, 2, 1, s, "#555");

  if (status === "idle") {
    drawRect(ctx, x + 4, y + 3, 4, 1, s, "#333");
  } else if (status === "running") {
    // Loading animation
    const dot = frame % 4;
    for (let i = 0; i < 3; i++) {
      drawPixel(ctx, x + 4 + i * 2, y + 4, s, i <= dot ? PAL.testYellow : "#333");
    }
    drawRect(ctx, x + 2, y + 2, 3, 0.7, s, PAL.testYellow);
  } else if (status === "passed") {
    // Green checkmark
    drawRect(ctx, x + 1, y + 1, 10, 6, s, "#0a2a0a");
    drawPixel(ctx, x + 3, y + 4, s, PAL.testGreen);
    drawPixel(ctx, x + 4, y + 5, s, PAL.testGreen);
    drawPixel(ctx, x + 5, y + 4, s, PAL.testGreen);
    drawPixel(ctx, x + 6, y + 3, s, PAL.testGreen);
    drawPixel(ctx, x + 7, y + 2, s, PAL.testGreen);
    // "PASS" text
    drawRect(ctx, x + 2, y + 1.5, 3, 0.7, s, PAL.testGreen);
  } else if (status === "failed") {
    // Red X
    drawRect(ctx, x + 1, y + 1, 10, 6, s, "#2a0a0a");
    drawPixel(ctx, x + 3, y + 2, s, PAL.testRed);
    drawPixel(ctx, x + 7, y + 2, s, PAL.testRed);
    drawPixel(ctx, x + 5, y + 4, s, PAL.testRed);
    drawPixel(ctx, x + 3, y + 6, s, PAL.testRed);
    drawPixel(ctx, x + 7, y + 6, s, PAL.testRed);
    // "FAIL" text
    drawRect(ctx, x + 2, y + 1.5, 3, 0.7, s, PAL.testRed);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Pot
  drawRect(ctx, x, y + 3, 4, 3, s, "#8b5e3c");
  drawRect(ctx, x + 0.5, y + 3, 3, 0.5, s, "#a07050");
  // Leaves
  drawPixel(ctx, x + 2, y, s, "#3a8040");
  drawPixel(ctx, x + 1, y + 1, s, "#4a9050");
  drawPixel(ctx, x + 3, y + 1, s, "#4a9050");
  drawPixel(ctx, x + 2, y + 2, s, "#3a7030");
  drawPixel(ctx, x + 0, y + 2, s, "#4a9050");
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, s: number) {
  const charW = 3.5;
  const maxChars = 20;
  const displayText = text.length > maxChars ? text.slice(0, maxChars - 2) + ".." : text;
  const bubbleW = Math.max(displayText.length * charW + 6, 12);
  const bubbleH = 8;
  const px = x * s;
  const py = y * s;

  // Bubble background
  ctx.fillStyle = PAL.bubbleBg;
  ctx.beginPath();
  ctx.roundRect(px - bubbleW * s / 2, py - bubbleH * s, bubbleW * s, bubbleH * s, 3 * s);
  ctx.fill();

  // Border
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tail
  ctx.fillStyle = PAL.bubbleBg;
  ctx.beginPath();
  ctx.moveTo(px - 2 * s, py);
  ctx.lineTo(px, py + 2 * s);
  ctx.lineTo(px + 2 * s, py);
  ctx.fill();

  // Text
  ctx.fillStyle = PAL.bubbleText;
  ctx.font = `${3 * s}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(displayText, px, py - 3 * s);
}

function drawRoundBadge(ctx: CanvasRenderingContext2D, x: number, y: number, round: number, s: number) {
  const px = x * s;
  const py = y * s;
  ctx.fillStyle = "#a78bfa";
  ctx.beginPath();
  ctx.arc(px, py, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${3.5 * s}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`R${round}`, px, py + 0.5 * s);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PixelOffice({ activity, round, isDark, thought }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const s = Math.floor(Math.min(W / 120, H / 70)); // pixel size — fit both dimensions

    ctx.imageSmoothingEnabled = false;
    frameRef.current++;
    const f = Math.floor(frameRef.current / 6); // slow down animations

    // Clear
    ctx.fillStyle = PAL.wall;
    ctx.fillRect(0, 0, W, H);

    // Wall pattern
    for (let wx = 0; wx < 120; wx += 8) {
      drawRect(ctx, wx, 0, 8, 35, s, wx % 16 < 8 ? PAL.wall : PAL.wallAccent);
    }

    // Floor
    drawRect(ctx, 0, 35, 120, 35, s, PAL.floor);
    for (let fx = 0; fx < 120; fx += 6) {
      drawRect(ctx, fx, 35, 6, 35, s, fx % 12 < 6 ? PAL.floor : PAL.floorLight);
    }
    // Baseboard
    drawRect(ctx, 0, 35, 120, 1, s, "#4a3a60");

    // ── Background objects ──

    // Whiteboard (wall, left side)
    const bossPlanning = activity.boss === "planning";
    drawWhiteboard(ctx, 5, 5, s, bossPlanning || activity.boss === "reviewing", f);

    // Test screen (wall, center-right)
    drawTestScreen(ctx, 65, 5, s, activity.tester, f);

    // Server rack (far right)
    drawServerRack(ctx, 105, 20, s, f, activity.tester === "running");

    // Plant
    drawPlant(ctx, 90, 38, s);

    // ── Boss area (left) ──
    drawDesk(ctx, 25, 40, 14, s);
    drawMonitor(ctx, 28, 33, s,
      activity.boss === "approved" ? PAL.testGreen :
      activity.boss === "feedback" ? PAL.testYellow :
      PAL.monitorGlow,
      activity.boss !== "idle" ? 3 : 0, f);
    drawCoffeeMug(ctx, 36, 38, s, f);

    // Boss character
    if (bossPlanning) {
      // Standing at whiteboard
      drawBoss(ctx, 12, 26, s, f, "right");
    } else {
      // Sitting at desk
      drawChair(ctx, 27, 37, s);
      drawBoss(ctx, 28, 33, s, f, "front");
    }

    // ── Worker area (right) ──
    drawDesk(ctx, 55, 43, 14, s);
    const workerIsTyping = activity.worker === "coding" || activity.worker === "fixing";
    drawMonitor(ctx, 58, 36, s,
      activity.worker === "done" ? PAL.testGreen :
      workerIsTyping ? "#60a0ff" :
      "#555555",
      workerIsTyping ? 3 : 0, f);

    // Worker character
    drawChair(ctx, 57, 40, s);
    drawWorker(ctx, 58, 36, s, f, workerIsTyping);

    // Second coffee mug for worker
    drawCoffeeMug(ctx, 66, 41, s, f);

    // ── Overlays ──

    // Round badge
    if (round > 0) {
      drawRoundBadge(ctx, 100, 8, round, s);
    }

    // Thought bubbles
    if (thought) {
      if (thought.agent === "boss") {
        if (bossPlanning) {
          drawBubble(ctx, 15, 22, thought.text, s);
        } else {
          drawBubble(ctx, 32, 29, thought.text, s);
        }
      } else if (thought.agent === "worker") {
        drawBubble(ctx, 62, 32, thought.text, s);
      }
    }

    // Status labels
    ctx.font = `${2.5 * s}px monospace`;
    ctx.textAlign = "center";

    // Boss label
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("OPUS (BOSS)", 32 * s, 55 * s);
    if (activity.boss !== "idle") {
      ctx.fillStyle = "#d0c0f0";
      ctx.font = `${2 * s}px monospace`;
      ctx.fillText(activity.boss.toUpperCase(), 32 * s, 58 * s);
    }

    // Worker label
    ctx.font = `${2.5 * s}px monospace`;
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("CODEX (WORKER)", 62 * s, 58 * s);
    if (activity.worker !== "idle") {
      ctx.fillStyle = "#a0c0f0";
      ctx.font = `${2 * s}px monospace`;
      ctx.fillText(activity.worker.toUpperCase(), 62 * s, 61 * s);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [activity, round, thought]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size — 120x70 pixel grid, scaled up
    const container = canvas.parentElement;
    if (container) {
      const w = container.clientWidth;
      const h = Math.min(w * 0.58, 380);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="w-full relative" style={{ imageRendering: "pixelated" }}>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

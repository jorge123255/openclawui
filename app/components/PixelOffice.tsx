"use client";
import { useRef, useEffect, useCallback } from "react";

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

// ─── Pixel Helpers ──────────────────────────────────────────────────────────

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x * s, y * s, s, s);
};

const rect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x * s, y * s, w * s, h * s);
};

// Draw from a sprite map: array of [x, y, color] relative to origin
const sprite = (ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number, pixels: [number, number, string][]) => {
  for (const [dx, dy, c] of pixels) {
    ctx.fillStyle = c;
    ctx.fillRect((ox + dx) * s, (oy + dy) * s, s, s);
  }
};

// ─── Color Palette ──────────────────────────────────────────────────────────

const C = {
  wall1: "#2d2245", wall2: "#332850", wall3: "#28203e",
  floor1: "#3d3060", floor2: "#453868", floor3: "#352858",
  baseboard: "#4a3a6a",
  ceiling: "#222040",

  // Furniture
  deskTop: "#b8956a", deskFront: "#8b6b45", deskSide: "#9a7a52", deskLeg: "#6b5035",
  chairBack: "#444", chairSeat: "#555", chairLeg: "#3a3a3a", chairWheel: "#333",
  
  // Boss character (12px tall)
  bHair: "#f0d060", bHairDk: "#d0b040", bSkin: "#f5c898", bSkinSh: "#d8a870",
  bEye: "#2a2a4a", bMouth: "#c08060",
  bShirt: "#e8e0f0", bTie: "#d04040",
  bSuit: "#5544a0", bSuitLt: "#7060b8", bSuitDk: "#443088",
  bShoe: "#2a2a3a", bPant: "#443880",
  
  // Worker character
  wHair: "#3a2515", wHairDk: "#2a1808", wSkin: "#e8b080", wSkinSh: "#c89060",
  wEye: "#1a1a3a",
  wHoodie: "#3872c0", wHoodieLt: "#5090e0", wHoodieDk: "#2858a0", wHoodieStr: "#60a8f0",
  wPant: "#384868", wShoe: "#555",
  wPhone: "#333", wPhoneBand: "#555",

  // Monitors
  monBez: "#2a2a38", monScreen: "#0a0a18", monStand: "#444", monBase: "#555",
  codeGreen: "#50e090", codeBright: "#80ffc0", codeBlue: "#60a0ff", codeDim: "#308060",
  codeOrange: "#f0a040",
  errRed: "#ff4040", errDim: "#802020",

  // Objects
  wbFrame: "#888078", wbSurface: "#f0ece8", wbMarkerR: "#e04040", wbMarkerB: "#4060e0", wbMarkerG: "#40a060",
  mugBrown: "#7b5030", mugRim: "#9b7050", steam: "rgba(255,255,255,0.25)",
  plantPot: "#8b5e3c", plantPotRim: "#a07050", leaf1: "#3a8838", leaf2: "#50a848", leaf3: "#68c060",
  
  // Server
  srvBody: "#252535", srvInner: "#1a1a28", srvLed: "#40e080", srvLedWarn: "#e0c040", srvLedOff: "#2a2a2a",
  
  // Test screen
  testPass: "#40e080", testFail: "#ff4444", testWarn: "#e8c840", testBg: "#111118",
  
  // Window
  winFrame: "#5a5070", winGlass: "#2a3050", winSky: "#1a2848", winStar: "#f0e8c0",
  
  // Misc
  clock: "#ddd", clockFace: "#fff", clockHand: "#333",
  postIt1: "#fff740", postIt2: "#ff7eb3", postIt3: "#7afcff",
  paper: "#e8e4e0", paperLine: "#c0b8b0",
  cable: "#333",
  bubbleBg: "#fff", bubbleBorder: "#ccc", bubbleText: "#222",
  badge: "#a78bfa", badgeText: "#fff",
};

// ─── Boss Sprite (sitting, 8w x 13h) ───────────────────────────────────────

function drawBossSitting(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number, f: number) {
  // Hair
  sprite(ctx, ox, oy, s, [
    [2,0,C.bHair],[3,0,C.bHair],[4,0,C.bHair],[5,0,C.bHair],
    [1,1,C.bHair],[2,1,C.bHairDk],[3,1,C.bHair],[4,1,C.bHair],[5,1,C.bHairDk],[6,1,C.bHair],
  ]);
  // Face
  sprite(ctx, ox, oy, s, [
    [2,2,C.bSkin],[3,2,C.bSkin],[4,2,C.bSkin],[5,2,C.bSkin],
    [1,2,C.bSkinSh],[6,2,C.bSkinSh],
    [2,3,C.bSkin],[3,3,C.bSkin],[4,3,C.bSkin],[5,3,C.bSkin],
  ]);
  // Eyes (blink every 16 frames)
  if (f % 16 < 14) {
    px(ctx, ox+2, oy+2, s, C.bEye); px(ctx, ox+5, oy+2, s, C.bEye);
  }
  // Mouth (talks when active)
  if (f % 6 < 3) px(ctx, ox+3, oy+3, s, C.bMouth);
  // Shirt + Tie
  sprite(ctx, ox, oy, s, [
    [3,4,C.bShirt],[4,4,C.bShirt],
    [3,5,C.bTie],[4,5,C.bShirt],
  ]);
  // Suit jacket
  sprite(ctx, ox, oy, s, [
    [1,4,C.bSuit],[2,4,C.bSuitLt],[5,4,C.bSuitLt],[6,4,C.bSuit],
    [1,5,C.bSuit],[2,5,C.bSuitLt],[5,5,C.bSuitLt],[6,5,C.bSuit],
    [1,6,C.bSuitDk],[2,6,C.bSuit],[3,6,C.bSuit],[4,6,C.bSuit],[5,6,C.bSuit],[6,6,C.bSuitDk],
  ]);
  // Arms typing
  const armOff = f % 4 < 2 ? 0 : 1;
  px(ctx, ox+0, oy+5+armOff, s, C.bSkin);
  px(ctx, ox+7, oy+5+(1-armOff), s, C.bSkin);
  // Pants
  sprite(ctx, ox, oy, s, [
    [2,7,C.bPant],[3,7,C.bPant],[4,7,C.bPant],[5,7,C.bPant],
  ]);
  // Shoes
  px(ctx, ox+2, oy+8, s, C.bShoe); px(ctx, ox+5, oy+8, s, C.bShoe);
}

function drawBossStanding(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number, f: number) {
  // Same top half
  sprite(ctx, ox, oy, s, [
    [2,0,C.bHair],[3,0,C.bHair],[4,0,C.bHair],[5,0,C.bHair],
    [1,1,C.bHair],[2,1,C.bHairDk],[3,1,C.bHair],[4,1,C.bHair],[5,1,C.bHairDk],[6,1,C.bHair],
    [2,2,C.bSkin],[3,2,C.bSkin],[4,2,C.bSkin],[5,2,C.bSkin],
    [1,2,C.bSkinSh],[6,2,C.bSkinSh],
    [2,3,C.bSkin],[3,3,C.bSkin],[4,3,C.bSkin],[5,3,C.bSkin],
  ]);
  if (f % 16 < 14) { px(ctx, ox+3, oy+2, s, C.bEye); px(ctx, ox+5, oy+2, s, C.bEye); } // facing right
  if (f % 6 < 3) px(ctx, ox+4, oy+3, s, C.bMouth);
  // Shirt + suit
  sprite(ctx, ox, oy, s, [
    [3,4,C.bShirt],[4,4,C.bShirt],[3,5,C.bTie],[4,5,C.bShirt],
    [1,4,C.bSuit],[2,4,C.bSuitLt],[5,4,C.bSuitLt],[6,4,C.bSuit],
    [1,5,C.bSuit],[2,5,C.bSuitLt],[5,5,C.bSuitLt],[6,5,C.bSuit],
    [1,6,C.bSuitDk],[2,6,C.bSuit],[3,6,C.bSuit],[4,6,C.bSuit],[5,6,C.bSuit],[6,6,C.bSuitDk],
  ]);
  // Arm raised (pointing at whiteboard)
  px(ctx, ox+7, oy+3, s, C.bSkin); px(ctx, ox+8, oy+2, s, C.bSkin);
  px(ctx, ox+0, oy+5, s, C.bSkin);
  // Pants (standing — taller)
  sprite(ctx, ox, oy, s, [
    [2,7,C.bPant],[3,7,C.bPant],[4,7,C.bPant],[5,7,C.bPant],
    [2,8,C.bPant],[3,8,C.bPant],[4,8,C.bPant],[5,8,C.bPant],
    [2,9,C.bPant],[5,9,C.bPant],
  ]);
  // Shoes
  px(ctx, ox+1, oy+10, s, C.bShoe); px(ctx, ox+2, oy+10, s, C.bShoe);
  px(ctx, ox+5, oy+10, s, C.bShoe); px(ctx, ox+6, oy+10, s, C.bShoe);
}

// ─── Worker Sprite (sitting, 8w x 10h) ─────────────────────────────────────

function drawWorkerSitting(ctx: CanvasRenderingContext2D, ox: number, oy: number, s: number, f: number, typing: boolean) {
  // Headphone band
  sprite(ctx, ox, oy, s, [[1,-1,C.wPhoneBand],[2,-1,C.wPhoneBand],[3,-1,C.wPhoneBand],[4,-1,C.wPhoneBand],[5,-1,C.wPhoneBand],[6,-1,C.wPhoneBand]]);
  // Headphone cups
  px(ctx, ox+0, oy+0, s, C.wPhone); px(ctx, ox+7, oy+0, s, C.wPhone);
  // Hair
  sprite(ctx, ox, oy, s, [
    [2,0,C.wHair],[3,0,C.wHair],[4,0,C.wHair],[5,0,C.wHair],
    [1,0,C.wHairDk],[6,0,C.wHairDk],
    [1,1,C.wHair],[2,1,C.wHairDk],[5,1,C.wHairDk],[6,1,C.wHair],
  ]);
  // Face
  sprite(ctx, ox, oy, s, [
    [2,1,C.wSkin],[3,1,C.wSkin],[4,1,C.wSkin],[5,1,C.wSkin],
    [2,2,C.wSkin],[3,2,C.wSkin],[4,2,C.wSkin],[5,2,C.wSkin],
  ]);
  // Eyes (occasional blink)
  if (f % 20 < 18) { px(ctx, ox+3, oy+1, s, C.wEye); px(ctx, ox+5, oy+1, s, C.wEye); }
  // Hoodie
  sprite(ctx, ox, oy, s, [
    [1,3,C.wHoodie],[2,3,C.wHoodieLt],[3,3,C.wHoodieStr],[4,3,C.wHoodieStr],[5,3,C.wHoodieLt],[6,3,C.wHoodie],
    [1,4,C.wHoodieDk],[2,4,C.wHoodie],[3,4,C.wHoodieLt],[4,4,C.wHoodieLt],[5,4,C.wHoodie],[6,4,C.wHoodieDk],
    [1,5,C.wHoodieDk],[2,5,C.wHoodie],[3,5,C.wHoodie],[4,5,C.wHoodie],[5,5,C.wHoodie],[6,5,C.wHoodieDk],
  ]);
  // Arms typing
  if (typing) {
    const a = f % 3;
    px(ctx, ox+0, oy+4+(a===0?0:1), s, C.wSkin);
    px(ctx, ox+7, oy+4+(a===1?0:1), s, C.wSkin);
  } else {
    px(ctx, ox+0, oy+5, s, C.wSkin); px(ctx, ox+7, oy+5, s, C.wSkin);
  }
  // Pants + shoes
  sprite(ctx, ox, oy, s, [
    [2,6,C.wPant],[3,6,C.wPant],[4,6,C.wPant],[5,6,C.wPant],
  ]);
  px(ctx, ox+2, oy+7, s, C.wShoe); px(ctx, ox+5, oy+7, s, C.wShoe);
}

// ─── Office Objects ─────────────────────────────────────────────────────────

function drawDeskBig(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Desktop surface with edge highlight
  rect(ctx, x, y, 18, 1, s, C.deskTop);
  rect(ctx, x, y-1, 18, 1, s, C.deskSide);
  // Front panel
  rect(ctx, x, y+1, 18, 3, s, C.deskFront);
  // Drawer lines
  rect(ctx, x+1, y+1.5, 7, 0.3, s, C.deskLeg);
  rect(ctx, x+10, y+1.5, 7, 0.3, s, C.deskLeg);
  // Drawer handles
  px(ctx, x+4, oy2(y,2), s, C.deskTop); px(ctx, x+13, oy2(y,2), s, C.deskTop);
  // Legs
  rect(ctx, x+1, y+4, 1, 4, s, C.deskLeg);
  rect(ctx, x+16, y+4, 1, 4, s, C.deskLeg);
}

function oy2(y: number, off: number) { return y + off; } // helper

function drawDualMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, glow: string, lines: number, f: number) {
  // Left monitor
  rect(ctx, x, y, 8, 6, s, C.monBez);
  rect(ctx, x+0.5, y+0.5, 7, 5, s, C.monScreen);
  // Right monitor  
  rect(ctx, x+9, y, 8, 6, s, C.monBez);
  rect(ctx, x+9.5, y+0.5, 7, 5, s, C.monScreen);
  // Stands
  rect(ctx, x+3, y+6, 2, 1, s, C.monStand);
  rect(ctx, x+2, y+7, 4, 0.5, s, C.monBase);
  rect(ctx, x+12, y+6, 2, 1, s, C.monStand);
  rect(ctx, x+11, y+7, 4, 0.5, s, C.monBase);
  
  // Screen content
  if (lines > 0) {
    for (let i = 0; i < Math.min(lines, 4); i++) {
      const w = 2 + ((f + i * 7) % 4);
      const col = i % 2 === 0 ? glow : (glow === C.codeGreen ? C.codeDim : C.codeBlue);
      rect(ctx, x+1, y+1+i*1.2, w, 0.6, s, col);
      // Right monitor — different content
      const w2 = 3 + ((f + i * 5) % 3);
      rect(ctx, x+10, y+1+i*1.2, w2, 0.6, s, col);
    }
    // Cursor blink on left monitor
    if (f % 4 < 2) {
      px(ctx, x+1+(f%5), y+1+Math.min(lines-1,3)*1.2, s, C.codeBright);
    }
  }
}

function drawSingleMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, glow: string, lines: number, f: number) {
  rect(ctx, x, y, 8, 6, s, C.monBez);
  rect(ctx, x+0.5, y+0.5, 7, 5, s, C.monScreen);
  rect(ctx, x+3, y+6, 2, 1, s, C.monStand);
  rect(ctx, x+2, y+7, 4, 0.5, s, C.monBase);
  if (lines > 0) {
    for (let i = 0; i < Math.min(lines, 4); i++) {
      const w = 2 + ((f + i * 3) % 4);
      rect(ctx, x+1, y+1+i*1.2, w, 0.6, s, glow);
    }
    if (f % 4 < 2) px(ctx, x+1+(f%4), y+1+Math.min(lines-1,3)*1.2, s, C.codeBright);
  }
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // Back rest
  rect(ctx, x, y, 7, 1, s, C.chairBack);
  rect(ctx, x, y+1, 1, 4, s, C.chairBack);
  rect(ctx, x+6, y+1, 1, 4, s, C.chairBack);
  // Seat
  rect(ctx, x, y+5, 7, 1, s, C.chairSeat);
  // Center pole
  rect(ctx, x+3, y+6, 1, 2, s, C.chairLeg);
  // Star base
  sprite(ctx, x, oy2(y, 8), s, [[0,0,C.chairWheel],[3,0,C.chairLeg],[6,0,C.chairWheel]]);
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hasContent: boolean, f: number) {
  // Frame
  rect(ctx, x, y, 20, 12, s, C.wbFrame);
  rect(ctx, x+1, y+1, 18, 10, s, C.wbSurface);
  
  if (hasContent) {
    // Architecture diagram
    // Boxes
    rect(ctx, x+2, y+2, 5, 2, s, "#4060d0");
    rect(ctx, x+9, y+2, 5, 2, s, "#d06040");
    rect(ctx, x+5, y+6, 6, 2, s, "#40a060");
    // Arrows
    rect(ctx, x+7, y+3, 2, 0.4, s, "#555");
    rect(ctx, x+6, y+4, 0.4, 2, s, "#555");
    rect(ctx, x+10, y+4, 0.4, 2, s, "#555");
    // Labels
    rect(ctx, x+3, y+2.5, 3, 0.4, s, "#fff");
    rect(ctx, x+10, y+2.5, 3, 0.4, s, "#fff");
    rect(ctx, x+6, y+6.5, 4, 0.4, s, "#fff");
    // Animated: new line being drawn
    if (f % 8 < 4) {
      rect(ctx, x+15, y+3+(f%3), 2, 0.4, s, C.wbMarkerR);
    }
  }
  
  // Marker tray
  rect(ctx, x+3, y+12, 14, 0.8, s, "#777");
  rect(ctx, x+4, y+12, 2, 0.6, s, C.wbMarkerR);
  rect(ctx, x+7, y+12, 2, 0.6, s, C.wbMarkerB);
  rect(ctx, x+10, y+12, 2, 0.6, s, C.wbMarkerG);
  // Post-its on frame
  rect(ctx, x+17, y+1, 2, 2, s, C.postIt1);
  rect(ctx, x+17, y+3.5, 2, 2, s, C.postIt2);
}

function drawTestWall(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, status: string, f: number) {
  // Large wall-mounted screen
  rect(ctx, x, y, 14, 9, s, "#333");
  rect(ctx, x+1, y+1, 12, 7, s, C.testBg);
  // Wall mount
  rect(ctx, x+6, y+9, 2, 1, s, "#555");
  
  const label = (text: string, tx: number, ty: number, color: string) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${2.2*s}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(text, (x+tx)*s, (y+ty)*s);
  };

  if (status === "idle") {
    label("TESTS", 7, 5, "#444");
    label("READY", 7, 7, "#444");
  } else if (status === "running") {
    // Animated loading bar
    const progress = (f % 10) / 10;
    rect(ctx, x+2, y+4, 10, 1.5, s, "#222");
    rect(ctx, x+2, y+4, 10 * progress, 1.5, s, C.testWarn);
    label("RUNNING", 7, 3.5, C.testWarn);
    // Spinning indicator
    const dots = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
    label(dots[f % dots.length], 7, 7, C.testWarn);
  } else if (status === "passed") {
    // Green glow effect
    rect(ctx, x+1, y+1, 12, 7, s, "#0a2a0a");
    // Big checkmark
    sprite(ctx, x, y, s, [
      [4,4,C.testPass],[5,5,C.testPass],[6,4,C.testPass],[7,3,C.testPass],[8,2,C.testPass],[9,1,C.testPass],
    ]);
    label("ALL PASS", 7, 7.5, C.testPass);
  } else if (status === "failed") {
    // Red glow with pulse
    const pulse = f % 4 < 2;
    rect(ctx, x+1, y+1, 12, 7, s, pulse ? "#2a0a0a" : "#1a0505");
    // Big X
    sprite(ctx, x, y, s, [
      [4,2,C.testFail],[8,2,C.testFail],
      [5,3,C.testFail],[7,3,C.testFail],
      [6,4,C.testFail],
      [5,5,C.testFail],[7,5,C.testFail],
      [4,6,C.testFail],[8,6,C.testFail],
    ]);
    label("FAILED", 7, 7.5, C.testFail);
  }
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number, active: boolean) {
  rect(ctx, x, y, 7, 18, s, C.srvBody);
  rect(ctx, x+0.5, y+0.5, 6, 17, s, C.srvInner);
  
  for (let i = 0; i < 5; i++) {
    rect(ctx, x+1, y+1+i*3.2, 5, 2.5, s, "#202030");
    // Vents
    for (let v = 0; v < 3; v++) {
      rect(ctx, x+2+v*1.5, y+2+i*3.2, 0.8, 0.4, s, "#181828");
    }
    // LEDs
    const on1 = active && ((f + i * 3) % 8 < 6);
    const on2 = active && ((f + i * 5) % 6 < 4);
    px(ctx, x+1.2, y+1.3+i*3.2, s, on1 ? C.srvLed : C.srvLedOff);
    px(ctx, x+2, y+1.3+i*3.2, s, on2 ? C.srvLedWarn : C.srvLedOff);
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number) {
  // Frame
  rect(ctx, x, y, 12, 14, s, C.winFrame);
  rect(ctx, x+1, y+1, 10, 12, s, C.winGlass);
  // Cross bar
  rect(ctx, x+5.5, y+1, 1, 12, s, C.winFrame);
  rect(ctx, x+1, y+6.5, 10, 1, s, C.winFrame);
  // Night sky with stars
  rect(ctx, x+1, y+1, 4.5, 5.5, s, C.winSky);
  rect(ctx, x+6.5, y+1, 4.5, 5.5, s, C.winSky);
  rect(ctx, x+1, y+7.5, 4.5, 5.5, s, C.winSky);
  rect(ctx, x+6.5, y+7.5, 4.5, 5.5, s, C.winSky);
  // Stars (twinkle)
  if (f % 6 < 4) px(ctx, x+3, y+3, s, C.winStar);
  if (f % 8 < 5) px(ctx, x+8, y+2, s, C.winStar);
  if (f % 7 < 4) px(ctx, x+2, y+9, s, C.winStar);
  if (f % 5 < 3) px(ctx, x+9, y+10, s, C.winStar);
  if (f % 9 < 6) px(ctx, x+4, y+8, s, C.winStar);
  // Moon
  rect(ctx, x+8, y+4, 2, 2, s, "#e8e0c0");
  px(ctx, x+9, y+4, s, C.winSky); // crescent
  // Blinds
  rect(ctx, x, y, 12, 1, s, "#665878");
}

function drawCoffeeMug(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number) {
  rect(ctx, x, y+1, 3, 3, s, C.mugBrown);
  rect(ctx, x, y, 3, 1, s, C.mugRim);
  px(ctx, x+3, y+2, s, C.mugBrown); // handle
  // Steam wisps
  if (f % 10 < 5) { px(ctx, x+1, y-1, s, C.steam); }
  if (f % 10 >= 3 && f % 10 < 8) { px(ctx, x+2, y-2, s, C.steam); }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number) {
  // Pot
  rect(ctx, x, y+4, 5, 4, s, C.plantPot);
  rect(ctx, x, y+4, 5, 1, s, C.plantPotRim);
  // Leaves (sway slightly)
  const sway = f % 12 < 6 ? 0 : 1;
  sprite(ctx, x+sway, y, s, [
    [2,0,C.leaf2],[3,0,C.leaf3],
    [1,1,C.leaf1],[2,1,C.leaf2],[3,1,C.leaf2],[4,1,C.leaf3],
    [0,2,C.leaf1],[1,2,C.leaf2],[3,2,C.leaf2],[5,2,C.leaf1],
    [1,3,C.leaf1],[2,3,C.leaf2],[3,3,C.leaf2],[4,3,C.leaf1],
  ]);
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number) {
  // Clock body
  rect(ctx, x, y, 5, 5, s, C.clock);
  rect(ctx, x+0.5, y+0.5, 4, 4, s, C.clockFace);
  // Hour hand
  px(ctx, x+2.5, y+1.5, s, C.clockHand);
  px(ctx, x+2.5, y+2.5, s, C.clockHand);
  // Minute hand (rotates)
  if (f % 4 < 1) px(ctx, x+3.5, y+2.5, s, C.clockHand);
  else if (f % 4 < 2) px(ctx, x+2.5, y+3.5, s, C.clockHand);
  else if (f % 4 < 3) px(ctx, x+1.5, y+2.5, s, C.clockHand);
  else px(ctx, x+2.5, y+1, s, C.clockHand);
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, f: number) {
  // Bottle
  rect(ctx, x+1, y, 3, 2, s, "#a0d8f0");
  rect(ctx, x+1.5, y+0.5, 2, 1, s, "#c0e8ff");
  // Body
  rect(ctx, x, y+2, 5, 5, s, "#ddd");
  rect(ctx, x+0.5, y+2.5, 4, 4, s, "#eee");
  // Spout
  px(ctx, x+1, y+4, s, "#888");
  // Legs
  px(ctx, x, y+7, s, "#999"); px(ctx, x+4, y+7, s, "#999");
  // Water bubbles
  if (f % 20 < 2) px(ctx, x+2, y+1, s, "#fff");
}

// ─── Thought Bubble ─────────────────────────────────────────────────────────

function drawBubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, s: number) {
  const maxLen = 22;
  const display = text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
  ctx.font = `${2.5 * s}px monospace`;
  const measured = ctx.measureText(display);
  const bw = measured.width + 8 * s;
  const bh = 7 * s;
  const bx = cx * s - bw / 2;
  const by = cy * s - bh;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.roundRect(bx + s, by + s, bw, bh, 4 * s);
  ctx.fill();

  // Bubble
  ctx.fillStyle = C.bubbleBg;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4 * s);
  ctx.fill();
  ctx.strokeStyle = C.bubbleBorder;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Tail dots
  ctx.fillStyle = C.bubbleBg;
  ctx.beginPath();
  ctx.arc(cx * s, (cy + 1) * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx * s + 1.5 * s, (cy + 2.5) * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = C.bubbleText;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(display, cx * s, by + bh / 2);
}

function drawRoundBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, round: number, s: number) {
  const pxX = cx * s;
  const pxY = cy * s;
  // Glow
  ctx.fillStyle = "rgba(167,139,250,0.3)";
  ctx.beginPath(); ctx.arc(pxX, pxY, 6 * s, 0, Math.PI * 2); ctx.fill();
  // Circle
  ctx.fillStyle = C.badge;
  ctx.beginPath(); ctx.arc(pxX, pxY, 4.5 * s, 0, Math.PI * 2); ctx.fill();
  // Text
  ctx.fillStyle = C.badgeText;
  ctx.font = `bold ${3.5 * s}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`R${round}`, pxX, pxY + 0.5 * s);
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
    // Scale to fill full width - scene is 160px wide
    const s = Math.max(2, W / 160);

    ctx.imageSmoothingEnabled = false;
    frameRef.current++;
    const f = Math.floor(frameRef.current / 8); // animation speed

    // ── Background ──
    // Ceiling
    rect(ctx, 0, 0, 160, 3, s, C.ceiling);
    // Ceiling lights with glow
    for (let lx = 15; lx < 160; lx += 30) {
      rect(ctx, lx, 1.5, 10, 1.5, s, "#555");
      rect(ctx, lx+1, 3, 8, 0.5, s, "#666");
      // Light glow cone
      ctx.fillStyle = "rgba(255,255,200,0.04)";
      ctx.beginPath();
      ctx.moveTo((lx+2)*s, 3*s);
      ctx.lineTo((lx-3)*s, 40*s);
      ctx.lineTo((lx+13)*s, 40*s);
      ctx.lineTo((lx+8)*s, 3*s);
      ctx.fill();
    }

    // Wall
    for (let wx = 0; wx < 160; wx += 10) {
      rect(ctx, wx, 3, 10, 37, s, wx % 20 < 10 ? C.wall1 : C.wall2);
    }
    // Wall texture lines
    for (let wx = 0; wx < 160; wx += 20) {
      rect(ctx, wx+5, 3, 0.3, 37, s, C.wall3);
    }
    // Baseboard
    rect(ctx, 0, 39, 160, 1.5, s, C.baseboard);

    // Floor tiles
    for (let fx = 0; fx < 160; fx += 8) {
      rect(ctx, fx, 40, 8, 32, s, fx % 16 < 8 ? C.floor1 : C.floor2);
      rect(ctx, fx, 40, 0.3, 32, s, C.floor3);
    }

    const bossIsPlanning = activity.boss === "planning";
    const workerTyping = activity.worker === "coding" || activity.worker === "fixing";
    const bossActive = activity.boss !== "idle";
    const testerStatus = activity.tester;

    // ── Wall objects (back to front) ──

    // Window (far left)
    drawWindow(ctx, 3, 5, s, f);

    // Whiteboard (left-center)
    drawWhiteboard(ctx, 22, 6, s, bossIsPlanning || activity.boss === "reviewing" || activity.boss === "diagnosing", f);

    // Clock
    drawClock(ctx, 48, 6, s, f);

    // Test screen (center)
    drawTestWall(ctx, 60, 5, s, testerStatus, f);

    // Motivational poster
    rect(ctx, 82, 7, 10, 12, s, "#333");
    rect(ctx, 83, 8, 8, 10, s, "#1a1a2a");
    rect(ctx, 84, 9, 6, 4, s, "#2a2050"); // image area
    px(ctx, 86, 10, s, "#f0d060"); px(ctx, 87, 10, s, "#f0d060"); // star
    px(ctx, 86, 11, s, "#f0d060"); px(ctx, 87, 11, s, "#f0d060");
    rect(ctx, 84, 14, 5, 0.5, s, "#60a0ff");
    rect(ctx, 84, 15.5, 4, 0.5, s, "#a78bfa");

    // Bookshelf (right wall)
    rect(ctx, 118, 8, 14, 2, s, "#6b5035"); // top shelf
    rect(ctx, 118, 14, 14, 2, s, "#6b5035"); // mid shelf
    rect(ctx, 118, 20, 14, 2, s, "#6b5035"); // bottom shelf
    rect(ctx, 117, 7, 1, 16, s, "#5a4028"); // left side
    rect(ctx, 132, 7, 1, 16, s, "#5a4028"); // right side
    // Books
    rect(ctx, 119, 10, 2, 4, s, "#d04040"); rect(ctx, 121, 10.5, 1.5, 3.5, s, "#4060d0");
    rect(ctx, 123, 10, 2, 4, s, "#40a060"); rect(ctx, 125, 10.5, 1.5, 3.5, s, "#e0a020");
    rect(ctx, 127, 10, 2, 4, s, "#8040c0"); rect(ctx, 129, 10.5, 1, 3.5, s, "#d08040");
    // Bottom shelf books
    rect(ctx, 119, 16, 2.5, 4, s, "#3050a0"); rect(ctx, 122, 16.5, 2, 3.5, s, "#a04040");
    rect(ctx, 125, 16, 2.5, 4, s, "#40a0a0"); rect(ctx, 128, 16.5, 2, 3.5, s, "#c06080");

    // Second window (far right)
    drawWindow(ctx, 140, 5, s, f);

    // ── Furniture ──

    // === BOSS AREA (left side, x ~20-50) ===
    // Boss desk — large
    rect(ctx, 20, 44, 22, 1, s, C.deskTop);
    rect(ctx, 20, 43, 22, 1, s, C.deskSide);
    rect(ctx, 20, 45, 22, 3, s, C.deskFront);
    rect(ctx, 21, 48, 1, 3, s, C.deskLeg);
    rect(ctx, 40, 48, 1, 3, s, C.deskLeg);
    rect(ctx, 21, 46, 9, 0.3, s, C.deskLeg);
    rect(ctx, 32, 46, 9, 0.3, s, C.deskLeg);
    // Drawer handle
    rect(ctx, 25, 46.5, 1.5, 0.3, s, C.deskTop);
    rect(ctx, 36, 46.5, 1.5, 0.3, s, C.deskTop);

    // Boss dual monitors
    drawDualMonitor(ctx, 23, 36, s,
      activity.boss === "approved" ? C.codeGreen :
      activity.boss === "feedback" ? C.codeOrange :
      bossActive ? C.codeGreen : "#444",
      bossActive ? 4 : 0, f);

    // Coffee on boss desk
    drawCoffeeMug(ctx, 39, 41, s, f);
    // Papers
    rect(ctx, 36, 43, 3, 2, s, C.paper);
    rect(ctx, 36.5, 43.5, 1.5, 0.3, s, C.paperLine);
    rect(ctx, 36.5, 44.2, 2, 0.3, s, C.paperLine);
    // Pen
    rect(ctx, 35, 42.5, 0.3, 2, s, "#3050a0");

    // Boss chair
    drawChair(ctx, 26, 42, s);

    // Boss character
    if (bossIsPlanning) {
      drawBossStanding(ctx, 30, 27, s, f);
    } else {
      drawBossSitting(ctx, 27, 37, s, f);
    }

    // === BREAK AREA (center, x ~52-68) ===
    // Water cooler
    drawWaterCooler(ctx, 55, 44, s, f);

    // Filing cabinet
    rect(ctx, 60, 42, 6, 9, s, "#4a4a5a");
    rect(ctx, 60.5, 42.5, 5, 3.5, s, "#555568");
    rect(ctx, 60.5, 46.5, 5, 3.5, s, "#555568");
    rect(ctx, 62, 44, 2, 0.4, s, "#777"); // handle
    rect(ctx, 62, 48, 2, 0.4, s, "#777"); // handle

    // Trash can
    rect(ctx, 52, 48, 3, 3, s, "#555");
    rect(ctx, 52, 47.5, 3, 0.8, s, "#666");
    // Crumpled paper in trash
    px(ctx, 53, 48.5, s, C.paper);

    // === WORKER AREA (right-center, x ~70-100) ===
    // Worker desk
    rect(ctx, 72, 47, 20, 1, s, C.deskTop);
    rect(ctx, 72, 46, 20, 1, s, C.deskSide);
    rect(ctx, 72, 48, 20, 3, s, C.deskFront);
    rect(ctx, 73, 51, 1, 3, s, C.deskLeg);
    rect(ctx, 90, 51, 1, 3, s, C.deskLeg);
    rect(ctx, 73, 49, 8, 0.3, s, C.deskLeg);
    rect(ctx, 83, 49, 8, 0.3, s, C.deskLeg);
    rect(ctx, 77, 49.5, 1.5, 0.3, s, C.deskTop);

    // Worker dual monitors too (he's a dev, needs screens!)
    drawDualMonitor(ctx, 75, 39, s,
      activity.worker === "done" ? C.codeGreen :
      workerTyping ? C.codeBlue : "#444",
      workerTyping ? 4 : (activity.worker === "done" ? 2 : 0), f);

    // Energy drink
    rect(ctx, 88, 44, 2, 3, s, "#30a060");
    rect(ctx, 88, 44, 2, 1, s, "#40c080");
    // Worker coffee
    drawCoffeeMug(ctx, 85, 44, s, f);
    // Rubber duck
    px(ctx, 90, 45, s, "#f0d040"); px(ctx, 91, 45, s, "#f0d040");
    px(ctx, 90, 44.5, s, "#f0d040"); px(ctx, 91, 44, s, "#f09020"); // beak

    // Worker chair
    drawChair(ctx, 78, 45, s);

    // Worker character
    drawWorkerSitting(ctx, 79, 40, s, f, workerTyping);

    // === FAR RIGHT AREA (x ~100-155) ===

    // Server rack
    drawServerRack(ctx, 110, 24, s, f, testerStatus === "running" || workerTyping);
    // Cable from server
    rect(ctx, 113, 42, 0.4, 10, s, C.cable);
    rect(ctx, 113, 52, 5, 0.4, s, C.cable);

    // Plant (large)
    drawPlant(ctx, 105, 44, s, f);

    // Standing desk / side table (far right)
    rect(ctx, 135, 38, 10, 1, s, C.deskTop);
    rect(ctx, 135, 39, 10, 2, s, C.deskFront);
    rect(ctx, 136, 41, 1, 6, s, C.deskLeg);
    rect(ctx, 143, 41, 1, 6, s, C.deskLeg);
    // Laptop on it
    rect(ctx, 137, 36, 6, 2, s, "#333");
    rect(ctx, 137.5, 36.5, 5, 1, s, "#111");
    // Laptop screen glow
    if (workerTyping || bossActive) {
      rect(ctx, 138, 36.7, 4, 0.5, s, C.codeDim);
    }

    // Couch / bean bag (break area right)
    rect(ctx, 148, 50, 8, 4, s, "#504080");
    rect(ctx, 147, 48, 2, 6, s, "#453070"); // arm
    rect(ctx, 148, 48, 8, 2, s, "#5a4890"); // back
    rect(ctx, 156, 48, 2, 6, s, "#453070"); // arm
    // Pillow
    rect(ctx, 150, 49, 3, 2, s, "#f0a040");

    // Small table next to couch
    rect(ctx, 146, 52, 3, 0.5, s, C.deskTop);
    rect(ctx, 146.5, 52.5, 0.8, 2, s, C.deskLeg);
    // Plant on it
    rect(ctx, 146.5, 51, 2, 1.5, s, C.leaf2);
    rect(ctx, 147, 52, 1, 0.5, s, C.plantPot);

    // ── Monitor glow on faces (ambient lighting) ──
    if (bossActive && !bossIsPlanning) {
      ctx.fillStyle = "rgba(80,224,144,0.06)";
      ctx.fillRect(25*s, 36*s, 12*s, 8*s);
    }
    if (workerTyping) {
      ctx.fillStyle = "rgba(96,160,255,0.06)";
      ctx.fillRect(77*s, 39*s, 12*s, 8*s);
    }

    // ── Labels ──
    ctx.textAlign = "center";

    ctx.font = `bold ${2.8 * s}px monospace`;
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("OPUS (BOSS)", 32 * s, 58 * s);
    if (bossActive) {
      ctx.font = `${2 * s}px monospace`;
      ctx.fillStyle = "#c0b0e0";
      ctx.fillText(activity.boss.toUpperCase(), 32 * s, 61 * s);
    }

    ctx.font = `bold ${2.8 * s}px monospace`;
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("CODEX (WORKER)", 84 * s, 60 * s);
    if (activity.worker !== "idle") {
      ctx.font = `${2 * s}px monospace`;
      ctx.fillStyle = "#90c0f0";
      ctx.fillText(activity.worker.toUpperCase(), 84 * s, 63 * s);
    }

    // ── Overlays ──
    if (round > 0) drawRoundBadge(ctx, 130, 8, round, s);

    if (thought) {
      if (thought.agent === "boss") {
        drawBubble(ctx, bossIsPlanning ? 34 : 32, bossIsPlanning ? 23 : 33, thought.text, s);
      } else if (thought.agent === "worker") {
        drawBubble(ctx, 84, 36, thought.text, s);
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [activity, round, thought]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const w = container.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      const pixW = w * dpr;
      const ps = pixW / 160; // pixel size
      const pixH = ps * 72;  // scene is 72 pixels tall
      canvas.width = pixW;
      canvas.height = pixH;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${pixH / dpr}px`;
    };

    resize();
    window.addEventListener("resize", resize);

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [draw]);

  return (
    <div className="w-full relative overflow-hidden rounded-lg" style={{ imageRendering: "pixelated" }}>
      <canvas ref={canvasRef} className="w-full block" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}

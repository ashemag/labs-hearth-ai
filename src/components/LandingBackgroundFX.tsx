"use client";

import { useEffect, useRef } from "react";

const DARK = "146,118,94"; // warm taupe groove color
const LIGHT = "255,255,255"; // etched highlight color
const EMBER = "188,85,32"; // burnt orange for traveling signals

/** Strokes the current path twice (white highlight offset down, dark groove on top)
 *  to fake a carved / debossed look on a near-white background. */
function etchStroke(
  ctx: CanvasRenderingContext2D,
  trace: () => void,
  alpha: number,
  width = 1.6
) {
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.save();
  ctx.translate(0, 1.4);
  ctx.beginPath();
  trace();
  ctx.strokeStyle = `rgba(${LIGHT},${Math.min(1, alpha * 6)})`;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  trace();
  ctx.strokeStyle = `rgba(${DARK},${alpha})`;
  ctx.stroke();
}

function etchDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number
) {
  ctx.beginPath();
  ctx.arc(x, y + 1.4, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${LIGHT},${Math.min(1, alpha * 6)})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${DARK},${alpha})`;
  ctx.fill();
}

/** A soft burnt-orange ball with a faint glow halo, still etched into the page
 *  via the offset white highlight underneath. */
function emberDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha: number
) {
  // glow halo
  const glowR = r * 4.5;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  glow.addColorStop(0, `rgba(${EMBER},${alpha * 0.5})`);
  glow.addColorStop(1, `rgba(${EMBER},0)`);
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // engraved highlight beneath the core
  ctx.beginPath();
  ctx.arc(x, y + 1.4, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${LIGHT},${Math.min(1, alpha * 4)})`;
  ctx.fill();

  // burnt-orange core
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${EMBER},${alpha})`;
  ctx.fill();
}

/* ----------------------------- network effect ---------------------------- */

interface Node {
  x: number;
  y: number;
  z: number; // depth 0.45..1 -> scale, alpha, speed
  r: number;
  phase: number;
  hub: boolean;
}

interface Edge {
  a: Node;
  b: Node;
  cx: number; // control point of the bowed curve
  cy: number;
  alpha: number;
}

interface Pulse {
  a: Node;
  b: Node;
  p: number; // 0..1 progress along the edge
  speed: number;
}

function createNetwork(w: number, h: number): Node[] {
  const count = Math.min(200, Math.max(70, Math.round((w * h) / 11000)));
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: 0.45 + Math.random() * 0.55,
    r: 1.3 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    hub: Math.random() < 0.12,
  }));
}

/** Quiet the area behind the logo so the etching frames it instead of crowding it. */
function centerFade(x: number, y: number, w: number, h: number) {
  const d = Math.hypot(x - w / 2, y - h / 2) / (Math.min(w, h) * 0.26);
  const f = Math.min(1, d);
  return 0.3 + 0.7 * f * f;
}

function quadPoint(
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  p: number
) {
  const q = 1 - p;
  return [
    q * q * ax + 2 * q * p * cx + p * p * bx,
    q * q * ay + 2 * q * p * cy + p * p * by,
  ] as const;
}

function drawNetwork(
  ctx: CanvasRenderingContext2D,
  nodes: Node[],
  pulses: Pulse[],
  w: number,
  h: number,
  t: number,
  dt: number
) {
  const linkDist = Math.min(215, Math.max(140, w / 7));

  // organic meander: nodes follow a slowly evolving flow field instead of
  // bouncing in straight lines
  for (const n of nodes) {
    const angle =
      Math.sin(n.y * 0.0042 + t * 0.16 + n.phase) * 1.7 +
      Math.cos(n.x * 0.0038 - t * 0.12) * 1.7;
    const speed = 11 * n.z;
    n.x += Math.cos(angle) * speed * dt;
    n.y += Math.sin(angle) * speed * dt;
    if (n.x < -24) n.x = w + 24;
    if (n.x > w + 24) n.x = -24;
    if (n.y < -24) n.y = h + 24;
    if (n.y > h + 24) n.y = -24;
  }

  // edges: gently bowed curves whose curvature breathes over time
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= linkDist || d < 1) continue;

      const zAvg = (a.z + b.z) / 2;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const bow =
        d * 0.14 * Math.sin(t * 0.45 + a.phase + b.phase);
      const cx = mx + (-dy / d) * bow;
      const cy = my + (dx / d) * bow;

      const alpha =
        (1 - d / linkDist) * 0.2 * zAvg * centerFade(mx, my, w, h);
      edges.push({ a, b, cx, cy, alpha });

      etchStroke(
        ctx,
        () => {
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        },
        alpha,
        0.9 + 1.1 * zAvg
      );
    }
  }

  // signal pulses traveling along live edges
  if (pulses.length < 14 && edges.length > 0 && Math.random() < 0.14) {
    const e = edges[Math.floor(Math.random() * edges.length)];
    pulses.push({ a: e.a, b: e.b, p: 0, speed: 0.45 + Math.random() * 0.5 });
  }
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pl = pulses[i];
    pl.p += pl.speed * dt;
    if (pl.p >= 1) {
      pulses.splice(i, 1);
      continue;
    }
    const e = edges.find((ed) => ed.a === pl.a && ed.b === pl.b);
    if (!e) {
      pulses.splice(i, 1);
      continue;
    }
    const [px, py] = quadPoint(e.a.x, e.a.y, e.cx, e.cy, e.b.x, e.b.y, pl.p);
    const fade = Math.sin(Math.PI * pl.p); // ease in and out
    const vis = fade * centerFade(px, py, w, h);

    // faint warm comet trail behind the ball
    const [tx, ty] = quadPoint(
      e.a.x, e.a.y, e.cx, e.cy, e.b.x, e.b.y,
      Math.max(0, pl.p - 0.08)
    );
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(px, py);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(${EMBER},${0.16 * vis})`;
    ctx.stroke();

    emberDot(ctx, px, py, 2.1, 0.5 * vis);
  }

  // nodes: depth-scaled with a slow breathing pulse; hubs get an orbit ring
  for (const n of nodes) {
    const fade = centerFade(n.x, n.y, w, h);
    const breathe = 1 + 0.18 * Math.sin(t * 1.1 + n.phase);
    etchDot(ctx, n.x, n.y, n.r * n.z * breathe, 0.26 * n.z * fade);

    if (n.hub) {
      const ringR =
        (n.r + 5.5) * n.z * (1 + 0.12 * Math.sin(t * 0.7 + n.phase * 2));
      etchStroke(
        ctx,
        () => {
          ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
        },
        0.18 * n.z * fade,
        1.1
      );
    }
  }
}

/* -------------------------------- component ------------------------------- */

export default function LandingBackgroundFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    const pulses: Pulse[] = [];

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = createNetwork(w, h);
      pulses.length = 0;
    };
    resize();
    window.addEventListener("resize", resize);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let last = performance.now();
    const start = last;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;

      ctx.clearRect(0, 0, w, h);
      drawNetwork(ctx, nodes, pulses, w, h, reducedMotion ? 0 : t, reducedMotion ? 0 : dt);

      if (!reducedMotion) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

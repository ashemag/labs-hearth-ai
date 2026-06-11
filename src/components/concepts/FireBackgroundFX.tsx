"use client";

/**
 * Concept: minimal lapping fire background, carved/debossed into a near-white page.
 * Not currently used on the landing page — kept here for future exploration.
 * Render inside a `relative` container; the canvas fills it absolutely.
 */

import { useEffect, useRef } from "react";

const DARK = "146,118,94"; // warm taupe groove color
const LIGHT = "255,255,255"; // etched highlight color

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

interface Flame {
  dx: number; // horizontal offset from center
  w: number; // half-width at base
  h: number; // height
  sway: number;
  speed: number;
  phase: number;
  alpha: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  r: number;
}

function createFlames(h: number): Flame[] {
  const s = Math.min(1.25, Math.max(0.7, h / 800));
  return [
    { dx: 0, w: 64 * s, h: 300 * s, sway: 0.8, speed: 1.0, phase: 0.0, alpha: 0.2 },
    { dx: -34 * s, w: 40 * s, h: 195 * s, sway: 1.15, speed: 1.5, phase: 2.1, alpha: 0.17 },
    { dx: 36 * s, w: 44 * s, h: 225 * s, sway: 1.0, speed: 1.25, phase: 4.4, alpha: 0.17 },
  ];
}

function tracePoints(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  // midpoint smoothing for a soft, organic outline
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.closePath();
}

function drawFire(
  ctx: CanvasRenderingContext2D,
  flames: Flame[],
  embers: Ember[],
  w: number,
  h: number,
  t: number,
  dt: number
) {
  const cx = w / 2;
  const baseY = h * 0.84;

  // hearth line beneath the flames
  const hearthW = Math.min(360, w * 0.4);
  etchStroke(
    ctx,
    () => {
      ctx.moveTo(cx - hearthW / 2, baseY + 14);
      ctx.quadraticCurveTo(cx, baseY + 26, cx + hearthW / 2, baseY + 14);
    },
    0.16
  );

  for (const f of flames) {
    const flicker =
      1 +
      0.05 * Math.sin(t * 1.7 + f.phase) +
      0.035 * Math.sin(t * 3.1 + f.phase * 2.3);
    const hEff = f.h * flicker;

    const steps = 26;
    const left: [number, number][] = [];
    const right: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const y = baseY - hEff * s;
      const halfW =
        f.w *
        Math.pow(1 - s, 1.2) *
        (1 + 0.09 * Math.sin(t * 2.2 + s * 5 + f.phase));
      const swayX =
        Math.sin(t * f.speed + f.phase + s * 2.6) * 16 * f.sway * s * s;
      const x = cx + f.dx + swayX;
      left.push([x - halfW, y]);
      right.push([x + halfW, y]);
    }

    const outline: [number, number][] = [...left, ...right.reverse()];
    etchStroke(ctx, () => tracePoints(ctx, outline), f.alpha, 2);
  }

  // embers drifting up from the flame tips
  if (embers.length < 10 && Math.random() < 0.05) {
    embers.push({
      x: cx + (Math.random() - 0.5) * 90,
      y: baseY - flames[0].h * (0.55 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 8,
      vy: -(18 + Math.random() * 16),
      life: 1,
      r: 1 + Math.random() * 1.3,
    });
  }
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.x += (e.vx + Math.sin(t * 2 + e.y * 0.02) * 6) * dt;
    e.y += e.vy * dt;
    e.life -= dt * 0.35;
    if (e.life <= 0) {
      embers.splice(i, 1);
      continue;
    }
    etchDot(ctx, e.x, e.y, e.r, 0.18 * e.life);
  }
}

export default function FireBackgroundFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let flames: Flame[] = [];
    const embers: Ember[] = [];

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flames = createFlames(h);
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
      drawFire(ctx, flames, embers, w, h, reducedMotion ? 0 : t, dt);

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

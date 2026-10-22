"use client";

import { useEffect, useRef } from "react";

/* The scissors cut as they move. Along the cursor's path a small fabric glyph
   appears every few pixels and is snipped in two: the halves part along the
   line of the cut and fall away, and now and then a loose thread drops off.

   Mouse and trackpad only, never with reduced motion, and never over anything
   being read or written: form fields, forms, dialogs, whatever is marked
   data-no-cut (the thread board, the article sheet, project notes, the studio)
   and anywhere the cursor isn't the scissors (text fields). The canvas stays
   0×0 until the first cut and only draws while pieces fall. */

const NO_CUT = "input, textarea, select, [contenteditable], form, [role='dialog'], [data-no-cut]";
const WEAVE = "#x+%&*=";
const FRAY = "~'`,";
const STEP = 18; // px of travel between snips
const MAX = 160; // pieces on screen at once
const SIZE = 17; // px, a woven glyph; a loose thread is smaller
const SLIT_MS = 650; // how long the dashed cut line stays

type Piece = {
  x: number;
  y: number;
  /** direction of the cut, in radians */
  a: number;
  ch: string;
  /** which half of a snipped glyph (-1 above the cut, 1 below); 0 is a loose thread */
  half: -1 | 0 | 1;
  t0: number;
  life: number;
  /** px the half moves away from the cut */
  drift: number;
  /** rad it turns while it falls */
  spin: number;
  /** px it drops by the end */
  fall: number;
};

/** the dashed cutting line the scissors leave, from one snip to the next */
type Slit = { x1: number; y1: number; x2: number; y2: number; t0: number };

const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export default function CutTrail() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");

    let pieces: Piece[] = [];
    let slits: Slit[] = [];
    let frame = 0;
    let sized = false;
    let ink = "#4a0c18";
    let font = "monospace";
    // the last snip, and whether the element under the pointer may be cut
    let from: { x: number; y: number; t: number } | null = null;
    let target: EventTarget | null = null;
    let allowed = false;

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
    };
    const onResize = () => sized && size();

    const canCut = (t: EventTarget | null) => {
      if (!(t instanceof Element) || t.closest(NO_CUT)) return false;
      if (document.querySelector("[aria-modal='true']")) return false;
      // the scissors are only ever set under (pointer: fine), so this is the mouse check too
      return getComputedStyle(t).cursor.includes("scissors");
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      slits = slits.filter((c) => now - c.t0 < SLIT_MS);
      for (const c of slits) {
        ctx.globalAlpha = (1 - Math.max(0, now - c.t0) / SLIT_MS) * 0.5;
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.stroke();
      }
      pieces = pieces.filter((p) => now - p.t0 < p.life);
      let px = 0;
      for (const p of pieces) {
        const k = Math.max(0, now - p.t0) / p.life;
        // the halves hold together for a beat, then part along the cut
        const part = Math.max(0, (k - 0.12) / 0.88);
        const ease = 1 - (1 - part) ** 3;
        const x = p.x - Math.sin(p.a) * p.half * p.drift * ease;
        const y = p.y + Math.cos(p.a) * p.half * p.drift * ease + p.fall * part * part;
        ctx.globalAlpha = Math.min(1, k / 0.06) * (1 - k) ** 1.2 * 0.9;
        const fs = p.half ? SIZE : SIZE - 3;
        if (fs !== px) ctx.font = `700 ${(px = fs)}px ${font}`;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.a + p.spin * ease);
        if (p.half) {
          ctx.beginPath();
          ctx.rect(-SIZE, p.half < 0 ? -SIZE : 0, SIZE * 2, SIZE);
          ctx.clip();
        }
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      frame = pieces.length || slits.length ? requestAnimationFrame(draw) : 0;
    };

    const snip = (x0: number, y0: number, x: number, y: number, a: number, now: number, n: number) => {
      slits.push({ x1: x0, y1: y0, x2: x, y2: y, t0: now });
      const ch = pick(WEAVE);
      const life = between(900, 1200);
      for (const half of [-1, 1] as const) {
        pieces.push({ x, y, a, ch, half, t0: now, life, drift: between(5, 10), spin: half * between(0.2, 0.6), fall: between(14, 28) });
      }
      if (n % 3 === 0) {
        const side = Math.random() < 0.5 ? -1 : 1;
        pieces.push({
          x: x - Math.sin(a) * side * between(6, 10),
          y: y + Math.cos(a) * side * between(6, 10),
          a: between(-0.6, 0.6),
          ch: pick(FRAY),
          half: 0,
          t0: now + 60,
          life: between(1100, 1400),
          drift: 0,
          spin: between(-1.2, 1.2),
          fall: between(24, 40),
        });
      }
      if (pieces.length > MAX) pieces.splice(0, pieces.length - MAX);
    };

    let count = 0;
    const onMove = (e: PointerEvent) => {
      // touch never shows the scissors; a held button is a text selection or a drag
      if (e.pointerType === "touch" || e.buttons || still.matches) {
        from = null;
        return;
      }
      if (e.target !== target) {
        target = e.target;
        allowed = canCut(target);
      }
      if (!allowed) {
        from = null;
        return;
      }
      const now = performance.now();
      const { clientX: x, clientY: y } = e;
      // a fresh stroke on coming in from an uncut area, or after a rest
      if (!from || now - from.t > 200) {
        from = { x, y, t: now };
        return;
      }
      const dx = x - from.x;
      const dy = y - from.y;
      const d = Math.hypot(dx, dy);
      if (d < STEP) {
        from.t = now;
        return;
      }

      if (!sized) {
        const css = getComputedStyle(document.documentElement);
        ink = css.getPropertyValue("--ink").trim() || ink;
        font = css.getPropertyValue("--font-mono").trim() || font;
        size();
        sized = true;
      }
      const a = Math.atan2(dy, dx);
      // a fast flick still leaves an even line, but no more than three snips at once
      const n = Math.min(3, Math.floor(d / STEP));
      for (let i = 1; i <= n; i++) {
        snip(from.x + (dx * (i - 1)) / n, from.y + (dy * (i - 1)) / n, from.x + (dx * i) / n, from.y + (dy * i) / n, a, now, ++count);
      }
      from = { x, y, t: now };
      if (!frame) frame = requestAnimationFrame(draw);
    };

    // capture: a component that stops pointermove for itself doesn't stop the scissors
    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} className="cut-trail" width={0} height={0} aria-hidden="true" />;
}

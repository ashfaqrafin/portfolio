"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./intro.css";

/* The home page's opening, in the hero's own language of thread. The page
   starts as a sheet of pattern paper with the name on it, cut into ROWS strips.
   A storm of threads streaks in from every side; each one catches a row and
   shoots across it like a loom shuttle (alternate rows run the other way), and
   the strip of paper goes with it, so the site underneath is woven onto the
   screen row by row. The woven threads tighten and fade. About 2.3 s; any click,
   key, scroll or touch runs the rest at 4× speed.

   Whether it plays is decided before the first paint by INTRO_GATE in the root
   layout (html[data-intro]). The paper is server-rendered, so nothing flashes
   before this runs; if the script never starts, a CSS fail-safe fades it out.
   At the end data-intro becomes "seen", which hides it and lets the hero start
   (Hero.tsx waits, so its WebGL set-up never stutters the threads). */

const ROWS = 14;
const LOOSE = 16;
const SPEEDUP = 4;
const TRAIL = 22; // samples
const TRAIL_DT = 0.011; // s between samples
const INK = "#4a0c18";
const THREAD = "#8c2f43";
const HI = "#f2c4cb";

type XY = { x: number; y: number };
type Curve = [XY, XY, XY, XY]; // cubic bezier, normalised to the screen
type Row = { y: number; dir: 1 | -1; t0: number; fly: number; t1: number; weave: number; curve: Curve; phase: number };
type Loose = { t0: number; dur: number; curve: Curve };

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const easeOut = (u: number) => 1 - (1 - u) ** 3;
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
function bez([a, b, c, d]: Curve, u: number): XY {
  const v = 1 - u;
  const k0 = v * v * v;
  const k1 = 3 * v * v * u;
  const k2 = 3 * v * u * u;
  const k3 = u * u * u;
  return { x: k0 * a.x + k1 * b.x + k2 * c.x + k3 * d.x, y: k0 * a.y + k1 * b.y + k2 * c.y + k3 * d.y };
}
// the same storm every visit
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** a point off screen, on a ring around the centre */
function offscreen(r: () => number): XY {
  const a = r() * Math.PI * 2;
  return { x: 0.5 + Math.cos(a) * 0.85, y: 0.5 + Math.sin(a) * 0.85 };
}

function plan() {
  const r = rng(11);
  const rows: Row[] = Array.from({ length: ROWS }, (_, i) => {
    const dir = i % 2 ? -1 : 1;
    const y = (i + 0.5) / ROWS;
    const entry = { x: dir > 0 ? -0.02 : 1.02, y };
    const s = offscreen(r);
    const t0 = 0.05 + i * 0.035 + r() * 0.05;
    const fly = 0.42 + r() * 0.13;
    return {
      y,
      dir,
      t0,
      fly,
      t1: t0 + fly,
      weave: 0.55 + r() * 0.1,
      phase: r() * Math.PI * 2,
      // swoop in, then arrive running along the row
      curve: [s, { x: s.x + (r() - 0.5) * 0.9, y: s.y + (r() - 0.5) * 0.9 }, { x: entry.x - dir * 0.3, y: y + (r() - 0.5) * 0.25 }, entry],
    };
  });
  const loose: Loose[] = Array.from({ length: LOOSE }, () => {
    const a = offscreen(r);
    const b = offscreen(r);
    return { t0: r() * 0.7, dur: 0.8 + r() * 0.5, curve: [a, { x: r(), y: r() }, { x: r(), y: r() }, b] };
  });
  const end = Math.max(...rows.map((w) => w.t1 + w.weave + 0.6));
  return { rows, loose, end };
}

export default function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const cv = canvasRef.current;
    const html = document.documentElement;
    if (!el || !cv || html.dataset.intro !== "play") return;
    const ctx = cv.getContext("2d");
    let raf = 0;
    const finish = () => {
      cancelAnimationFrame(raf);
      html.dataset.intro = "seen";
    };
    if (!ctx) return finish();
    el.setAttribute("data-live", ""); // the CSS fail-safe stands down

    const strips = Array.from(el.querySelectorAll<HTMLElement>(".intro-strip"));
    const papers = strips.map((s) => s.firstElementChild as HTMLElement);
    const { rows, loose, end } = plan();
    let W = 0;
    let H = 0;
    const size = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const px = (p: XY) => ({ x: p.x * W, y: p.y * H });

    /** where row w's thread head is at time t, or null before it enters */
    const headOf = (w: Row, t: number): XY | null => {
      if (t < w.t0) return null;
      if (t < w.t1) return px(bez(w.curve, easeOut(clamp01((t - w.t0) / w.fly))));
      const v = easeInOut(clamp01((t - w.t1) / w.weave));
      const x0 = w.dir > 0 ? -0.02 : 1.02;
      return { x: (x0 + 1.04 * w.dir * v) * W, y: w.y * H };
    };
    // a fading, tapering tail behind a moving head
    const trail = (at: (t: number) => XY | null, t: number, width: number, alpha = 1) => {
      let prev = at(t);
      if (!prev || alpha <= 0) return;
      for (let k = 1; k <= TRAIL; k++) {
        const p = at(t - k * TRAIL_DT);
        if (!p) break;
        const f = 1 - k / TRAIL;
        ctx.globalAlpha = alpha * f;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.lineWidth = 0.5 + width * f;
        ctx.strokeStyle = THREAD;
        ctx.stroke();
        if (k < 6) {
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = HI;
          ctx.stroke();
        }
        prev = p;
      }
    };

    // ?intro-speed=0.25 slows it down to look at
    const debugSpeed = Number(new URLSearchParams(window.location.search).get("intro-speed")) || 1;
    let t = 0;
    let speed = debugSpeed;
    let last = performance.now();
    const frame = (now: number) => {
      t += Math.min(0.05, Math.max(0, now - last) / 1000) * speed;
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // loose threads: the storm
      for (const l of loose) {
        if (t < l.t0 || t > l.t0 + l.dur + TRAIL * TRAIL_DT) continue;
        const at = (s: number) => (s < l.t0 ? null : px(bez(l.curve, easeInOut(clamp01((s - l.t0) / l.dur)))));
        trail(at, t, 2.2, 0.8);
      }

      rows.forEach((w, i) => {
        const v = clamp01((t - w.t1) / w.weave);
        const p = easeInOut(v);
        // the strip goes with the shuttle; its paper stays put, so it reads as a cut
        const shift = w.dir * p * W * 1.04;
        strips[i].style.transform = p ? `translate3d(${shift.toFixed(1)}px,0,0)` : "";
        papers[i].style.transform = p ? `translate3d(${(-shift).toFixed(1)}px,0,0)` : "";

        const head = headOf(w, t);
        if (!head) return;
        // the woven line behind the shuttle: slack while it runs, pulled taut, gone
        if (t > w.t1) {
          const done = t - (w.t1 + w.weave);
          const taut = clamp01(done / 0.3);
          const fade = 1 - clamp01((done - 0.2) / 0.45);
          if (fade > 0) {
            const x0 = w.dir > 0 ? 0 : W;
            const y = w.y * H;
            const amp = 3.2 * (1 - taut);
            ctx.globalAlpha = 0.95 * fade;
            ctx.beginPath();
            for (let n = 0; n <= 48; n++) {
              const x = x0 + ((head.x - x0) * n) / 48;
              const yy = y + Math.sin(x * 0.045 + w.phase + t * 6) * amp;
              if (n === 0) ctx.moveTo(x, yy);
              else ctx.lineTo(x, yy);
            }
            ctx.strokeStyle = THREAD;
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.setLineDash([5, 7]);
            ctx.strokeStyle = HI;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        if (v < 1) {
          trail((s) => headOf(w, s), t, 3);
          ctx.globalAlpha = 1;
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      if (t >= end) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const skip = () => {
      speed = SPEEDUP * debugSpeed;
    };
    // a background tab may never run the frames
    const fallback = window.setTimeout(finish, 6000 / debugSpeed);
    const opts = { passive: true, once: true } as const;
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("keydown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchstart", skip, opts);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <div ref={ref} className="intro" aria-hidden="true" style={{ "--rows": ROWS } as CSSProperties}>
      {Array.from({ length: ROWS }, (_, i) => (
        <div key={i} className="intro-strip" style={{ "--i": i } as CSSProperties}>
          <div className="intro-paper">
            <p className="intro-name">Ashfaq</p>
            <p className="intro-line">threading the needle&hellip;</p>
          </div>
        </div>
      ))}
      <canvas ref={canvasRef} className="intro-threads" />
    </div>
  );
}

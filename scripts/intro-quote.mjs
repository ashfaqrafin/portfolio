#!/usr/bin/env node
/* Turns the intro's quote into single-line pen strokes, so a thread can write
   it out in the site's handwriting (Caveat), one stroke after another.

   Each line is rendered in Caveat by Chromium, thinned to its centre line
   (Zhang–Suen), traced into strokes, cleaned of the little spurs thinning
   leaves, smoothed, and put in the order a hand would write them: left to
   right, each stroke starting from the end nearest the pen. The result is
   written to app/components/intro/quote.ts. Re-run after changing QUOTE:

     npm run intro:quote          (needs Chromium; CHROMIUM_PATH to override)

   The font is design/fonts/Caveat-latin.woff2 (SIL Open Font License). */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "app/components/intro/quote.ts");
const QUOTE = ["One thread. One terminal.", "A kind heart.", "Enough to mend anything."];
const SIZE = 120; // px, the font size the quote is traced at
const LEADING = 1.12; // line height, × SIZE
const WEIGHT = 500;

const font = readFileSync(path.join(ROOT, "design/fonts/Caveat-latin.woff2")).toString("base64");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const lines = [];
try {
  const page = await browser.newPage({ viewport: { width: 2400, height: 400 } });
  await page.setContent(
    `<style>@font-face{font-family:Q;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 700}
      body{margin:0;background:#fff}span{font:${WEIGHT} ${SIZE}px/1 Q;color:#000;white-space:pre;display:inline-block;padding:20px}</style><span id="t"></span>`,
  );
  for (const text of QUOTE) {
    const box = await page.evaluate(async (text) => {
      await document.fonts.load("500 120px Q");
      const t = document.getElementById("t");
      t.textContent = text;
      const r = t.getBoundingClientRect();
      return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
    }, text);
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: box.w, height: box.h } });
    const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
    lines.push({ text, w: info.width, h: info.height, ink: Uint8Array.from(data, (v) => (v < 128 ? 1 : 0)) });
  }
} finally {
  await browser.close();
}

// ── thinning (Zhang–Suen) ────────────────────────────────────────────────────
function thin(src, w, h) {
  const im = src.slice();
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : im[y * w + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const del = [];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!im[y * w + x]) continue;
          const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
          const b = p.reduce((s, v) => s + v, 0);
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) a++;
          if (a !== 1) continue;
          if (step === 0 ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue;
          del.push(y * w + x);
        }
      for (const i of del) im[i] = 0;
      if (del.length) changed = true;
    }
  }
  return im;
}

/** half the stroke's width at each pixel: a chamfer distance to the nearest blank pixel */
function distance(ink, w, h) {
  const d = new Float32Array(w * h).map((_, i) => (ink[i] ? 1e9 : 0));
  const pass = (xs, ys, nb) => {
    for (const y of ys)
      for (const x of xs) {
        const i = y * w + x;
        if (!d[i]) continue;
        for (const [dx, dy, c] of nb) {
          const xx = x + dx;
          const yy = y + dy;
          const v = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : d[yy * w + xx];
          if (v + c < d[i]) d[i] = v + c;
        }
      }
  };
  const range = (n, rev) => (rev ? [...Array(n).keys()].reverse() : [...Array(n).keys()]);
  pass(range(w), range(h), [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.4], [1, -1, 1.4]]);
  pass(range(w, true), range(h, true), [[1, 0, 1], [0, 1, 1], [1, 1, 1.4], [-1, 1, 1.4]]);
  return d;
}

// ── tracing the centre lines into strokes ────────────────────────────────────
const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
/** neighbours under m-adjacency: a diagonal only counts if neither shared side pixel is set */
function neighbours(sk, w, h, i) {
  const x = i % w;
  const y = (i - x) / w;
  const on = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && sk[yy * w + xx];
  const out = [];
  for (const [dx, dy] of N8) {
    if (!on(x + dx, y + dy)) continue;
    if (dx && dy && (on(x + dx, y) || on(x, y + dy))) continue;
    out.push((y + dy) * w + x + dx);
  }
  return out;
}

function trace(sk, w, h) {
  const nb = new Map();
  for (let i = 0; i < sk.length; i++) if (sk[i]) nb.set(i, neighbours(sk, w, h, i));
  const seen = new Set();
  const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  const strokes = [];
  const walk = (start, next) => {
    const pts = [start];
    let prev = start;
    let cur = next;
    seen.add(key(prev, cur));
    for (;;) {
      pts.push(cur);
      const ns = nb.get(cur);
      if (ns.length !== 2) break;
      const nxt = ns[0] === prev ? ns[1] : ns[0];
      if (seen.has(key(cur, nxt))) break;
      seen.add(key(cur, nxt));
      prev = cur;
      cur = nxt;
    }
    return pts;
  };
  for (const [i, ns] of nb) {
    if (ns.length === 2) continue;
    if (ns.length === 0) strokes.push([i]); // a dot
    for (const n of ns) if (!seen.has(key(i, n))) strokes.push(walk(i, n));
  }
  // closed loops with no ends (an "o" written in one go)
  for (const [i, ns] of nb) if (ns.length === 2 && !seen.has(key(i, ns[0]))) strokes.push(walk(i, ns[0]));
  return strokes.map((s) => s.map((i) => [i % w, Math.floor(i / w)]));
}

const len = (pts) => pts.reduce((s, p, k) => (k ? s + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0);

/** drop the short spurs thinning grows at corners and junctions, then join what's left end to end */
function clean(strokes, spur) {
  const id = (p) => `${p[0]},${p[1]}`;
  for (let round = 0; round < 3; round++) {
    const ends = new Map();
    for (const s of strokes) for (const p of [s[0], s[s.length - 1]]) ends.set(id(p), (ends.get(id(p)) ?? 0) + 1);
    // a spur: short, with one end loose and the other on a junction
    strokes = strokes.filter((s) => {
      if (s.length < 2) return true;
      const a = ends.get(id(s[0]));
      const b = ends.get(id(s[s.length - 1]));
      return !(len(s) < spur && (a === 1) !== (b === 1));
    });
    // join strokes meeting at a point only they share
    const at = new Map();
    for (const s of strokes) for (const p of [s[0], s[s.length - 1]]) at.set(id(p), [...(at.get(id(p)) ?? []), s]);
    const merged = new Set();
    const out = [];
    for (const s of strokes) {
      if (merged.has(s)) continue;
      let cur = s;
      merged.add(s);
      for (let grew = true; grew; ) {
        grew = false;
        for (const end of [0, 1]) {
          const p = end ? cur[cur.length - 1] : cur[0];
          const others = (at.get(id(p)) ?? []).filter((o) => o !== s && !merged.has(o));
          if ((at.get(id(p)) ?? []).length !== 2 || others.length !== 1) continue;
          const o = others[0];
          merged.add(o);
          const oo = id(o[0]) === id(p) ? o : [...o].reverse();
          cur = end ? [...cur, ...oo.slice(1)] : [...[...oo].reverse(), ...cur.slice(1)];
          grew = true;
        }
      }
      out.push(cur);
    }
    strokes = out;
  }
  return strokes;
}

function smooth(pts) {
  if (pts.length < 5) return pts;
  return pts.map((p, k) => {
    if (k === 0 || k === pts.length - 1) return p;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let j = Math.max(0, k - 2); j <= Math.min(pts.length - 1, k + 2); j++) {
      sx += pts[j][0];
      sy += pts[j][1];
      n++;
    }
    return [sx / n, sy / n];
  });
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  // a closed loop: halve it at the point farthest from where it starts, or it collapses
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) {
    let at = 1;
    for (let k = 1; k < pts.length - 1; k++)
      if (Math.hypot(pts[k][0] - a[0], pts[k][1] - a[1]) > Math.hypot(pts[at][0] - a[0], pts[at][1] - a[1])) at = k;
    if (at > 0 && at < pts.length - 1) return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
  }
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let far = 0;
  let at = 0;
  for (let k = 1; k < pts.length - 1; k++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - pts[k][1]) - (a[0] - pts[k][0]) * (b[1] - a[1])) / L;
    if (d > far) [far, at] = [d, k];
  }
  if (far <= eps) return [a, b];
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

/** Catmull-Rom through the points, as cubic Béziers */
function toPath(pts, dx, dy) {
  const f = (v) => +v.toFixed(1);
  const P = pts.map(([x, y]) => [x + dx, y + dy]);
  if (P.length === 1) return `M${f(P[0][0])} ${f(P[0][1])}h0.1`;
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let k = 0; k < P.length - 1; k++) {
    const p0 = P[Math.max(0, k - 1)];
    const p1 = P[k];
    const p2 = P[k + 1];
    const p3 = P[Math.min(P.length - 1, k + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** the order a hand writes them: left to right, each from the end nearest the pen */
function order(strokes) {
  const left = strokes.map((s) => ({ s, minX: Math.min(...s.map((p) => p[0])) }));
  const out = [];
  let pen = [0, 0];
  while (left.length) {
    const reach = Math.min(...left.map((o) => o.minX)) + SIZE * 0.35;
    let best = null;
    for (const o of left) {
      if (o.minX > reach) continue;
      for (const rev of [false, true]) {
        const start = rev ? o.s[o.s.length - 1] : o.s[0];
        const end = rev ? o.s[0] : o.s[o.s.length - 1];
        // a stroke is begun at its left end, unless the pen is already at the other
        const cost = Math.hypot(start[0] - pen[0], start[1] - pen[1]) + (start[0] > end[0] + 2 ? SIZE * 0.25 : 0);
        if (!best || cost < best.cost) best = { o, rev, cost };
      }
    }
    left.splice(left.indexOf(best.o), 1);
    const s = best.rev ? [...best.o.s].reverse() : best.o.s;
    out.push(s);
    pen = s[s.length - 1];
  }
  return out;
}

const result = [];
let widthMax = 0;
let halfWidths = [];
lines.forEach((ln, row) => {
  const sk = thin(ln.ink, ln.w, ln.h);
  const dist = distance(ln.ink, ln.w, ln.h);
  for (let i = 0; i < sk.length; i++) if (sk[i]) halfWidths.push(dist[i]);
  const cleaned = clean(trace(sk, ln.w, ln.h), SIZE * 0.07);
  // drop the tiny bits thinning leaves inside junctions, but keep marks that stand
  // on their own: a full stop thins to a pixel or two
  const touches = (s) => cleaned.some((o) => o !== s && [o[0], o[o.length - 1]].some((q) => s.some((p) => Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)));
  const strokes = order(cleaned.filter((s) => len(s) >= SIZE * 0.08 || !touches(s)));
  const dy = row * SIZE * LEADING;
  for (const s of strokes) {
    const pts = simplify(smooth(s), 0.7);
    result.push({ d: toPath(pts, 0, dy), len: Math.max(1, Math.round(len(pts))), line: row });
  }
  widthMax = Math.max(widthMax, ln.w);
});
halfWidths.sort((a, b) => a - b);
const stroke = +(halfWidths[Math.floor(halfWidths.length / 2)] * 2).toFixed(1);
const height = Math.round(SIZE * LEADING * (lines.length - 1) + lines[lines.length - 1].h);

writeFileSync(
  OUT,
  `/* Generated by \`npm run intro:quote\` (scripts/intro-quote.mjs): the quote in
   Caveat, as single-line pen strokes in writing order. Don't edit by hand. */

export const QUOTE_TEXT = ${JSON.stringify(QUOTE.join(" "))};
export const QUOTE_W = ${widthMax};
export const QUOTE_H = ${height};
/** the pen's width, in the same units */
export const QUOTE_STROKE = ${stroke};
/** each stroke: its path, and its length (for pacing the thread) */
export const QUOTE_STROKES: readonly { d: string; len: number }[] = [
${result.map((r) => `  { d: ${JSON.stringify(r.d)}, len: ${r.len} },`).join("\n")}
];
`,
);
console.log(`  quote.ts  ${result.length} strokes, ${widthMax}×${height}, pen ${stroke}px`);

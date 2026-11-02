#!/usr/bin/env node
/* Stray marks on the desk: a few burgundy marks left on the bare paper round
   the cards, as if someone shaded a little where they shouldn't have, tried a
   pencil out, let it slip, or let a drop of watercolour fall from the brush.
   Sparse on purpose: most of the paper stays bare, and most marks end up under
   a card anyway.

   The pencil is on two tiles of different sizes (1500 × 2200 and 1100 × 2900
   css px), laid over each other on <body> (globals.css), so the pattern only
   repeats every few screens and never in step. The paint is drawn one drop to
   an image, and each chapter seam puts one in its gap (ChapterSeam.tsx,
   chapter.css), so every gap between sections has one, on any screen. The strokes are drawn one by one, in --thread;
   the paint is a wash under them; both on transparent. Re-run after changing
   a mark:

     npm run desk:strays

   Output: public/desk-strays-{a,b}.webp, public/desk-drop-{1..4}.webp */

import { statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { clamp01, mulberry32, smooth, sstep } from "./pencil.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
let S = 1.25; // image px per css px (the drops are drawn finer: set before each)
const INK = [140, 47, 67]; // --thread
// the paint: a thin wash is a lighter, rosier burgundy; where it pools and dries at the edge, deep wine
const WASH = [146, 28, 58];
const POOL = [88, 10, 30];

/* Each mark, in css px within its tile:
   swatch: a quick swipe of shading, the pencil going back and forth across it
     [x, y, length, width, angle of the swipe (deg), pressure 0..1]
   zigzag: a pencil tried out, a few strokes back and forth
     [x, y, length, width, angle (deg), turns]
   slip: one long light line where the pencil slid
     [x, y, length, angle (deg), bow (px)]
   drop: a drop of watercolour that fell from the brush: a blot with the dark
     edge paint leaves as it dries, and droplets thrown off the way it fell
     [x, y, radius, angle it fell along (deg), droplets, strength 0..1] */
const TILES = {
  a: {
    w: 1500,
    h: 2200,
    seed: 11,
    swatch: [
      [330, 340, 190, 64, -28, 0.85],
      [1180, 1260, 140, 50, -35, 0.7],
      [610, 1880, 96, 38, -22, 0.6],
      [420, 1600, 150, 46, -26, 0.7],
      [1080, 820, 170, 52, -32, 0.75],
      [200, 1050, 130, 44, -24, 0.65],
      [1300, 1950, 120, 40, -38, 0.6],
    ],
    zigzag: [
      [1040, 520, 70, 22, -18, 6],
      [520, 1320, 60, 18, -22, 5],
    ],
    slip: [
      [760, 1020, 170, -12, 9],
      [1150, 160, 140, -6, 6],
    ],
  },
  b: {
    w: 1100,
    h: 2900,
    seed: 23,
    swatch: [
      [820, 760, 160, 56, -30, 0.75],
      [180, 2050, 120, 44, -40, 0.65],
      [300, 420, 110, 40, -18, 0.6],
      [560, 1450, 150, 50, -28, 0.7],
      [900, 2500, 130, 44, -34, 0.65],
      [120, 2700, 100, 36, -20, 0.55],
    ],
    zigzag: [
      [260, 1240, 56, 18, -14, 5],
      [780, 230, 64, 20, -10, 5],
    ],
    slip: [[640, 1700, 130, 8, -7]],
  },
};

const rad = (d) => (d * Math.PI) / 180;

// smooth value noise, from a hash: (x, y) in px, `cell` px across
const hash2 = (x, y, k) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(k, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function vnoise(x, y, cell, k) {
  const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = smooth(gx - ix), fy = smooth(gy - iy);
  const a = hash2(ix, iy, k), b = hash2(ix + 1, iy, k), c = hash2(ix, iy + 1, k), d = hash2(ix + 1, iy + 1, k);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function tile({ w: cw, h: ch, seed, swatch, zigzag, slip, drop = [] }) {
  const w = Math.round(cw * S);
  const h = Math.round(ch * S);
  const rand = mulberry32(seed);
  const cover = new Float32Array(w * h);
  // the paint, under the pencil: how much of it (alpha), and how pooled (0 wash … 1 dark)
  const paint = new Float32Array(w * h);
  const pool = new Float32Array(w * h);

  /* one blot of watercolour at (x, y), radius r css px: its outline wavers;
     the pigment is carried to the edge as it dries and leaves a dark rim; inside
     it settles unevenly, darker in pools, with a fine grain. `stretch` draws it
     out along `dir` (a drop that fell at a slant) */
  const blot = (x, y, r, dir, stretch, k, waver = 1) => {
    const c = Math.cos(dir), sn = Math.sin(dir);
    // nearly round: a slow waver, and a faint ripple where the paper's fibres took it
    const lobes = [
      ...Array.from({ length: 4 }, (_, j) => [j + 2, (0.055 / Math.pow(j + 2, 0.5)) * (0.4 + rand()) * waver, rand() * 6.283]),
      ...Array.from({ length: 5 }, (_, j) => [j + 11, 0.009 * (0.5 + rand()) * waver, rand() * 6.283]),
    ];
    const nk = Math.floor(rand() * 1e6);
    const R = r * (1.4 + stretch) * S;
    const rim = (1.1 + r * 0.035) * S; // the dried edge, px
    for (let py = Math.max(0, Math.floor(y * S - R)); py < Math.min(h, Math.ceil(y * S + R)); py++)
      for (let px = Math.max(0, Math.floor(x * S - R)); px < Math.min(w, Math.ceil(x * S + R)); px++) {
        const dx = px / S - x, dy = py / S - y;
        const u = (dx * c + dy * sn) / stretch, v = -dx * sn + dy * c;
        const th = Math.atan2(v, u);
        let edge = 1;
        for (const [f, amp, ph] of lobes) edge += amp * Math.sin(f * th + ph);
        const rr = r * edge * S;
        const dist = Math.hypot(u, v) * S;
        if (dist > rr + 1) continue;
        const inside = clamp01(rr + 0.5 - dist); // antialiased edge
        const toEdge = rr - dist;
        const ring = Math.exp(-Math.max(0, toEdge) / rim);
        // pigment settles unevenly: broad pools, and smaller ones in them
        const pooled = 0.65 * vnoise(px, py, r * 0.6 * S, nk) + 0.35 * vnoise(px, py, r * 0.22 * S, nk + 3);
        const grain = vnoise(px, py, 1.6 * S, nk + 7) - 0.5;
        const a = k * inside * (0.34 + 0.26 * pooled + 0.46 * ring + 0.06 * grain);
        const i = py * w + px;
        const was = paint[i];
        paint[i] = 1 - (1 - was) * (1 - a);
        pool[i] = Math.max(pool[i], clamp01(ring * 1.05 + pooled * 0.3 - 0.12));
      }
  };

  /* one pencil stroke, (x0, y0) to (x1, y1) in css px: bowed a little, lighter
     where it lands and lifts, its pressure wandering along it */
  const stroke = (x0, y0, x1, y1, r, alpha, bow = 0) => {
    const ax = x0 * S, ay = y0 * S, vx = (x1 - x0) * S, vy = (y1 - y0) * S;
    const L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L, R = r * S, B = bow * S;
    const wob = rand() * 6;
    const bx0 = Math.max(0, Math.floor(Math.min(ax, ax + vx) - Math.abs(B) - R - 2)), bx1 = Math.min(w - 1, Math.ceil(Math.max(ax, ax + vx) + Math.abs(B) + R + 2));
    const by0 = Math.max(0, Math.floor(Math.min(ay, ay + vy) - Math.abs(B) - R - 2)), by1 = Math.min(h - 1, Math.ceil(Math.max(ay, ay + vy) + Math.abs(B) + R + 2));
    for (let py = by0; py <= by1; py++)
      for (let px = bx0; px <= bx1; px++) {
        const t = ((px - ax) * vx + (py - ay) * vy) / (L * L);
        if (t < 0 || t > 1) continue;
        const bend = B * 4 * t * (1 - t);
        const d = Math.abs((px - ax) * nx + (py - ay) * ny - bend);
        const cov = clamp01(R + 0.5 - d);
        if (cov <= 0) continue;
        const ends = sstep(0, 0.12, t) * sstep(1, 0.8, t);
        const press = 0.7 + 0.3 * Math.sin(t * 5 + wob);
        const i = py * w + px;
        cover[i] = 1 - (1 - cover[i]) * (1 - cov * alpha * ends * press);
      }
  };

  // swatches: strokes laid across the swipe, close together, each a little
  // longer or shorter, leaning one way, heavier where the swipe began
  for (const [x, y, len, wid, deg, k] of swatch) {
    const ax = Math.cos(rad(deg)), ay = Math.sin(rad(deg));
    const lean = rad(deg + 90 - 24);
    const n = Math.round(len / 2.6);
    for (let j = 0; j < n; j++) {
      if (rand() < 0.08) continue;
      const t = j / (n - 1) - 0.5;
      const half = (wid / 2) * Math.pow(Math.max(0, 1 - 4 * t * t), 0.6) * (0.7 + rand() * 0.55);
      if (half < 3) continue;
      const cx = x + t * len * ax + (rand() - 0.5) * 5, cy = y + t * len * ay + (rand() - 0.5) * 5;
      const dx = Math.cos(lean + (rand() - 0.5) * 0.18) * half, dy = Math.sin(lean + (rand() - 0.5) * 0.18) * half;
      const alpha = k * (0.3 + rand() * 0.26) * (1.15 - 0.45 * (t + 0.5));
      stroke(cx - dx, cy - dy, cx + dx, cy + dy, 0.55 + rand() * 0.3, alpha, (rand() - 0.5) * 3);
    }
  }

  // zigzags: one line drawn back and forth, each pass a little off the last
  for (const [x, y, len, wid, deg, turns] of zigzag) {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    let prev = null;
    for (let k = 0; k <= turns * 2; k++) {
      const along = (k / (turns * 2) - 0.5) * len + (rand() - 0.5) * 4;
      const across = (k % 2 ? 1 : -1) * (wid / 2) * (0.7 + rand() * 0.45);
      const pt = [x + along * c - across * s, y + along * s + across * c];
      if (prev) stroke(prev[0], prev[1], pt[0], pt[1], 0.7, 0.42 + rand() * 0.2, (rand() - 0.5) * 2);
      prev = pt;
    }
  }

  // slips: one long, light line
  for (const [x, y, len, deg, bow] of slip) {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    stroke(x - (c * len) / 2, y - (s * len) / 2, x + (c * len) / 2, y + (s * len) / 2, 0.6, 0.32, bow);
  }

  // drops: the blot, and droplets flung on ahead of it the way it fell, smaller
  // the further they went, and a spray of specks further still; none touching
  for (const [x, y, r, deg, n, k] of drop) {
    const dir = rad(deg);
    blot(x, y, r, dir, 1.08, k);
    const placed = [[x, y, r * 1.1]];
    const fling = (count, near, far, small, big) => {
      for (let j = 0, tries = 0; j < count && tries < count * 20; tries++) {
        const d = r * (near + rand() * (far - near));
        const a = dir + (rand() - 0.5) * 1.0;
        const size = Math.max(1.3, r * (small + rand() * (big - small)) * (1.3 - (d / r - near) / (far - near) * 0.6));
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (placed.some(([qx, qy, qr]) => Math.hypot(px - qx, py - qy) < qr + size + 3)) continue;
        placed.push([px, py, size]);
        blot(px, py, size, a, 1 + rand() * 0.5, k * (0.85 + rand() * 0.25), 0.6);
        j++;
      }
    };
    fling(n, 1.3, 2.6, 0.05, 0.13);
    fling(Math.round(n * 1.5), 1.6, 3.6, 0.02, 0.045);
  }

  // the pencil over the paint; the paper's tooth: specks the graphite skipped
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    if (!cover[i] && !paint[i]) continue;
    const tooth = rand() < 0.3 ? 0.3 + rand() * 0.7 : 0;
    const pa = clamp01(cover[i] * (1 - tooth)), wa = paint[i], q = pool[i];
    const A = pa + wa * (1 - pa);
    for (let ch = 0; ch < 3; ch++) {
      const wc = WASH[ch] + (POOL[ch] - WASH[ch]) * q;
      out[i * 4 + ch] = Math.round((INK[ch] * pa + wc * wa * (1 - pa)) / (A || 1));
    }
    out[i * 4 + 3] = Math.round(255 * A);
  }
  return { w, h, out };
}

/* the drops, one to an image (320 × 240 css px), for the chapter gaps 01–04:
   [x, y, radius, angle it fell along (deg), droplets, strength] in the cell */
const DROPS = [
  [92, 96, 42, 22, 7, 0.95],
  [228, 92, 36, 196, 6, 0.9],
  [104, 82, 32, 38, 5, 0.9],
  [216, 104, 38, 158, 6, 0.95],
];
S = 2;
for (const [k, d] of DROPS.entries()) {
  const { w, h, out } = tile({ w: 320, h: 240, seed: 41 + k * 7, swatch: [], zigzag: [], slip: [], drop: [d] });
  const file = path.join(ROOT, `public/desk-drop-${k + 1}.webp`);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 86, alphaQuality: 95, effort: 6 }).toFile(file);
  console.log(`wrote ${path.relative(ROOT, file)}: ${Math.round(statSync(file).size / 1024)} KB`);
}
S = 1.25;

for (const [name, def] of Object.entries(TILES)) {
  const { w, h, out } = tile(def);
  const file = path.join(ROOT, `public/desk-strays-${name}.webp`);
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 82, alphaQuality: 92, effort: 6 }).toFile(file);
  console.log(`wrote ${path.relative(ROOT, file)}: ${def.w} × ${def.h} css px, ${Math.round(statSync(file).size / 1024)} KB`);
}

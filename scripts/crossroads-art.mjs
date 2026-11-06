#!/usr/bin/env node
/* Cuts the intro's character frames out of their sheet, so they can be drawn
   on the page's paper, and packs them into one image for the page.

   The sheet (design/crossroads/frames.png) is one picture on a white ground:
   walking away (7 frames), walking towards us (6), turning round (5),
   shrugging (4), the shears (5) and a grin (2, head and shoulders). Each frame
   is cut out of its cell, its ground flood-filled from the edges (so the pale
   shirt, enclosed by its outline, stays) and the pixels along the cut given a
   soft alpha with the white taken back out of their colour, so no halo shows
   on the cream paper. The shrug and shears frames were drawn cut off across
   the trouser legs: their legs are let down to the length the other frames
   give (the head to the waist is about 0.39 of the head to the soles in the
   turning frames; below the hips the trousers are stretched to match) and they
   get the shoes from a turning frame (from behind, or three quarters behind),
   at their own scale, slid in under the hem. Each frame's anchor is the point
   between its feet (the bottom of its soles, the middle of its hips), so it
   can be set down on the road; each sequence gets a scale that brings it to
   the walking frames' height (the sheet's rows weren't drawn quite to the
   same size).

     npm run intro:art

   Source: design/crossroads/frames.png (kept out of public/, not deployed).
   Output: public/intro/crossroads.webp, and app/components/crossroads/frames.json
   (where each frame is in it, its anchor, and each sequence's scale). */

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "design/crossroads/frames.png");
const OUT = path.join(ROOT, "public/intro/crossroads.webp");
const META = path.join(ROOT, "app/components/crossroads/frames.json");

// the cells: each sequence's band of rows and its frames' columns, in the sheet
const SETS = {
  walkAway: { y: [20, 304], x: [[45, 127], [150, 231], [253, 334], [355, 440], [454, 537], [552, 635], [652, 740]] },
  walkToward: { y: [20, 304], x: [[818, 903], [931, 1017], [1046, 1130], [1159, 1243], [1271, 1355], [1384, 1468]] },
  turn: { y: [346, 652], x: [[51, 140], [204, 281], [352, 413], [486, 562], [624, 715]] },
  shrug: { y: [346, 652], x: [[837, 941], [1010, 1107], [1146, 1331], [1361, 1483]], shoes: [0, 0, 0, 0] },
  shears: { y: [682, 1000], x: [[41, 198], [223, 375], [401, 544], [562, 706], [734, 859]], shoes: [0, 1, 1, 1, 1] },
  grin: { y: [682, 1022], x: [[942, 1165], [1226, 1496]], bust: true },
};
// the shoes to lend: a turning frame's, from just above its hem to its soles (sheet px)
const SHOES = [
  { set: "turn", i: 0, hem: 627 },
  { set: "turn", i: 1, hem: 629 },
];
const PAD = 4;

const sheet = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = sheet.info.width;

/** a cell cut out of the sheet, its ground keyed out: { w, h, data (rgba) } */
function cut([x0, x1], [y0, y1]) {
  const ox = Math.max(0, x0 - PAD), w = Math.min(SW, x1 + PAD) - ox, oy = y0, h = Math.min(sheet.info.height, y1) - y0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) data.set(sheet.data.subarray(((oy + y) * SW + ox) * 4, ((oy + y) * SW + ox + w) * 4), y * w * 4);
  key(data, w, h);
  return { w, h, data, ox, oy };
}

/** the ground: near-white, colourless, and reached from the edge; the cut along it softened */
function key(data, w, h) {
  const n = w * h, out = new Uint8Array(n), queue = new Int32Array(n);
  let head = 0, tail = 0;
  const pale = (i) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return Math.min(r, g, b) > 236 && Math.max(r, g, b) - Math.min(r, g, b) < 12;
  };
  const push = (i) => {
    if (!out[i] && pale(i)) {
      out[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++], x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  for (let i = 0; i < n; i++) {
    if (out[i]) {
      data[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const edge = (x > 0 && out[i - 1]) || (x < w - 1 && out[i + 1]) || (i >= w && out[i - w]) || (i < n - w && out[i + w]);
    if (!edge) continue;
    const m = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    const a = Math.min(1, Math.max(0.05, (255 - m) / 110));
    for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(Math.max(0, Math.min(255, (data[i * 4 + c] - 255 * (1 - a)) / a)));
    data[i * 4 + 3] = Math.round(a * 255);
  }
}

const opaque = (f, x, y) => f.data[(y * f.w + x) * 4 + 3] > 96;
/** the first and last opaque columns along a row */
function span(f, y) {
  let a = -1, b = -1;
  for (let x = 0; x < f.w; x++)
    if (opaque(f, x, y)) {
      if (a < 0) a = x;
      b = x;
    }
  return [a, b];
}
function rows(f) {
  let top = -1, bot = -1;
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++)
      if (opaque(f, x, y)) {
        if (top < 0) top = y;
        bot = y;
        break;
      }
  return [top, bot];
}

/** the waist: down the middle of the hips, where the pale shirt gives way to the dark trousers */
function waist(f) {
  const [top, bot] = rows(f);
  let sum = 0, cnt = 0;
  for (let y = Math.round(top + (bot - top) * 0.62); y < top + (bot - top) * 0.7; y++)
    for (let x = 0; x < f.w; x++)
      if (opaque(f, x, y)) {
        sum += x;
        cnt++;
      }
  const cx = Math.round(sum / cnt);
  const dark = (y) => {
    let v = 0;
    for (let d = -3; d <= 3; d++) {
      const i = (y * f.w + cx + d) * 4;
      v += Math.min(f.data[i], f.data[i + 1], f.data[i + 2]);
    }
    return v / 7 < 150;
  };
  for (let y = Math.round(top + (bot - top) * 0.3); y < bot - 4; y++) if (dark(y) && dark(y + 1) && dark(y + 2) && dark(y + 4)) return y;
  return -1;
}

/** let a frame's legs down: below the hips (from `from`), its rows stretched until its bottom reaches `to` */
function lengthen(f, from, to) {
  const [, bot] = rows(f);
  if (to <= bot) return f;
  const g = { w: f.w, h: f.h + (to - bot), data: null, ox: f.ox, oy: f.oy };
  g.data = new Uint8ClampedArray(g.w * g.h * 4);
  g.data.set(f.data.subarray(0, from * f.w * 4));
  for (let y = from; y <= to; y++) {
    const sy = from + ((y - from) * (bot - from)) / (to - from), y0 = Math.floor(sy), y1 = Math.min(bot, y0 + 1), u = sy - y0;
    for (let x = 0; x < f.w; x++)
      for (let c = 0; c < 4; c++) g.data[(y * g.w + x) * 4 + c] = Math.round(f.data[(y0 * f.w + x) * 4 + c] * (1 - u) + f.data[(y1 * f.w + x) * 4 + c] * u);
  }
  return g;
}

/** give a frame cut off at the hem the shoes of a turning frame, at k times their size, slid in under its legs */
function shoe(f, lend, k) {
  const ref = cut(SETS[lend.set].x[lend.i], SETS[lend.set].y);
  const [, refBot] = rows(ref);
  const hemY = lend.hem - ref.oy; // in the lender's own rows
  const [rl, rr] = span(ref, hemY - 2);
  const [, fBot] = rows(f);
  const [fl, fr] = span(f, fBot - 2);
  const shift = (fl + fr) / 2 - ((rl + rr) / 2) * k;
  const ph = Math.round((refBot - hemY + 4) * k);
  const g = { w: f.w, h: fBot + 1 + ph, data: null, ox: f.ox, oy: f.oy };
  g.data = new Uint8ClampedArray(g.w * g.h * 4);
  // the shoes first (scaled from the lender, from 4 rows above its hem), then the frame over them
  for (let y = 0; y < ph + Math.round(4 * k); y++)
    for (let x = 0; x < g.w; x++) {
      const sx = Math.round((x - shift) / k), sy = Math.round(hemY - 4 + y / k);
      if (sx < 0 || sx >= ref.w || sy < 0 || sy >= ref.h) continue;
      const dy = fBot - Math.round(4 * k) + y;
      if (dy < 0 || dy >= g.h) continue;
      g.data.set(ref.data.subarray((sy * ref.w + sx) * 4, (sy * ref.w + sx) * 4 + 4), (dy * g.w + x) * 4);
    }
  for (let y = 0; y < f.h && y < g.h; y++)
    for (let x = 0; x < f.w; x++) {
      const s = (y * f.w + x) * 4, d = (y * g.w + x) * 4, a = f.data[s + 3] / 255;
      if (!a) continue;
      for (let c = 0; c < 3; c++) g.data[d + c] = Math.round(f.data[s + c] * a + g.data[d + c] * (1 - a));
      g.data[d + 3] = Math.max(f.data[s + 3], g.data[d + 3]);
    }
  return g;
}

const median = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
/** the head to the waist, in each of a sequence's frames (the middle one of them: an arm across the waist can fool one) */
const headToWaist = (name) => median(SETS[name].x.map((cx) => {
  const f = cut(cx, SETS[name].y);
  return waist(f) - rows(f)[0];
}));
// the proportion: the head to the waist, against the head to the soles, standing (the turning frames)
const R = median(SETS.turn.x.map((cx) => {
  const f = cut(cx, SETS.turn.y), [top, bot] = rows(f);
  return (waist(f) - top) / (bot - top);
}));
const lenders = SHOES.map((l) => {
  const f = cut(SETS[l.set].x[l.i], SETS[l.set].y), [top, bot] = rows(f);
  return { hw: waist(f) - top, hem: l.hem - f.oy, sole: bot };
});

// every frame: cut out, its legs let down and shod where it was drawn without, trimmed, anchored
const frames = [];
for (const [name, set] of Object.entries(SETS)) {
  const hw = set.shoes ? headToWaist(name) : 0;
  set.x.forEach((cx, i) => {
    let f = cut(cx, set.y);
    if (set.shoes) {
      const lend = lenders[set.shoes[i]], k = hw / lend.hw;
      const [top, bot] = rows(f);
      const w = top + hw;
      // the soles where the proportion puts them, and the hem a shoe's height above
      const hem = Math.round(top + hw / R - (lend.sole - lend.hem) * k);
      f = lengthen(f, Math.round(w + (bot - w) * 0.3), hem);
      f = shoe(f, SHOES[set.shoes[i]], k);
    }
    const [top, bot] = rows(f);
    let ax = f.w / 2;
    if (!set.bust) {
      // the middle of the hips (from the top of the trousers down a little): steady while the arms and legs move
      let sum = 0, cnt = 0;
      for (let y = Math.round(top + (bot - top) * 0.45); y < top + (bot - top) * 0.55; y++)
        for (let x = 0; x < f.w; x++)
          if (opaque(f, x, y)) {
            sum += x;
            cnt++;
          }
      ax = sum / cnt;
    }
    frames.push({ name, i, f, top, bot, ax, ay: bot + 1 });
  });
}

// each sequence brought to the walking frames' height
const height = (name) => {
  const hs = frames.filter((r) => r.name === name).map((r) => r.ay - r.top).sort((a, b) => a - b);
  return hs[Math.floor(hs.length / 2)];
};
const H = height("walkAway");

// pack them, row by row, trimmed to what they hold (a pixel of room each side)
const ATLAS_W = 1600;
let x = 0, y = 0, rowH = 0;
const placed = frames.map((r) => {
  const [top, bot] = [r.top, r.bot];
  let l = r.f.w, rt = 0;
  for (let yy = top; yy <= bot; yy++) {
    const [a, b] = span(r.f, yy);
    if (a >= 0) {
      l = Math.min(l, a);
      rt = Math.max(rt, b);
    }
  }
  const w = rt - l + 3, h = bot - top + 3;
  if (x + w > ATLAS_W) {
    x = 0;
    y += rowH;
    rowH = 0;
  }
  const p = { ...r, sx: l - 1, sy: top - 1, w, h, x, y };
  x += w;
  rowH = Math.max(rowH, h);
  return p;
});
const AH = y + rowH;
const atlas = new Uint8ClampedArray(ATLAS_W * AH * 4);
for (const p of placed)
  for (let yy = 0; yy < p.h; yy++)
    for (let xx = 0; xx < p.w; xx++) {
      const sx = p.sx + xx, sy = p.sy + yy;
      if (sx < 0 || sx >= p.f.w || sy < 0 || sy >= p.f.h) continue;
      atlas.set(p.f.data.subarray((sy * p.f.w + sx) * 4, (sy * p.f.w + sx) * 4 + 4), ((p.y + yy) * ATLAS_W + p.x + xx) * 4);
    }

mkdirSync(path.dirname(OUT), { recursive: true });
await sharp(Buffer.from(atlas.buffer), { raw: { width: ATLAS_W, height: AH, channels: 4 } })
  .webp({ quality: 88, alphaQuality: 92, effort: 6 })
  .toFile(OUT);

// where each is: [x, y, w, h, anchor x, anchor y] in the atlas; and each sequence's scale to the walking height
const meta = { height: H, sets: {} };
for (const name of Object.keys(SETS)) {
  const own = placed.filter((p) => p.name === name);
  meta.sets[name] = {
    scale: SETS[name].bust ? 1 : +(H / height(name)).toFixed(4),
    frames: own.map((p) => [p.x, p.y, p.w, p.h, +(p.ax - p.sx).toFixed(1), p.ay - p.sy]),
  };
}
writeFileSync(META, JSON.stringify(meta) + "\n");
console.log(`  crossroads.webp  ${ATLAS_W}×${AH}  ${Math.round(statSync(OUT).size / 1024)} KB, ${placed.length} frames; walking height ${H} px`);
for (const [n, s] of Object.entries(meta.sets)) console.log(`    ${n}: ${s.frames.length} frames, scale ${s.scale}`);

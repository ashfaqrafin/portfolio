#!/usr/bin/env node
/* Prepares the art for the world view page (/worldview) from the drawings in
   design/experience_my_world_view/ (kept out of public/, not deployed).

   Backgrounds and layers: a painted layer drawn on flat green or magenta is
   keyed off it; an ink drawing on white paper is keyed off the paper (the
   paper is flood-filled in from the edges, so a white vest enclosed by its
   outline stays). Full-frame paintings are only re-encoded.

   Character sheets: the cell borders and base lines the generator drew are
   rubbed out, the figures keyed off the paper and found as separate shapes,
   ordered row by row, left to right. Two sheets drew their poles across the
   next frame, so their frames are cut out by hand-placed regions instead.
   Each frame gets an anchor (the bottom of the soles, under the middle of the
   torso) and each sequence a reference height (its tallest body, top of the
   head to the soles), so every character can be drawn to one scale. Frames
   are packed, a few sequences to an image, and described in
   app/components/worldview/art.json.

     npm run worldview:art                                                      */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { components, eraseRules, keyChroma, keyWhite } from "./worldview-key.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "design/experience_my_world_view");
const OUT = path.join(ROOT, "public/worldview");
const JSON_OUT = path.join(ROOT, "app/components/worldview/art.json");
mkdirSync(OUT, { recursive: true });
mkdirSync(path.dirname(JSON_OUT), { recursive: true });

const load = async (file) => {
  const { data, info } = await sharp(path.join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};
const encode = (img, opts = {}) =>
  sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } }).webp({ quality: 82, alphaQuality: 90, effort: 6, ...opts });

const layers = {};
const sizes = [];
async function layer(name, file, key, opts = {}) {
  const img = await load(file);
  if (key === "white") {
    eraseRules(img, opts.rules);
    keyWhite(img, opts);
  } else if (key) keyChroma(img, key);
  if (opts.after) await opts.after(img);
  const out = path.join(OUT, `${name}.webp`);
  let pipe = encode(img, { quality: key ? 84 : 80 });
  if (opts.trim) pipe = sharp(await pipe.toBuffer()).trim({ threshold: 1 });
  const info = await pipe.toFile(out);
  layers[name] = { src: `/worldview/${name}.webp`, w: info.width, h: info.height };
  sizes.push([name, statSync(out).size]);
}

// ── backgrounds and layers ──────────────────────────────────────────────────
await layer("sky-storm", "scene1/1.jpeg");
await layer("sky-storm-p", "scene1/2.jpeg");
await layer("skyline", "scene1/3.jpeg", "green");
await layer("street", "scene1/4.jpeg", "green");
await layer("wall", "scene1/5.jpeg", "green");
await layer("railing", "scene1/6.jpeg", "green", { after: liftCloth });
await layer("stairs", "scene1/7.jpeg", "green");
await layer("road-a", "scene3/1.jpeg");
await layer("road-b", "scene3/2.jpeg");
await layer("night", "scene4/1.jpeg");
await layer("night-p", "scene4/2.jpeg");
await layer("debris", "scene4/3.jpeg", "green");
await layer("sky-hero", "scene6/1.jpeg");
await layer("sky-hero-p", "scene6/2.jpeg");
await layer("clouds", "scene6/3.jpeg", "green");
await layer("leaves-a", "scene6/4.jpeg", "magenta");
await layer("leaves-b", "scene6/5.jpeg", "magenta");
await layer("dawn", "scene7/1.jpeg");
await layer("dawn-p", "scene7/2.jpeg");
await feast();
await layer("rock", "merchers/chat8/2.jpeg", "white", { hole: 99999999, trim: true });
await layer("shields", "merchers/chat8/4.jpeg", "white", { hole: 400, trim: true });
await layer("paper", "textures/1.png");

// the comrades: two versions of each group side by side, keyed off green and
// split down the middle, both halves trimmed to one box so they line up
/* (the seventh came back with a painted sky instead of green, and not quite
   the masked protester of the other drawings: it waits for a redraw) */
const comrades = [];
for (let k = 1; k <= 6; k++) {
  const img = await load(`comrades/${k}.jpeg`);
  keyChroma(img, "green");
  const half = Math.floor(img.width / 2);
  const halves = [0, half].map((x0) => crop(img, x0, 0, half, img.height));
  // a divider (or a frame) drawn around the halves: clear 8px along every edge
  for (const h of halves) clearEdges(h, 8);
  const box = unionBox(halves.map(opaqueBox));
  const names = [];
  for (const [i, h] of halves.entries()) {
    const c = crop(h, box.x0, box.y0, box.x1 - box.x0 + 1, box.y1 - box.y0 + 1);
    const name = `comrade-${k}${"ab"[i]}`;
    await encode(c, { quality: 84 }).toFile(path.join(OUT, `${name}.webp`));
    names.push(`/worldview/${name}.webp`);
    sizes.push([name, statSync(path.join(OUT, `${name}.webp`)).size]);
  }
  comrades.push({ a: names[0], b: names[1], w: box.x1 - box.x0 + 1, h: box.y1 - box.y0 + 1 });
}

// ── characters ──────────────────────────────────────────────────────────────
/* region cuts for the two sheets whose poles cross into the next frame: each
   frame is the union of its boxes [x0, y0, x1, y1) (in the sheet's pixels),
   taken in order, a pixel going to the first frame that claims it */
const RAISE_CUTS = [
  [[0, 0, 300, 9999], [300, 290, 378, 9999]],
  [[378, 0, 600, 9999], [600, 0, 632, 140], [600, 140, 622, 420]],
  [[600, 0, 905, 9999]],
  [[905, 0, 9999, 9999]],
];
const CLIMB_CUTS = [
  [[0, 0, 283, 9999], [283, 633, 305, 9999]],
  [[283, 0, 528, 548], [283, 548, 512, 9999]],
  [[528, 0, 785, 678], [512, 548, 762, 9999]],
  [[785, 0, 980, 9999], [762, 678, 785, 9999]],
  [[980, 0, 9999, 9999]],
];

const SHEETS = [
  // [atlas, sequence, file, frames, options]
  ["hero", "walk", "hero/Gemini_Generated_Image_jwldjtjwldjtjwld.jpeg", 8, { hole: 150, walk: true }],
  ["carry", "carry", "hero/image.png", 8, { hole: 40, pure: 228, walk: true, tip: "pole" }],
  ["hero", "pickup", "hero/Gemini_Generated_Image_nnbgo7nnbgo7nnbg.jpeg", 4, { hole: 150, refFrame: 3 }],
  ["hero", "tie", "hero/Gemini_Generated_Image_1qjxpk1qjxpk1qjx.jpeg", 3, { hole: 150, refFrame: 1 }],
  ["hero", "raise", "hero/Gemini_Generated_Image_f6zfulf6zfulf6zf.jpeg", 4, { hole: 150, cuts: RAISE_CUTS, refFrame: 0, tip: "upper-right" }],
  ["hero2", "climb", "hero/Gemini_Generated_Image_p0vpxgp0vpxgp0vp.jpeg", 5, { hole: 150, cuts: CLIMB_CUTS, refFrame: 4 }],
  ["hero2", "stand", "hero/Gemini_Generated_Image_52h5og52h5og52h5.jpeg", 3, { hole: 150, refFrame: 0, tip: "pole" }],
  ["march", "worker", "merchers/worker/3.jpeg", 8, { hole: 400, walk: true }],
  ["march", "student", "merchers/student/2.jpeg", 8, { hole: 400, tip: "upper-left", walk: true }],
  ["march", "farmer", "merchers/farmer/2.jpeg", 8, { hole: 400, tip: "top", walk: true }],
  ["march", "keffiyeh", "merchers/keffiyeh/2.jpeg", 8, { hole: 2600, walk: true }],
  ["march", "rickshaw", "merchers/rickshaw/2.jpeg", 8, { hole: 400, walk: true }],
  ["masked", "toward", "merchers/masked/2.jpeg", 8, { hole: 400 }],
  ["masked", "stop", "merchers/masked/3.jpeg", 8, { hole: 400 }],
  ["masked", "crowd", "merchers/chat8/3.jpeg", 12, { hole: 300, tip: "top" }],
  ["masked", "hands", "merchers/chat8/1.jpeg", 5, { hole: 300, rules: { minRun: 9999 }, tip: "bar" }],
];

const atlases = {};
const sequences = {};
for (const [atlas, seq, file, count, opts] of SHEETS) {
  const img = await load(file);
  eraseRules(img, opts.rules);
  keyWhite(img, opts);
  let frames;
  if (opts.cuts) {
    frames = opts.cuts.map((boxes, k) => {
      const owner = (x, y) => opts.cuts.findIndex((bs) => bs.some(([a, b, c, d]) => x >= a && x < c && y >= b && y < d));
      const f = { data: Buffer.from(img.data), width: img.width, height: img.height };
      for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (owner(x, y) !== k) f.data[(y * img.width + x) * 4 + 3] = 0;
      const b = opaqueBox(f);
      return crop(f, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
    });
  } else {
    const { list, label } = components(img);
    if (list.length !== count) throw new Error(`${file}: found ${list.length} figures, expected ${count}`);
    // rows by vertical centre, then left to right
    const rows = [];
    for (const c of [...list].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2)) {
      const cy = (c.y0 + c.y1) / 2;
      const row = rows.find((r) => Math.abs(r.cy - cy) < img.height / 5);
      if (row) row.items.push(c);
      else rows.push({ cy, items: [c] });
    }
    const ordered = rows.flatMap((r) => r.items.sort((a, b) => a.x0 - b.x0));
    frames = ordered.map((c) => {
      const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
      const f = crop(img, c.x0, c.y0, w, h);
      // only this figure's pixels (a neighbour's pole tip can reach into the box)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (label[(c.y0 + y) * img.width + c.x0 + x] !== c.id) f.data[(y * w + x) * 4 + 3] = 0;
      return f;
    });
  }
  const measured = frames.map(measure);
  // the end of a carried bamboo, where a red rag gets tied
  if (opts.tip) frames.forEach((f, k) => (measured[k].tip = tip(f, opts.tip)));
  /* the scale: a standing frame's body where a sequence has one (a raised
     arm over the head would otherwise count as height), else the tallest */
  let ref = opts.refFrame !== undefined ? measured[opts.refFrame].body : Math.max(...measured.map((m) => m.body));
  sequences[seq] = { atlas, ref, frames: [] };
  /* a walk: the frames are drawn to one scale (the heads are the same width
     in each), but the body dips by up to a tenth at each step, and a head
     that jumps between frames reads as a stutter. So each frame's height is
     kept (the page eases the head from one to the next, and cross-fades the
     frames), its anchor is put under the head (so the heads sit on one
     another), and the step's length is measured (the feet's widest spread,
     less a foot), so the ground can pass at the speed the feet say. */
  if (opts.walk) {
    const sorted = measured.map((m) => m.body).sort((a, b) => a - b);
    ref = Math.round((sorted[3] + sorted[4]) / 2);
    let spread = 0;
    frames.forEach((f, k) => {
      const m = measured[k];
      m.ax = headX(f, m);
      spread = Math.max(spread, feetSpread(f, m));
    });
    sequences[seq].ref = ref;
    sequences[seq].body = measured.map((m) => m.body);
    sequences[seq].stride = +((2 * (spread - 0.15 * ref)) / ref).toFixed(3);
  }
  (atlases[atlas] ??= []).push(...frames.map((f, k) => ({ seq, k, img: f, m: measured[k] })));
}

// shelf-pack each atlas (2px apart), at most 4000 wide
for (const [name, items] of Object.entries(atlases)) {
  const MAXW = 4000, PAD = 2;
  const sorted = [...items].sort((a, b) => b.img.height - a.img.height);
  let x = 0, y = 0, shelf = 0, W = 0;
  for (const it of sorted) {
    if (x + it.img.width > MAXW) { x = 0; y += shelf + PAD; shelf = 0; }
    it.x = x; it.y = y;
    x += it.img.width + PAD;
    shelf = Math.max(shelf, it.img.height);
    W = Math.max(W, x);
  }
  const H = y + shelf;
  const canvas = Buffer.alloc(W * H * 4);
  for (const it of sorted) {
    const { data, width, height } = it.img;
    for (let r = 0; r < height; r++) data.copy(canvas, ((it.y + r) * W + it.x) * 4, r * width * 4, (r + 1) * width * 4);
  }
  const file = path.join(OUT, `${name}.webp`);
  await encode({ data: canvas, width: W, height: H }, { quality: 86 }).toFile(file);
  sizes.push([name, statSync(file).size]);
  layers[name] = { src: `/worldview/${name}.webp`, w: W, h: H };
  for (const it of items) {
    sequences[it.seq].frames[it.k] = [it.x, it.y, it.img.width, it.img.height, it.m.ax, it.m.ay, ...(it.m.tip ?? [])];
  }
}

writeFileSync(JSON_OUT, JSON.stringify({ layers, comrades, sequences }) + "\n");
let total = 0;
for (const [n, s] of sizes) { total += s; console.log(`${n.padEnd(14)} ${(s / 1024).toFixed(0).padStart(5)} KB`); }
console.log(`total          ${(total / 1024).toFixed(0).padStart(5)} KB`);

// ── music ───────────────────────────────────────────────────────────────────
/* the two marches, re-encoded small (AAC, 96 kb/s) with a short fade at each
   end so a loop doesn't click; fetched only once a visitor turns sound on */
const AUDIO = [
  ["march", "music/Warszawianka 1831.mp3"],
  ["anthem", "music/The Internationale.mp3"],
];
mkdirSync(path.join(OUT, "audio"), { recursive: true });
for (const [name, file] of AUDIO) {
  const out = path.join(OUT, "audio", `${name}.m4a`);
  try {
    const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(SRC, file)], { encoding: "utf8" }));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(SRC, file), "-af", `afade=t=in:d=0.4,afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2`, "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out]);
    console.log(`${name.padEnd(14)} ${(statSync(out).size / 1024).toFixed(0).padStart(5)} KB (audio)`);
  } catch {
    console.warn(`(skipped ${name}: ffmpeg not found)`);
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────
/* The feast: the people at the long table, cut out of their sheet (a white
   box in a cream margin, with construction lines above the heads) so they
   can sit in the dawn landscape; and the flag laid along the table as a
   cloth, as a layer of its own to go over them: red wherever the bare wood
   of the tabletop (and its front edge) shows, so the dishes, the bread and
   the elbows stay on top of it. Wood is told by its colour (pale, a little
   warm: the bread is yellower, the clay pinker, the rice whiter), inside
   the table's outline, in patches the ink lines close off. */
async function feast() {
  const img = await load("scene7/4.jpeg");
  const { data, width: w, height: h } = img;
  const src = Buffer.from(data);
  const BOX = [80, 152, 1300, 714];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (x < BOX[0] || x >= BOX[2] || y < BOX[1] || y >= BOX[3]) { const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = 255; }
  keyWhite(img, { tol: 232, chroma: 26, hole: 1400 });
  // loose specks and what's left of the pencil lines
  const { list, label } = components(img, { grow: 3, min: 1 });
  const big = new Set(list.filter((c) => c.n >= 2500).map((c) => c.id));
  for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] && !big.has(label[p])) data[p * 4 + 3] = 0;

  // the tabletop, with its front edge: near edge A→B (the corner nearest us)→C, far edge D→E
  const A = [146, 446], B = [650, 552], C = [1100, 347], D = [1100, 254], E = [1000, 258], F = [140, 404];
  const DROP = 27;
  const poly = [F, E, D, C, [B[0], B[1] + DROP], [A[0], A[1] + DROP]];
  const inside = (x, y) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const nearY = (x) => (x <= B[0] ? A[1] + ((B[1] - A[1]) * (x - A[0])) / (B[0] - A[0]) : B[1] + ((C[1] - B[1]) * (x - B[0])) / (C[0] - B[0]));
  const lumaAt = (p) => src[p * 4] * 0.3 + src[p * 4 + 1] * 0.59 + src[p * 4 + 2] * 0.11;
  const wood = new Uint8Array(w * h);
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) {
    if (!inside(x, y)) continue;
    const i = (y * w + x) * 4;
    const r = src[i], g = src[i + 1], b = src[i + 2];
    const luma = r * 0.3 + g * 0.59 + b * 0.11;
    if (luma > 148 && luma < 238 && r - b >= 16 && r - b <= 66 && r >= g - 4 && r - g <= 30) wood[y * w + x] = 1;
  }
  // (not within a pixel of an ink line: a broken outline shouldn't let a plate's glaze join the planks)
  const ink = new Uint8Array(w * h);
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) if (lumaAt(y * w + x) < 112) ink[y * w + x] = 1;
  for (let y = BOX[1] + 1; y < BOX[3] - 1; y++) for (let x = BOX[0] + 1; x < BOX[2] - 1; x++) {
    const p = y * w + x;
    if (wood[p] && (ink[p - 1] || ink[p + 1] || ink[p - w] || ink[p + w] || ink[p - w - 1] || ink[p - w + 1] || ink[p + w - 1] || ink[p + w + 1])) wood[p] = 2;
  }
  for (let p = 0; p < w * h; p++) if (wood[p] === 2) wood[p] = 0;
  /* patches of it, as the ink lines close them off: the planks are big; a
     sliver between two dishes is small; what's in between is a plate's own
     pale glaze, and stays bare (unless it's the table's front edge) */
  const seen = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (!wood[p] || seen[p]) continue;
    const region = [p];
    seen[p] = 1;
    let sy = 0, sx = 0;
    for (let k = 0; k < region.length; k++) {
      const q = region[k], x = q % w;
      sx += x; sy += (q - x) / w;
      for (const n of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, q - w, q + w]) if (n >= 0 && n < w * h && wood[n] && !seen[n]) { seen[n] = 1; region.push(n); }
    }
    const n = region.length, cx = sx / n, cy = sy / n;
    const keep = n >= 2600 || (n >= 40 && n <= 420 && cy < nearY(cx)) || (cy > nearY(cx) + 2 && cx < 980 && n >= 300);
    if (!keep) for (const q of region) wood[q] = 0;
  }
  // close over the plank lines and the wash's grain (grow 3, shrink 3)
  const morph = (m, r, grow) => {
    const out = new Uint8Array(w * h);
    for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) {
      let v = grow ? 0 : 1;
      for (let d = -r; d <= r && v === (grow ? 0 : 1); d++) for (let e = -r; e <= r; e++) {
        if (d * d + e * e > r * r + 1) continue;
        const on = m[(y + d) * w + x + e];
        if (grow ? on : !on) { v = grow ? 1 : 0; break; }
      }
      out[y * w + x] = v;
    }
    return out;
  };
  /* and the palest wood (the wash thins to bare paper in places): whatever
     pale, inkless stretch of the top touches the planks, short of any outline */
  {
    const pale = (q) => { const i = q * 4; const l = lumaAt(q); return l >= 198 && src[i] - src[i + 1] <= 30 && src[i] - src[i + 2] <= 70 && !ink[q] && !ink[q - 1] && !ink[q + 1] && !ink[q - w] && !ink[q + w] && !ink[q - 2] && !ink[q + 2] && !ink[q - 2 * w] && !ink[q + 2 * w]; };
    const stack = [];
    for (let q = 0; q < w * h; q++) if (wood[q]) stack.push(q);
    while (stack.length) {
      const q = stack.pop(), x = q % w;
      for (const n of [q - 1, q + 1, q - w, q + w]) {
        const nx = n % w, ny = (n - nx) / w;
        if (wood[n] || Math.abs(nx - x) > 1 || !inside(nx, ny) || ny > nearY(nx) - 3 || !pale(n)) continue;
        wood[n] = 1;
        stack.push(n);
      }
    }
  }
  const mask = morph(morph(wood, 4, true), 4, false);
  // bare highlights the cloth closes round (pale, no ink in them): cloth too
  const hole = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const x = p % w, y = (p - x) / w;
    if (mask[p] || hole[p] || !inside(x, y)) continue;
    const region = [p];
    hole[p] = 1;
    let open = false, dark = 0, light = 0;
    for (let k = 0; k < region.length && region.length < 900; k++) {
      const q = region[k], qx = q % w;
      const l = lumaAt(q);
      if (l < 125) dark++;
      if (l > 205) light++;
      for (const n of [q - 1, q + 1, q - w, q + w]) {
        const nx = n % w, ny = (n - nx) / w;
        if (!inside(nx, ny) || Math.abs(nx - qx) > 1) { open = true; continue; }
        if (!mask[n] && !hole[n]) { hole[n] = 1; region.push(n); }
      }
    }
    if (!open && region.length < 900 && dark / region.length < 0.04 && light / region.length > 0.7) for (const q of region) mask[q] = 1;
  }
  // the cloth: red, shaded by the wood's own light and shade (blurred, so planks read as soft folds)
  const lum = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) lum[p] = lumaAt(p) / 208;
  const cloth = Buffer.alloc(w * h * 4);
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) {
    const p = y * w + x;
    if (!mask[p]) continue;
    let s = 0, n = 0, edge = 0;
    for (let d = -3; d <= 3; d++) for (let e = -3; e <= 3; e++) { const q = p + d * w + e; s += Math.min(1.1, lum[q]); n++; if (!mask[q]) edge++; }
    let k = Math.max(0.66, Math.min(1.1, Math.pow(s / n, 1.4)));
    // where it hangs over the table's edge it's in the table's own shade
    if (y > nearY(x) + 3) k *= 0.82;
    cloth[p * 4] = Math.min(255, 194 * k);
    cloth[p * 4 + 1] = Math.min(255, 20 * k);
    cloth[p * 4 + 2] = Math.min(255, 42 * k);
    cloth[p * 4 + 3] = Math.round(255 * Math.min(1, 1.2 - edge / 22));
  }
  // both layers in one frame: the cut-out's box
  const b = opaqueBox(img);
  const cw = b.x1 - b.x0 + 1, ch = b.y1 - b.y0 + 1;
  for (const [name, layerImg] of [["feast", img], ["feast-cloth", { data: cloth, width: w, height: h }]]) {
    const out = path.join(OUT, `${name}.webp`);
    await encode(crop(layerImg, b.x0, b.y0, cw, ch), { quality: 86 }).toFile(out);
    layers[name] = { src: `/worldview/${name}.webp`, w: cw, h: ch };
    sizes.push([name, statSync(out).size]);
  }
  // where the table runs in that frame (its near corner, and its two ends), for laying the cloth along it
  layers.feast.table = { a: [A[0] - b.x0, A[1] - b.y0], b: [B[0] - b.x0, B[1] - b.y0], c: [C[0] - b.x0, C[1] - b.y0] };
}

/* The red rag on the railing comes off in the story: it is lifted into a
   layer of its own (railing-cloth.webp, the same size, to be laid over), and
   where it was wrapped round the bent spike the spike is cloned back in from
   just above it, along the spike's line. */
async function liftCloth(img) {
  const { data, width: w, height: h } = img;
  const BOX = [468, 352, 704, 570];
  const SPIKE = [[531, 330], [530, 345], [512, 380], [499, 430], [494, 497], [505, 583]];
  const HALF = 15;
  const cx = (y) => {
    for (let k = 1; k < SPIKE.length; k++) {
      const [x0, y0] = SPIKE[k - 1], [x1, y1] = SPIKE[k];
      if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    }
    return SPIKE.at(-1)[0];
  };
  const red = new Uint8Array(w * h);
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // (the rusty top rail, up and to the right, is not the rag)
    if (x > 590 && y < 405) continue;
    if (data[i + 3] > 30 && r > 85 && r > 1.45 * g && r > 1.3 * b) red[y * w + x] = 1;
  }
  const near = (p, r) => {
    const x = p % w, y = (p - x) / w;
    for (let d = -r; d <= r; d++) for (let e = -r; e <= r; e++) if (red[(y + d) * w + x + e]) return true;
    return false;
  };
  const keep = (x, y) => Math.abs(x - cx(y)) <= HALF || (x > 590 && y < 405) || x > 690;
  // the rag: red, and the ink and halftone within 4px of red (off the spike)
  const cloth = Buffer.alloc(w * h * 4);
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) {
    const p = y * w + x;
    if (!red[p] && (keep(x, y) || !near(p, 4))) continue;
    data.copy(cloth, p * 4, p * 4, p * 4 + 4);
    data[p * 4 + 3] = 0;
  }
  // loose ink left round where it hung (its folds' shadow, outline specks)
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = BOX[0]; x < BOX[2]; x++) {
    const p = y * w + x;
    if (data[p * 4 + 3] && !keep(x, y) && near(p, 12)) data[p * 4 + 3] = 0;
  }
  // the spike under it, cloned from the 14 rows above the rag
  for (let y = BOX[1]; y < BOX[3]; y++) for (let x = Math.round(cx(y) - HALF); x <= cx(y) + HALF; x++) {
    const p = y * w + x;
    if (!red[p] && data[p * 4 + 3] > 0) continue;
    const ys = 338 + ((y - 338) % 14);
    const xs = Math.round(cx(ys) + (x - cx(y)));
    const q = (ys * w + xs) * 4;
    data.copy(data, p * 4, q, q + 4);
  }
  const out = path.join(OUT, "railing-cloth.webp");
  await encode({ data: cloth, width: w, height: h }, { quality: 86 }).toFile(out);
  layers["railing-cloth"] = { src: "/worldview/railing-cloth.webp", w, h };
  sizes.push(["railing-cloth", statSync(out).size]);
}
function crop(img, x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let r = 0; r < h; r++) img.data.copy(out, r * w * 4, ((y0 + r) * img.width + x0) * 4, ((y0 + r) * img.width + x0 + w) * 4);
  return { data: out, width: w, height: h };
}
function clearEdges(img, m) {
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++)
    if (x < m || y < m || x >= img.width - m || y >= img.height - m) img.data[(y * img.width + x) * 4 + 3] = 0;
}
function opaqueBox(img) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++)
    if (img.data[(y * img.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}
function unionBox(bs) {
  return { x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) };
}
/* the end of a carried pole: the topmost point ("top"), the upper-left end
   of one over the shoulder, the upper-right end of one held up; for a pole
   planted beside him ("pole"), the middle of the pole at the top of the
   frame and a quarter of the way down, which give its line */
// the middle of the head: the opaque pixels of the top eighth of the body, near the anchor
function headX(img, m) {
  const { data, width: w } = img;
  const top = m.ay - m.body;
  let sx = 0, n = 0;
  for (let y = top; y < top + m.body * 0.125; y++)
    for (let x = Math.max(0, Math.round(m.ax - m.body * 0.17)); x < Math.min(w, m.ax + m.body * 0.17); x++)
      if (data[(y * w + x) * 4 + 3] > 100) { sx += x; n++; }
  return n ? Math.round(sx / n) : m.ax;
}
// how far apart the feet are: the opaque extent of the lowest twentieth of the body
function feetSpread(img, m) {
  const { data, width: w } = img;
  let x0 = w, x1 = 0;
  for (let y = Math.round(m.ay - m.body * 0.05); y < m.ay; y++)
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return Math.max(0, x1 - x0);
}
function tip(img, where) {
  const { data, width: w, height: h } = img;
  const op = (x, y) => data[(y * w + x) * 4 + 3] >= 120;
  // a bar held in a fist: the middle of the bar where it shows above the hand
  if (where === "bar") {
    const y = 16;
    let x0 = 0;
    while (x0 < w && !op(x0, y)) x0++;
    // (its highlight can show as a gap: take the row's first and last ink)
    let x1 = w - 1;
    while (x1 > x0 && !op(x1, y)) x1--;
    return [Math.round((x0 + x1) / 2), y, x1 - x0 + 1];
  }
  if (where === "pole") {
    const runMid = (y) => {
      let x1 = w - 1;
      while (x1 > 0 && !op(x1, y)) x1--;
      let x0 = x1;
      while (x0 > 0 && op(x0 - 1, y)) x0--;
      return Math.round((x0 + x1) / 2);
    };
    const y2 = Math.round(h * 0.25);
    return [runMid(2), 2, runMid(y2), y2];
  }
  let best = null, score = Infinity;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] < 120) continue;
    const s = where === "top" ? y : where === "upper-right" ? y - 2 * x : x + y;
    if (s < score) { score = s; best = [x, y]; }
  }
  return best;
}
/* the anchor (the soles' bottom, under the torso's middle: the median of the
   opaque pixels between a quarter and a half of the way down, which a thin
   pole hardly moves) and the body's height (from the top of the head, found
   near the anchor, to the soles) */
function measure(img) {
  const { data, width: w, height: h } = img;
  const op = (x, y) => data[(y * w + x) * 4 + 3] > 100;
  let bottom = 0;
  for (let y = h - 1; y >= 0 && !bottom; y--) for (let x = 0; x < w; x++) if (op(x, y)) { bottom = y; break; }
  const xs = [];
  for (let y = Math.floor(h * 0.25); y < h * 0.5; y++) for (let x = 0; x < w; x++) if (op(x, y)) xs.push(x);
  xs.sort((a, b) => a - b);
  const ax = xs.length ? xs[xs.length >> 1] : w / 2;
  const band = Math.max(8, Math.round(w * 0.07));
  let top = bottom;
  for (let y = 0; y < h; y++) {
    let hit = false;
    for (let x = Math.max(0, Math.round(ax - band)); x < Math.min(w, ax + band); x++) if (op(x, y)) { hit = true; break; }
    if (hit) { top = y; break; }
  }
  return { ax: Math.round(ax), ay: bottom + 1, body: bottom + 1 - top };
}

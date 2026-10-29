#!/usr/bin/env node
/* Cuts the intro's character out of his green-screen sheets into the pieces of
   a cut-out puppet, cleans their edges, and packs them into one image for the
   page, with each piece's joints (where it turns, and where the next piece
   hangs from it). He is drawn in profile, facing right.

   The sheets (design/intro/, not deployed):
     actor-standing.png    him standing: the reference for how he's built
     actor-parts.png       his body in pieces, at the body's scale
     actor-heads-hands.png three heads and eight hands, larger: scaled down here

   Each piece is keyed off the green (the colour of its edge pixels unmixed
   from it, so no green fringe is left) and taken by its own shape, so no bit
   of a neighbour comes along. The torso had the near arm's sleeve drawn into
   it: that is painted out with plain shirt, since the arm is a piece of its
   own. Each thigh and shin are joined into one trouser leg, which the page
   bends at the knee. The hands' wrist stubs fade out at the top, into the
   forearm they overlap. The far-side pieces are shaded a little darker.

   Re-run after changing a sheet or a cut:

     npm run intro:actor

   Output: public/intro/actor.webp, app/components/intro/actor-parts.ts */

import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SHEETS = { parts: "design/intro/actor-parts.png", heads: "design/intro/actor-heads-hands.png" };
const OUT_IMG = path.join(ROOT, "public/intro/actor.webp");
const OUT_TS = path.join(ROOT, "app/components/intro/actor-parts.ts");

const HEAD_SCALE = 0.68; // the heads sheet is drawn larger than the body
const HAND_SCALE = 0.57; // and so are the hands: their wrists to the forearms'
const FAR = 0.8; // the far side, in shade

/* The pieces: the sheet, the box on it, and the joints (sheet px). */
const HEAD = (box, neck) => ({ sheet: "heads", box, scale: HEAD_SCALE, joints: { neck } });
const HAND = (box, wrist, grip, far = false) => ({ sheet: "heads", box, scale: HAND_SCALE, far, fade: 0.32, joints: { wrist, grip } });
const PIECES = {
  headCalm: HEAD([26, 147, 284, 332], [150, 440]),
  headStrain: HEAD([370, 152, 279, 327], [494, 440]),
  headPleased: HEAD([697, 147, 280, 332], [821, 440]),
  torso: {
    sheet: "parts",
    box: [383, 263, 228, 431],
    // the near sleeve, drawn into the torso: painted out
    paintOut: [[392, 336], [404, 318], [424, 306], [446, 314], [462, 338], [474, 384], [480, 440], [481, 500], [480, 562], [380, 562], [380, 400]],
    // the sleeve hung out behind the shirt: its true back runs from the shoulder down to where it shows below the cuff
    backLine: [[398, 326], [403, 380], [409, 450], [414, 520], [417, 562]],
    joints: { neck: [488, 272], shoulder: [428, 358], waist: [500, 640] },
  },
  // (its rounded seat fades out at the bottom, into the trouser legs under it)
  hips: { sheet: "parts", box: [418, 708, 173, 177], fadeBottom: 16, joints: { waist: [505, 728], hip: [500, 832] } },
  // (each turns about the centre of its rounded top, so the top stays put as it swings)
  upperNear: { sheet: "parts", box: [192, 312, 115, 238], joints: { shoulder: [252, 368], elbow: [250, 524] } },
  upperFar: { sheet: "parts", box: [706, 312, 114, 238], far: true, joints: { shoulder: [765, 368], elbow: [763, 524] } },
  foreNear: { sheet: "parts", box: [206, 580, 74, 199], joints: { elbow: [243, 608], wrist: [261, 758] } },
  foreFar: { sheet: "parts", box: [738, 581, 69, 199], far: true, joints: { elbow: [772, 609], wrist: [772, 759] } },
  shoeNear: { sheet: "parts", box: [289, 1398, 181, 90], joints: { ankle: [340, 1420], toe: [466, 1466], heel: [294, 1462], sole: [380, 1486] } },
  shoeFar: { sheet: "parts", box: [597, 1398, 181, 91], far: true, joints: { ankle: [648, 1420], toe: [774, 1466], heel: [602, 1462], sole: [688, 1486] } },
  handRelaxed: HAND([75, 566, 120, 322], [117, 610], [118, 840]),
  handReach: HAND([295, 567, 228, 314], [342, 612], [395, 800]),
  handPinch: HAND([612, 579, 108, 275], [655, 624], [648, 836]),
  handFist: HAND([840, 570, 123, 277], [887, 614], [895, 790]),
  handRelaxedFar: HAND([76, 959, 120, 333], [118, 1003], [119, 1240], true),
  handReachFar: HAND([294, 956, 230, 329], [341, 1001], [394, 1200], true),
  handPinchFar: HAND([610, 974, 110, 282], [653, 1019], [646, 1236], true),
  handFistFar: HAND([839, 967, 124, 283], [886, 1011], [894, 1192], true),
};
/* The legs: a thigh and a shin joined into one trouser leg (the thigh over the
   shin at the knee), with the rows of its hip, knee and ankle. */
const LEGS = {
  legNear: { thigh: [299, 858, 122, 230], shin: [301, 1099, 113, 287], far: false },
  legFar: { thigh: [592, 856, 124, 231], shin: [598, 1098, 113, 287], far: true },
};
const KNEE_OVERLAP = 70;

// ── keying ──
const BG = [2, 249, 3];
const sheets = {};
for (const [k, f] of Object.entries(SHEETS)) {
  const { data, info } = await sharp(path.join(ROOT, f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const rgba = Buffer.alloc(n * 4);
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const d = g - Math.max(r, b);
    const a = Math.min(1, Math.max(0, (200 - d) / 160));
    solid[i] = d < 140 ? 1 : 0;
    let c = [r, g, b];
    if (a > 0 && a < 1) {
      c = c.map((v, j) => Math.min(255, Math.max(0, (v - (1 - a) * BG[j]) / a)));
      c[1] = Math.min(c[1], Math.max(c[0], c[2]));
    }
    rgba[i * 4] = c[0];
    rgba[i * 4 + 1] = c[1];
    rgba[i * 4 + 2] = c[2];
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  // the shapes on the sheet, so a piece can be taken by its own
  const label = new Int32Array(n).fill(-1);
  let next = 0;
  for (let s = 0; s < n; s++) {
    if (!solid[s] || label[s] >= 0) continue;
    const st = [s];
    label[s] = next;
    while (st.length) {
      const p = st.pop(), x = p % W;
      for (const q of [p - 1, p + 1, p - W, p + W])
        if (q >= 0 && q < n && solid[q] && label[q] < 0 && Math.abs((q % W) - x) <= 1) {
          label[q] = next;
          st.push(q);
        }
    }
    next++;
  }
  sheets[k] = { W, H, rgba, label };
}

// a piece, out of its sheet at its own scale: RGBA, only its own shape (and the soft edge round it)
function take(sheetName, [bx, by, bw, bh]) {
  const { W, rgba, label } = sheets[sheetName];
  const count = new Map();
  for (let y = by; y < by + bh; y++)
    for (let x = bx; x < bx + bw; x++) {
      const l = label[y * W + x];
      if (l >= 0) count.set(l, (count.get(l) ?? 0) + 1);
    }
  const own = [...count].sort((a, b) => b[1] - a[1])[0][0];
  const pad = 3, w = bw + 2 * pad, h = bh + 2 * pad;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = bx - pad + x, sy = by - pad + y;
      if (sx < 0 || sy < 0 || sx >= W || sy >= sheets[sheetName].H) continue;
      // within 2 px of its own shape
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2 && !near; dx++) {
          const qx = sx + dx, qy = sy + dy;
          if (qx >= 0 && qy >= 0 && qx < W && label[qy * W + qx] === own) near = true;
        }
      if (!near) continue;
      rgba.copy(out, (y * w + x) * 4, (sy * W + sx) * 4, (sy * W + sx) * 4 + 4);
    }
  return { w, h, buf: out, ox: bx - pad, oy: by - pad };
}

// paint a region out with the cloth round it: smooth colour filled in from its edges, with a fine grain over it
function paintOut(p, poly, backLine) {
  const { w, h, buf, ox, oy } = p;
  const inside = (x, y) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const A = (x, y) => buf[(y * w + x) * 4 + 3];
  // the outline round the shape stays: pixels within 4 px of its edge
  const edge = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (A(Math.min(w - 1, Math.max(0, x + dx)), Math.min(h - 1, Math.max(0, y + dy))) < 128) return true;
    return false;
  };
  // the back line, as an x for each sheet row it spans
  const back = (sy) => {
    if (!backLine || sy < backLine[0][1] || sy > backLine[backLine.length - 1][1]) return null;
    for (let i = 1; i < backLine.length; i++)
      if (sy <= backLine[i][1]) {
        const [x0, y0] = backLine[i - 1], [x1, y1] = backLine[i];
        return x0 + ((x1 - x0) * (sy - y0)) / (y1 - y0);
      }
    return null;
  };
  const fill = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const bx = back(y + oy);
      if (A(x, y) > 200 && inside(x + ox, y + oy) && (bx !== null ? x + ox > bx + 2 && !edge(x - 8, y) : !edge(x, y))) fill[y * w + x] = 1;
    }
  const lum = (i) => 0.3 * buf[i] + 0.59 * buf[i + 1] + 0.11 * buf[i + 2];
  // a fine grain, like the weave elsewhere (fixed, so every run cuts the same)
  const grain = (x, y) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (v - Math.floor(v) - 0.5) * 9;
  };
  /* each column filled from the shirt just above the region to the shirt just
     below it, so it keeps the shirt's own shading from back to front; then
     softened across a little */
  const col = new Float32Array(w * h * 3);
  const cloth = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !fill[y * w + x] && A(x, y) > 200 && lum((y * w + x) * 4) > 25;
  const avg = (x, from, to) => {
    const sum = [0, 0, 0];
    let k = 0;
    for (let y = Math.max(0, Math.min(from, to)); y <= Math.min(h - 1, Math.max(from, to)); y++)
      if (cloth(x, y)) {
        for (let c = 0; c < 3; c++) sum[c] += buf[(y * w + x) * 4 + c];
        k++;
      }
    return k ? sum.map((v) => v / k) : null;
  };
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) {
      if (!fill[y * w + x]) continue;
      let y1 = y;
      while (y1 + 1 < h && fill[(y1 + 1) * w + x]) y1++;
      const top = avg(x, y - 8, y - 2), bot = avg(x, y1 + 2, y1 + 14);
      for (let yy = y; yy <= y1; yy++) {
        const f = (yy - y) / Math.max(1, y1 - y);
        for (let c = 0; c < 3; c++) col[(yy * w + x) * 3 + c] = top && bot ? top[c] + (bot[c] - top[c]) * f : (top ?? bot ?? [90, 20, 30])[c];
      }
      y = y1;
    }
  for (let pass = 0; pass < 2; pass++)
    for (let y = 0; y < h; y++) {
      const row = col.slice(y * w * 3, (y + 1) * w * 3);
      for (let x = 0; x < w; x++) {
        if (!fill[y * w + x]) continue;
        const sum = [0, 0, 0];
        let k = 0;
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || !fill[y * w + xx]) continue;
          for (let c = 0; c < 3; c++) sum[c] += row[xx * 3 + c];
          k++;
        }
        for (let c = 0; c < 3; c++) col[(y * w + x) * 3 + c] = sum[c] / k;
      }
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!fill[i]) continue;
      const d = grain(x, y);
      for (let c = 0; c < 3; c++) buf[i * 4 + c] = Math.min(255, Math.max(0, col[i * 3 + c] + d * (c === 0 ? 1 : 0.45)));
    }
  // behind the back line: gone; along it, a fresh outline, its outer pixel soft
  if (backLine)
    for (let y = 0; y < h; y++) {
      const bx = back(y + oy);
      if (bx === null) continue;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, dx = x + ox - bx;
        if (dx < -0.5) buf[i + 3] = 0;
        else if (dx < 2.2) {
          buf[i] = 38;
          buf[i + 1] = 9;
          buf[i + 2] = 15;
          buf[i + 3] = Math.min(buf[i + 3], Math.round(255 * Math.min(1, dx + 0.5)));
        }
      }
    }
}

function shade(p, f) {
  for (let i = 0; i < p.w * p.h; i++) for (let c = 0; c < 3; c++) p.buf[i * 4 + c] = Math.round(p.buf[i * 4 + c] * f);
}

// a piece's bottom edge fades out over r px, each column from where it ends (so its sides keep their outline)
function fadeBottom(p, r) {
  const a = (x, y) => (y >= p.h ? 0 : p.buf[(y * p.w + x) * 4 + 3]);
  for (let x = 0; x < p.w; x++)
    for (let y = 0; y < p.h; y++) {
      if (a(x, y) < 128) continue;
      let d = 0;
      while (d < r && a(x, y + d + 1) >= 128) d++;
      if (d < r) {
        const f = d / r;
        p.buf[(y * p.w + x) * 4 + 3] = Math.round(p.buf[(y * p.w + x) * 4 + 3] * f * f * (3 - 2 * f));
      }
    }
}

// the top of a hand's wrist stub fades out, from its top edge down a fraction of the way to the wrist joint
function fadeTop(p, wristY, frac) {
  let top = p.h;
  for (let y = 0; y < p.h && top === p.h; y++) for (let x = 0; x < p.w; x++) if (p.buf[(y * p.w + x) * 4 + 3] > 128) { top = y; break; }
  const to = top + (wristY - top) * frac * 2.4;
  for (let y = top; y < to; y++) {
    const f = Math.max(0, (y - top) / (to - top));
    for (let x = 0; x < p.w; x++) p.buf[(y * p.w + x) * 4 + 3] = Math.round(p.buf[(y * p.w + x) * 4 + 3] * f * f * (3 - 2 * f));
  }
}

async function scaled(p, s) {
  if (s === 1) return p;
  const w = Math.round(p.w * s), h = Math.round(p.h * s);
  // (premultiplied while resizing, so edges don't darken)
  const buf = await sharp(p.buf, { raw: { width: p.w, height: p.h, channels: 4 } }).resize(w, h, { kernel: "lanczos3" }).raw().toBuffer();
  return { ...p, w, h, buf, s };
}

// ── the pieces ──
const out = [];
for (const [name, def] of Object.entries(PIECES)) {
  let p = take(def.sheet, def.box);
  if (def.paintOut) paintOut(p, def.paintOut, def.backLine);
  if (def.fadeBottom) fadeBottom(p, def.fadeBottom);
  if (def.far) shade(p, FAR);
  const s = def.scale ?? 1;
  const joints = Object.fromEntries(Object.entries(def.joints).map(([j, [x, y]]) => [j, [(x - p.ox) * s, (y - p.oy) * s]]));
  p = await scaled(p, s);
  if (def.fade) fadeTop(p, joints.wrist[1], def.fade);
  out.push({ name, w: p.w, h: p.h, buf: p.buf, joints });
}
for (const [name, def] of Object.entries(LEGS)) {
  const t = take("parts", def.thigh), s = take("parts", def.shin);
  // centred on each other; the shin under the thigh's knee
  const tc = t.w / 2, sc = s.w / 2, w = Math.max(t.w, s.w), h = t.h + s.h - KNEE_OVERLAP;
  // each on a layer of the leg's size
  const layer = (p, dx, dy) => {
    const b = Buffer.alloc(w * h * 4);
    for (let y = 0; y < p.h; y++) p.buf.copy(b, ((y + dy) * w + dx) * 4, y * p.w * 4, (y + 1) * p.w * 4);
    return b;
  };
  const tb = layer(t, Math.round(w / 2 - tc), 0), sb = layer(s, Math.round(w / 2 - sc), t.h - KNEE_OVERLAP);
  const alpha = (b, x, y) => (y < 0 || y >= h ? 0 : b[(y * w + x) * 4 + 3] / 255);
  /* Where both are solid, they're cross-faded by how far each is from its own
     cut end (the thigh's bottom, the shin's top), so neither rounded end's
     outline shows inside the trouser; elsewhere, the thigh over the shin. */
  const R = 12;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, aT = tb[i + 3] / 255, aS = sb[i + 3] / 255;
      if (aT > 0.9 && aS > 0.9) {
        let dT = 0, dS = 0;
        while (dT < R && alpha(tb, x, y + dT + 1) > 0.5) dT++;
        while (dS < R && alpha(sb, x, y - dS - 1) > 0.5) dS++;
        const wT = (dT / R) ** 2, wS = (dS / R) ** 2, sum = wT + wS || 1;
        for (let c = 0; c < 3; c++) buf[i + c] = Math.round((tb[i + c] * wT + sb[i + c] * wS) / sum);
        buf[i + 3] = 255;
        continue;
      }
      const A = aT + aS * (1 - aT);
      if (!A) continue;
      for (let c = 0; c < 3; c++) buf[i + c] = Math.round((tb[i + c] * aT + sb[i + c] * aS * (1 - aT)) / A);
      buf[i + 3] = Math.round(A * 255);
    }
  const p = { w, h, buf };
  if (def.far) shade(p, FAR);
  // rows: the hip in the thigh's top cap, the knee in the overlap, the ankle inside the cuff
  out.push({ name, w, h, buf, joints: { hip: [w / 2, 3 + t.w / 2 - 6], knee: [w / 2, t.h - KNEE_OVERLAP / 2], ankle: [w / 2, h - 30] } });
}

// ── packed in rows, 2 px apart ──
const ATLAS_W = 1024, PAD = 2;
let x = PAD, y = PAD, rowH = 0;
const placed = {};
for (const p of [...out].sort((a, b) => b.h - a.h)) {
  if (x + p.w + PAD > ATLAS_W) {
    x = PAD;
    y += rowH + PAD;
    rowH = 0;
  }
  placed[p.name] = { x, y };
  x += p.w + PAD;
  rowH = Math.max(rowH, p.h);
}
const ATLAS_H = y + rowH + PAD;
await sharp({ create: { width: ATLAS_W, height: ATLAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(out.map((p) => ({ input: p.buf, raw: { width: p.w, height: p.h, channels: 4 }, left: placed[p.name].x, top: placed[p.name].y })))
  .webp({ quality: 90, alphaQuality: 100, effort: 6 })
  .toFile(OUT_IMG);

const r = (v) => Math.round(v * 10) / 10;
const meta = Object.fromEntries(
  out.map((p) => [p.name, { x: placed[p.name].x, y: placed[p.name].y, w: p.w, h: p.h, joints: Object.fromEntries(Object.entries(p.joints).map(([j, [jx, jy]]) => [j, [r(jx), r(jy)]])) }]),
);
writeFileSync(
  OUT_TS,
  `/* Generated by \`npm run intro:actor\` (scripts/intro-actor.mjs): the pieces of
   the intro's character in public/intro/actor.webp, each with its box there and
   its joints (px, from the piece's top left), all at the body's scale. He
   faces right. Don't edit by hand. */

export const ACTOR_SRC = "/intro/actor.webp";

export const ACTOR_PARTS = {
${Object.entries(meta)
  .map(([k, v]) => `  ${k}: { x: ${v.x}, y: ${v.y}, w: ${v.w}, h: ${v.h}, joints: { ${Object.entries(v.joints).map(([j, [jx, jy]]) => `${j}: [${jx}, ${jy}]`).join(", ")} } },`)
  .join("\n")}
} as const;
`,
);
console.log(`wrote ${path.relative(ROOT, OUT_IMG)} (${ATLAS_W} × ${ATLAS_H}) and ${path.relative(ROOT, OUT_TS)}: ${out.length} pieces`);

#!/usr/bin/env node
/* Cuts the education avatar out of its white backdrop, so the orbiting
   particle balls can pass behind him, and saves a small WebP for the page.

   The backdrop is flood-filled from the image's edges (so the white shirt,
   enclosed by the suit, stays), and the pixels along the cut get a soft alpha
   with the white taken back out of their colour, so no pale halo shows on the
   cream paper. Re-run after replacing the source:

     npm run education:art

   Source: design/education/education.png (kept out of public/, not deployed).
   Output: public/education/avatar.webp */

import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "design/education/education.png");
const OUT_DIR = path.join(ROOT, "public/education");
const HEIGHT = 1200; // px; shown up to ~560 css px tall at 2×

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const n = w * h;

// backdrop: near-white and colourless
const pale = (i) => {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  return Math.min(r, g, b) > 228 && Math.max(r, g, b) - Math.min(r, g, b) < 14;
};
const out = new Uint8Array(n); // 1 = backdrop
const queue = new Int32Array(n);
let head = 0;
let tail = 0;
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
  const i = queue[head++];
  const x = i % w;
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
  // along the cut: as transparent as it is white, with the white taken out
  const x = i % w;
  const edge = (x > 0 && out[i - 1]) || (x < w - 1 && out[i + 1]) || (i >= w && out[i - w]) || (i < n - w && out[i + w]);
  if (!edge) continue;
  const m = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  const a = Math.min(1, Math.max(0.05, (255 - m) / 110));
  for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(Math.max(0, Math.min(255, (data[i * 4 + c] - 255 * (1 - a)) / a)));
  data[i * 4 + 3] = Math.round(a * 255);
}

mkdirSync(OUT_DIR, { recursive: true });
const file = path.join(OUT_DIR, "avatar.webp");
await sharp(Buffer.from(data.buffer), { raw: { width: w, height: h, channels: 4 } })
  .trim({ threshold: 0 })
  .resize({ height: HEIGHT })
  .webp({ quality: 84, alphaQuality: 90, effort: 6 })
  .toFile(file);
const meta = await sharp(file).metadata();
console.log(`  avatar.webp  ${meta.width}×${meta.height}  ${Math.round(statSync(file).size / 1024)} KB`);

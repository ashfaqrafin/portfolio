/* The pencil shading round the hero's drawing book page: thousands of short
   burgundy scratches, scattered at random and built up where the shade is
   heavy (in from the page's edges, heaviest in the corners). Each has its own
   slant, length, curve and pressure; most lean one way, as a right hand shades,
   and the darkest patches get a few strokes across them. The paper's tooth
   shows through.

   Drawn once by hero-art.mjs into an image the page shows from its first
   frame (.hero-shade in hero.css), so the browser never paints it. It's ink on
   white, multiplied over the page: white leaves the page as it is, and an opaque
   image compresses far better than a transparent one (~80 KB, not ~300). */

import { clamp01, mulberry32, scatter, sstep, valueNoise } from "./pencil.mjs";

const REACH = 80; // css px the shading reaches in from an edge, on average

/**
 * @param {number} w image width, px
 * @param {number} h image height, px
 * @param {number} s image px per css px, as the page is usually shown
 * @param {{ seed?: number, ink?: number[] }} [opts] ink: the pencil's colour, the
 *   site's --thread burgundy (the darker --ink reads as black where strokes pile up)
 * @returns {Buffer} raw RGB: the shading in that colour, on white
 */
export function pageShade(w, h, s, { seed = 5, ink = [140, 47, 67] } = {}) {
  const rand = mulberry32(seed);
  const reachNoise = valueNoise(w, h, 90 * s, rand);
  const density = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ex = Math.min(x, w - x);
      const ey = Math.min(y, h - y);
      const reach = REACH * s * (0.35 + 1.15 * reachNoise[i]);
      const edge = (1 - sstep(0, reach, Math.min(ex, ey))) ** 1.4;
      const corner = (1 - sstep(0, reach * 2.4, ex)) * (1 - sstep(0, reach * 2.4, ey));
      density[i] = Math.min(1, edge + corner * 0.5);
    }
  const cover = scatter(w, h, density, s, 1.05, 0.55, rand, { rate: 0.16, len: [6, 16], width: [0.7, 1.1], alpha: [0.05, 0.13] });
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    // the paper's tooth: random specks the graphite skipped
    const tooth = rand() < 0.35 ? 0.35 + rand() * 0.65 : 0;
    const k = clamp01(cover[i] * (1 - tooth));
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(255 + (ink[c] - 255) * k);
  }
  return out;
}

import { PALETTE } from "./config";
import { mulberry32, smoothstep } from "./utils";

/* The pencil shading round the drawing book's page: thousands of short
   burgundy pencil scratches, scattered at random and built up where the shade
   is heavy (in from the edges, heaviest in the corners). Each has its own
   slant, length, curve and pressure; most lean one way, as a right hand shades,
   and the darkest patches get a few strokes across them. The paper's tooth
   shows through at the end.

   Painted once per layout into a canvas that the paper shader (BG_FRAG) reads:
   strokes scattered like this can't be drawn by a shader every frame. That's
   some 20,000 strokes, so it's painted a slice at a time (paint() takes a
   budget) while the page is idle. Seeded, so the page shades the same way on
   every visit. */

const REACH = 80; // px the shading reaches in from an edge, on average
const CELL = 90; // px between the points of the noise that makes the reach uneven
const TRIES = 0.16; // candidate strokes per px² (kept in proportion to the shade there)

export interface Scratch {
  canvas: HTMLCanvasElement;
  /** paints strokes while `more()` says so; true once the shading is finished */
  paint(more: () => boolean): boolean;
}

export function scratchShading(w: number, h: number, dpr: number, seed = 5): Scratch {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(w * dpr));
  canvas.height = Math.max(2, Math.round(h * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.lineCap = "round";
  ctx.strokeStyle = PALETTE.ink;
  const rand = mulberry32(seed);

  // a coarse random grid, smoothly interpolated: how far the shade reaches varies along the edge
  const gw = Math.ceil(w / CELL) + 2;
  const grid = Array.from({ length: gw * (Math.ceil(h / CELL) + 2) }, rand);
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x / CELL);
    const iy = Math.floor(y / CELL);
    const fx = smoothstep(0, 1, x / CELL - ix);
    const fy = smoothstep(0, 1, y / CELL - iy);
    const g = (i: number, j: number) => grid[(iy + j) * gw + ix + i];
    return g(0, 0) + (g(1, 0) - g(0, 0)) * fx + (g(0, 1) - g(0, 0)) * fy + (g(0, 0) - g(1, 0) - g(0, 1) + g(1, 1)) * fx * fy;
  };
  /** how heavy the shade is at a point, 0..1 */
  const shade = (x: number, y: number) => {
    const ex = Math.min(x, w - x);
    const ey = Math.min(y, h - y);
    const reach = REACH * (0.35 + 1.15 * noise(x, y));
    const edge = (1 - smoothstep(0, reach, Math.min(ex, ey))) ** 1.4;
    const corner = (1 - smoothstep(0, reach * 2.4, ex)) * (1 - smoothstep(0, reach * 2.4, ey));
    return Math.min(1, edge + corner * 0.5);
  };

  const scratch = () => {
    const x = rand() * w;
    const y = rand() * h;
    const d = shade(x, y);
    if (rand() >= d) return;
    // mostly one slant; some strokes across it where the shade is darkest
    const across = d > 0.6 && rand() < 0.28;
    const ang = (across ? -0.55 : 1.05) + (rand() - 0.5) * 0.55;
    const len = (6 + rand() * 16) * (0.6 + 0.6 * d);
    const dx = (Math.cos(ang) * len) / 2;
    const dy = (Math.sin(ang) * len) / 2;
    const bend = (rand() - 0.5) * len * 0.22;
    ctx.globalAlpha = (0.05 + rand() * 0.13) * (0.45 + 0.55 * d);
    ctx.lineWidth = 0.7 + rand() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.quadraticCurveTo(x - (dy / len) * bend * 2, y + (dx / len) * bend * 2, x + dx, y + dy);
    ctx.stroke();
  };

  // the paper's tooth: knock random specks out of the graphite
  const tooth = () => {
    const t = document.createElement("canvas");
    t.width = t.height = 97;
    const tctx = t.getContext("2d")!;
    const specks = tctx.createImageData(97, 97);
    for (let i = 0; i < specks.data.length; i += 4) specks.data[i + 3] = rand() < 0.35 ? 90 + rand() * 165 : 0;
    tctx.putImageData(specks, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = ctx.createPattern(t, "repeat")!;
    ctx.fillRect(0, 0, w, h);
  };

  const tries = Math.round(w * h * TRIES);
  let k = 0;
  return {
    canvas,
    paint(more) {
      while (k < tries && more()) {
        for (const end = Math.min(tries, k + 200); k < end; k++) scratch();
        if (k === tries) tooth();
      }
      return k === tries;
    },
  };
}

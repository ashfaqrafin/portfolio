import ART from "./art.json";
import type { Cloth } from "./cloth";
import type { FlagGL } from "./flaggl";
import type { Sound } from "./sound";
import type { Mesh } from "./wave";

/* What every scene draws with: the stage, the clocks, the pictures, and a
   few drawing helpers (pictures cover-fitted, a character's frame set down
   on its anchor, ragged edges for torn paper and ink). */

export type Seq = keyof typeof ART.sequences;
export type Layer = keyof typeof ART.layers;
type Frame = number[];

export type World = {
  g: CanvasRenderingContext2D;
  /** the stage, in CSS pixels, and device pixels to a CSS pixel */
  W: number;
  H: number;
  dpr: number;
  portrait: boolean;
  /** story time (s), and its value last frame */
  t: number;
  prevT: number;
  /** real time (s), and this frame's step */
  now: number;
  dt: number;
  reduced: boolean;
  img: (key: string) => HTMLImageElement | null;
  sound: Sound;
  fonts: { hand: string; bangla: string; mono: string; display: string };
  state: SceneState;
};

/** what the scenes keep from frame to frame */
export type SceneState = {
  /** draws the flags, and the grids of the ones that only fly (by name) */
  gl: FlagGL;
  meshes: Map<string, Mesh>;
  /** where a walker's two frames are cross-faded before they're set down */
  scratch: HTMLCanvasElement | null;
  ragTex: HTMLCanvasElement | null;
  /** the flag in the climax */
  flag: Cloth | null;
  flagTex: HTMLCanvasElement[];
  flagIndex: number;
  stitch: { t0: number; to: number; order: number } | null;
  slash: { t0: number; ax: number; ay: number; bx: number; by: number; last: number; order: number } | null;
  cutOrder: number;
  tearHintGone: boolean;
  flagNote: { text: string; t0: number } | null;
  /** fire, smoke and embers */
  particles: Particle[];
  /** the road, joined into one strip that tiles */
  road: HTMLCanvasElement | null;
  tinted: Map<string, HTMLCanvasElement>;
  paper: CanvasPattern | null;
  shake: number;
  flash: number;
};

export type Particle = { kind: "fire" | "ember" | "smoke"; x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; spin: number };

// ── numbers ─────────────────────────────────────────────────────────────────
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
/** 0..1 through [a, b] */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = (f: number) => f * f * (3 - 2 * f);
export const out = (f: number) => 1 - (1 - f) * (1 - f);
export const outBack = (f: number) => 1 + 2.4 * Math.pow(f - 1, 3) + 1.4 * Math.pow(f - 1, 2);
/** in over [a, a+r], out over [b-r, b] */
export const fade = (t: number, a: number, b: number, r = 0.5) => clamp(Math.min((t - a) / r, (b - t) / r));
/** a stable pseudo-random number for an integer */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ── pictures ────────────────────────────────────────────────────────────────
/** `body` (a walk's frames): each frame's height; `stride`: the ground one cycle covers, in body heights */
export const SEQ = ART.sequences as Record<Seq, { atlas: string; ref: number; frames: Frame[]; body?: number[]; stride?: number }>;
export const LAYERS = ART.layers as Record<string, { src: string; w: number; h: number; table?: { a: number[]; b: number[]; c: number[] } }>;
export const COMRADES = ART.comrades;

/** cover the stage with a picture (`ax`, `ay` choose which part stays when cropped) */
export function cover(w: World, im: HTMLImageElement | HTMLCanvasElement | null, o: { ax?: number; ay?: number; zoom?: number; dx?: number; dy?: number; alpha?: number } = {}) {
  if (!im) return;
  const { g, W, H } = w;
  const iw = im.width, ih = im.height;
  const k = Math.max(W / iw, H / ih) * (o.zoom ?? 1);
  const dw = iw * k, dh = ih * k;
  const x = (W - dw) * (o.ax ?? 0.5) + (o.dx ?? 0);
  const y = (H - dh) * (o.ay ?? 0.5) + (o.dy ?? 0);
  if (o.alpha !== undefined) {
    const a = g.globalAlpha;
    g.globalAlpha = a * o.alpha;
    g.drawImage(im, x, y, dw, dh);
    g.globalAlpha = a;
  } else g.drawImage(im, x, y, dw, dh);
}

/** the landscape picture, or its portrait version on a tall screen when there is one */
export function pick(w: World, key: string) {
  return (w.portrait && w.img(`${key}-p`)) || w.img(key);
}

export type Placed = { x: number; y: number; k: number; flip: boolean; f: Frame };

/**
 * Set down frame `k` of a sequence with its anchor (between the soles) at
 * (x, y), the body `h` tall. Returns where it went, for points on it.
 */
export function frame(w: World, seq: Seq, k: number, x: number, y: number, h: number, o: { flip?: boolean; alpha?: number; atlas?: CanvasImageSource | null } = {}): Placed | null {
  const s = SEQ[seq];
  const f = s.frames[((k % s.frames.length) + s.frames.length) % s.frames.length];
  const im = o.atlas ?? w.img(s.atlas);
  const kk = h / s.ref;
  const placed = { x, y, k: kk, flip: !!o.flip, f };
  if (!im) return placed;
  const { g } = w;
  const a = g.globalAlpha;
  if (o.alpha !== undefined) g.globalAlpha = a * o.alpha;
  if (o.flip) {
    g.save();
    g.translate(x, 0);
    g.scale(-1, 1);
    g.drawImage(im, f[0], f[1], f[2], f[3], -f[4] * kk, y - f[5] * kk, f[2] * kk, f[3] * kk);
    g.restore();
  } else g.drawImage(im, f[0], f[1], f[2], f[3], x - f[4] * kk, y - f[5] * kk, f[2] * kk, f[3] * kk);
  g.globalAlpha = a;
  return placed;
}

export type Walk = { a: Placed; b: Placed; mix: number };

/**
 * A walking figure at `ph` (in frames, with its fraction): the frames either
 * side are cross-faded (so a step flows instead of jumping), and the head is
 * eased from one frame's height to the next (the frames dip by up to a tenth
 * at each step; `bob` keeps that much of it). `haze` lays a colour over the
 * figure (distance); `shadow` puts a soft one under the feet.
 */
export function walker(
  w: World, seq: Seq, ph: number, x: number, y: number, h: number,
  o: { alpha?: number; haze?: [string, number]; blend?: boolean; bob?: number; shadow?: number; atlas?: CanvasImageSource | null; atlasScale?: number } = {},
): Walk {
  const s = SEQ[seq];
  const n = s.frames.length;
  const base = Math.floor(ph), fr = ph - base;
  const k0 = ((base % n) + n) % n, k1 = (k0 + 1) % n;
  const f0 = s.frames[k0], f1 = s.frames[k1];
  const kk = h / s.ref;
  const mix = o.blend === false ? 0 : ease(clamp((fr - 0.5) / 0.5));
  let dy0 = 0, dy1 = 0;
  if (s.body) {
    const e = ease(fr);
    const head = s.ref + (o.bob ?? 0.6) * (lerp(s.body[k0], s.body[k1], e) - s.ref);
    dy0 = (s.body[k0] - head) * kk;
    dy1 = (s.body[k1] - head) * kk;
  }
  const a: Placed = { x, y: y + dy0, k: kk, flip: false, f: f0 }, b: Placed = { x, y: y + dy1, k: kk, flip: false, f: f1 };
  const im = o.atlas ?? w.img(s.atlas);
  if (!im) return { a, b, mix };
  const { g } = w;
  if (o.shadow) {
    g.fillStyle = `rgba(12,7,10,${o.shadow})`;
    g.beginPath();
    g.ellipse(x, y - 0.004 * h, 0.21 * h, 0.026 * h, 0, 0, Math.PI * 2);
    g.fill();
  }
  const sc = o.atlasScale ?? 1;
  const put = (c: CanvasRenderingContext2D, f: number[], yy: number) => c.drawImage(im, f[0] * sc, f[1] * sc, f[2] * sc, f[3] * sc, x - f[4] * kk, yy - f[5] * kk, f[2] * kk, f[3] * kk);
  const ga = g.globalAlpha;
  if (o.alpha !== undefined) g.globalAlpha = ga * o.alpha;
  if (mix < 0.01 && !o.haze) put(g, f0, a.y);
  else {
    // the two frames added together in proportion (so where both are solid, it stays solid), then the haze over just them
    const left = Math.floor(x - Math.max(f0[4], f1[4]) * kk) - 2, top = Math.floor(y - Math.max(f0[5], f1[5]) * kk + Math.min(dy0, dy1)) - 2;
    const ws = Math.ceil(Math.max(f0[2] - f0[4], f1[2] - f1[4]) * kk + x - left) + 2, hs = Math.ceil(y + Math.max(dy0, dy1) - top) + 4;
    const sc2 = (w.state.scratch ??= document.createElement("canvas"));
    const pw = Math.ceil(ws * w.dpr), phh = Math.ceil(hs * w.dpr);
    if (sc2.width < pw || sc2.height < phh) {
      sc2.width = Math.max(sc2.width, pw);
      sc2.height = Math.max(sc2.height, phh);
    }
    const c = sc2.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.clearRect(0, 0, pw + 1, phh + 1);
    c.setTransform(w.dpr, 0, 0, w.dpr, -left * w.dpr, -top * w.dpr);
    c.globalAlpha = 1 - mix;
    put(c, f0, a.y);
    if (mix >= 0.01) {
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = mix;
      put(c, f1, b.y);
    }
    if (o.haze) {
      c.globalCompositeOperation = "source-atop";
      c.globalAlpha = o.haze[1];
      c.fillStyle = o.haze[0];
      c.fillRect(left, top, ws, hs);
    }
    g.drawImage(sc2, 0, 0, pw, phh, left, top, pw / w.dpr, phh / w.dpr);
  }
  g.globalAlpha = ga;
  return { a, b, mix };
}

/** a point marked on a walk's frames (two numbers from index `i` of each), eased between the two frames */
export function mark(wk: Walk, i: number) {
  const p = at(wk.a, wk.a.f[i], wk.a.f[i + 1]), q = at(wk.b, wk.b.f[i], wk.b.f[i + 1]);
  return { x: lerp(p.x, q.x, wk.mix), y: lerp(p.y, q.y, wk.mix) };
}

/** a point given in a frame's own pixels, on the stage */
export function at(p: Placed, px: number, py: number) {
  const dx = (px - p.f[4]) * p.k;
  return { x: p.x + (p.flip ? -dx : dx), y: p.y + (py - p.f[5]) * p.k };
}

/** a picture made once from another (greyed, darkened, its edges feathered), kept */
export function derive(w: World, id: string, key: string, make: (im: HTMLImageElement, g: CanvasRenderingContext2D, c: HTMLCanvasElement) => void): HTMLCanvasElement | null {
  const hit = w.state.tinted.get(id);
  if (hit) return hit;
  const im = w.img(key);
  if (!im) return null;
  const c = document.createElement("canvas");
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(im, 0, 0);
  make(im, g, c);
  w.state.tinted.set(id, c);
  return c;
}

/** its edges faded out: `fx` of the width at the sides, `fy` of the height top and bottom */
export function feathered(w: World, key: string, fx: number, fy = 0) {
  return derive(w, `feather:${key}:${fx}:${fy}`, key, (_, g, c) => {
    g.globalCompositeOperation = "destination-in";
    if (fx > 0) {
      const h = g.createLinearGradient(0, 0, c.width, 0);
      h.addColorStop(0, "rgba(0,0,0,0)");
      h.addColorStop(fx, "rgba(0,0,0,1)");
      h.addColorStop(1 - fx, "rgba(0,0,0,1)");
      h.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = h;
      g.fillRect(0, 0, c.width, c.height);
    }
    if (fy > 0) {
      const v = g.createLinearGradient(0, 0, 0, c.height);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(fy, "rgba(0,0,0,1)");
      v.addColorStop(1 - fy, "rgba(0,0,0,1)");
      v.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = v;
      g.fillRect(0, 0, c.width, c.height);
    }
  });
}

/** an atlas with every pixel turned one colour (keeping its alpha): far-off crowds */
export function tint(w: World, key: string, colour: string): HTMLCanvasElement | null {
  const id = `${key}|${colour}`;
  const hit = w.state.tinted.get(id);
  if (hit) return hit;
  const im = w.img(key);
  if (!im) return null;
  const c = document.createElement("canvas");
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext("2d")!;
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = colour;
  g.fillRect(0, 0, c.width, c.height);
  w.state.tinted.set(id, c);
  return c;
}

// ── marks ───────────────────────────────────────────────────────────────────
/** a ragged circle (watercolour, ink), as a path */
export function raggedCircle(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed = 0) {
  g.beginPath();
  for (let k = 0; k <= 96; k++) {
    const a = (k / 96) * Math.PI * 2;
    const rr = r * (1 + 0.055 * Math.sin(3 * a + seed) + 0.035 * Math.sin(7 * a + seed * 1.7) + 0.02 * Math.sin(13 * a + seed * 2.3));
    if (k) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}

/** a torn paper edge across the stage at height `y`: the points along it */
export function tornEdge(W: number, y: number, seed: number, amp = 9) {
  const pts: [number, number][] = [];
  for (let x = -20, k = 0; x <= W + 20; x += 13, k++) pts.push([x, y + (hash(k + seed * 31) - 0.5) * 2 * amp + Math.sin(x * 0.011 + seed) * amp]);
  return pts;
}

/** the darkening round a stage's edges */
export function vignette(w: World, strength = 0.5, colour = "0,0,0") {
  const { g, W, H } = w;
  const r = Math.hypot(W, H) / 2;
  const grad = g.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r * 1.05);
  grad.addColorStop(0, `rgba(${colour},0)`);
  grad.addColorStop(1, `rgba(${colour},${strength})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
}

/** drain the colour out of what's drawn (0 none, 1 grey) */
export function desaturate(w: World, amount: number) {
  if (amount <= 0.01) return;
  const { g, W, H } = w;
  g.save();
  g.globalCompositeOperation = "saturation";
  g.globalAlpha = clamp(amount);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, W, H);
  g.restore();
}

/** paper over the whole stage (made once for the stage's size, then just drawn) */
export function paper(w: World, tone = "#f3ecdf", extra?: (g: CanvasRenderingContext2D, w: World) => boolean) {
  const { g, W, H } = w;
  const id = `paper:${tone}:${W}x${H}@${w.dpr}:${extra ? "x" : ""}`;
  let c = w.state.tinted.get(id);
  if (!c) {
    const pat = w.state.paper;
    c = document.createElement("canvas");
    c.width = Math.round(W * w.dpr);
    c.height = Math.round(H * w.dpr);
    const pg = c.getContext("2d")!;
    pg.scale(w.dpr, w.dpr);
    pg.fillStyle = tone;
    pg.fillRect(0, 0, W, H);
    if (pat) {
      pg.globalCompositeOperation = "multiply";
      pg.fillStyle = pat;
      pg.fillRect(0, 0, W, H);
      pg.globalCompositeOperation = "source-over";
    }
    // anything else that never moves, laid on the paper (kept only once it's all in)
    const done = extra ? extra(pg, w) : true;
    if (pat && done) {
      for (const k of [...w.state.tinted.keys()]) if (k.startsWith(`paper:${tone}:`)) w.state.tinted.delete(k);
      w.state.tinted.set(id, c);
    }
  }
  g.drawImage(c, 0, 0, W, H);
}

/** a speech bubble beside (x, y), its tail pointing there */
export function bubble(w: World, x: number, y: number, lines: string[], o: { side: -1 | 1; size: number; font: string; pop: number; gloss?: string; glossFont?: string }) {
  const { g } = w;
  if (o.pop <= 0) return;
  g.save();
  g.font = `700 ${o.size}px ${o.font}`;
  const lw = Math.max(...lines.map((l) => g.measureText(l).width));
  const lh = o.size * 1.05;
  const gh = o.gloss ? o.size * 0.62 : 0;
  const bw = lw + o.size * 1.3, bh = lines.length * lh + gh + o.size * 0.8;
  // beside the speaker, but never off the stage (its tail still finds them)
  const bx = clamp(x + o.side * (bw / 2 + o.size * 0.9), bw / 2 + o.size * 0.6, w.W - bw / 2 - o.size * 0.6);
  const by = clamp(y - bh / 2 - o.size * 0.6, bh / 2 + o.size * 2.4, w.H);
  const s = outBack(clamp(o.pop));
  g.translate(bx, by);
  g.scale(s, s);
  g.beginPath();
  g.ellipse(0, 0, bw / 2 + o.size * 0.25, bh / 2 + o.size * 0.2, 0, 0, Math.PI * 2);
  g.fillStyle = "#fffdf7";
  g.fill();
  g.lineWidth = Math.max(2, o.size * 0.07);
  g.strokeStyle = "#111";
  g.stroke();
  // the tail
  const tx = -o.side * (bw / 2) * 0.62, ty = bh / 2 * 0.55;
  g.beginPath();
  g.moveTo(tx - o.size * 0.25, ty - 2);
  g.lineTo(x - bx, y - by);
  g.lineTo(tx + o.size * 0.35, ty - 6);
  g.fillStyle = "#fffdf7";
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(tx - o.size * 0.25 + 2, ty - 4);
  g.lineTo(tx + o.size * 0.35 - 2, ty - 8);
  g.lineWidth = g.lineWidth * 2;
  g.strokeStyle = "#fffdf7";
  g.stroke();
  g.fillStyle = "#111";
  g.textAlign = "center";
  g.textBaseline = "middle";
  lines.forEach((l, k) => g.fillText(l, 0, -bh / 2 + o.size * 0.4 + lh * (k + 0.5)));
  if (o.gloss) {
    g.font = `400 ${o.size * 0.48}px ${o.glossFont ?? o.font}`;
    g.fillStyle = "#555";
    g.fillText(o.gloss, 0, bh / 2 - o.size * 0.55);
  }
  g.restore();
}

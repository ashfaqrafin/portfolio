/* Redraws a clean, flat vector illustration as a coloured-pencil drawing.

   Used by hero-art.mjs on the hero's artwork. Traced vector art has one even
   line weight, crisp edges and flat fills, which reads as machine-made; this
   puts the hand back:

   - grain: the pencil catches the paper's tooth, so lines and fills break up
     into streaks laid one way, and into paper specks where they're light.
     Pressed hard (the dark velvet suit) the tooth fills and the grain fades.
   - pressure: lines darken and lighten slowly along their length.
   - a second pass: stretches of the lines redrawn faintly, a little off, as a
     sketch is.
   - hatching: broken diagonal strokes where the drawing is busy (folds) and on
     the side of each form away from the light, crossed where it's deepest.
   - shadows: each drawing throws a shadow onto the page, down and to the right
     of it, away from the light, scratched in loosely: heaviest beside the
     drawing, thinning out unevenly. A standing figure (`ground`) also gets a
     ragged patch of flat strokes on the floor at its feet.

   Every mark is sized to be seen where the figure is shown (about half this
   size on a 1× screen): finer than that, it would just read as flat tone.

   Works on raw RGBA, keeps the drawing's own ink and paper colours and its
   silhouette, and is seeded, so the same SVG always gives the same picture.
   Tuned on art 1300 px tall; other sizes scale. */

export const smooth = (k) => k * k * (3 - 2 * k);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sstep = (a, b, v) => smooth(clamp01((v - a) / (b - a)));

export const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (n) => {
  let t = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  t ^= t >>> 13;
  t = Math.imul(t, 0xc2b2ae35);
  t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
};

/** smooth value noise in 0..1, with features about `cell` px across */
export function valueNoise(w, h, cell, rand) {
  const gw = Math.ceil(w / cell) + 2;
  const g = new Float32Array(gw * (Math.ceil(h / cell) + 2)).map(rand);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const iy = Math.floor(y / cell);
    const fy = smooth(y / cell - iy);
    for (let x = 0; x < w; x++) {
      const ix = Math.floor(x / cell);
      const fx = smooth(x / cell - ix);
      const a = g[iy * gw + ix];
      const b = g[iy * gw + ix + 1];
      const c = g[(iy + 1) * gw + ix];
      const d = g[(iy + 1) * gw + ix + 1];
      out[y * w + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

/** gaussian-ish blur: three box passes each way */
function blur(src, w, h, sigma) {
  const r = Math.max(1, Math.round((Math.sqrt(1 + 4 * sigma * sigma) - 1) / 2));
  const a = src.slice();
  const b = new Float32Array(w * h);
  const pass = (from, to, n, lines, step, lineStep) => {
    for (let l = 0; l < lines; l++) {
      const base = l * lineStep;
      const at = (k) => from[base + Math.min(n - 1, Math.max(0, k)) * step];
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += at(k);
      for (let i = 0; i < n; i++) {
        to[base + i * step] = sum / (2 * r + 1);
        sum += at(i + r + 1) - at(i - r);
      }
    }
  };
  for (let k = 0; k < 3; k++) {
    pass(a, b, w, h, 1, w);
    pass(b, a, h, w, w, 1);
  }
  return a;
}

/** smear along an angle: the grain of strokes all laid one way */
function streak(src, w, h, deg, len) {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -len; k <= len; k++) {
        const xx = Math.min(w - 1, Math.max(0, Math.round(x + c * k)));
        const yy = Math.min(h - 1, Math.max(0, Math.round(y + s * k)));
        sum += src[yy * w + xx];
      }
      out[y * w + x] = sum / (2 * len + 1);
    }
  return out;
}

/** bilinear read of a field, clamped to its edges */
function sample(f, w, h, x, y) {
  x = Math.min(w - 1.001, Math.max(0, x));
  y = Math.min(h - 1.001, Math.max(0, y));
  const ix = x | 0;
  const iy = y | 0;
  const fx = x - ix;
  const fy = y - iy;
  const i = iy * w + ix;
  return (f[i] * (1 - fx) + f[i + 1] * fx) * (1 - fy) + (f[i + w] * (1 - fx) + f[i + w + 1] * fx) * fy;
}

/** pencil hatching at `deg`: broken strokes 5–14 spacings long, each with its own
    pressure, lighter where it lands and lifts, drifting a little off straight */
function hatching(w, h, deg, spacing, width, seed, drift) {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const along = x * c + y * s;
      const across = -x * s + y * c + (drift[i] - 0.5) * spacing * 0.5;
      const line = Math.floor(across / spacing);
      const off = hash(line * 7919 + seed) * spacing * 0.3;
      const d = Math.abs(across - (line + 0.5) * spacing - off + spacing * 0.15);
      const prof = 1 - sstep(width * 0.35, width, d);
      if (prof <= 0) continue;
      const pos = along / (spacing * (5 + hash(line * 104729 + seed * 3) * 9)) + hash(line * 31 + seed);
      const seg = Math.floor(pos);
      const f = pos - seg;
      const gap = 0.08 + hash(seg * 13 + line * 977 + seed) * 0.12;
      if (f < gap) continue;
      const ends = sstep(gap, gap + 0.15, f) * sstep(1, 0.85, f);
      out[i] = prof * ends * (0.55 + 0.45 * hash(seg * 17 + line * 131 + seed * 5));
    }
  }
  return out;
}

/** loose pencil shading: short scratches scattered at random, more of them and
    harder where `density` (0..1) is high. Most lean along `ang` (radians, give or
    take `spread`); where it's darkest a few cross them. `s` is px per unit.
    Returns coverage 0..1. */
export function scatter(w, h, density, s, ang, spread, rand, { rate = 0.12, len: [l0, l1] = [5, 13], width: [w0, w1] = [0.7, 0.9], alpha: [a0, a1] = [0.1, 0.22] } = {}) {
  const out = new Float32Array(w * h);
  const tries = Math.round(((w * h) / (s * s)) * rate);
  for (let k = 0; k < tries; k++) {
    const x = rand() * w;
    const y = rand() * h;
    const d = density[Math.floor(y) * w + Math.floor(x)];
    if (!(rand() < d)) continue;
    const a = (d > 0.6 && rand() < 0.25 ? ang - 1.5 : ang) + (rand() - 0.5) * spread;
    const len = (l0 + rand() * l1) * s * (0.6 + 0.6 * d);
    const r = ((w0 + rand() * w1) * s) / 2;
    const alpha = (a0 + rand() * a1) * (0.5 + 0.5 * d);
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const bend = (rand() - 0.5) * len * 0.2;
    // the stroke as a gently bent line: distance to its centre, bowed in the middle
    const bx0 = Math.max(0, Math.floor(x - len / 2 - r - 2));
    const bx1 = Math.min(w - 1, Math.ceil(x + len / 2 + r + 2));
    const by0 = Math.max(0, Math.floor(y - len / 2 - r - 2));
    const by1 = Math.min(h - 1, Math.ceil(y + len / 2 + r + 2));
    for (let py = by0; py <= by1; py++)
      for (let px = bx0; px <= bx1; px++) {
        const along = (px - x) * ux + (py - y) * uy;
        if (along < -len / 2 || along > len / 2) continue;
        const t = along / (len / 2);
        const across = -(px - x) * uy + (py - y) * ux - bend * (1 - t * t);
        const cov = clamp01(r + 0.5 - Math.abs(across));
        if (cov <= 0) continue;
        // the pencil lands and lifts: lighter at both ends
        const ends = 1 - t * t * t * t;
        const i = py * w + px;
        out[i] = 1 - (1 - out[i]) * (1 - cov * alpha * ends);
      }
  }
  return out;
}

/**
 * @param {{ data: Uint8Array | Buffer, width: number, height: number }} img raw RGBA
 * @param {{ seed?: number, ground?: boolean }} [opts]
 * @returns {{ data: Buffer, width: number, height: number }} raw RGBA, same size
 */
export function pencil({ data, width: w, height: h }, { seed = 7, ground = false } = {}) {
  const s = h / 1300;
  const rand = mulberry32(seed);
  const n = w * h;
  const A = new Float32Array(n);
  const L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    A[i] = data[i * 4 + 3] / 255;
    L[i] = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  }

  // the drawing's own ink and paper: its darkest and its usual light
  const opaque = [];
  for (let i = 0; i < n; i += 7) if (A[i] > 0.98) opaque.push(i);
  opaque.sort((a, b) => L[a] - L[b]);
  const inkAt = opaque[Math.floor(opaque.length * 0.01)];
  const paperAt = opaque[Math.floor(opaque.length * 0.9)];
  const ink = [0, 1, 2].map((c) => data[inkAt * 4 + c]);
  const paper = [0, 1, 2].map((c) => data[paperAt * 4 + c]);
  const D = new Float32Array(n); // how much ink, 0..1
  for (let i = 0; i < n; i++) D[i] = A[i] > 0 ? clamp01((L[paperAt] - L[i]) / (L[paperAt] - L[inkAt])) : 0;

  // paper tooth: grain streaked along the strokes, normalised to mean 0.5
  let G = new Float32Array(n).map(rand);
  G = blur(streak(blur(G, w, h, 1.1 * s), w, h, -58, Math.max(3, Math.round(9 * s))), w, h, 0.5 * s);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += G[i];
  mean /= n;
  let sd = 0;
  for (let i = 0; i < n; i++) sd += (G[i] - mean) ** 2;
  sd = Math.sqrt(sd / n);
  for (let i = 0; i < n; i++) G[i] = clamp01(0.5 + ((G[i] - mean) / sd) * 0.2);

  const pressure = valueNoise(w, h, 46 * s, rand);
  const dx = valueNoise(w, h, 70 * s, rand);
  const dy = valueNoise(w, h, 70 * s, rand);
  const lines = blur(D, w, h, 0.35 * s);

  // shade: where the drawing is busy, and the side of each form away from a
  // light up and to the left (inside the figure, not lit through its outline)
  const busy = blur(D, w, h, 9 * s);
  const ox = Math.round(-14 * s);
  const oy = Math.round(-10 * s);
  const away = new Float32Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const xx = x + ox;
      const yy = y + oy;
      const lit = xx >= 0 && yy >= 0 && xx < w && yy < h ? A[yy * w + xx] : 0;
      away[y * w + x] = A[y * w + x] * (1 - lit);
    }
  const rim = blur(away, w, h, 7 * s);
  const drift = valueNoise(w, h, 24 * s, rand);
  const hatch1 = hatching(w, h, -58, 11 * s, 2.6 * s, 11, drift);
  const hatch2 = hatching(w, h, 22, 12 * s, 2.2 * s, 23, drift);
  // which stretches of line get a second pass
  const redrawn = valueNoise(w, h, 34 * s, rand);

  // the shadow the drawing throws on the page, laid in with loose scratches:
  // heaviest right beside the drawing, thinning out unevenly as it goes
  const sx = Math.round(14 * s);
  const sy = Math.round(10 * s);
  const thrown = new Float32Array(n);
  for (let y = sy; y < h; y++) for (let x = sx; x < w; x++) thrown[y * w + x] = A[(y - sy) * w + x - sx];
  const near = blur(thrown, w, h, 3 * s);
  const far = blur(thrown, w, h, 11 * s);
  const patchy = valueNoise(w, h, 38 * s, rand);
  const castAt = new Float32Array(n);
  for (let i = 0; i < n; i++)
    castAt[i] = clamp01((sstep(0.1, 0.7, near[i]) * 0.75 + sstep(0.02, 0.5, far[i]) * 0.4) * (0.35 + 1.05 * patchy[i]));
  const shadow = scatter(w, h, castAt, s, 0.95, 0.7, mulberry32(seed + 101));
  // and where a figure stands: a ragged patch on the floor, reaching right from
  // its feet, scratched in flatter strokes
  if (ground) {
    let foot = 0;
    for (let i = 0; i < n; i++) if (A[i] > 0.5) foot = Math.floor(i / w);
    let x0 = w;
    let x1 = 0;
    for (let y = Math.max(0, foot - Math.round(30 * s)); y <= foot; y++)
      for (let x = 0; x < w; x++)
        if (A[y * w + x] > 0.5) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
        }
    const cx = x0 + (x1 - x0) * 0.6;
    const rx = (x1 - x0) * 0.72;
    const ry = 24 * s;
    const cy = foot - 14 * s;
    const floorAt = new Float32Array(n);
    for (let y = Math.max(0, Math.floor(cy - ry * 2)); y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + (patchy[i] - 0.5) * 0.9;
        floorAt[i] = (1 - sstep(0.15, 1, e)) * 0.85;
      }
    const floor = scatter(w, h, floorAt, s, 0.12, 0.45, mulberry32(seed + 202));
    for (let i = 0; i < n; i++) shadow[i] = 1 - (1 - shadow[i]) * (1 - floor[i]);
  }

  const out = Buffer.alloc(n * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = A[i];
      const g = G[i];
      // pressure wanders along lines; a solid fill is laid down evenly
      const press = 0.78 + 0.34 * pressure[i] + (0.18 - 0.26 * pressure[i]) * sstep(0.7, 1, lines[i]);
      const d0 = (1 - (1 - lines[i]) ** 1.2) * press;
      // pressed hard the pencil fills the tooth; lighter lines break into streaks and specks
      const line = clamp01(d0 * (1.04 + (0.62 - 0.3 * d0) * (g - 0.5)));
      const again =
        sample(D, w, h, x + (dx[i] - 0.5) * 3.5 * s + 1.6 * s, y + (dy[i] - 0.5) * 3.5 * s - 1 * s) *
        0.4 *
        sstep(0.42, 0.58, redrawn[i]) *
        (0.5 + g);
      const shade = clamp01(0.75 * sstep(0.06, 0.32, busy[i]) + 1.1 * sstep(0.04, 0.4, rim[i])) * a;
      const hatch = clamp01(hatch1[i] * shade * 0.5 + hatch2[i] * sstep(0.55, 1, shade) * 0.32) * (0.6 + 0.6 * g);
      const smudge = 0.05 * shade * (0.6 + 0.4 * pressure[i]);
      const t = 1 - (1 - line) * (1 - again) * (1 - hatch) * (1 - smudge);
      // the second pass may stray a hair past the figure's edge, in ink
      const k = a > 0.01 ? t : 1;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(paper[c] + (ink[c] - paper[c]) * k);
      // the shadows, only where the page shows: hatched, lighter as the hatching frays out
      out[i * 4 + 3] = Math.round(clamp01(a + (1 - a) * Math.max(again * 1.4, shadow[i] * (0.6 + 0.8 * g))) * 255);
    }
  }
  return { data: out, width: w, height: h };
}

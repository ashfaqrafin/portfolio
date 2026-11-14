/* ALL OF US: the drawing kit. Everything in the film is drawn from here, in
   code: flat colour in two tones (cel shading) inside an ink outline, brush
   lines that taper, and the marks anime is made of (speed lines, focus
   lines, bursts, flares). No pictures. */

export type G = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

export const C = {
  ink: "#17111c", paper: "#fbf6ea",
  // the factory: cold
  wallHi: "#a3b3c4", wall: "#7a8da2", wallLo: "#56687d", roof: "#44566b", floor: "#647589", steel: "#b4c1cf", lamp: "#e4eef7",
  grey: "#9ba8b6", greyD: "#727f8f", skin: "#c6cfd9", hair: "#2a3443",
  // the people; money, which ends as light
  red: "#e8341c", redD: "#a81d0e", redHi: "#ff7242", gold: "#f4b21f", goldHi: "#ffe493", goldD: "#b8770c",
  // the wall they meet
  slate: "#43385a", slateD: "#2e2643", slateHi: "#75688f",
};
/** the sky they break out under, and the morning after: top to horizon */
export const DUSK = ["#6a2a78", "#a5306f", "#e2455f", "#ff7a3d", "#ffb43e", "#ffd96b"];
export const DAWN = ["#ff9a3c", "#ffb84a", "#ffd270", "#ffe6a0", "#fff4d2"];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const ease = (f: number) => f * f * (3 - 2 * f);
export const out = (f: number) => 1 - (1 - f) * (1 - f);
export const outBack = (f: number) => 1 + 2.4 * Math.pow(f - 1, 3) + 1.4 * Math.pow(f - 1, 2);
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** on twos: a time that holds for two frames of twenty-four, as drawn animation does */
export const twos = (t: number) => Math.floor(t * 12) / 12;
/** a colour between two hex colours */
export function tint(a: string, b: string, f: number) {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(p(a, i), p(b, i), f))).join(",")})`;
}

// ── shapes ──────────────────────────────────────────────────────────────────
export function poly(g: G, p: number[], fill?: string, stroke?: string, lw = 0) {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.lineJoin = "round";
    g.stroke();
  }
}
export function disc(g: G, x: number, y: number, r: number, fill: string) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
/** points along a cubic curve */
export function bez(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, n = 14) {
  const p: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    p.push(v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3);
  }
  return p;
}
/** a brush stroke along points: 0 swells in the middle, 1 starts thick and runs out, 2 is even */
export function brush(g: G, p: number[], w: number, colour: string, shape: 0 | 1 | 2 = 0) {
  const n = p.length / 2;
  if (n < 2) return;
  const L: number[] = [], R: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    let dx = p[b * 2] - p[a * 2], dy = p[b * 2 + 1] - p[a * 2 + 1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const u = i / (n - 1);
    const k = shape === 0 ? Math.pow(Math.sin(Math.PI * u), 0.6) : shape === 1 ? 1 - u * 0.94 : 1;
    const hw = (w / 2) * Math.max(0.05, k);
    L.push(p[i * 2] - dy * hw, p[i * 2 + 1] + dx * hw);
    R.push(p[i * 2] + dy * hw, p[i * 2 + 1] - dx * hw);
  }
  g.beginPath();
  g.moveTo(L[0], L[1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i * 2], L[i * 2 + 1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i * 2], R[i * 2 + 1]);
  g.closePath();
  g.fillStyle = colour;
  g.fill();
}
/** a sky in flat bands, top colour first, down to the horizon at y1 */
export function sky(g: G, cols: string[], y0: number, y1: number, seed = 0) {
  g.fillStyle = cols[0];
  g.fillRect(-4000, -4000, 9600, 9000);
  for (let i = 1; i < cols.length; i++) {
    const y = lerp(y0, y1, Math.pow(i / cols.length, 0.75));
    g.beginPath();
    g.moveTo(-4000, 5000);
    for (let x = -4000; x <= 5600; x += 400) g.lineTo(x, y + (hash(seed + i * 9 + x * 0.013) - 0.5) * 30);
    g.lineTo(5600, 5000);
    g.closePath();
    g.fillStyle = cols[i];
    g.fill();
  }
}
/** a long flat cloud */
export function cloud(g: G, x: number, y: number, w: number, colour: string, seed = 0) {
  g.fillStyle = colour;
  for (let i = 0; i < 4; i++) {
    const cw = w * (0.45 + 0.5 * hash(seed + i)), cx = x + (hash(seed + i * 3) - 0.5) * w * 0.5, cy = y + i * w * 0.035, h = w * 0.03;
    g.beginPath();
    g.moveTo(cx - cw / 2, cy);
    g.lineTo(cx - cw / 2 + h * 2, cy - h);
    g.lineTo(cx + cw / 2 - h * 3, cy - h);
    g.lineTo(cx + cw / 2, cy);
    g.lineTo(cx + cw / 2 - h * 2, cy + h);
    g.lineTo(cx - cw / 2 + h * 3, cy + h);
    g.closePath();
    g.fill();
  }
}

// ── people ──────────────────────────────────────────────────────────────────
/** angles from straight down, positive toward the way they face; the second of each pair bends the joint */
export type Pose = { lean: number; head: number; aF: [number, number]; aB: [number, number]; lF: [number, number]; lB: [number, number] };
export type Look = { body: string; shade: string; hair?: number; band?: number; glint?: number; rim?: string; wind?: number; ink?: string; seed?: number };

export const POSE = {
  stand: { lean: 0.03, head: 0, aF: [0.1, 0.15], aB: [-0.1, 0.12], lF: [0.07, 0], lB: [-0.07, 0] } as Pose,
  /** bent over the belt; `s` (-1..1) is where the pump is */
  work: (s: number): Pose => ({ lean: 0.9 + 0.09 * s, head: 0.3, aF: [0.4 + 0.34 * s, -0.75 - 0.4 * s], aB: [0.28 - 0.34 * s, -0.7 + 0.4 * s], lF: [0.14, -0.16], lB: [-0.22, -0.05] }),
  /** a fist in the air; `s` (0..1) punches it higher */
  fist: (s: number): Pose => ({ lean: 0.06, head: -0.2, aF: [1.95 + 0.27 * s, 0.45 + 0.4 * s], aB: [-0.32, 0.6], lF: [0.3, -0.08], lB: [-0.27, 0] }),
  /** feet planted wide, one fist high, the other at the hip */
  hero: { lean: -0.06, head: -0.16, aF: [2.22, 0.86], aB: [-0.55, 1.05], lF: [0.44, -0.12], lB: [-0.42, 0] } as Pose,
  /** walking; `ph` in radians, `up` raises the front arm */
  march: (ph: number, up: number, lean = 0.14): Pose => {
    const s = Math.sin(ph), c = Math.cos(ph);
    return { lean, head: -0.05, aF: [lerp(-0.6 * s, 2.2, up), lerp(0.4, 0.82, up)], aB: [0.6 * s, 0.45], lF: [0.5 * s, -Math.max(0, -c) * 0.8], lB: [-0.5 * s, -Math.max(0, c) * 0.8] };
  },
  /** flat out, leaning into it; `back` trails both arms behind */
  run: (ph: number, back = 0): Pose => {
    const s = Math.sin(ph), c = Math.cos(ph);
    return { lean: 0.62, head: -0.42, aF: [lerp(-1.1 * s, -1.25, back), lerp(1.3, -0.25, back)], aB: [lerp(1.1 * s, -1.05, back), lerp(1.3, -0.3, back)], lF: [1.05 * s + 0.15, -0.25 - Math.max(0, -c) * 1.5], lB: [-1.05 * s + 0.15, -0.25 - Math.max(0, c) * 1.5] };
  },
  /** in the air, the fist drawn back */
  leap: { lean: 0.9, head: -0.6, aF: [-1.5, -1.3], aB: [1.9, 0.3], lF: [0.5, -1.5], lB: [-1.1, -0.5] } as Pose,
  /** the punch landed */
  punch: { lean: 1.1, head: -0.7, aF: [1.75, 0.05], aB: [-1.2, -0.9], lF: [0.1, -0.6], lB: [-1.25, -0.2] } as Pose,
  fallen: { lean: 1.45, head: 0.2, aF: [1.9, 0.3], aB: [0.6, 0.4], lF: [1.35, -0.2], lB: [1.2, -0.5] } as Pose,
  kneel: { lean: 0.4, head: 0.55, aF: [0.35, 0.3], aB: [0.05, 0.2], lF: [1.3, -1.5], lB: [0.15, -1.55] } as Pose,
};
export function mix(a: Pose, b: Pose, f: number): Pose {
  const m = (x: [number, number], y: [number, number]): [number, number] => [lerp(x[0], y[0], f), lerp(x[1], y[1], f)];
  return { lean: lerp(a.lean, b.lean, f), head: lerp(a.head, b.head, f), aF: m(a.aF, b.aF), aB: m(a.aB, b.aB), lF: m(a.lF, b.lF), lB: m(a.lB, b.lB) };
}

/** a limb's piece, as an outline: a tapered bar with a round joint at each end */
function part(path: Path2D, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  path.moveTo(x0 - (nx * w0) / 2, y0 - (ny * w0) / 2);
  path.lineTo(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2);
  path.lineTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
  path.lineTo(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2);
  path.closePath();
  path.moveTo(x0 + w0 / 2, y0);
  path.arc(x0, y0, w0 / 2, 0, TAU);
  path.moveTo(x1 + w1 / 2, y1);
  path.arc(x1, y1, w1 / 2, 0, TAU);
}

/** flat colour in two tones inside `path`: the edge away from the light (`L` is which side it comes from) stays dark; the edge toward it may catch a rim */
function cel(g: G, path: Path2D, fill: string, shade: string, rim: string | undefined, L: number, sw: number, rw: number) {
  const toward = new Path2D(), away = new Path2D();
  toward.addPath(path, new DOMMatrix().translate(L * sw, -sw * 0.45));
  away.addPath(path, new DOMMatrix().translate(-L * rw, rw * 0.45));
  g.fillStyle = shade;
  g.fill(path);
  g.save();
  g.clip(path);
  if (rim) {
    g.fillStyle = rim;
    g.fill(toward);
    g.clip(toward);
    g.fillStyle = fill;
    g.fill(away);
  } else {
    g.fillStyle = fill;
    g.fill(toward);
  }
  g.restore();
}

/** the tails of a headband: two ribbons streaming from (x, y), flat and even, not twigs */
export function tails(g: G, x: number, y: number, len: number, dir: number, now: number, seed: number, wind = 1, colour: string = C.red) {
  if (len <= 1) return;
  const w = len * 0.09, n = 10;
  for (let k = 0; k < 2; k++) {
    const p: number[] = [];
    for (let j = 0; j <= n; j++) {
      const u = j / n, sway = Math.sin(now * 9 + seed + u * 5.2 + k * 1.7) * len * 0.1 * u * wind;
      p.push(x - dir * len * u * lerp(0.2, 1, wind) * (1 - k * 0.2), y + sway + lerp(len * 0.95 * u, (k ? 0.24 : -0.05) * len * u, wind));
    }
    brush(g, p, w + Math.max(3, len * 0.035), C.ink, 2);
    brush(g, p, w, colour, 2);
  }
}

/** where a figure's joints are: feet at (x, y), `h` tall standing, facing `dir` */
export function rig(x: number, y: number, h: number, dir: number, p: Pose) {
  const UP = 0.245, LO = 0.25, TORSO = 0.3, ARM = 0.17, HEAD = 0.084;
  const reach = (a: [number, number]) => Math.cos(a[0]) * UP + Math.cos(a[0] + a[1]) * LO;
  const hx = x, hy = y - Math.max(0.08, reach(p.lF), reach(p.lB)) * h - 0.02 * h;
  const sx = hx + Math.sin(p.lean) * TORSO * h * dir, sy = hy - Math.cos(p.lean) * TORSO * h;
  const ha = p.lean + p.head, r = HEAD * h;
  const cx = sx + Math.sin(ha) * (HEAD + 0.05) * h * dir, cy = sy - Math.cos(ha) * (HEAD + 0.05) * h;
  const limb = (bx: number, by: number, a: [number, number], l1: number, l2: number) => {
    const mx = bx + Math.sin(a[0]) * l1 * h * dir, my = by + Math.cos(a[0]) * l1 * h;
    return [mx, my, mx + Math.sin(a[0] + a[1]) * l2 * h * dir, my + Math.cos(a[0] + a[1]) * l2 * h];
  };
  const ay = sy + 0.03 * h;
  const lF = limb(hx, hy, p.lF, UP, LO), lB = limb(hx, hy, p.lB, UP, LO), aF = limb(sx, ay, p.aF, ARM, ARM), aB = limb(sx, ay, p.aB, ARM, ARM);
  return { h, dir, hx, hy, sx, sy, ay, cx, cy, r, lF, lB, aF, aB, hand: { x: aF[2], y: aF[3] }, hand2: { x: aB[2], y: aB[3] }, head: { x: cx, y: cy }, hip: { x: hx, y: hy }, sh: { x: sx, y: sy } };
}
export type Rig = ReturnType<typeof rig>;

/**
 * A figure: feet at (x, y), `h` tall standing, facing `dir`. A body in two
 * flat tones inside an ink outline, the darker tone (and the light's edge,
 * if there is one) following its silhouette; a hair silhouette; if they have
 * woken, a red headband across the brow whose tails stream behind, and a
 * glint where the eye is.
 */
export function figure(g: G, x: number, y: number, h: number, dir: number, p: Pose, k: Look, now = 0) {
  return drawRig(g, rig(x, y, h, dir, p), k, now);
}
export function drawRig(g: G, q: Rig, k: Look, now = 0) {
  const { h, dir, hx, hy, sx, sy, ay, cx, cy, r, lF, lB, aF, aB } = q;
  const leg = (path: Path2D, l: number[]) => {
    part(path, hx, hy, l[0], l[1], 0.105 * h, 0.078 * h);
    part(path, l[0], l[1], l[2], l[3], 0.078 * h, 0.052 * h);
    part(path, l[2], l[3], l[2] + dir * 0.075 * h, l[3] + 0.012 * h, 0.05 * h, 0.034 * h);
  };
  const arm = (path: Path2D, a: number[]) => {
    part(path, sx, ay, a[0], a[1], 0.072 * h, 0.056 * h);
    part(path, a[0], a[1], a[2], a[3], 0.056 * h, 0.046 * h);
    path.moveTo(a[2] + 0.043 * h, a[3]);
    path.arc(a[2], a[3], 0.043 * h, 0, TAU);
  };
  const back = new Path2D(), body = new Path2D(), front = new Path2D();
  leg(back, lB);
  arm(back, aB);
  part(body, hx, hy, sx, sy, 0.125 * h, 0.175 * h);
  leg(body, lF);
  part(body, sx, sy, cx, cy, 0.06 * h, 0.06 * h);
  body.moveTo(cx + r, cy);
  body.arc(cx, cy, r, 0, TAU);
  arm(front, aF);
  g.save();
  g.lineJoin = "round";
  g.strokeStyle = k.ink ?? C.ink;
  // light comes from the way they face, and from above
  // (the shading that follows the silhouette is only worth its cost on figures big enough to show it)
  const fine = h >= 480, L = dir, sw = h * 0.034, rw = h * 0.016;
  const lay = (path: Path2D, fill: string, lit: boolean) => {
    g.lineWidth = Math.max(2, h * 0.03);
    g.stroke(path);
    if (!lit || !fine) {
      g.fillStyle = fill;
      g.fill(path);
      return;
    }
    cel(g, path, fill, k.shade, k.rim, L, sw, rw);
  };
  lay(back, k.shade, false);
  lay(body, k.body, true);
  // hair: a silhouette the wind can take hold of
  const wind = k.wind ?? 0, sd = k.seed ?? 0, style = k.hair ?? 0;
  const at = (th: number, rad: number): [number, number] => [cx - dir * Math.sin(th) * rad, cy - Math.cos(th) * rad];
  const hairCol = k.ink ?? C.ink;
  if (style === 0) {
    const pts: number[] = [...at(-0.95, r * 1.02)];
    for (let i = 0; i < 5; i++) {
      const th = -0.5 + i * 0.5, sway = Math.sin(now * 9 + i * 1.7 + sd) * 0.12 * wind + 0.22 * wind;
      pts.push(...at(th + sway, r * (1.75 + 0.5 * hash(sd + i))), ...at(th + 0.27, r * 1.04));
    }
    pts.push(...at(2.1, r * 0.9), cx, cy - r * 0.2);
    poly(g, pts, hairCol);
  } else {
    const pts: number[] = [];
    for (let i = 0; i <= 10; i++) pts.push(...at(-1 + i * 0.3, r * 1.09));
    pts.push(cx - dir * r * 0.2, cy - r * 0.15);
    poly(g, pts, hairCol);
    const [bx, by] = at(1.25, r * 1.02);
    if (style === 2 || style === 4) {
      const len = r * (style === 2 ? 2.6 : 3.4), tq: number[] = [];
      for (let j = 0; j <= 6; j++) tq.push(bx - dir * len * (j / 6) * lerp(0.3, 1, wind), by + lerp(len * 0.8, len * 0.1, wind) * (j / 6) + Math.sin(now * 10 + j * 1.1 + sd) * r * 0.3 * (j / 6) * wind);
      brush(g, tq, r * (style === 2 ? 0.75 : 1.5), hairCol, 1);
    } else if (style === 3) disc(g, ...at(1.05, r * 1.42), r * 0.5, hairCol);
  }
  if (k.band) {
    // across the brow, above the eye; knotted at the back
    const fx = cx + dir * r * 0.9, fy = cy - r * 0.52, bx = cx - dir * r * 0.97, by = cy - r * 0.36;
    tails(g, bx, by, h * 0.3 * k.band, dir, now, sd, wind);
    g.lineCap = "butt";
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(lerp(fx, bx, k.band), lerp(fy, by, k.band));
    g.lineWidth = r * 0.44;
    g.strokeStyle = k.ink ?? C.ink;
    g.stroke();
    g.lineWidth = r * 0.27;
    g.strokeStyle = C.red;
    g.stroke();
    disc(g, bx, by, r * 0.2, C.red);
    g.strokeStyle = k.ink ?? C.ink;
  }
  lay(front, k.body, h >= 500);
  if (k.glint) flare(g, cx + dir * r * 0.5, cy + r * 0.12, r * 2.6 * k.glint, C.redHi);
  g.restore();
  return q;
}

/** someone sitting at the table, seen across it: from the front on its far side, from behind (`near`) on ours */
export function sitter(g: G, x: number, y: number, h: number, k: Look, near: boolean, sway: number, lift = 0, now = 0) {
  const sx = x + sway * h * 0.035, sy = y - 0.31 * h, half = 0.1 * h, hx = sx + sway * h * 0.03, hy = sy - 0.13 * h, r = 0.088 * h;
  const body = new Path2D();
  if (near) for (const s of [-1, 1]) part(body, x + s * 0.05 * h, y, x + s * 0.085 * h, y + 0.36 * h, 0.085 * h, 0.06 * h);
  part(body, x, y, sx, sy + 0.03 * h, 0.15 * h, 0.2 * h);
  for (const s of [-1, 1]) {
    const up = s > 0 ? lift : 0, ex = sx + s * (half + 0.085 * h), ey = sy + (0.17 - 0.24 * up) * h;
    part(body, sx + s * half, sy + 0.03 * h, ex, ey, 0.07 * h, 0.055 * h);
    part(body, ex, ey, sx + s * (near ? 0.05 : 0.07 + 0.13 * up) * h, sy + ((near ? 0.1 : 0.21) - 0.55 * up) * h, 0.055 * h, 0.05 * h);
  }
  body.moveTo(hx + r, hy);
  body.arc(hx, hy, r, 0, TAU);
  g.save();
  g.lineJoin = "round";
  g.lineWidth = Math.max(2, h * 0.03);
  g.strokeStyle = C.ink;
  g.stroke(body);
  if (h >= 300) cel(g, body, k.body, k.shade, k.rim, 1, h * 0.034, h * 0.016);
  else {
    g.fillStyle = k.body;
    g.fill(body);
  }
  // hair (the whole head, from behind), and the band
  const pts: number[] = [];
  for (let i = 0; i <= 10; i++) pts.push(hx + Math.cos(Math.PI + (i / 10) * Math.PI) * r * 1.1, hy + Math.sin(Math.PI + (i / 10) * Math.PI) * r * 1.1 * (near ? 1 : 0.95));
  if (near) pts.push(hx + r * 1.05, hy + r * 0.75, hx - r * 1.05, hy + r * 0.75);
  poly(g, pts, C.ink);
  if (k.band) {
    g.fillStyle = C.red;
    g.fillRect(hx - r * 1.02, hy - r * (near ? 0.1 : 0.42), r * 2.04, r * 0.3);
    if (near) tails(g, hx + r * 0.2, hy + r * 0.05, h * 0.2, 1, now, k.seed ?? 0, 0.25);
  }
  g.restore();
}

/** a row of a crowd, far enough off to be shapes: heads, shoulders, fists that rise on `punch` (0..1) */
export function crowd(g: G, x0: number, x1: number, y: number, n: number, h: number, colour: string, seed: number, punch = 0, now = 0) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + hash(seed + i) * 0.7) / n), hh = h * (0.85 + 0.3 * hash(seed + i * 2.1)), up = punch * (0.5 + 0.5 * hash(seed + i * 5.3)) + Math.sin(now * 7 + i) * 0.04;
    const w = hh * 0.2;
    g.moveTo(x - w, y);
    g.lineTo(x - w * 0.8, y - hh * 0.62);
    g.lineTo(x + w * 0.8, y - hh * 0.62);
    g.lineTo(x + w, y);
    g.closePath();
    g.moveTo(x + hh * 0.1, y - hh * 0.76);
    g.arc(x, y - hh * 0.76, hh * 0.1, 0, TAU);
    if (hash(seed + i * 7.7) < 0.75) {
      const ax = x + w * 0.9, ay = y - hh * 0.58, fy = y - hh * (0.75 + 0.42 * up);
      g.moveTo(ax - hh * 0.035, ay);
      g.lineTo(ax + hh * 0.03, fy);
      g.lineTo(ax + hh * 0.1, fy);
      g.lineTo(ax + hh * 0.04, ay);
      g.closePath();
      g.moveTo(ax + hh * 0.125, fy);
      g.arc(ax + hh * 0.065, fy, hh * 0.06, 0, TAU);
    }
  }
  g.fillStyle = colour;
  g.fill();
}

// ── close-ups ───────────────────────────────────────────────────────────────
/** an eye, `w` wide. `open` 0..1 (a little more is wide with shock); `brow` -1 worn out .. 1 fierce; `lit` makes the iris burn */
export function eye(g: G, x: number, y: number, w: number, o: { open: number; iris: string; lit?: number; brow?: number; dir?: number; look?: number; tired?: number }) {
  const d = o.dir ?? 1, op = Math.max(0, o.open), up = w * 0.3 * op, dn = w * 0.12 * op, brow = o.brow ?? 0, lit = o.lit ?? 0;
  const ix = x - d * w * 0.5, iy = y + w * 0.045, ox = x + d * w * 0.5, oy = y - w * 0.05;
  const top = bez(ix, iy, x - d * w * 0.3, y - up * 1.5, x + d * w * 0.26, y - up * 1.55 - w * 0.02, ox, oy, 16);
  const bot = bez(ox, oy, x + d * w * 0.3, y + dn * 1.9 + w * 0.02, x - d * w * 0.24, y + dn * 1.8 + w * 0.03, ix, iy, 12);
  g.save();
  if (op > 0.04) {
    g.save();
    poly(g, [...top, ...bot], "#fdfbf4");
    g.clip();
    // the lid's shadow on the white
    poly(g, [...top, ox, oy - w * 0.02, x, y - up * 0.72, ix, iy], "#d5dbe4");
    const ex = x + (o.look ?? 0) * w * 0.1, ey = y - up * 0.26 + dn * 0.3, ir = w * 0.2;
    disc(g, ex, ey, ir, C.ink);
    disc(g, ex, ey, ir * 0.9, o.iris);
    if (lit > 0) {
      const gr = g.createRadialGradient(ex, ey, ir * 0.15, ex, ey, ir * 0.9);
      gr.addColorStop(0, `rgba(255,236,170,${0.95 * lit})`);
      gr.addColorStop(0.6, `rgba(255,120,60,${0.6 * lit})`);
      gr.addColorStop(1, "rgba(255,90,40,0)");
      g.fillStyle = gr;
      g.fillRect(ex - ir, ey - ir, ir * 2, ir * 2);
    }
    // the iris's rays, the pupil, the light in it
    g.strokeStyle = "rgba(23,17,28,0.35)";
    g.lineWidth = w * 0.006;
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU;
      g.moveTo(ex + Math.cos(a) * ir * 0.45, ey + Math.sin(a) * ir * 0.45);
      g.lineTo(ex + Math.cos(a) * ir * 0.85, ey + Math.sin(a) * ir * 0.85);
    }
    g.stroke();
    disc(g, ex, ey, ir * (lit > 0 ? 0.3 : 0.42), C.ink);
    disc(g, ex - d * ir * 0.38, ey - ir * 0.4, ir * 0.24, "#ffffff");
    disc(g, ex + d * ir * 0.34, ey + ir * 0.36, ir * 0.1, "#ffffff");
    g.restore();
  }
  // the lids: a heavy brushed upper line with a flick at the outer corner; a light lower one
  brush(g, top, w * 0.075, C.ink, 0);
  brush(g, [ox - d * w * 0.05, oy + w * 0.01, ox + d * w * 0.05, oy - w * 0.035, ox + d * w * 0.11, oy - w * 0.1], w * 0.05, C.ink, 1);
  brush(g, bot.slice(4, 18), w * 0.018, C.ink, 0);
  brush(g, bez(ix + d * w * 0.1, y - up * 1.5 - w * 0.07, x - d * w * 0.1, y - up * 1.9 - w * 0.09, x + d * w * 0.2, y - up * 1.9 - w * 0.1, ox - d * w * 0.06, oy - w * 0.12, 10), w * 0.014, C.ink, 0);
  if (o.tired) {
    g.globalAlpha = o.tired;
    brush(g, bez(ix + d * w * 0.12, y + dn + w * 0.13, x - d * w * 0.1, y + dn + w * 0.2, x + d * w * 0.15, y + dn + w * 0.2, ox - d * w * 0.12, y + dn + w * 0.1, 10), w * 0.02, "#8a97a8", 0);
    brush(g, bez(ix + d * w * 0.2, y + dn + w * 0.2, x - d * w * 0.05, y + dn + w * 0.26, x + d * w * 0.1, y + dn + w * 0.26, ox - d * w * 0.2, y + dn + w * 0.18, 8), w * 0.012, "#8a97a8", 0);
    g.globalAlpha = 1;
  }
  // the brow: low at the nose when fierce, sagging outward when worn out
  const by = y - w * 0.37 - up * 0.25;
  brush(g, [x - d * w * 0.56, by + brow * w * 0.13, x - d * w * 0.2, by - w * 0.02 + brow * w * 0.04, x + d * w * 0.2, by - w * 0.05 - brow * w * 0.04, x + d * w * 0.62, by - brow * w * 0.1 + w * 0.02], w * 0.11, C.ink, 1);
  g.restore();
}

/** a fist, knuckles to the right, `s` wide, its forearm running off down and left */
export function fist(g: G, x: number, y: number, s: number, rot: number, col: string, shade: string, rim?: string) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const o = 0.045;
  poly(g, [-0.42, -0.4, -4.2, -0.62, -4.2, 0.62, -0.42, 0.44], col, C.ink, o);
  poly(g, [-0.42, 0.1, -4.2, 0.2, -4.2, 0.62, -0.42, 0.44], shade);
  poly(g, [-0.52, -0.5, 0.36, -0.56, 0.56, -0.38, 0.62, 0.3, 0.44, 0.52, -0.5, 0.5], col, C.ink, o);
  poly(g, [-0.5, 0.2, 0.6, 0.12, 0.62, 0.3, 0.44, 0.52, -0.5, 0.5], shade);
  if (rim) poly(g, [-0.5, -0.5, 0.36, -0.56, 0.56, -0.38, 0.5, -0.36, 0.33, -0.48, -0.5, -0.42], rim);
  g.lineCap = "round";
  g.strokeStyle = C.ink;
  g.lineWidth = o * 0.8;
  g.beginPath();
  for (const fy of [-0.3, -0.06, 0.18]) {
    g.moveTo(0.02, fy);
    g.lineTo(0.6, fy + 0.02);
  }
  g.moveTo(0.02, -0.52);
  g.lineTo(0.02, 0.4);
  g.stroke();
  // the thumb, locked across
  poly(g, [-0.2, 0.02, 0.26, -0.04, 0.36, 0.12, 0.26, 0.3, -0.24, 0.3], col, C.ink, o);
  poly(g, [-0.22, 0.2, 0.3, 0.2, 0.26, 0.3, -0.24, 0.3], shade);
  g.restore();
}

// ── marks ───────────────────────────────────────────────────────────────────
/** streaks, running left to right across a box */
export function speed(g: G, x0: number, y0: number, x1: number, y1: number, n: number, colour: string, seed: number, len = 0.5) {
  g.fillStyle = colour;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, hash(seed + i * 1.7)), w = (x1 - x0) * len * (0.3 + hash(seed + i * 3.1)), x = lerp(x0 - w, x1, hash(seed + i * 5.3)), th = 2 + 10 * hash(seed + i * 7.7);
    g.moveTo(x, y);
    g.lineTo(x + w, y - th / 2);
    g.lineTo(x + w, y + th / 2);
    g.closePath();
  }
  g.fill();
}
/** lines rushing in on a point from all round, leaving it clear to `r0` */
export function focus(g: G, cx: number, cy: number, r0: number, R: number, n: number, colour: string, seed: number) {
  g.fillStyle = colour;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = ((i + hash(seed + i) * 0.8) / n) * TAU, w = 0.005 + 0.02 * hash(seed + i * 2.3), r = r0 * (0.75 + 0.7 * hash(seed + i * 4.1));
    g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    g.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    g.closePath();
  }
  g.fill();
}
/** a jagged star */
export function burst(g: G, x: number, y: number, r0: number, r1: number, n: number, fill: string, seed: number, stroke?: string, lw = 0) {
  const p: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU + hash(seed) * 3, r = i % 2 ? r0 * (0.8 + 0.4 * hash(seed + i)) : r1 * (0.7 + 0.6 * hash(seed + i * 1.3));
    p.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  poly(g, p, fill, stroke, lw);
}
export function ring(g: G, x: number, y: number, r: number, w: number, colour: string) {
  if (r <= 0 || w <= 0) return;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.lineWidth = w;
  g.strokeStyle = colour;
  g.stroke();
}
/** a four-pointed glint */
export function flare(g: G, x: number, y: number, r: number, colour: string) {
  if (r <= 0) return;
  g.save();
  g.globalCompositeOperation = "lighter";
  const k = 0.07;
  poly(g, [x - r, y, x - r * k, y - r * k, x, y - r * 0.62, x + r * k, y - r * k, x + r, y, x + r * k, y + r * k, x, y + r * 0.62, x - r * k, y + r * k], colour);
  poly(g, [x - r * 1.9, y, x, y - r * 0.03, x + r * 1.9, y, x, y + r * 0.03], colour);
  g.restore();
  disc(g, x, y, r * 0.13, "#fffdf2");
}
/** sparks thrown from a point, `age` seconds ago */
export function sparks(g: G, x: number, y: number, n: number, age: number, seed: number, colour: string, power = 600, grav = 900) {
  if (age < 0) return;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const life = 0.35 + 0.5 * hash(seed + i * 3.3);
    if (age > life) continue;
    const a = hash(seed + i) * TAU, sp = power * (0.3 + hash(seed + i * 2.1));
    const px = x + Math.cos(a) * sp * age, py = y + Math.sin(a) * sp * age + grav * age * age, l = 16 + 40 * (1 - age / life);
    g.moveTo(px, py);
    g.lineTo(px - Math.cos(a) * l, py - Math.sin(a) * l - grav * age * 0.03);
  }
  g.lineWidth = 5;
  g.lineCap = "round";
  g.strokeStyle = colour;
  g.stroke();
}
/** a puff of dust, cel-style: a pale blob with a shaded underside */
export function dust(g: G, x: number, y: number, r: number, age: number, seed: number, colour: string, shade: string) {
  const life = 0.9;
  if (age < 0 || age > life) return;
  const k = out(age / life);
  g.globalAlpha = 1 - seg(age, life * 0.5, life);
  for (let i = 0; i < 4; i++) {
    const a = hash(seed + i) * TAU, d = r * 0.7 * k, px = x + Math.cos(a) * d * 1.4, py = y - Math.abs(Math.sin(a)) * d - r * 0.4 * k, rr = r * (0.5 + 0.4 * hash(seed + i * 2)) * (0.5 + 0.6 * k);
    disc(g, px, py + rr * 0.12, rr, shade);
    disc(g, px, py - rr * 0.08, rr * 0.9, colour);
  }
  g.globalAlpha = 1;
}
/** rays of light fanning from a point */
export function rays(g: G, x: number, y: number, R: number, spin: number, colour: string, n = 18, width = 0.5) {
  g.fillStyle = colour;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * TAU, w = (TAU / n) * width * 0.5 * (0.7 + 0.6 * hash(i * 3.1));
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a - w) * R, y + Math.sin(a - w) * R);
    g.lineTo(x + Math.cos(a + w) * R, y + Math.sin(a + w) * R);
    g.closePath();
  }
  g.fill();
}

// ── things ──────────────────────────────────────────────────────────────────
/** a flag flying from the top of its pole at (x, y): cloth, its folds travelling along it; `speedK` is how fast it rolls */
export function flag(g: G, x: number, y: number, w: number, h: number, dir: number, now: number, seed: number, open = 1, speedK = 1) {
  const n = 18, T: number[] = [], B: number[] = [], ph: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, f = u * 7.4 - now * 5.5 * speedK + seed, amp = h * 0.15 * (0.2 + 0.8 * u);
    const px = x + dir * w * open * (u - 0.025 * Math.sin(f + 1) * u);
    ph.push(f);
    T.push(px, y + Math.sin(f) * amp + (1 - open) * h * 0.5 * u);
    B.push(px - dir * w * 0.02 * u, y + Math.sin(f - 0.55) * amp * 1.1 + h * (1 - 0.07 * u) * lerp(0.45, 1, open) + (1 - open) * h * 0.4 * u);
  }
  const rev: number[] = [];
  for (let i = n; i >= 0; i--) rev.push(B[i * 2], B[i * 2 + 1]);
  const mid = [lerp(T[n * 2], B[n * 2], 0.5) - dir * w * 0.045, lerp(T[n * 2 + 1], B[n * 2 + 1], 0.5)];
  const edge = [...T, ...mid, ...rev];
  poly(g, edge, C.red);
  // where the cloth turns from the light, the darker red; on the crests, a lighter one
  for (let i = 1, from = -1; i <= n; i++) {
    const dark = i < n && Math.cos((ph[i] + ph[i + 1]) / 2 - 0.3) < -0.45;
    if (dark && from < 0) from = i;
    if (!dark && from >= 0) {
      const m = (from + i) / 2, k = Math.floor(m), f = m - k, wedge: number[] = [];
      for (let j = from; j <= i; j++) wedge.push(T[j * 2], T[j * 2 + 1]);
      const tx = lerp(T[k * 2], T[Math.min(n, k + 1) * 2], f), ty = lerp(T[k * 2 + 1], T[Math.min(n, k + 1) * 2 + 1], f);
      const bx = lerp(B[k * 2], B[Math.min(n, k + 1) * 2], f), by = lerp(B[k * 2 + 1], B[Math.min(n, k + 1) * 2 + 1], f);
      wedge.push(lerp(tx, bx, 0.82) - dir * w * 0.02, lerp(ty, by, 0.82));
      poly(g, wedge, C.redD);
      from = -1;
    }
  }
  poly(g, edge, undefined, C.ink, Math.max(3, h * 0.028));
}
/** the boss: a top hat, its band gold, a cigar under the brim. (x, y) is the middle of the brim */
export function hat(g: G, x: number, y: number, s: number, rot: number, now: number, o: { ember?: number; glint?: number; smoke?: number; col?: string } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  const col = o.col ?? C.ink;
  if (o.smoke) {
    const p: number[] = [];
    for (let j = 0; j <= 9; j++) p.push(-156 - j * 5 + Math.sin(now * 1.6 + j * 0.8) * (4 + j * 2.4), 34 - j * 20);
    g.globalAlpha = 0.6 * o.smoke;
    brush(g, p, 16, "#eef3f8", 0);
    g.globalAlpha = 1;
  }
  poly(g, [-74, 22, -150, 34, -152, 48, -72, 38], "#7a5642", C.ink, 3);
  disc(g, -152, 41, 8, C.redHi);
  if (o.ember) flare(g, -152, 41, 26 * o.ember, C.redHi);
  poly(g, [-58, 2, -68, -118, -42, -130, 42, -130, 68, -118, 58, 2], col);
  g.beginPath();
  g.ellipse(0, 2, 112, 18, 0, 0, TAU);
  g.fillStyle = col;
  g.fill();
  poly(g, [-59, -8, -61, -32, 61, -32, 59, -8], C.gold);
  poly(g, [-59, -8, -60, -16, 60, -16, 59, -8], C.goldD);
  poly(g, [30, -36, 36, -120, 50, -116, 44, -36], "#3b3148");
  if (o.glint) flare(g, -18, 26, 44 * o.glint, C.goldHi);
  g.restore();
}
/** a riot shield standing on (x, y): a slab with a slit to look through */
export function shield(g: G, x: number, y: number, w: number, h: number, o: { rot?: number; flare?: number } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(o.rot ?? 0);
  const a = w / 2, c = w * 0.16;
  poly(g, [-a + c, -h, a - c, -h, a, -h + c, a, 0, -a, 0, -a, -h + c], C.slate, C.ink, Math.max(3, w * 0.035));
  poly(g, [w * 0.08, -h, a - c, -h, a, -h + c, a, 0, w * 0.08, 0], C.slateD);
  poly(g, [-a + c, -h + w * 0.04, -a + c * 1.5, -h + w * 0.04, -a + w * 0.09, 0, -a + w * 0.04, 0, -a + w * 0.04, -h + c], C.slateHi);
  poly(g, [-a * 0.7, -h * 0.76, a * 0.7, -h * 0.76, a * 0.7, -h * 0.69, -a * 0.7, -h * 0.69], C.goldHi, C.ink, Math.max(2, w * 0.02));
  if (o.flare) flare(g, -a * 0.3, -h * 0.725, w * 0.9 * o.flare, C.goldHi);
  g.restore();
}
export function gear(g: G, x: number, y: number, r: number, a: number, colour: string = C.steel) {
  const teeth = 9, p: number[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const th = a + (i / (teeth * 4)) * TAU, rr = i % 4 < 2 ? r : r * 0.78;
    p.push(x + Math.cos(th) * rr, y + Math.sin(th) * rr);
  }
  poly(g, p, colour, C.ink, Math.max(3, r * 0.07));
  disc(g, x, y, r * 0.34, C.ink);
  disc(g, x, y, r * 0.2, C.wallLo);
}
export function coin(g: G, x: number, y: number, r: number, turn = 1) {
  const w = Math.max(0.18, Math.abs(turn)) * r;
  g.beginPath();
  g.ellipse(x, y, w, r, 0, 0, TAU);
  g.fillStyle = C.gold;
  g.fill();
  g.lineWidth = Math.max(1.5, r * 0.16);
  g.strokeStyle = C.goldD;
  g.stroke();
  g.beginPath();
  g.ellipse(x - w * 0.25, y - r * 0.25, w * 0.3, r * 0.3, 0, 0, TAU);
  g.fillStyle = C.goldHi;
  g.fill();
}

// ── type ────────────────────────────────────────────────────────────────────
/** a word slammed onto the picture: it lands big and settles (`p` 0..1), ink a step behind it */
export function slam(g: G, text: string, x: number, y: number, size: number, p: number, font: string, colour: string, rot = -0.05) {
  if (p <= 0) return;
  const s = lerp(2.6, 1, outBack(clamp(p)));
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s, s);
  g.font = `400 ${size}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = size * 0.07;
  g.strokeStyle = C.ink;
  g.fillStyle = C.ink;
  g.strokeText(text, size * 0.04, size * 0.045);
  g.fillText(text, size * 0.04, size * 0.045);
  g.strokeText(text, 0, 0);
  g.fillStyle = colour;
  g.fillText(text, 0, 0);
  g.restore();
}
/** a time clock's stamp */
export function stamp(g: G, text: string, x: number, y: number, size: number, p: number, font: string, colour: string) {
  if (p <= 0) return;
  g.save();
  g.translate(x, y);
  g.rotate(-0.07);
  const sc = lerp(1.8, 1, out(clamp(p * 6)));
  g.scale(sc, sc);
  g.font = `400 ${size}px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const tw = g.measureText(text).width;
  g.fillStyle = "rgba(251,246,234,0.9)";
  g.fillRect(-tw / 2 - size * 0.3, -size * 0.62, tw + size * 0.6, size * 1.24);
  g.lineWidth = size * 0.08;
  g.strokeStyle = colour;
  g.strokeRect(-tw / 2 - size * 0.3, -size * 0.62, tw + size * 0.6, size * 1.24);
  g.fillStyle = colour;
  g.fillText(text, 0, size * 0.05);
  g.restore();
}
/** cut-out letters, pasted on one by one (`shown` of them), each on its own scrap */
export function ransom(g: G, text: string, x: number, y: number, size: number, shown: number, fonts: string[], seed: number) {
  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  const widths = [...text].map((ch) => (ch === " " ? size * 0.4 : size * (0.62 + 0.12 * hash(seed + ch.charCodeAt(0)))));
  const total = widths.reduce((a, b) => a + b, 0) + size * 0.08 * (text.length - 1);
  let cx = x - total / 2;
  [...text].forEach((ch, k) => {
    const w = widths[k];
    if (ch !== " " && k < shown) {
      const pop = outBack(clamp(shown - k));
      const style = Math.floor(hash(seed + k * 3.7) * 3);
      g.save();
      g.translate(cx + w / 2, y + (hash(seed + k) - 0.5) * size * 0.14);
      g.rotate((hash(seed + k * 1.9) - 0.5) * 0.22);
      g.scale(pop, pop);
      g.fillStyle = style === 0 ? C.ink : style === 1 ? C.red : C.paper;
      g.fillRect(-w / 2, -size * 0.56, w, size * 1.12);
      g.lineWidth = Math.max(2, size * 0.03);
      g.strokeStyle = C.ink;
      g.strokeRect(-w / 2, -size * 0.56, w, size * 1.12);
      g.fillStyle = style === 2 ? C.ink : C.paper;
      g.font = `${style === 1 ? 700 : 400} ${size * (style === 1 ? 0.78 : 0.9)}px ${fonts[style % fonts.length]}`;
      g.fillText(ch, 0, size * 0.04);
      g.restore();
    }
    cx += w + size * 0.08;
  });
  g.restore();
}

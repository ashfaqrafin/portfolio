import { Cloth } from "./cloth";
import { paintFlag } from "./flags";
import {
  COMRADES, LAYERS, SEQ, type Particle, type Placed, type Seq, type World,
  type Walk, at, bubble, clamp, cover, derive, desaturate, ease, fade, feathered, frame, hash, lerp, mark, out, outBack, paper, pick, raggedCircle, seg, vignette, walker,
} from "./kit";
import { BUBBLES, FLAGS } from "./story";
import { border, makeMesh, waveFlag, type Mesh, type Wave } from "./wave";

/* The seven chapters, drawn. Each scene draws the whole stage from the
   story time (w.t) and, for what keeps moving on its own (walking, wind,
   fire), real time (w.now). Sizes are fractions of the stage, so a phone held
   upright gets the same story, framed tighter. */

const INK = "#16100f";
const unit = (w: World) => w.H / 900;
/** a body's height on this stage (`f` of the height, but never too wide on a phone) */
const body = (w: World, f: number, maxW = 0.95) => (w.portrait ? Math.min(w.H * f, w.W * maxW) : w.H * f);

/* the way the stick runs back from its end, in each frame of raising it and
   in the student's walk (unit vectors): a flag's hoist lies along its stick */
const RAISE_STICK = [[-0.79, 0.61], [-0.376, 0.927], [-0.89, 0.455], [-0.9, 0.434]];
const SHOULDER_STICK = [0.824, 0.568];

/** this frame's grid for a flag that only flies (kept by name) */
function waving(w: World, key: string, nx: number, ny: number, o: Wave): Mesh {
  let m = w.state.meshes.get(key);
  if (!m || m.nx !== nx || m.ny !== ny) {
    m = makeMesh(nx, ny);
    w.state.meshes.set(key, m);
  }
  waveFlag(m, o);
  return m;
}

type Flown = { mesh: Mesh; pic: HTMLCanvasElement; ink: number; alpha?: number };
/** a layer of flags: each drawn lit, then inked round (ink 0: no line) */
function flagLayer(w: World, flags: Flown[]) {
  if (!flags.length) return;
  const { g } = w;
  const gl = w.state.gl;
  gl.begin(g, w.W, w.H, w.dpr);
  for (const f of flags) gl.draw(f.mesh, f.pic, null, f.alpha ?? 1);
  gl.end();
  g.save();
  g.strokeStyle = INK;
  g.lineJoin = "round";
  for (const f of flags) {
    if (f.ink <= 0) continue;
    g.lineWidth = f.ink;
    g.globalAlpha = f.alpha ?? 1;
    border(g, f.mesh);
    g.stroke();
  }
  g.restore();
}

function redTex(w: World) {
  if (!w.state.ragTex) w.state.ragTex = paintFlag("red");
  return w.state.ragTex;
}

/** a pre-greyed copy of a layer or atlas (drawn in front of something in colour) */
function greyed(w: World, key: string, amount = 0.82) {
  return derive(w, `grey:${key}`, key, (_, g, c) => {
    const d = g.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const l = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      p[i] += (l - p[i]) * amount;
      p[i + 1] += (l - p[i + 1]) * amount;
      p[i + 2] += (l - p[i + 2]) * amount;
    }
    g.putImageData(d, 0, 0);
  });
}

/** a darkened copy (the shields, in the night) */
function shaded(w: World, key: string, colour: string) {
  return derive(w, `shade:${key}:${colour}`, key, (_, g, c) => {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = colour;
    g.fillRect(0, 0, c.width, c.height);
  });
}

function pole(w: World, ax: number, ay: number, bx: number, by: number, width: number, colour = "#4b3324") {
  const { g } = w;
  g.save();
  g.lineCap = "round";
  g.strokeStyle = INK;
  g.lineWidth = width + 2;
  g.beginPath();
  g.moveTo(ax, ay);
  g.lineTo(bx, by);
  g.stroke();
  g.strokeStyle = colour;
  g.lineWidth = width;
  g.stroke();
  g.restore();
}

// ── I. the stairs ───────────────────────────────────────────────────────────
export function stairs(w: World) {
  const { g, W, H, t, now } = w;
  cover(w, pick(w, "sky-storm"), { zoom: 1.08, dx: w.reduced ? 0 : Math.sin(now * 0.06) * 18 });
  const im = w.img("stairs");
  if (im) {
    const ih = H * 1.9, iw = (ih * im.width) / im.height;
    const p = ease(seg(t, 0.3, 3.2));
    const y = lerp(-0.02 * H, H - ih, p);
    const x = (W - iw) / 2;
    g.drawImage(im, x, y, iw, ih);
    const crowd = w.img("masked");
    if (crowd) {
      // the few, tiny, at the top in the light
      for (const [k, fx] of [[1, 0.47], [4, 0.53]] as const) frame(w, "crowd", k, x + iw * fx, y + ih * 0.17, ih * 0.03, { alpha: 0.7 });
      // the many at the bottom, heads down
      const a = seg(t, 2.2, 3.4);
      if (a > 0) {
        const n = w.portrait ? 7 : 11;
        const order = [1, 7, 8, 4, 5, 9, 2, 10, 6, 1, 7];
        for (let k = 0; k < n; k++) {
          const fx = (k + 0.5) / n;
          frame(w, "crowd", order[k], lerp(0.08 * W, 0.92 * W, fx) + (hash(k) - 0.5) * 18, y + ih * (0.985 - hash(k + 9) * 0.02), H * (0.19 + hash(k + 3) * 0.03), { alpha: a });
        }
      }
    }
  }
  desaturate(w, 0.55);
  vignette(w, 0.7);
}

// ── I–II. the street ────────────────────────────────────────────────────────
export function street(w: World) {
  const { g, W, H, t, now } = w;
  const u = unit(w);
  const hB = body(w, 0.5, 0.95);
  const feetY = 0.95 * H;
  /* the rag on its spike hangs just where his raised hand reaches; the
     railing stands behind him, its foot hidden in the street's shadow */
  const clothX = W * (w.portrait ? 0.56 : 0.54), clothY = feetY - 1.11 * hB;
  const rk = (0.8 * H - clothY) / 313;
  const rx = clothX - 575 * rk, ry = 0.8 * H - 768 * rk;
  const stopX = clothX - 0.05 * hB;

  // a slow push in over the chapter
  const push = w.reduced ? 1 : 1 + 0.05 * ease(seg(t, 7, 21.5));
  g.save();
  g.translate(clothX, H * 0.55);
  g.scale(push, push);
  g.translate(-clothX, -H * 0.55);

  cover(w, pick(w, "sky-storm"), { zoom: 1.12, dx: w.reduced ? 0 : Math.sin(now * 0.05) * 14 });
  const sky = w.img("skyline");
  if (sky) {
    const sw = w.portrait ? W * 2.6 : W * 1.15, sh = (sw * sky.height) / sky.width;
    g.drawImage(sky, (W - sw) / 2, H * 0.6 - sh * 0.75, sw, sh);
  }
  cover(w, w.img("street"), { zoom: 1.04, ay: 0.55 });
  desaturate(w, 0.8);
  // from here on everything is drawn already greyed, so the red can stay red
  const rail = greyed(w, "railing");
  if (rail) g.drawImage(rail, rx, ry, 1376 * rk, 768 * rk);
  const rag = w.img("railing-cloth");
  if (rag && t < 12.45) {
    const p = seg(t, 12.2, 12.45);
    const dx = p * (stopX + 0.06 * hB - clothX), dy = p * (feetY - 0.62 * hB - clothY);
    g.save();
    g.globalAlpha = 1 - p;
    g.drawImage(rag, rx + dx, ry + dy, 1376 * rk, 768 * rk);
    g.restore();
  }
  // the street he walks on, in the buildings' shadow (the railing's foot in it)
  const gr = g.createLinearGradient(0, H * 0.7, 0, H * 0.86);
  gr.addColorStop(0, "rgba(21,18,24,0)");
  gr.addColorStop(1, "rgba(21,18,24,0.94)");
  g.fillStyle = gr;
  g.fillRect(-W, H * 0.7, W * 3, H * 0.5);

  // the hero: grey like everything else until he takes hold of the rag
  const atlas = t < 12.2 ? greyed(w, "hero") : null;
  let placed: Placed | null = null;
  if (t < 10.6) {
    const p = seg(t, 7.4, 10.6);
    const f = p < 0.75 ? p * 1.1 : 0.825 + (1 - Math.pow(1 - (p - 0.75) / 0.25, 2)) * 0.175;
    const x0 = -0.25 * W, x = lerp(x0, stopX, f);
    // his steps are as long as his stride: the frame is how far he's come
    walker(w, "walk", (8 * (x - x0)) / ((SEQ.walk.stride ?? 0.65) * hB), x, feetY, hB, { atlas, blend: p < 1 });
  } else if (t < 14.2) {
    const k = t < 11.6 ? 0 : t < 12.2 ? 1 : t < 12.8 ? 2 : 3;
    placed = frame(w, "pickup", k, stopX, feetY, hB, { atlas });
  } else if (t < 17.6) {
    const k = t < 15.2 ? 0 : t < 16.3 ? 1 : 2;
    placed = frame(w, "tie", k, stopX, feetY, hB);
  } else {
    const k = t < 18.2 ? 0 : t < 18.8 ? 1 : t < 20.0 ? 2 : 3;
    const shake = k === 3 && !w.reduced ? Math.sin(now * 61) * 1.6 * u : 0;
    placed = frame(w, "raise", k, stopX + shake, feetY, hB);
  }
  // the rag, tied on now, flies from the stick's end
  if (t >= 17.6 && placed) {
    const p = placed as Placed;
    const tip = at(p, p.f[6], p.f[7]);
// its hoist lies along the stick's end, however he holds the stick, and it flies off downwind
    const [sx, sy] = RAISE_STICK[SEQ.raise.frames.indexOf(p.f)] ?? [0, 1];
    // (downwind, and a little down off the stick, so it keeps its breadth when the stick is held flat overhead)
    const down = sx < 0 ? [-sy, sx] : [sy, -sx];
    const fl = Math.hypot(0.75 + 0.45 * Math.abs(down[0]), 0.45 * Math.abs(down[1]));
    const mesh = waving(w, "street", 18, 12, { x: tip.x, y: tip.y, hx: sx, hy: sy, len: 0.36 * hB, height: 0.22 * hB, dir: 1, fly: [(0.75 + 0.45 * Math.abs(down[0])) / fl, (0.45 * Math.abs(down[1])) / fl], time: now, phase: 1.3, wind: 0.95, open: out(seg(t, 17.6, 18.3)) });
    flagLayer(w, [{ mesh, pic: redTex(w), ink: 1.6 * u }]);
  }
  const wall = greyed(w, "wall");
  if (wall) {
    const wh = H * 1.25, ww = (wh * wall.width) / wall.height;
    g.drawImage(wall, (w.portrait ? 0.06 : 0.13) * W - 0.62 * ww, -H * 0.12, ww, wh);
  }
  g.restore();
  vignette(w, 0.6);
}

// ── II. two hands on one pole ───────────────────────────────────────────────
export function hands(w: World) {
  const { g, W, H, t } = w;
  const u = unit(w);
  paper(w, "#f1e9da");
  speedLines(w, W / 2, H * 0.55, Math.hypot(W, H) * 0.18, 0.55);
  const hh = H * (w.portrait ? 0.34 : 0.42);
  const k = hh / 430;
  const px = W / 2;
  // one pole through both fists
  const f0 = frame0("hands", 0), f1 = frame0("hands", 1);
  const barW = Math.max(f0[8], f1[8]) * k;
  g.fillStyle = INK;
  g.fillRect(px - barW / 2, -10, barW, H + 20);
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.fillRect(px + barW * 0.12, -10, barW * 0.1, H + 20);
  frame(w, "hands", 0, px + (f0[4] - f0[6]) * k, H * 0.5, hh);
  const p = seg(t, 22.6, 22.85);
  if (p > 0) {
    const dx = (1 - outBack(p)) * W * 0.45;
    frame(w, "hands", 1, px + (f1[4] - f1[6]) * k + dx, H * 0.5 + hh * 0.98, hh);
  }
  panelBorder(w, 7 * u);
}

/** a frame's numbers: [x, y, w, h, anchor x, anchor y, ...its marks] */
const frame0 = (seq: Seq, k: number) => SEQ[seq].frames[k];

// ── III. the march ──────────────────────────────────────────────────────────
type Marcher = { seq: Seq; slot: number; dy: number; join: number; phase: number };
const FRONT: Marcher[] = [
  { seq: "keffiyeh", slot: -2.05, dy: 0.006, join: 33.3, phase: 5 },
  { seq: "student", slot: -1.02, dy: -0.006, join: 29.3, phase: 2 },
  { seq: "carry", slot: 0, dy: 0, join: -1, phase: 0 },
  { seq: "worker", slot: 0.98, dy: 0.01, join: -1, phase: 4 },
  { seq: "farmer", slot: 1.98, dy: -0.008, join: 30.6, phase: 6 },
  { seq: "rickshaw", slot: 2.98, dy: 0.004, join: 34.6, phase: 1 },
];
const CAST: Seq[] = ["worker", "student", "farmer", "keffiyeh", "rickshaw", "walk"];
const HAZE = "#b98268";
/** who carries a bamboo in their drawing: their frames aren't cross-faded (the stick would show double) */
const STICK = new Set<Seq>(["student", "farmer"]);

/* the bamboo someone carries (drawn in their hand, in the "carry" frames),
   carried on up past its drawn end: where the flag's hoist starts, and the
   way the bamboo points */
function bamboo(wk: Walk, more: number) {
  const top = mark(wk, 6), low = mark(wk, 8);
  const d = Math.hypot(top.x - low.x, top.y - low.y) || 1;
  const ux = (top.x - low.x) / d, uy = (top.y - low.y) / d;
  return { from: top, top: { x: top.x + ux * more, y: top.y + uy * more }, ux, uy };
}

/** when his feet strike the road (real time, seconds): the drums keep his step */
export const beat = { dur: 0.4, at: 0 };

/** an atlas at half size with the road's dust laid over it: the far rows of the crowd */
function hazedAtlas(w: World, key: string, alpha: number) {
  const id = `haze:${key}:${alpha}`;
  const hit = w.state.tinted.get(id);
  if (hit) return hit;
  const im = w.img(key);
  if (!im) return null;
  const c = document.createElement("canvas");
  c.width = Math.ceil(im.width / 2);
  c.height = Math.ceil(im.height / 2);
  const cg = c.getContext("2d")!;
  cg.drawImage(im, 0, 0, im.width / 2, im.height / 2);
  cg.globalCompositeOperation = "source-atop";
  cg.globalAlpha = alpha;
  cg.fillStyle = HAZE;
  cg.fillRect(0, 0, c.width, c.height);
  w.state.tinted.set(id, c);
  return c;
}

export function march(w: World) {
  const { g, W, H, t, now } = w;
  const u = unit(w);
  const hB = body(w, 0.4, 0.62);
  /* everyone covers the same ground: the road passes at the speed his
     stride and his step say, and each walker's frame is how far along the
     road they have come, measured in their own stride (longer legs, slower
     steps), so no foot slides */
  const T = 0.8;
  const strideOf = (seq: Seq, h: number) => (SEQ[seq].stride ?? 0.7) * h;
  const v = strideOf("carry", hB) / T;
  const phaseAt = (seq: Seq, h: number, x: number, off: number) => (8 * (now * v + x)) / strideOf(seq, h) + off;
  const cx = W * (w.portrait ? 0.5 : 0.46);
  beat.dur = T / 2;
  beat.at = ((((-cx / v) % beat.dur) + beat.dur) % beat.dur);
  // colour comes back as the crowd grows
  const c = t < 27 ? 0.12 : t < 29 ? lerp(0.12, 0.3, seg(t, 27, 29)) : t < 33 ? lerp(0.3, 0.55, seg(t, 29, 33)) : t < 37 ? lerp(0.55, 0.8, seg(t, 33, 37)) : lerp(0.8, 1, seg(t, 37, 40.5));
  const crowd = seg(t, 35.4, 40);

  // every footfall of a thousand people lands in the picture
  const stepAt = (((now - beat.at) / beat.dur) % 1 + 1) % 1;
  const jolt = w.reduced ? 0 : crowd * 0.006 * Math.exp(-7 * stepAt);
  g.save();
  g.translate(W / 2, H * 0.85);
  g.scale(1 + jolt, 1 + jolt);
  g.translate(-W / 2, -H * 0.85);

  // the road slides under them: the two paintings joined into one strip that tiles
  const road = roadStrip(w);
  if (road) {
    const k = (H / road.height) * 1.03;
    const rw = road.width * k;
    const off = (now * v) % rw;
    for (let x = -off; x < W; x += rw) g.drawImage(road, x, H - road.height * k, rw + 1, road.height * k);
  }
  // the dust a crowd raises, hanging over the road behind them
  if (crowd > 0) {
    const dust = g.createLinearGradient(0, H * 0.5, 0, H * 0.8);
    dust.addColorStop(0, "rgba(185,130,104,0)");
    dust.addColorStop(0.7, `rgba(185,130,104,${(0.42 * crowd).toFixed(3)})`);
    dust.addColorStop(1, "rgba(185,130,104,0)");
    g.fillStyle = dust;
    g.fillRect(0, H * 0.5, W, H * 0.3);
  }

  const s = 0.52 * hB;
  const poles: (() => void)[] = [];
  const flags: Flown[] = [];
  const red = redTex(w);

  // the rows behind, from the back: further, smaller, deeper in the dust, and more of them
  const dense = clamp(W / (H * 1.6), 0.45, 1);
  const rows = [
    { n: 30, scale: 0.34, feet: 0.69, from: 38.8, step: 0.06, haze: 0.6 },
    { n: 24, scale: 0.44, feet: 0.718, from: 38.0, step: 0.09, haze: 0.48 },
    { n: 18, scale: 0.56, feet: 0.764, from: 36.9, step: 0.13, haze: 0.34 },
    { n: 12, scale: 0.73, feet: 0.83, from: 35.4, step: 0.2, haze: 0.18 },
  ];
  rows.forEach((row, r) => {
    const n = Math.round(row.n * dense);
    const span = W * 1.3;
    for (let k = 0; k < n; k++) {
      const a = seg(t, row.from + k * row.step, row.from + k * row.step + 0.6);
      if (a <= 0) continue;
      // every third one carries a flag: in their hand, as he carries his
      const bearer = (k + r) % 3 === 0;
      const seq = bearer ? "carry" : CAST[(k * 7 + r * 3) % CAST.length];
      const x = -W * 0.15 + ((k + 0.5) / n) * span + (hash(k + r * 40) - 0.5) * span * 0.05;
      const y = H * (row.feet + (hash(k * 3 + r) - 0.5) * 0.018);
      const h = hB * row.scale * (0.92 + hash(k + r * 11) * 0.14);
      const ph = phaseAt(seq, h, x, hash(k * 5 + r) * 8);
      const key = SEQ[seq].atlas;
      const wk = r < 2
        ? walker(w, seq, ph, x, y, h, { alpha: a, blend: false, atlas: hazedAtlas(w, key, row.haze), atlasScale: 0.5 })
        : walker(w, seq, ph, x, y, h, { alpha: Math.min(1, a * 5), haze: [HAZE, lerp(0.96, row.haze, ease(a))], shadow: 0.2 * a, blend: !STICK.has(seq) });
      if (bearer) {
        const big = hash(k * 9 + r) > 0.8;
        const b = bamboo(wk, h * (big ? 0.85 : 0.6));
        const len = h * (big ? 0.9 : 0.5 + 0.16 * hash(k + 7));
        const shown = r < 2 ? a : Math.min(1, a * 5);
        poles.push(() => {
          g.globalAlpha = shown;
          pole(w, b.from.x, b.from.y, b.top.x, b.top.y, Math.max(1.2, h * 0.02), "#a98a58");
          g.globalAlpha = 1;
        });
        flags.push({ mesh: waving(w, `m${r}:${k}`, 12, 8, { x: b.top.x, y: b.top.y, hx: -b.ux, hy: -b.uy, len, height: len * 0.62, dir: -1, time: now, phase: k * 1.7 + r, wind: 0.85 + 0.25 * hash(k + r * 5), open: r < 2 ? 1 : out(a) }), pic: red, ink: 0, alpha: shown });
      }
    }
  });

  // the front row, the ones we know; joiners hurry in from the left
  const front = [...FRONT].sort((a, b) => a.dy - b.dy);
  for (const m of front) {
    if (m.join >= 0 && t < m.join) continue;
    const p = m.join >= 0 ? ease(seg(t, m.join, m.join + 1.6)) : 1;
    const x = lerp(-0.3 * W, cx + m.slot * s, p);
    const y = H * (0.95 + m.dy);
    const h = hB * (m.seq === "carry" ? 1 : 0.97);
    const wk = walker(w, m.seq, phaseAt(m.seq, h, x, m.phase), x, y, h, { shadow: 0.3, blend: !STICK.has(m.seq) });
    if (m.seq === "carry") {
      // the bamboo is in his hand, in the drawing; it goes on up, and the flag flies from its top
      const b = bamboo(wk, 0.5 * hB);
      poles.push(() => pole(w, b.from.x, b.from.y, b.top.x, b.top.y, Math.max(2, 0.024 * hB), "#b8975a"));
      flags.push({ mesh: waving(w, "march", 26, 16, { x: b.top.x, y: b.top.y, hx: -b.ux, hy: -b.uy, len: 0.66 * hB, height: 0.42 * hB, dir: -1, time: now, phase: 0.4, wind: 1 }), pic: red, ink: 1.7 * u });
    } else if (m.seq === "student") {
      // his is over his shoulder: its flag hangs down from the stick's end behind him, clear of the face that follows
      const tip = mark(wk, 6);
      flags.push({ mesh: waving(w, "f:student", 14, 9, { x: tip.x, y: tip.y, hx: SHOULDER_STICK[0], hy: SHOULDER_STICK[1], len: 0.27 * hB, height: 0.2 * hB, dir: -1, fly: [-0.2, 0.98], time: now, phase: m.phase, wind: 0.35 }), pic: red, ink: 0 });
    } else if (m.seq === "farmer") {
      /* his bamboo ends at his brow in the drawing: it goes on up, so the
         flag flies over the heads and not across a face */
      const tip = mark(wk, 6), top = { x: tip.x + 0.01 * hB, y: tip.y - 0.46 * hB };
      poles.push(() => pole(w, tip.x, tip.y + 2, top.x, top.y, Math.max(2, 0.02 * hB), "#b8975a"));
      flags.push({ mesh: waving(w, "f:farmer", 14, 9, { x: top.x, y: top.y, hx: 0.03, hy: 0.999, len: 0.36 * hB, height: 0.23 * hB, dir: -1, time: now, phase: m.phase, wind: 1 }), pic: red, ink: 0 });
    }
  }
  desaturate(w, (1 - c) * 0.88);
  // a red sky as the crowd fills the road
  g.save();
  g.globalCompositeOperation = "soft-light";
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, `rgba(220,30,40,${(0.55 * c).toFixed(3)})`);
  sky.addColorStop(1, "rgba(220,30,40,0)");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  g.restore();
  // the red stays red: poles and flags go on after the colour is drained (and keep their own light and shade)
  for (const f of poles) f();
  flagLayer(w, flags);
  g.restore();
  vignette(w, 0.45);
}

/** the two road paintings, joined, with the end blended into the start so it tiles */
function roadStrip(w: World): HTMLCanvasElement | null {
  if (w.state.road) return w.state.road;
  const a = w.img("road-a"), b = w.img("road-b");
  if (!a || !b) return null;
  const J = 150, X = 220;
  const pano = document.createElement("canvas");
  pano.width = a.width + b.width - J;
  pano.height = a.height;
  const pg = pano.getContext("2d")!;
  pg.drawImage(a, 0, 0);
  // b over a's end, fading in across the join
  const bt = document.createElement("canvas");
  bt.width = b.width;
  bt.height = b.height;
  const bg = bt.getContext("2d")!;
  bg.drawImage(b, 0, 0);
  bg.globalCompositeOperation = "destination-in";
  const gb = bg.createLinearGradient(0, 0, J, 0);
  gb.addColorStop(0, "rgba(0,0,0,0)");
  gb.addColorStop(1, "rgba(0,0,0,1)");
  bg.fillStyle = gb;
  bg.fillRect(0, 0, b.width, b.height);
  pg.drawImage(bt, a.width - J, 0);
  // the loop: the strip's head becomes a blend of its tail and itself
  const Wc = pano.width - X;
  const strip = document.createElement("canvas");
  strip.width = Wc;
  strip.height = pano.height;
  const sg = strip.getContext("2d")!;
  sg.drawImage(pano, 0, 0);
  const head = document.createElement("canvas");
  head.width = X;
  head.height = pano.height;
  const hg = head.getContext("2d")!;
  hg.drawImage(pano, Wc, 0, X, pano.height, 0, 0, X, pano.height);
  hg.globalCompositeOperation = "destination-in";
  const gh = hg.createLinearGradient(0, 0, X, 0);
  gh.addColorStop(0, "rgba(0,0,0,1)");
  gh.addColorStop(1, "rgba(0,0,0,0)");
  hg.fillStyle = gh;
  hg.fillRect(0, 0, X, pano.height);
  sg.drawImage(head, 0, 0);
  w.state.road = strip;
  return strip;
}

// ── IV. the fire ────────────────────────────────────────────────────────────
let fireSprite: HTMLCanvasElement | null = null;
let smokeSprite: HTMLCanvasElement | null = null;
function sprites() {
  if (fireSprite) return;
  const mk = (stops: [number, string][]) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [o, col] of stops) r.addColorStop(o, col);
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    return c;
  };
  fireSprite = mk([[0, "rgba(255,244,190,1)"], [0.3, "rgba(255,170,60,0.85)"], [0.65, "rgba(210,50,20,0.35)"], [1, "rgba(120,10,10,0)"]]);
  smokeSprite = mk([[0, "rgba(28,26,30,0.55)"], [0.6, "rgba(30,28,34,0.25)"], [1, "rgba(30,28,34,0)"]]);
}

function emit(w: World, kind: Particle["kind"], x: number, y: number, u: number) {
  const ps = w.state.particles;
  if (ps.length > 700) return;
  const r = Math.random;
  if (kind === "fire") ps.push({ kind, x, y, vx: (r() - 0.5) * 22 * u, vy: -(70 + r() * 90) * u, life: 0.5 + r() * 0.6, age: 0, size: (22 + r() * 30) * u, spin: r() * 6 });
  else if (kind === "ember") ps.push({ kind, x, y, vx: (r() - 0.5) * 40 * u, vy: -(90 + r() * 120) * u, life: 1.6 + r() * 1.6, age: 0, size: (1.5 + r() * 2.5) * u, spin: r() * 6 });
  else ps.push({ kind, x, y, vx: (r() - 0.3) * 18 * u, vy: -(18 + r() * 26) * u, life: 4 + r() * 3, age: 0, size: (90 + r() * 130) * u, spin: r() * 6 });
}

export function night(w: World) {
  const { g, W, H, t, now, dt } = w;
  const u = unit(w);
  sprites();
  cover(w, pick(w, "night"), { zoom: 1.04 + 0.05 * seg(t, 42, 57) });

  // shields at the end of the street, closing in
  const sh = shaded(w, "shields", "rgba(16,20,28,0.62)");
  const sa = seg(t, 42.8, 43.7);
  if (sh && sa > 0) {
    const sw = (w.portrait ? 0.95 * W : 0.42 * W) * lerp(0.92, 1.12, ease(seg(t, 43, 47)));
    const shh = (sw * sh.height) / sh.width;
    g.save();
    g.globalAlpha = sa * 0.95;
    g.drawImage(sh, (W - sw) / 2, H * 0.66 - shh, sw, shh);
    g.restore();
  }
  // the barricade
  const deb = w.img("debris");
  const dw = w.portrait ? 1.6 * W : 0.78 * W, dh = deb ? (dw * deb.height) / deb.width : 0;
  const dx = (W - dw) / 2, dy = H * 1.03 - dh;
  const fireY = dy + 0.33 * dh, fx0 = dx + 0.3 * dw, fx1 = dx + 0.74 * dw;
  // smoke behind
  const ps = w.state.particles;
  const intensity = (t < 43.8 ? lerp(0.25, 0.75, seg(t, 42, 43.8)) : 0.75) + (t >= 48 && t < 50.5 ? 0.7 * (1 - seg(t, 48, 50.5)) : 0) - (t > 49 && t < 51 ? 0.25 : 0);
  if (!w.reduced || ps.length < 200) {
    const n = dt * 150 * intensity * (W / 1600 + 0.4);
    for (let k = 0; k < n; k++) emit(w, "fire", lerp(fx0, fx1, Math.random()), fireY + Math.random() * 0.06 * dh, u);
    if (Math.random() < dt * 16 * intensity) emit(w, "ember", lerp(fx0, fx1, Math.random()), fireY, u);
    if (Math.random() < dt * 9 * intensity) emit(w, "smoke", lerp(fx0, fx1, Math.random()), fireY - 30 * u, u);
  }
  for (const p of ps) {
    p.age += dt;
    p.x += p.vx * dt + (p.kind === "ember" ? Math.sin(now * 3 + p.spin) * 12 * u * dt : 0);
    p.y += p.vy * dt;
    if (p.kind === "fire") p.vy -= 40 * u * dt;
  }
  w.state.particles = ps.filter((p) => p.age < p.life && p.y > -200);
  const drawSmoke = (near: boolean) => {
    for (const p of w.state.particles) {
      if (p.kind !== "smoke" || (p.spin > 4.2) !== near) continue;
      const f = p.age / p.life;
      g.globalAlpha = Math.sin(Math.PI * f) * 0.55;
      const s = p.size * (0.7 + f);
      g.drawImage(smokeSprite!, p.x - s / 2, p.y - s / 2, s, s);
    }
    g.globalAlpha = 1;
  };
  drawSmoke(false);
  if (deb) g.drawImage(deb, dx, dy, dw, dh);

  /* the flag: planted by the barricade, then falling into the fire (the
     pole is as long as from its foot to the flames, so its end lands there) */
  const baseX = W * (w.portrait ? 0.1 : 0.2), baseY = H * 1.05;
  const land = { x: W * 0.5, y: fireY - 0.02 * H };
  const L = Math.hypot(land.x - baseX, baseY - land.y);
  const th1 = Math.atan2(land.x - baseX, baseY - land.y);
  const th0 = 0.08 + (w.reduced ? 0 : Math.sin(now * 0.9) * 0.02);
  const fall = seg(t, 47, 48);
  const th = t < 47 ? th0 : lerp(th0, th1, fall * fall);
  const tip = { x: baseX + Math.sin(th) * L, y: baseY - Math.cos(th) * L };
  if (t < 50.6) {
    const rw = 0.32 * H, rh = 0.21 * H;
    pole(w, baseX, baseY, tip.x, tip.y, Math.max(2.5, 0.011 * H));
    // it flies from the pole's top; as the pole falls the wind leaves it
    // (it flies downwind; as the pole falls it trails behind the pole's end, then lies where it fell)
    const mesh = waving(w, "night", 22, 14, { x: tip.x, y: tip.y, hx: -Math.sin(th), hy: Math.cos(th), len: rw, height: rh, dir: t < 47 ? 1 : -1, time: now, phase: 0.6, wind: t < 47 ? 1 : lerp(1, 0.5, seg(t, 48, 49)) });
    // the fire takes it from the pole's end outward
    const R = rw * 2.2 * seg(t, 48, 50.4);
    for (let k = 0; k < mesh.nx * mesh.ny; k++) mesh.aux[k * 2 + 1] = t >= 48 ? clamp((R - Math.hypot(mesh.pos[k * 2] - tip.x, mesh.pos[k * 2 + 1] - tip.y)) / (0.14 * rw)) : 0;
    flagLayer(w, [{ mesh, pic: redTex(w), ink: t >= 48 ? 0 : 1.6 * u }]);
  } else {
    // the pole, burnt, lies across the pile
    pole(w, baseX, baseY, tip.x, tip.y, Math.max(2.5, 0.011 * H), "#1d1512");
  }

  // the fire, over the pile
  g.save();
  g.globalCompositeOperation = "lighter";
  for (const p of w.state.particles) {
    const f = p.age / p.life;
    if (p.kind === "fire") {
      g.globalAlpha = (1 - f) * 0.85;
      const s = p.size * (0.6 + 0.7 * Math.sin(Math.PI * Math.min(1, f * 1.3)));
      g.drawImage(fireSprite!, p.x - s / 2, p.y - s / 2, s, s);
    } else if (p.kind === "ember") {
      g.globalAlpha = 1 - f;
      g.fillStyle = "#ffb347";
      g.fillRect(p.x, p.y, p.size, p.size);
    }
  }
  // its light on the street
  const flick = 0.85 + 0.15 * Math.sin(now * 13) * Math.sin(now * 7.3);
  const glow = g.createRadialGradient(W / 2, fireY, 0, W / 2, fireY, Math.max(W, H) * 0.6);
  glow.addColorStop(0, `rgba(255,120,40,${(0.32 * intensity * flick).toFixed(3)})`);
  glow.addColorStop(1, "rgba(255,80,20,0)");
  g.globalAlpha = 1;
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.restore();

  // out of the smoke, someone walks toward us
  const ma = seg(t, 50.8, 51.7);
  if (ma > 0) {
    const z = seg(t, 51, 54.4);
    const h = lerp(0.15 * H, (w.portrait ? 0.56 : 0.64) * H, Math.pow(z, 1.5));
    const y = lerp(0.7 * H, 0.995 * H, ease(z));
    const k = t < 54.4 ? Math.floor((now / 1.05) * 8) : t < 55.2 ? 0 : 3;
    frame(w, t < 54.4 ? "toward" : "stop", k, W / 2, y, h, { alpha: ma });
  }
  drawSmoke(true);
  // the silence after the fall: everything darker
  const hush = fade(t, 48.6, 51.4, 0.8) * 0.35;
  if (hush > 0) {
    g.fillStyle = `rgba(0,0,0,${hush.toFixed(3)})`;
    g.fillRect(0, 0, W, H);
  }
  vignette(w, 0.75);
}

// ── V. the flag ─────────────────────────────────────────────────────────────
/** where the climax's pieces are this frame (the flag, the hero), for input */
export const climax = { ready: false, flagBox: { x0: 0, y0: 0, x1: 0, y1: 0 } };

export function manga(w: World) {
  const { g, W, H, t, now } = w;
  const u = unit(w);
  const st = w.state;
  paper(w, "#f4ede0");
  const hB = body(w, 0.4, 0.78);
  // (on a tall screen he stands left of centre, so the flag fits beside him)
  const cx = W * (w.portrait ? 0.32 : 0.5);
  // the rock rises in from below; he stands on its top, the flag over his head
  const rock = w.img("rock");
  const rh = H * (w.portrait ? 0.36 : 0.42);
  const rise = (1 - ease(seg(t, 56.8, 58))) * H * 0.7;
  const rockTop = H * 1.02 - rh + rise;
  const heroY = rockTop + rh * 0.05;
  const chest = { x: cx, y: heroY - hB * 0.62 };
  speedLines(w, chest.x, chest.y, hB * 0.75, t < 60 ? 0.45 : 0.75);
  if (rock) {
    const rw = (rh * rock.width) / rock.height;
    g.drawImage(rock, cx - rw / 2, rockTop, rw, rh);
  }

  // the hero: climbing, then standing with the pole (drawn the other way
  // round from the sheets, so the wind and the flag go left to right)
  if (t >= 57.4) {
    if (t < 60) {
      const k = Math.min(4, Math.floor((t - 57.6) / 0.48));
      const p = ease(seg(t, 57.6, 60));
      frame(w, "climb", Math.max(0, k), lerp(cx + 0.1 * hB, cx, p), lerp(heroY + 0.42 * hB, heroY, p), hB, { flip: true, alpha: seg(t, 57.4, 57.7) });
    } else {
      const see = t >= BUBBLES.see.t0 - 0.2 && t < 84;
      const k = see ? 2 : Math.floor(now / 0.9) % 2;
      // the pole and the flag go behind him: find his pole from the frame first
      const ghost: Placed = { x: cx, y: heroY, k: hB / 787, flip: true, f: frame0("stand", k) };
      const top = at(ghost, ghost.f[6], ghost.f[7]);
      const mid = at(ghost, ghost.f[8], ghost.f[9]);
      const dl = Math.hypot(top.x - mid.x, top.y - mid.y) || 1;
      const ux = (top.x - mid.x) / dl, uy = (top.y - mid.y) / dl;
      const poleTop = { x: top.x + ux * 0.2 * hB, y: top.y + uy * 0.2 * hB };
      pole(w, top.x, top.y + 4, poleTop.x, poleTop.y, Math.max(3, 0.028 * hB), "#141012");
      if (t >= 60.6) drawFlag(w, poleTop, ux, uy, hB);
      frame(w, "stand", k, cx, heroY, hB, { flip: true });
    }
  }

  // what he says, and the sound the flag makes coming back
  const head = { x: cx - 0.04 * hB, y: heroY - 0.9 * hB };
  const side: -1 | 1 = -1;
  const bsz = Math.max(17, (w.portrait ? 0.026 : 0.036) * H);
  if (t >= BUBBLES.burn.t0 && t < BUBBLES.burn.t1) bubble(w, head.x - 0.1 * hB, head.y, BUBBLES.burn.text, { side, size: bsz, font: w.fonts.hand, pop: seg(t, BUBBLES.burn.t0, BUBBLES.burn.t0 + 0.3) * fade(t, BUBBLES.burn.t0, BUBBLES.burn.t1, 0.3) });
  if (t >= BUBBLES.see.t0 && t < BUBBLES.see.t1)
    bubble(w, head.x - 0.1 * hB, head.y, BUBBLES.see.text, { side, size: bsz * 1.15, font: w.fonts.bangla, pop: seg(t, BUBBLES.see.t0, BUBBLES.see.t0 + 0.3) * fade(t, BUBBLES.see.t0, BUBBLES.see.t1, 0.3), gloss: BUBBLES.see.gloss, glossFont: w.fonts.hand });

  // the hint, until the flag is first torn
  if (!st.tearHintGone && t >= 62.4 && t < 80 && climax.ready) {
    const b = climax.flagBox;
    const a = fade(t, 62.4, 80, 0.5);
    const touch = matchMedia("(pointer: coarse)").matches;
    const size = Math.max(18, 0.03 * H);
    g.save();
    g.globalAlpha = a * (0.75 + 0.25 * Math.sin(now * 3));
    g.font = `700 ${size}px ${w.fonts.hand}`;
    g.fillStyle = "#b0102a";
    const lines = [touch ? "swipe across" : "drag across", "the flag to tear it"];
    const tw = Math.max(...lines.map((l) => g.measureText(l).width));
    // beside its free end where there's room, else under it
    const beside = b.x1 + 24 * u + tw + 12 * u < W;
    g.translate(beside ? b.x1 + 24 * u : Math.min(W - 16 * u, b.x1), beside ? (b.y0 + b.y1) / 2 - size * 0.4 : b.y1 + size * 1.4);
    g.rotate(-0.05);
    g.textAlign = beside ? "left" : "right";
    lines.forEach((l, k) => g.fillText(k === 0 ? (beside ? "← " : "↑ ") + l : l, 0, k * size * 1.05));
    g.restore();
  }
  // the flag's line: where and when, sewn in with it
  const note = st.flagNote;
  if (note && note.text) {
    const a = fade(now, note.t0, note.t0 + 3, 0.35);
    if (a > 0) captionBox(w, note.text, W * 0.05, H * (w.portrait ? 0.08 : 0.12), a);
  }
  // ধ্রাম!
  if (t >= BUBBLES.slam.t && t < 84.2) {
    const p = seg(t, BUBBLES.slam.t, BUBBLES.slam.t + 0.22);
    const size = (w.portrait ? 0.12 : 0.2) * H;
    const sc = lerp(2.4, 1, outBack(p));
    g.save();
    g.globalAlpha = fade(t, BUBBLES.slam.t - 0.01, 84.2, 0.3);
    g.translate(w.portrait ? W * 0.5 : W * 0.21, w.portrait ? H * 0.86 : H * 0.56);
    g.rotate(-0.16);
    g.scale(sc, sc);
    g.font = `800 ${size}px ${w.fonts.bangla}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = size * 0.2;
    g.strokeStyle = "#fffdf7";
    g.strokeText(BUBBLES.slam.text, 0, 0);
    g.lineWidth = size * 0.09;
    g.strokeStyle = INK;
    g.strokeText(BUBBLES.slam.text, 0, 0);
    g.fillStyle = "#d21f2e";
    g.fillText(BUBBLES.slam.text, 0, 0);
    g.restore();
  }
  panelBorder(w, 7 * u);
}

/** the flag on its pole: built, flown, torn and stitched */
function drawFlag(w: World, top: { x: number; y: number }, ux: number, uy: number, hB: number) {
  const { g, t, now } = w;
  const st = w.state;
  const u = unit(w);
  const fw = (w.portrait ? 0.84 : 0.95) * hB, fh = (w.portrait ? 0.56 : 0.62) * hB;
  if (!st.flagTex.length) st.flagTex = FLAGS.map((f) => paintFlag(f.id));
  const c = (st.flag ??= new Cloth(30, 19));
  c.update({ x: top.x, y: top.y, hx: -ux, hy: -uy, len: fw, height: fh, dir: 1, time: now, phase: 0, wind: 1, open: 0.04 + 0.96 * out(seg(t, 60.6, 61.5)) }, w.dt);

  // an automatic tear, drawn across it, for whoever only scrolls
  if (st.slash) {
    const s = st.slash;
    const q = seg(now, s.t0, s.t0 + 0.28);
    const x = lerp(s.ax, s.bx, q), y = lerp(s.ay, s.by, q);
    const lx = lerp(s.ax, s.bx, s.last), ly = lerp(s.ay, s.by, s.last);
    if (q > s.last && c.cut(lx, ly, x, y, s.order) > 0) w.sound.play("tear");
    s.last = q;
    if (q >= 1) {
      st.slash = null;
      st.stitch = { t0: now + 0.3, to: Math.min(st.flagIndex + 1, FLAGS.length - 1), order: s.order };
    }
  }
  // the stitching: the thread pulled through, the cloth drawn together, the next flag sewn in
  let over: HTMLCanvasElement | null = null;
  const aux = c.mesh.aux;
  aux.fill(0);
  if (st.stitch) {
    const s = st.stitch;
    const e = now - s.t0;
    if (e >= 0) c.mend(seg(e, 0, 0.9));
    if (e > 0 && !(s as { snd?: boolean }).snd) {
      (s as { snd?: boolean }).snd = true;
      w.sound.play("stitch");
    }
    if (s.to !== st.flagIndex && e > 0.85) {
      // the next flag soaks in from the middle outward
      const b = c.bounds();
      const ctr = c.centre();
      const diag = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
      const q = seg(e, 0.85, 1.45);
      over = st.flagTex[s.to];
      const pos = c.mesh.pos;
      for (let k = 0; k < aux.length; k += 2) aux[k] = clamp((q * 1.8 - Math.hypot(pos[k] - ctr.x, pos[k + 1] - ctr.y) / diag) * 4);
    }
    if (e >= 0.95 && !(s as { hit?: boolean }).hit) {
      (s as { hit?: boolean }).hit = true;
      w.sound.play("flagUp", s.to);
      st.shake = Math.max(st.shake, 0.4);
      st.flash = Math.max(st.flash, 0.25);
      if (s.to !== st.flagIndex) st.flagNote = { text: FLAGS[s.to].line, t0: now };
    }
    if (e >= 1.5) {
      st.flagIndex = s.to;
      st.stitch = null;
      over = null;
      aux.fill(0);
    }
  }
  // past the slam it's the last flag, however it got there
  if (t >= BUBBLES.slam.t && !st.stitch && !st.slash) st.flagIndex = FLAGS.length - 1;
  c.cells();
  const gl = st.gl;
  gl.begin(g, w.W, w.H, w.dpr);
  gl.draw(c.mesh, st.flagTex[st.flagIndex], over);
  gl.end();
  c.outline(g, INK, 2.2 * u);
  c.thread(g, "#e01b33", Math.max(1.4, 1.9 * u));
  const b = c.bounds();
  climax.flagBox = b;
  climax.ready = t >= 61.4;
}

/** start an automatic tear across the flag (if it's free to tear) */
export function autoTear(w: World, k: number) {
  const st = w.state;
  const c = st.flag;
  if (!c || st.stitch || st.slash || st.flagIndex > k) return;
  const b = c.bounds();
  const flip = k % 2 === 0;
  st.cutOrder++;
  st.slash = {
    t0: w.now,
    ax: lerp(b.x0, b.x1, flip ? 0.78 : 0.3), ay: b.y0 - 12,
    bx: lerp(b.x0, b.x1, flip ? 0.42 : 0.72), by: b.y1 + 12,
    last: 0, order: st.cutOrder,
  };
}

/** a manual tear: a stroke across the flag, as the pointer moves */
export function tearStroke(w: World, ax: number, ay: number, bx: number, by: number): number {
  const st = w.state;
  const c = st.flag;
  if (!c || st.stitch || st.slash || !climax.ready) return 0;
  return c.cut(ax, ay, bx, by, st.cutOrder);
}

export function finishTear(w: World) {
  const st = w.state;
  if (!st.flag || st.stitch || !st.flag.torn) return;
  st.tearHintGone = true;
  st.stitch = { t0: w.now + 0.25, to: Math.min(st.flagIndex + 1, FLAGS.length - 1), order: st.cutOrder };
  st.cutOrder++;
}

function captionBox(w: World, text: string, x: number, y: number, a: number) {
  const { g } = w;
  const size = Math.max(12, 0.019 * w.H);
  g.save();
  g.globalAlpha = a;
  g.font = `700 ${size}px ${w.fonts.mono}`;
  const tw = g.measureText(text.toUpperCase()).width;
  g.fillStyle = "#fffdf7";
  g.fillRect(x, y, tw + size * 1.6, size * 2.4);
  g.lineWidth = 2;
  g.strokeStyle = INK;
  g.strokeRect(x, y, tw + size * 1.6, size * 2.4);
  g.fillStyle = INK;
  g.textBaseline = "middle";
  g.fillText(text.toUpperCase(), x + size * 0.8, y + size * 1.2);
  g.restore();
}

/** manga speed lines, radiating from (x, y), clear of a disc of radius r0 */
function speedLines(w: World, x: number, y: number, r0: number, alpha: number) {
  const { g, W, H, now } = w;
  const seed = w.reduced ? 1 : Math.floor(now * 9);
  const R = Math.hypot(W, H);
  g.save();
  g.fillStyle = `rgba(22,16,15,${alpha})`;
  g.beginPath();
  for (let k = 0; k < 84; k++) {
    const a = (k / 84) * Math.PI * 2 + (hash(k + seed * 97) - 0.5) * 0.06;
    const r1 = r0 * (1 + hash(k * 7 + seed) * 0.6);
    const wdt = 0.004 + hash(k * 13 + seed) * 0.011;
    g.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    g.lineTo(x + Math.cos(a - wdt) * R, y + Math.sin(a - wdt) * R);
    g.lineTo(x + Math.cos(a + wdt) * R, y + Math.sin(a + wdt) * R);
    g.closePath();
  }
  g.fill();
  g.restore();
}

function panelBorder(w: World, width: number) {
  const { g, W, H } = w;
  g.save();
  g.lineWidth = width;
  g.strokeStyle = INK;
  const m = width * 1.6;
  g.strokeRect(m, m, W - 2 * m, H - 2 * m);
  g.restore();
}

// ── VI. the comrades ────────────────────────────────────────────────────────
const MEET = [86.0, 89.2, 91.8, 94.4, 97.0, 99.6];

export function comrades(w: World) {
  const { g, W, H, t, now } = w;
  const gh = w.portrait ? Math.min(0.86 * H, 1.5 * W) : 0.9 * H;
  const groups = COMRADES.map((c) => ({ ...c, w: (gh * c.w) / c.h }));
  const step = groups[0].w * 0.74;
  // the camera, from one group to the next
  let camX = 0;
  for (let k = 0; k < MEET.length; k++) {
    if (t < MEET[k]) {
      const p = ease(seg(t, MEET[k] - 1.6, MEET[k]));
      camX = lerp((k - 1) * step, k * step, k === 0 ? 1 : p);
      if (k === 0) camX = 0;
      break;
    }
    camX = k * step;
  }
  cover(w, pick(w, "sky-hero"), { zoom: 1.12, dx: -camX * 0.04 });
  const clouds = feathered(w, "clouds", 0.1, 0.14);
  if (clouds) {
    const cw = Math.max(W * 1.4, H * 1.2), ch = (cw * clouds.height) / clouds.width;
    const off = ((w.reduced ? 0 : now * 6) + camX * 0.15) % cw;
    for (let x = -off; x < W; x += cw) {
      g.globalAlpha = 0.9;
      g.drawImage(clouds, x, -ch * 0.12, cw, ch);
    }
    g.globalAlpha = 1;
  }
  // the groups along the ridge, each turning as we reach it
  for (const [k, gr] of groups.entries()) {
    const x = W / 2 + k * step - camX - gr.w / 2;
    if (x > W || x + gr.w < 0) continue;
    // the sides feathered, so one group melts into the next
    const a = feathered(w, gr.a.replace("/worldview/", "").replace(".webp", ""), 0.12, 0.04);
    const b = feathered(w, gr.b.replace("/worldview/", "").replace(".webp", ""), 0.12, 0.04);
    const turn = seg(t, MEET[k] + 0.3, MEET[k] + 0.55);
    const y = H * 1.05 - gh;
    if (a && turn < 1) {
      g.globalAlpha = 1;
      g.drawImage(a, x, y, gr.w, gh);
    }
    if (b && turn > 0) {
      g.globalAlpha = turn;
      g.drawImage(b, x, y, gr.w, gh);
      g.globalAlpha = 1;
    }
  }
  // leaves in front, nearer, so they pass faster
  // (each strip's ends feathered and overlapped, so the strips run on without a seam)
  for (const [n, key] of (["leaves-b", "leaves-a"] as const).entries()) {
    const im = feathered(w, key, 0.08);
    if (!im) continue;
    const lh = H * (n ? 0.36 : 0.3), lw = (lh * im.width) / im.height;
    const stepX = lw * 0.86;
    const off = (camX * (1.15 + n * 0.2) + n * stepX * 0.5) % stepX;
    for (let x = -off - stepX; x < W; x += stepX) g.drawImage(im, x, H - lh * (n ? 0.92 : 0.84), lw, lh);
  }
  // morning light
  g.save();
  g.globalCompositeOperation = "soft-light";
  const sun = g.createLinearGradient(0, 0, W, H);
  sun.addColorStop(0, "rgba(255,214,150,0.55)");
  sun.addColorStop(1, "rgba(255,214,150,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);
  g.restore();
  vignette(w, 0.32);
}

// ── VII. the table ──────────────────────────────────────────────────────────
export function table(w: World) {
  const { g, W, H, t, now } = w;
  // dawn over the fields, on the page
  paper(w, "#f5efe3", (pg, w) => {
    const dawn = pick(w, "dawn");
    if (!dawn) return false;
    pg.globalCompositeOperation = "multiply";
    cover({ ...w, g: pg }, dawn, { zoom: 1.04, alpha: 0.9 });
    return true;
  });
  // the sun coming up, and a few birds crossing it
  const up = seg(t, 101, 113);
  const sun = g.createRadialGradient(W * 0.74, H * 0.4, 0, W * 0.74, H * 0.4, H * 0.75);
  sun.addColorStop(0, `rgba(255,214,140,${(0.16 + 0.26 * up).toFixed(3)})`);
  sun.addColorStop(1, "rgba(255,214,140,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);
  g.save();
  g.strokeStyle = "rgba(70,44,40,0.7)";
  g.lineWidth = Math.max(1.2, H * 0.002);
  g.lineCap = "round";
  for (let k = 0; k < 6; k++) {
    const sp = 0.011 + 0.008 * hash(k + 5);
    const bx = ((hash(k) + (w.reduced ? 0 : now * sp)) % 1.2) * W * 1.1 - W * 0.1;
    const by = H * (0.1 + 0.2 * hash(k + 9)) + Math.sin(now * 0.6 + k) * H * 0.006;
    const wing = H * (0.008 + 0.006 * hash(k + 2)), flap = w.reduced ? 0.4 : Math.sin(now * (6 + 2 * hash(k)) + k * 2);
    g.beginPath();
    g.moveTo(bx - wing * 1.4, by - wing * (0.2 + 0.7 * flap));
    g.quadraticCurveTo(bx - wing * 0.5, by - wing * 0.5 * flap, bx, by);
    g.quadraticCurveTo(bx + wing * 0.5, by - wing * 0.5 * flap, bx + wing * 1.4, by - wing * (0.2 + 0.7 * flap));
    g.stroke();
  }
  g.restore();

  // where the table and its people will be, on the open ground
  const F = LAYERS.feast;
  const fw = w.portrait ? W * 1.75 : Math.min(W * 0.9, H * 1.52);
  const k = fw / F.w, fh = F.h * k;
  const fx = w.portrait ? W / 2 - fw * 0.44 : (W - fw) / 2;
  const fy = H * (w.portrait ? 0.9 : 0.955) - fh;
  const tb = F.table ?? { a: [66, 294], b: [570, 400], c: [1020, 195] };
  const pt = (q: number[]) => ({ x: fx + q[0] * k, y: fy + q[1] * k });
  const A = pt(tb.a), B = pt(tb.b), C = pt(tb.c);
  const mid = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 + fh * 0.1 };

  // the stairs, standing on the page; then tipped over, flat
  const stairsIm = w.img("stairs");
  const sh = H * 0.72, sw = stairsIm ? (sh * stairsIm.width) / stairsIm.height : 0;
  const base = B.y + fh * 0.06;
  const tip = seg(t, 105.3, 106.5);
  // (it falls faster as it goes, and settles with one small rebound)
  const fold = tip < 0.82 ? Math.pow(tip / 0.82, 2.2) : 1 - 0.05 * Math.sin(((tip - 0.82) / 0.18) * Math.PI);
  const sa = seg(t, 102, 102.8) * (1 - seg(t, 106.5, 107.3));
  if (stairsIm && sa > 0) {
    const th = (fold * Math.PI) / 2;
    // its shadow on the ground, longer as it comes down
    g.save();
    g.globalAlpha = sa * (0.1 + 0.12 * fold);
    g.fillStyle = "rgba(60,36,30,1)";
    g.beginPath();
    g.ellipse(mid.x, base + sh * 0.015, sw * (0.52 + 0.2 * fold), sh * (0.022 + 0.02 * fold), 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // (as it comes down the stone warms into planks)
    const dark = fold > 0 ? shaded(w, "stairs", "rgba(226,198,150,0.86)") : null;
    const strips = 40;
    g.save();
    g.globalAlpha = sa;
    g.globalCompositeOperation = "multiply";
    for (let n = 0; n < strips; n++) {
      // strip n from the bottom: up the picture, tipped toward us (nearer strips wider, and lower)
      const v0 = n / strips, v1 = (n + 1) / strips;
      const y0 = base - v0 * sh * Math.cos(th) + v0 * sh * 0.1 * Math.sin(th), y1 = base - v1 * sh * Math.cos(th) + v1 * sh * 0.1 * Math.sin(th);
      const ww = sw * (1 + 0.5 * Math.sin(th) * v1);
      const sy = stairsIm.height * (1 - v1), shh = stairsIm.height / strips;
      g.drawImage(stairsIm, 0, sy, stairsIm.width, shh + 1, mid.x - ww / 2, Math.min(y0, y1), ww, Math.abs(y0 - y1) + 0.6);
      if (dark) {
        g.globalAlpha = sa * fold;
        g.drawImage(dark, 0, sy, stairsIm.width, shh + 1, mid.x - ww / 2, Math.min(y0, y1), ww, Math.abs(y0 - y1) + 0.6);
        g.globalAlpha = sa;
      }
    }
    g.restore();
  }
  // where it lands, the dust jumps
  const puff = seg(t, 106.42, 107.2);
  if (puff > 0 && puff < 1) {
    g.save();
    g.translate(mid.x, base);
    g.scale(1, 0.16);
    for (let n = 0; n < 3; n++) {
      const q = clamp(puff * 1.3 - n * 0.12);
      if (q <= 0) continue;
      raggedCircle(g, 0, 0, sw * (0.5 + 1.1 * out(q)), n * 2.1);
      g.lineWidth = sw * 0.07 * (1 - q);
      g.strokeStyle = `rgba(150,110,86,${(0.4 * (1 - q)).toFixed(3)})`;
      g.stroke();
    }
    g.restore();
  }

  // out of the place it fell, the table and everyone at it, soaking into the paper
  const feast = w.img("feast");
  const soak = seg(t, 106.5, 108.4);
  if (feast && soak > 0) {
    const q = out(soak);
    g.save();
    if (soak < 1) {
      g.translate(mid.x, mid.y);
      g.scale(1, 0.62);
      raggedCircle(g, 0, 0, fw * 0.72 * q, 4.2);
      g.setTransform(w.dpr, 0, 0, w.dpr, 0, 0);
      g.clip();
    }
    // the ground under them takes their shadow
    const sx = fx + fw * 0.5, sy = fy + fh * 0.93;
    g.save();
    g.translate(sx, sy);
    g.scale(1, 0.13);
    const shd = g.createRadialGradient(0, 0, fw * 0.1, 0, 0, fw * 0.52);
    shd.addColorStop(0, "rgba(84,52,40,0.34)");
    shd.addColorStop(1, "rgba(84,52,40,0)");
    g.fillStyle = shd;
    g.beginPath();
    g.arc(0, 0, fw * 0.53, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.globalAlpha = clamp(soak * 3);
    g.drawImage(feast, fx, fy, fw, fh);
    g.restore();
    // the wash's wet edge
    if (soak < 1) {
      g.save();
      g.translate(mid.x, mid.y);
      g.scale(1, 0.62);
      raggedCircle(g, 0, 0, fw * 0.72 * q, 4.2);
      g.setTransform(w.dpr, 0, 0, w.dpr, 0, 0);
      g.lineWidth = 10;
      g.strokeStyle = `rgba(150,60,60,${(0.16 * (1 - soak)).toFixed(3)})`;
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = `rgba(120,40,50,${(0.4 * (1 - soak)).toFixed(3)})`;
      g.stroke();
      g.restore();
    }
  }

  /* the flag, laid along the table as its cloth: unrolled from the near
     end to the far one, under the dishes (the layer is red only where the
     bare wood showed), the roll's shadow running ahead of it */
  const clothIm = w.img("feast-cloth");
  const lay = ease(seg(t, 109.4, 111.6));
  if (clothIm && lay > 0) {
    const dx = C.x - A.x, dy = C.y - A.y;
    const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const front = lerp(-0.06, 1.1, lay) * len;
    const region = (from: number, to: number) => {
      g.beginPath();
      for (let s2 = -fh; s2 <= fh; s2 += 14) {
        const f = to + Math.sin(s2 * 0.045 + 2) * 5 * k;
        g.lineTo(A.x + ux * f - uy * s2, A.y + uy * f + ux * s2);
      }
      for (let s2 = fh; s2 >= -fh; s2 -= 14) g.lineTo(A.x + ux * from - uy * s2, A.y + uy * from + ux * s2);
      g.closePath();
    };
    g.save();
    region(-len, front);
    g.clip();
    g.drawImage(clothIm, fx, fy, fw, fh);
    g.restore();
    if (lay < 1) {
      // the roll: the cloth's own red, twice over, in a band at its leading edge
      g.save();
      region(front - 12 * k, front);
      g.clip();
      g.globalCompositeOperation = "multiply";
      g.globalAlpha = 0.6;
      g.drawImage(clothIm, fx, fy, fw, fh);
      g.restore();
    }
  }
  vignette(w, 0.18, "60,30,20");
}

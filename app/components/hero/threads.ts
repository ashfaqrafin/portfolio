import { THREADS, WINDOWS } from "./config";
import type { Layout } from "./stage-layout";
import type { RowSet } from "./raster";
import type { RibbonBatch } from "./ribbons";
import { clamp, easeInOutSine, lerp, smoothstep, win, type Vec2 } from "./utils";
import { HILITE, YARN } from "./yarn";

/** A woven artwork: its loom rows plus how a raster point maps onto the stage. */
export interface Surface {
  rows: RowSet;
  point: (u: number, v: number, out: Vec2) => void;
}

type Endpoint =
  | { kind: "row"; surf: Surface; row: number }
  | { kind: "pt"; x: number; y: number }
  | { kind: "dyn"; fn: (u: number, out: Vec2) => void };

export interface Thread {
  src: Endpoint;
  dst: Endpoint;
  /** unweave start / unweave end = flow start / flow end = weave start / weave end */
  t0: number;
  t1: number;
  t2: number;
  t3: number;
  zs: 1 | -1;
  bend: 1 | -1;
  seed: number;
  wmul: number;
  spacing: number;
  loose: boolean;
  /** row this thread weaves / unweaves (link threads), else -1 */
  link: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  nx: number;
  ny: number;
  dist: number;
}

function rowPoint(surf: Surface, row: number, f: number, out: Vec2) {
  const r = surf.rows.rows[row];
  const u = r.dir > 0 ? r.xmin + f * (r.xmax - r.xmin) : r.xmax - f * (r.xmax - r.xmin);
  surf.point(u, r.ymid, out);
}

const tmp: Vec2 = [0, 0];

function finalize(th: Thread) {
  const s = th.src;
  if (s.kind === "row") rowPoint(s.surf, s.row, 1, tmp);
  else if (s.kind === "pt") {
    tmp[0] = s.x;
    tmp[1] = s.y;
  } else s.fn(th.t0, tmp);
  th.x0 = tmp[0];
  th.y0 = tmp[1];

  const d = th.dst;
  if (d.kind === "row") rowPoint(d.surf, d.row, 0, tmp);
  else if (d.kind === "pt") {
    tmp[0] = d.x;
    tmp[1] = d.y;
  } else d.fn(th.t2, tmp);
  th.x3 = tmp[0];
  th.y3 = tmp[1];

  const dx = th.x3 - th.x0;
  const dy = th.y3 - th.y0;
  const dist = Math.hypot(dx, dy) || 1;
  th.dist = dist;
  th.nx = -dy / dist;
  th.ny = dx / dist;
  const k = th.bend * 0.34 * dist;
  // S-shaped bend: control points at 30% / 70%, offset sideways in opposite directions
  th.x1 = th.x0 + dx * 0.3 + th.nx * k;
  th.y1 = th.y0 + dy * 0.3 + th.ny * k;
  th.x2 = th.x0 + dx * 0.7 - th.nx * k;
  th.y2 = th.y0 + dy * 0.7 - th.ny * k;
}

/** 0 = unweaving source row, 1 = flowing, 2 = weaving target row. */
function head(th: Thread, u: number, out: Vec2): 0 | 1 | 2 {
  if (u < th.t1) {
    if (th.src.kind === "row") {
      rowPoint(th.src.surf, th.src.row, easeInOutSine(win(u, th.t0, th.t1)), out);
    } else {
      out[0] = th.x0;
      out[1] = th.y0;
    }
    return 0;
  }
  if (u < th.t2) {
    const e = easeInOutSine((u - th.t1) / (th.t2 - th.t1));
    const m = 1 - e;
    const w0 = m * m * m;
    const w1 = 3 * m * m * e;
    const w2 = 3 * m * e * e;
    const w3 = e * e * e;
    const rip = Math.sin(e * Math.PI * 3 + th.seed) * Math.sin(Math.PI * e) * 0.025 * th.dist;
    out[0] = w0 * th.x0 + w1 * th.x1 + w2 * th.x2 + w3 * th.x3 + th.nx * rip;
    out[1] = w0 * th.y0 + w1 * th.y1 + w2 * th.y2 + w3 * th.y3 + th.ny * rip;
    if (th.src.kind === "dyn") {
      // peel off a moving source, then settle onto the planned arc
      th.src.fn(u, tmp);
      out[0] += (tmp[0] - th.x0) * m;
      out[1] += (tmp[1] - th.y0) * m;
    }
    if (th.dst.kind === "row") {
      // land exactly on the live (floating) start of the target row
      rowPoint(th.dst.surf, th.dst.row, 0, tmp);
      out[0] += (tmp[0] - th.x3) * e;
      out[1] += (tmp[1] - th.y3) * e;
    }
    return 1;
  }
  if (th.dst.kind === "row") {
    rowPoint(th.dst.surf, th.dst.row, easeInOutSine(win(u, th.t2, th.t3)), out);
  } else {
    out[0] = th.x3;
    out[1] = th.y3;
  }
  return 2;
}

/** Row progress (0..1) for link threads: weave = reveal, unweave = erase. */
export function rowProgress(
  threads: Thread[],
  u: number,
  kind: "weave" | "unweave",
  out: Float32Array,
) {
  for (const th of threads) {
    if (th.link < 0) continue;
    out[th.link] =
      kind === "weave"
        ? easeInOutSine(win(u, th.t2, th.t3))
        : easeInOutSine(win(u, th.t0, th.t1));
  }
}

const NS = THREADS.trailSamples;
const pt: Vec2 = [0, 0];
const SX = new Float32Array(NS + 2);
const SY = new Float32Array(NS + 2);
const SA = new Float32Array(NS + 2);

/**
 * Every thread is a polyline of its head and 18 trailing samples. Back threads
 * go behind the figure, front ones after it; weaving phases are always in front.
 */
export function drawThreads(
  threads: Thread[],
  u: number,
  back: RibbonBatch,
  front: RibbonBatch,
  lw: number,
) {
  for (const th of threads) {
    const life = th.t3 - th.t0;
    const dt = life * th.spacing;
    const tail = NS * dt;
    if (u < th.t0 || u > th.t3 + tail) continue;

    const fadeIn = smoothstep(0, 0.05, (u - th.t0) / Math.max(life, 1e-4));
    const endFade =
      1 - smoothstep(th.t3 - (th.loose ? 0.3 * life : 0), th.t3 + tail, u);
    const A = fadeIn * endFade;
    if (A < 0.01) continue;

    const ph = head(th, Math.min(u, th.t3), pt);
    const batch = ph === 1 ? (th.zs > 0 ? front : back) : front;
    const hw = lw * th.wmul;

    // collect samples head → tail
    let n = 0;
    for (let i = 0; i <= NS; i++) {
      const ui = Math.min(u - i * dt, th.t3);
      if (ui < th.t0) break;
      head(th, ui, pt);
      const wob = Math.sin(th.seed + i * 1.9) * 0.55;
      SX[n] = pt[0] + th.nx * wob;
      SY[n] = pt[1] + th.ny * wob;
      SA[n] = A * Math.pow(1 - i / (NS + 1), 1.3);
      n++;
    }
    if (n < 2) continue;

    batch.start();
    for (let i = 0; i < n; i++) batch.pt(SX[i], SY[i], hw * (1 - 0.5 * (i / n)), SA[i]);
    batch.end(YARN[0], YARN[1], YARN[2]);
    batch.start();
    for (let i = 0; i < n; i++)
      batch.pt(SX[i] - 0.7, SY[i] - 0.8, hw * 0.4 * (1 - 0.5 * (i / n)), SA[i] * 0.55);
    batch.end(HILITE[0], HILITE[1], HILITE[2]);
  }
}

// ── Thread-table builders ──────────────────────────────────────────────────

export interface ThreadCtx {
  L: Layout;
  rng: () => number;
  patternSurf: Surface;
  suitSurf: Surface;
  avatar4Surf: Surface;
  /** random opaque stage-px point on avatar n (0..3) */
  pickFigure: (n: number, rng: () => number) => Vec2;
  pickPattern: (rng: () => number) => Vec2;
  /** random opaque suit point as normalised raster coords */
  pickSuitUV: (rng: () => number) => Vec2;
  /** where the suit is at transition progress u, for peeling threads */
  suitOutAt: (u: number, uu: number, vv: number, out: Vec2) => void;
  suitInAt: (u: number, uu: number, vv: number, out: Vec2) => void;
}

function blank(rng: () => number): Thread {
  const sp = THREADS.trailSpacing;
  return {
    src: { kind: "pt", x: 0, y: 0 },
    dst: { kind: "pt", x: 0, y: 0 },
    t0: 0,
    t1: 0,
    t2: 0,
    t3: 0,
    zs: rng() < 0.5 ? -1 : 1,
    bend: rng() < 0.5 ? -1 : 1,
    seed: rng() * 6.28,
    wmul: 0.8 + rng() * 0.5,
    spacing: lerp(sp[0], sp[1], rng()),
    loose: false,
    link: -1,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    x3: 0,
    y3: 0,
    nx: 0,
    ny: 1,
    dist: 1,
  };
}

/** Top-to-bottom stagger with ~12% jitter, so a garment is knitted downwards. */
function stagger(
  i: number,
  n: number,
  a: number,
  b: number,
  span: number,
  rng: () => number,
) {
  const room = b - a - span;
  return clamp(a + (i / (n - 1)) * room + (rng() - 0.5) * 0.12 * room, a, b - span);
}

function pt2(p: Vec2): Endpoint {
  return { kind: "pt", x: p[0], y: p[1] };
}

export function buildThreadSets(ctx: ThreadCtx): Thread[][] {
  const { L, rng } = ctx;
  const NR = THREADS.rows;
  const looseN = L.mobile ? THREADS.looseMobile : THREADS.looseDesktop;
  const sets: Thread[][] = [[], [], [], []];

  const drift = (from: Vec2): Vec2 => [
    from[0] + (rng() - 0.5) * 0.3 * L.sw,
    from[1] - (0.25 + rng() * 0.3) * L.sh,
  ];

  const addLoose = (
    set: Thread[],
    ti: number,
    src: () => Endpoint,
    dst: () => Endpoint,
    t0Range: [number, number],
  ) => {
    const th = blank(rng);
    th.loose = true;
    const [s0, s1] = WINDOWS.storm[ti];
    const a = clamp(lerp(t0Range[0], t0Range[1], Math.pow(rng(), 1.1)), s0, s1 - 0.2);
    const dur = Math.min(0.24 + rng() * 0.26, s1 - a);
    th.t0 = th.t1 = a;
    th.t2 = th.t3 = a + dur;
    th.src = src();
    th.dst = dst();
    finalize(th);
    set.push(th);
  };

  const addLink = (
    set: Thread[],
    i: number,
    src: Endpoint,
    dst: Endpoint,
    t0: number,
    t1: number,
    t2: number,
    t3: number,
  ) => {
    const th = blank(rng);
    th.link = i;
    th.src = src;
    th.dst = dst;
    th.t0 = t0;
    th.t1 = t1;
    th.t2 = t2;
    th.t3 = t3;
    finalize(th);
    set.push(th);
  };

  // 1 → 2: pattern sheet unspools; threads weave the suit
  {
    const set = sets[0];
    const dU = 0.14;
    const dW = 0.16;
    for (let i = 0; i < NR; i++) {
      const t0 = stagger(i, NR, WINDOWS.patternUnweave[0], WINDOWS.patternUnweave[1], dU, rng);
      const t1 = t0 + dU;
      const t2 = Math.min(
        Math.max(stagger(i, NR, WINDOWS.suitWeave[0], WINDOWS.suitWeave[1], dW, rng), t1 + 0.06),
        1 - dW,
      );
      addLink(
        set,
        i,
        { kind: "row", surf: ctx.patternSurf, row: i },
        { kind: "row", surf: ctx.suitSurf, row: i },
        t0,
        t1,
        t2,
        t2 + dW,
      );
    }
    for (let j = 0; j < looseN; j++) {
      const r = rng();
      addLoose(
        set,
        0,
        () => pt2(r < 0.7 ? ctx.pickPattern(rng) : ctx.pickFigure(0, rng)),
        () => {
          if (r < 0.4) {
            const [uu, vv] = ctx.pickSuitUV(rng);
            const p: Vec2 = [0, 0];
            ctx.suitSurf.point(uu, vv, p);
            return pt2(p);
          }
          if (r < 0.75) return pt2(ctx.pickFigure(1, rng));
          return pt2(drift(ctx.pickPattern(rng)));
        },
        [0.05, 0.7],
      );
    }
  }

  // 2 → 3: the suit flies away, threads peel off it and rebuild the figure
  {
    const set = sets[1];
    const n = Math.round(looseN * 1.25);
    for (let j = 0; j < n; j++) {
      const fromSuit = j % 3 === 0;
      const [uu, vv] = ctx.pickSuitUV(rng);
      addLoose(
        set,
        1,
        () =>
          fromSuit
            ? { kind: "dyn", fn: (u, out) => ctx.suitOutAt(u, uu, vv, out) }
            : pt2(ctx.pickFigure(1, rng)),
        () => (rng() < 0.65 ? pt2(ctx.pickFigure(2, rng)) : pt2(drift(ctx.pickFigure(1, rng)))),
        fromSuit ? [WINDOWS.suitOut[0] + 0.02, WINDOWS.suitOut[1] - 0.06] : [0.12, 0.7],
      );
    }
  }

  // 3 → 4: the suit returns; the final avatar is woven over it, row by row
  {
    const set = sets[2];
    const dW = 0.14;
    for (let i = 0; i < NR; i++) {
      const t0 = stagger(i, NR, 0.1, 0.44, 0.0, rng);
      const t2 = Math.min(
        Math.max(
          stagger(i, NR, WINDOWS.finalWeave[0], WINDOWS.finalWeave[1], dW, rng),
          t0 + 0.14,
        ),
        WINDOWS.finalWeave[1] - dW + 0.02,
      );
      addLink(
        set,
        i,
        pt2(ctx.pickFigure(2, rng)),
        { kind: "row", surf: ctx.avatar4Surf, row: i },
        t0,
        t0,
        t2,
        t2 + dW,
      );
    }
    for (let j = 0; j < looseN * 0.9; j++) {
      const fromSuit = j % 3 === 0;
      const [uu, vv] = ctx.pickSuitUV(rng);
      addLoose(
        set,
        2,
        () =>
          fromSuit
            ? { kind: "dyn", fn: (u, out) => ctx.suitInAt(u, uu, vv, out) }
            : pt2(ctx.pickFigure(2, rng)),
        () => (rng() < 0.7 ? pt2(ctx.pickFigure(3, rng)) : pt2(drift(ctx.pickFigure(2, rng)))),
        fromSuit ? [WINDOWS.suitIn[0], WINDOWS.suitIn[1] - 0.05] : [0.12, 0.6],
      );
    }
  }

  // 4 → 1: the figure frays into thread that weaves the pattern sheet back
  {
    const set = sets[3];
    const dW = 0.14;
    for (let i = 0; i < NR; i++) {
      const t1 = stagger(i, NR, 0.14, 0.46, 0.0, rng);
      const t2 = Math.min(
        Math.max(
          stagger(i, NR, WINDOWS.patternWeave[0], WINDOWS.patternWeave[1], dW, rng),
          t1 + 0.12,
        ),
        WINDOWS.patternWeave[1] - dW + 0.02,
      );
      addLink(
        set,
        i,
        pt2(ctx.pickFigure(3, rng)),
        { kind: "row", surf: ctx.patternSurf, row: i },
        t1,
        t1,
        t2,
        t2 + dW,
      );
    }
    for (let j = 0; j < looseN; j++) {
      addLoose(
        set,
        3,
        () => pt2(ctx.pickFigure(3, rng)),
        () => {
          const r = rng();
          if (r < 0.5) return pt2(ctx.pickFigure(0, rng));
          if (r < 0.8) return pt2(ctx.pickPattern(rng));
          return pt2(drift(ctx.pickFigure(3, rng)));
        },
        [0.14, 0.75],
      );
    }
  }

  return sets;
}

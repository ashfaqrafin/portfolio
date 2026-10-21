import type { ArticleMeta, Edge, Topic } from "./types";

/* Deterministic force layout for the thread board.
   x blends rank order (60%) and real date (40%); y is the topic lane.
   A seeded RNG and a fixed number of settling steps mean the server and the
   browser compute the same positions; everything is rounded to whole pixels. */

export const LANES: readonly Topic[] = ["tailoring", "fashion", "unified", "linux"];
export const LANE_GAP = 176;
export const PIN = { w: 196, h: 112 } as const;
export const PIN_FEATURED = { w: 226, h: 126 } as const;
export const COLLIDE_PAD = 26;
export const STEPS = 520;
/** margins around the pins: lane labels on the left, the tape-measure date axis below */
export const MARGIN = { l: 132, r: 56, t: 96, b: 96 } as const;
/** where a thread meets its pin: the pin head, this far below the card's top edge */
export const HEAD_DY = 8;
/** length of thread drawn in front of the card so it visibly leaves the pin */
export const CAP_LEN = 17;

export type PinBox = { slug: string; x: number; y: number; w: number; h: number; rot: number };
export type Lane = { topic: Topic; y: number; top: number; bottom: number };
export type Tick = { x: number; label: string; major: boolean };
export type BoardLayout = {
  width: number;
  height: number;
  pins: PinBox[];
  lanes: Lane[];
  ticks: Tick[];
  axisY: number;
};

// ── small deterministic helpers ──────────────────────────────────────────────
export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dayOf = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function pinSize(a: Pick<ArticleMeta, "featured">) {
  return a.featured ? PIN_FEATURED : PIN;
}

/** a small, stable tilt so the pins look hand-placed (degrees) */
export function pinTilt(slug: string) {
  return ((hash(slug) % 7) - 3) * 0.45;
}

// ── layout ───────────────────────────────────────────────────────────────────
export function layoutBoard(articles: readonly ArticleMeta[], edges: readonly Edge[]): BoardLayout {
  const chrono = [...articles].sort((a, b) => (a.date === b.date ? (a.slug < b.slug ? -1 : 1) : a.date < b.date ? -1 : 1));
  const n = chrono.length;
  // wide enough for the busiest lane to sit in one row: a crowded lane makes the
  // board longer, never stacks pins on top of each other or out of their lane
  const perLane = new Map<Topic, number>();
  for (const a of chrono) perLane.set(a.topic, (perLane.get(a.topic) ?? 0) + 1);
  const busiest = Math.max(0, ...perLane.values());
  const span = Math.max(900, n * 70, busiest * (PIN.w + COLLIDE_PAD + 18));
  const days = chrono.map((a) => dayOf(a.date));
  const d0 = n ? days[0] : 0;
  const d1 = n ? days[n - 1] : 0;
  const normDay = (d: number) => (d1 > d0 ? (d - d0) / (d1 - d0) : 0.5);

  /** x target for a (possibly fractional) rank and a day number */
  const targetX = (rank: number, day: number) => span * (0.6 * (n > 1 ? rank / (n - 1) : 0.5) + 0.4 * normDay(day));

  const rnd = mulberry32(hash(chrono.map((a) => a.slug).join("|")) || 1);
  type Body = { slug: string; tx: number; ty: number; x: number; y: number; vx: number; vy: number; w: number; h: number };
  const bodies: Body[] = chrono.map((a, i) => {
    const { w, h } = pinSize(a);
    const tx = targetX(i, days[i]);
    const ty = Math.max(0, LANES.indexOf(a.topic)) * LANE_GAP;
    return { slug: a.slug, tx, ty, x: tx + (rnd() - 0.5) * 40, y: ty + (rnd() - 0.5) * 20, vx: 0, vy: 0, w, h };
  });
  const idx = new Map(bodies.map((b, i) => [b.slug, i]));
  const springs = edges
    .map((e) => ({ a: idx.get(e.from), b: idx.get(e.to), rest: 240 - 60 * e.weight, k: 0.012 * e.weight }))
    .filter((s): s is { a: number; b: number; rest: number; k: number } => s.a !== undefined && s.b !== undefined);

  const collide = (strength: number) => {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p = bodies[i];
        const q = bodies[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const ox = (p.w + q.w) / 2 + COLLIDE_PAD - Math.abs(dx);
        const oy = (p.h + q.h) / 2 + COLLIDE_PAD - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // prefer sliding along the lane (x) so pins keep their topic row
        if (ox < oy * 1.8) {
          const s = (dx === 0 ? (i < j ? 1 : -1) : Math.sign(dx)) * ox * 0.5 * strength;
          p.x -= s;
          q.x += s;
        } else {
          const s = (dy === 0 ? 1 : Math.sign(dy)) * oy * 0.5 * strength;
          p.y -= s;
          q.y += s;
        }
      }
    }
  };

  for (let step = 0; step < STEPS; step++) {
    const alpha = 1 - step / STEPS;
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      fx[i] += 0.05 * (b.tx - b.x);
      fy[i] += 0.2 * (b.ty - b.y);
    }
    for (const s of springs) {
      const p = bodies[s.a];
      const q = bodies[s.b];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = s.k * (d - s.rest);
      fx[s.a] += (f * dx) / d;
      fy[s.a] += (f * dy) / d;
      fx[s.b] -= (f * dx) / d;
      fy[s.b] -= (f * dy) / d;
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 280 * 280) continue;
        const d = Math.sqrt(d2) || 1;
        const f = 1400 / Math.max(d2, 900);
        fx[i] -= (f * dx) / d;
        fy[i] -= (f * dy) / d;
        fx[j] += (f * dx) / d;
        fy[j] += (f * dy) / d;
      }
    }
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vx = (b.vx + fx[i] * alpha) * 0.8;
      b.vy = (b.vy + fy[i] * alpha) * 0.8;
      b.x += b.vx;
      b.y += b.vy;
    }
    collide(0.9);
  }
  for (let k = 0; k < 80; k++) collide(1);

  // normalise into board space with margins
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const b of bodies) {
    minX = Math.min(minX, b.x - b.w / 2);
    maxX = Math.max(maxX, b.x + b.w / 2);
    minY = Math.min(minY, b.y - b.h / 2);
    maxY = Math.max(maxY, b.y + b.h / 2);
  }
  if (!n) {
    minX = 0;
    maxX = 600;
    minY = -PIN.h / 2;
    maxY = (LANES.length - 1) * LANE_GAP + PIN.h / 2;
  }
  // always leave room for every lane, even an empty one
  minY = Math.min(minY, -PIN.h / 2);
  maxY = Math.max(maxY, (LANES.length - 1) * LANE_GAP + PIN.h / 2);
  const sx = MARGIN.l - minX;
  const sy = MARGIN.t - minY;
  const width = Math.round(maxX - minX + MARGIN.l + MARGIN.r);
  const axisY = Math.round(maxY + sy + 44);
  const height = Math.round(axisY + MARGIN.b - 44);

  const pins: PinBox[] = bodies.map((b) => ({
    slug: b.slug,
    x: Math.round(b.x - b.w / 2 + sx),
    y: Math.round(b.y - b.h / 2 + sy),
    w: b.w,
    h: b.h,
    rot: pinTilt(b.slug),
  }));

  const lanes: Lane[] = LANES.map((topic, i) => {
    const y = Math.round(i * LANE_GAP + sy);
    return { topic, y, top: y - LANE_GAP / 2, bottom: y + LANE_GAP / 2 };
  });

  // tape-measure ticks: first of every month, mapped through the same x blend
  const ticks: Tick[] = [];
  if (n) {
    const fracRank = (d: number) => {
      if (d <= days[0]) return 0;
      for (let i = 1; i < n; i++) {
        if (d <= days[i]) return days[i] === days[i - 1] ? i : i - 1 + (d - days[i - 1]) / (days[i] - days[i - 1]);
      }
      return n - 1;
    };
    const first = new Date(d0 * 864e5);
    let y = first.getUTCFullYear();
    let m = first.getUTCMonth();
    for (let guard = 0; guard < 240; guard++) {
      const d = Date.UTC(y, m, 1) / 864e5;
      if (d > d1) break;
      // the oldest article's month gets its tick at that article, not before the board starts
      const at = Math.max(d, d0);
      if (Date.UTC(y, m + 1, 1) / 864e5 > d0) {
        const x = Math.round(targetX(fracRank(at), at) + sx);
        ticks.push({ x, label: m === 0 || !ticks.length ? `${MONTHS[m]} ’${String(y).slice(2)}` : MONTHS[m], major: m === 0 });
      }
      m++;
      if (m === 12) {
        m = 0;
        y++;
      }
    }
  }

  return { width, height, pins, lanes, ticks, axisY };
}

// ── thread geometry ──────────────────────────────────────────────────────────
export type Pt = { x: number; y: number };

export function headOf(p: Pick<PinBox, "x" | "y" | "w">): Pt {
  return { x: p.x + p.w / 2, y: p.y + HEAD_DY };
}

/** per-thread sag multiplier, 0.85–1.15 */
export function threadJitter(a: string, b: string) {
  return 0.85 + (hash(`${a}>${b}`) % 1000) / 1000 * 0.3;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const f1 = (v: number) => Math.round(v * 10) / 10;
const pt = (p: Pt) => `${f1(p.x)} ${f1(p.y)}`;

export type ThreadGeom = {
  /** the whole hanging curve */
  d: string;
  /** the first and last CAP_LEN px, drawn above the cards */
  capA: string;
  capB: string;
  /** the lowest point of the curve, for labels */
  mid: Pt;
};

/** A quadratic curve that hangs between two pin heads and sags clamp(dist × 0.17, 14, 70) × jitter. */
export function threadGeom(a: Pt, b: Pt, jitter: number): ThreadGeom {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const sag = clamp(dist * 0.17, 14, 70) * jitter;
  const m = lerp(a, b, 0.5);
  const c = { x: m.x, y: m.y + 2 * sag }; // a quadratic's midpoint sits halfway to its control point
  const approxLen = (dist + Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y)) / 2 || 1;
  const t = Math.min(0.45, CAP_LEN / approxLen);
  // de Casteljau split at t and 1 - t
  const a1 = lerp(a, c, t);
  const pa = lerp(a1, lerp(c, b, t), t);
  const b1 = lerp(c, b, 1 - t);
  const pb = lerp(lerp(a, c, 1 - t), b1, 1 - t);
  const mid = lerp(lerp(a, c, 0.5), lerp(c, b, 0.5), 0.5);
  return {
    d: `M${pt(a)}Q${pt(c)} ${pt(b)}`,
    capA: `M${pt(a)}Q${pt(a1)} ${pt(pa)}`,
    capB: `M${pt(pb)}Q${pt(b1)} ${pt(b)}`,
    mid,
  };
}

/** A loose article's short dangling thread with a frayed end. */
/** A thread leaving the board for another sheet: up out of the pin head and off
   sideways (older to the left, newer to the right), ending in an arrowhead. */
export function offboardGeom(head: Pt, dir: "older" | "newer") {
  const s = dir === "older" ? -1 : 1;
  const e = { x: head.x + s * 128, y: head.y - 24 };
  const d =
    `M${pt(head)}` +
    `C${pt({ x: head.x + s * 14, y: head.y - 34 })} ${pt({ x: head.x + s * 70, y: head.y - 42 })} ${pt(e)}`;
  const arrow = `M${pt({ x: e.x - s * 8, y: e.y - 6 })}L${pt(e)}L${pt({ x: e.x - s * 8, y: e.y + 6 })}`;
  return { d, arrow, end: e };
}

export function danglingGeom(head: Pt, slug: string) {
  const dir = hash(slug) % 2 ? 1 : -1;
  const s = (v: number) => v * dir;
  const e = { x: head.x + s(-66), y: head.y - 30 };
  const d =
    `M${pt(head)}` +
    `C${pt({ x: head.x + s(10), y: head.y - 34 })} ${pt({ x: head.x + s(-22), y: head.y - 44 })} ${pt({ x: head.x + s(-34), y: head.y - 28 })}` +
    `S${pt({ x: head.x + s(-52), y: head.y - 18 })} ${pt(e)}`;
  const fray = [
    `M${pt(e)}l${f1(s(-9))} -6`,
    `M${pt(e)}l${f1(s(-10))} 1`,
    `M${pt(e)}l${f1(s(-7))} 6`,
  ].join("");
  return { d, fray };
}

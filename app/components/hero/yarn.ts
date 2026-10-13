import { MESH } from "./config";
import type { RibbonBatch } from "./ribbons";
import { POSE_STRIDE, posePoint, type ShardMesh } from "./shards";
import { smoothstep, type Vec2 } from "./utils";

export type RGB = [number, number, number];

/** Thread dark / highlight / ink, from the palette. */
export const YARN: RGB = [0.549, 0.184, 0.263]; // #8c2f43
export const HILITE: RGB = [0.949, 0.769, 0.796]; // #f2c4cb
export const INKC: RGB = [0.29, 0.047, 0.094]; // #4a0c18

const sx = new Array<number>(64).fill(0);
const sy = new Array<number>(64).fill(0);
const sa = new Array<number>(64).fill(0);

/**
 * Stroke the points in sx/sy/sa as one yarn: dark body, then a cream highlight
 * at 40% width offset by 1px, exactly as a thread is drawn everywhere else.
 */
export function strokeScratch(
  b: RibbonBatch,
  n: number,
  hw: number,
  taperWidth: number,
  color: RGB = YARN,
  highlight = true,
) {
  b.start();
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    b.pt(sx[i], sy[i], hw * (1 - taperWidth * t), sa[i]);
  }
  b.end(color[0], color[1], color[2]);
  if (!highlight) return;
  b.start();
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    b.pt(sx[i] - 0.7, sy[i] - 0.8, hw * 0.4 * (1 - taperWidth * t), sa[i] * 0.55);
  }
  b.end(HILITE[0], HILITE[1], HILITE[2]);
}

export function setScratch(i: number, x: number, y: number, a: number) {
  sx[i] = x;
  sy[i] = y;
  sa[i] = a;
}

const p0: Vec2 = [0, 0];
const p1: Vec2 = [0, 0];

/**
 * Fringe at torn edges + bridge threads between neighbouring shards.
 * `role` selects growth (old: grows as it tears; new: retracts as it arrives).
 */
export function drawShardYarn(
  b: RibbonBatch,
  m: ShardMesh,
  pose: Float32Array,
  role: "old" | "new",
  ox: number,
  oy: number,
  lw: number,
) {
  // fringe
  for (const f of m.fringe) {
    const o = f.shard * POSE_STRIDE;
    const alpha = pose[o + 4];
    if (alpha < 0.03) continue;
    const s = pose[o + 5];
    const g =
      role === "old"
        ? smoothstep(0.03, 0.35, s)
        : smoothstep(0, 0.25, s) * (1 - smoothstep(0.55, 1, s));
    if (g < 0.01) continue;
    posePoint(m, pose, f.shard, f.x, f.y, p0);
    const rx = p0[0] + ox;
    const ry = p0[1] + oy;
    const ang = f.ang + pose[o + 2];
    const len = f.len * g;

    if (f.circuit) {
      // right-angled trace ending in a small ring
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      let ax = 0;
      let ay = 0;
      if (Math.abs(c) > Math.abs(sn)) ax = Math.sign(c) || 1;
      else ay = Math.sign(sn) || 1;
      const tx = -ay * f.turn;
      const ty = ax * f.turn;
      const L1 = len * 0.6;
      const L2 = len * 0.38;
      const e1x = rx + ax * L1;
      const e1y = ry + ay * L1;
      const e2x = e1x + tx * L2;
      const e2y = e1y + ty * L2;
      setScratch(0, rx, ry, alpha * 0.95);
      setScratch(1, e1x, e1y, alpha * 0.95);
      setScratch(2, e2x, e2y, alpha * 0.95);
      strokeScratch(b, 3, lw * 0.8, 0, INKC, false);
      if (g > 0.8) {
        const R = Math.max(2.4, lw * 2.2);
        const cxr = e2x + tx * R;
        const cyr = e2y + ty * R;
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          setScratch(k, cxr + Math.cos(a) * R, cyr + Math.sin(a) * R, alpha * 0.95);
        }
        strokeScratch(b, 11, lw * 0.6, 0, INKC, false);
      }
      continue;
    }

    // frayed yarn strand: gentle curl and sag
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    for (let k = 0; k < 6; k++) {
      const t = k / 5;
      const along = len * t;
      const perp = f.curl * Math.sin(t * 3.2 + f.ph) * len * 0.17 * t;
      setScratch(
        k,
        rx + dx * along - dy * perp,
        ry + dy * along + dx * perp + 0.14 * len * t * t,
        alpha * (0.95 - 0.35 * t),
      );
    }
    strokeScratch(b, 6, lw * 0.75, 0.5);
  }

  // bridges: thin strands that stretch and snap while shards are close
  const maxD = MESH.bridgeMaxDist * m.W;
  for (const br of m.bridges) {
    const aA = pose[br.a * POSE_STRIDE + 4];
    const aB = pose[br.b * POSE_STRIDE + 4];
    if (aA < 0.05 || aB < 0.05) continue;
    posePoint(m, pose, br.a, br.x, br.y, p0);
    posePoint(m, pose, br.b, br.x, br.y, p1);
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const d = Math.hypot(dx, dy);
    if (d >= maxD || d < 0.8) continue;
    const alpha = (1 - smoothstep(0.15, 1, d / maxD)) * Math.min(aA, aB) * 0.9;
    const mx = (p0[0] + p1[0]) / 2 + (-dy / d) * d * 0.16 * br.sgn;
    const my = (p0[1] + p1[1]) / 2 + (dx / d) * d * 0.16 * br.sgn + d * 0.1;
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const w0 = (1 - t) * (1 - t);
      const w1 = 2 * (1 - t) * t;
      const w2 = t * t;
      setScratch(
        k,
        w0 * p0[0] + w1 * mx + w2 * p1[0] + ox,
        w0 * p0[1] + w1 * my + w2 * p1[1] + oy,
        alpha,
      );
    }
    strokeScratch(b, 7, lw * 0.55, 0);
  }
}

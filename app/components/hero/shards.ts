import * as THREE from "three";
import { MESH } from "./config";
import type { Raster } from "./raster";
import { clamp, mulberry32, smoothstep, type Vec2 } from "./utils";

export interface FringeItem {
  shard: number;
  x: number;
  y: number;
  ang: number;
  len: number;
  curl: number;
  ph: number;
  circuit: boolean;
  turn: 1 | -1;
}

export interface BridgeItem {
  a: number;
  b: number;
  x: number;
  y: number;
  sgn: 1 | -1;
}

export interface ShardMesh {
  W: number;
  H: number;
  count: number;
  present: boolean[];
  cx: Float32Array;
  cy: Float32Array;
  r1: Float32Array;
  r2: Float32Array;
  r3: Float32Array;
  side: Float32Array;
  delayOld: Float32Array;
  delayNew: Float32Array;
  geometry: THREE.BufferGeometry;
  fringe: FringeItem[];
  bridges: BridgeItem[];
}

/** Stride of the pose array: tx, ty, rot, scale, alpha, s */
export const POSE_STRIDE = 6;

function inPoly(poly: Vec2[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Build a jittered tear mesh once. Neighbouring shards share the identical
 * jagged edge array, so the pieces fit perfectly before they move.
 */
export function buildShardMesh(
  W: number,
  H: number,
  seed: number,
  raster: Raster,
  mobile: boolean,
  tech: number,
): ShardMesh {
  const rng = mulberry32(seed);
  const cfg = mobile ? MESH.mobile : MESH.desktop;
  const xs = cfg.xs;
  const ys = cfg.ys;
  const C = xs.length - 1;
  const R = ys.length - 1;

  const V: Vec2[][] = [];
  for (let i = 0; i <= C; i++) {
    V[i] = [];
    for (let j = 0; j <= R; j++) {
      let x = xs[i] * W;
      let y = ys[j] * H;
      if (i > 0 && i < C && j > 0 && j < R) {
        x += (rng() * 2 - 1) * MESH.jitterX * W;
        y += (rng() * 2 - 1) * MESH.jitterY * H;
      }
      V[i][j] = [x, y];
    }
  }

  const sp = W / MESH.edgeSpacingDiv;
  const jag = (a: Vec2, b: Vec2, boundary: boolean): Vec2[] => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const n = Math.max(2, Math.round(len / sp));
    const nx = -dy / len;
    const ny = dx / len;
    const pts: Vec2[] = [a];
    let off = 0;
    for (let m = 1; m < n; m++) {
      const t = m / n;
      off = off * 0.5 + (rng() * 2 - 1) * sp * MESH.edgeJag * 0.8;
      const taper = boundary ? 0 : Math.min(1, t / 0.2, (1 - t) / 0.2);
      pts.push([a[0] + dx * t + nx * off * taper, a[1] + dy * t + ny * off * taper]);
    }
    pts.push(b);
    return pts;
  };

  const Hh: Vec2[][][] = [];
  for (let i = 0; i < C; i++) {
    Hh[i] = [];
    for (let j = 0; j <= R; j++) Hh[i][j] = jag(V[i][j], V[i + 1][j], j === 0 || j === R);
  }
  const Vv: Vec2[][][] = [];
  for (let i = 0; i <= C; i++) {
    Vv[i] = [];
    for (let j = 0; j < R; j++) Vv[i][j] = jag(V[i][j], V[i][j + 1], i === 0 || i === C);
  }

  const count = C * R;
  const polys: Vec2[][] = [];
  const present: boolean[] = [];
  const cx = new Float32Array(count);
  const cy = new Float32Array(count);

  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      const id = j * C + i;
      const top = Hh[i][j];
      const right = Vv[i + 1][j];
      const bottom = Hh[i][j + 1].slice().reverse();
      const left = Vv[i][j].slice().reverse();
      const poly = [
        ...top.slice(0, -1),
        ...right.slice(0, -1),
        ...bottom.slice(0, -1),
        ...left.slice(0, -1),
      ];
      polys[id] = poly;
      let sx = 0;
      let sy = 0;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of poly) {
        sx += x;
        sy += y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      cx[id] = sx / poly.length;
      cy[id] = sy / poly.length;

      // skip shards whose region holds no opaque pixel
      let hit = false;
      const G = 14;
      for (let gy = 0; gy < G && !hit; gy++) {
        for (let gx = 0; gx < G && !hit; gx++) {
          const x = minX + ((gx + 0.5) / G) * (maxX - minX);
          const y = minY + ((gy + 0.5) / G) * (maxY - minY);
          if (raster.alphaAt(x / W, y / H) > 128 && inPoly(poly, x, y)) hit = true;
        }
      }
      present[id] = hit;
    }
  }

  // geometry
  const pos: number[] = [];
  const uvs: number[] = [];
  const cen: number[] = [];
  const sid: number[] = [];
  const idx: number[] = [];
  let vbase = 0;
  for (let id = 0; id < count; id++) {
    if (!present[id]) continue;
    const poly = polys[id];
    const contour = poly.map((p) => new THREE.Vector2(p[0], p[1]));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const [x, y] of poly) {
      pos.push(x, y, 0);
      uvs.push(x / W, y / H);
      cen.push(cx[id], cy[id]);
      sid.push(id);
    }
    for (const t of tris) idx.push(vbase + t[0], vbase + t[1], vbase + t[2]);
    vbase += poly.length;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("aCenter", new THREE.Float32BufferAttribute(cen, 2));
  geometry.setAttribute("aShard", new THREE.Float32BufferAttribute(sid, 1));
  geometry.setIndex(idx);

  // per-shard randoms
  const r1 = new Float32Array(count);
  const r2 = new Float32Array(count);
  const r3 = new Float32Array(count);
  const side = new Float32Array(count);
  const delayOld = new Float32Array(count);
  const delayNew = new Float32Array(count);
  const topNorm = Math.hypot(0.5 * W, H);
  for (let id = 0; id < count; id++) {
    r1[id] = rng();
    r2[id] = rng();
    r3[id] = rng();
    const sd = cx[id] / W;
    side[id] = Math.abs(sd - 0.5) < 0.02 ? (rng() < 0.5 ? -1 : 1) : sd < 0.5 ? -1 : 1;
    const dist = Math.hypot(cx[id] - 0.5 * W, cy[id]) / topNorm;
    delayOld[id] = clamp(dist * 0.78 + rng() * 0.22);
    delayNew[id] = clamp((1 - cy[id] / H) * 0.62 + rng() * 0.38);
  }

  // fringe along torn edges, only where cloth exists
  const fringe: FringeItem[] = [];
  for (let id = 0; id < count; id++) {
    if (!present[id]) continue;
    const poly = polys[id];
    const n = poly.length;
    for (let m = 0; m < n; m++) {
      const [x, y] = poly[m];
      const roll = rng();
      if (raster.alphaAt(x / W, y / H) <= 128 || roll >= MESH.fringeShare) continue;
      const prev = poly[(m - 1 + n) % n];
      const next = poly[(m + 1) % n];
      let nx = -(next[1] - prev[1]);
      let ny = next[0] - prev[0];
      if (nx * (x - cx[id]) + ny * (y - cy[id]) < 0) {
        nx = -nx;
        ny = -ny;
      }
      fringe.push({
        shard: id,
        x,
        y,
        ang: Math.atan2(ny, nx) + (rng() * 2 - 1) * 0.45,
        len: W * (0.04 + 0.07 * rng()),
        curl: rng() * 2 - 1,
        ph: rng() * 6.28,
        circuit: rng() < tech,
        turn: rng() < 0.5 ? -1 : 1,
      });
    }
  }

  // bridge threads over shared interior edges
  const bridges: BridgeItem[] = [];
  const addBridges = (pts: Vec2[], a: number, b: number) => {
    if (!present[a] || !present[b]) return;
    for (let m = 1; m < pts.length - 1; m++) {
      const [x, y] = pts[m];
      if (raster.alphaAt(x / W, y / H) > 128 && rng() < MESH.bridgeShare) {
        bridges.push({ a, b, x, y, sgn: rng() < 0.5 ? -1 : 1 });
      }
    }
  };
  for (let i = 0; i < C; i++)
    for (let j = 1; j < R; j++) addBridges(Hh[i][j], (j - 1) * C + i, j * C + i);
  for (let i = 1; i < C; i++)
    for (let j = 0; j < R; j++) addBridges(Vv[i][j], j * C + i - 1, j * C + i);

  return {
    W,
    H,
    count,
    present,
    cx,
    cy,
    r1,
    r2,
    r3,
    side,
    delayOld,
    delayNew,
    geometry,
    fringe,
    bridges,
  };
}

const DUR = 0.55;

/**
 * Per-shard pose for the window [a, b]:
 *   old: power-ease tear, cracking down from the top centre
 *   new: the same system reversed, stitched up from the feet
 */
export function poseShards(
  m: ShardMesh,
  role: "old" | "new",
  u: number,
  a: number,
  b: number,
  out: Float32Array,
) {
  const dur = (b - a) * DUR;
  const span = b - a - dur;
  const { W, H } = m;
  for (let i = 0; i < m.count; i++) {
    const o = i * POSE_STRIDE;
    if (!m.present[i]) {
      out[o + 4] = 0;
      continue;
    }
    const sd = m.side[i];
    if (role === "old") {
      const start = a + m.delayOld[i] * span;
      const s = clamp((u - start) / dur);
      const e = Math.pow(s, 1.5);
      out[o] = sd * (0.06 + 0.34 * m.r1[i]) * W * e;
      out[o + 1] =
        (0.1 + 0.5 * m.r2[i]) * H * e * e - 0.03 * H * Math.sin(Math.PI * Math.min(1, 1.5 * s));
      out[o + 2] = sd * (0.2 + 1.0 * m.r3[i]) * e;
      out[o + 3] = 1 + 0.08 * Math.sin(Math.PI * s);
      out[o + 4] = 1 - smoothstep(0.72, 1, s);
      out[o + 5] = s;
    } else {
      const start = a + m.delayNew[i] * span;
      const s = clamp((u - start) / dur);
      const e = Math.pow(1 - s, 1.5);
      out[o] = sd * (0.1 + 0.4 * m.r1[i]) * W * e;
      out[o + 1] = -(0.2 + 0.5 * m.r2[i]) * H * e * e;
      out[o + 2] = sd * (0.2 + 1.0 * m.r3[i]) * e;
      out[o + 3] = 1 + 0.08 * Math.sin(Math.PI * s);
      out[o + 4] = smoothstep(0, 0.22, s);
      out[o + 5] = s;
    }
  }
}

/** Transform a shard-local point by the shard's pose (same maths as the vertex shader). */
export function posePoint(
  m: ShardMesh,
  pose: Float32Array,
  i: number,
  x: number,
  y: number,
  out: Vec2,
) {
  const o = i * POSE_STRIDE;
  const lx = x - m.cx[i];
  const ly = y - m.cy[i];
  const c = Math.cos(pose[o + 2]);
  const s = Math.sin(pose[o + 2]);
  const sc = pose[o + 3];
  out[0] = m.cx[i] + (c * lx - s * ly) * sc + pose[o];
  out[1] = m.cy[i] + (s * lx + c * ly) * sc + pose[o + 1];
}

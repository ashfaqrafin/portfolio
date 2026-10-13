import * as THREE from "three";
import { MOTION, SUIT, WINDOWS } from "./config";
import type { Layout } from "./stage-layout";
import { easeInOutSine, lerp, smoothstep, win, type Vec2 } from "./utils";

export interface SuitPose {
  /** centre of the suit's raster box, stage px */
  x: number;
  y: number;
  scale: number;
  yaw: number;
  tilt: number;
  alpha: number;
}

/** The avatar floats ±3px, the suit ±4px; nothing else moves during a hold. */
export const figFloat = (t: number) => MOTION.figFloat * Math.sin((t * Math.PI * 2) / 4.6);
export const suitFloat = (t: number) =>
  MOTION.suitFloat * Math.sin((t * Math.PI * 2) / 5.3 + 1.2);

/**
 * Project a point of the suit raster (u, v in 0..1) to stage px. A front-only
 * drawing is yawed with perspective; the same maths drives the mesh and the
 * thread heads, so bands and threads never drift apart.
 */
export function suitProject(
  pose: SuitPose,
  fw: number,
  fh: number,
  u: number,
  v: number,
  out: Vec2,
) {
  const xc = (u - 0.5) * fw * pose.scale;
  const yc = (v - 0.5) * fh * pose.scale;
  const sn = Math.sin(pose.yaw);
  const cs = Math.cos(pose.yaw);
  // positive yaw brings the left edge toward the viewer: the suit faces the avatar
  const z = -xc * sn;
  const p = 1 / (1 - z / (2.2 * fh * pose.scale));
  const X = xc * cs * p;
  const Y = yc * p;
  const ct = Math.cos(pose.tilt);
  const st = Math.sin(pose.tilt);
  out[0] = pose.x + X * ct - Y * st;
  out[1] = pose.y + X * st + Y * ct;
}

const tmp: Vec2 = [0, 0];

function cubic(
  a: Vec2,
  b: Vec2,
  c: Vec2,
  d: Vec2,
  t: number,
  out: Vec2,
) {
  const mt = 1 - t;
  const w0 = mt * mt * mt;
  const w1 = 3 * mt * mt * t;
  const w2 = 3 * mt * t * t;
  const w3 = t * t * t;
  out[0] = w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * d[0];
  out[1] = w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * d[1];
}

/** Stage 2: the finished suit hangs at eye level, turned toward the avatar. */
export function displayPose(L: Layout, t: number): SuitPose {
  const sc = L.suitScale;
  const dy = (0.05 - 0.5 + 0.48 * sc) * L.fig.h;
  return {
    x: L.figCx + L.suitRight * L.sw,
    y: L.figCy + dy + suitFloat(t),
    scale: sc,
    yaw: SUIT.yaw,
    tilt: 0,
    alpha: 1,
  };
}

/** Transition 2 → 3: along a smooth arc, turning edge-on and tumbling away. */
export function outPose(L: Layout, t: number, u: number): SuitPose {
  const [a, b] = WINDOWS.suitOut;
  const s = easeInOutSine(win(u, a, b));
  const d = displayPose(L, t);
  const W = L.sw;
  const H = L.sh;
  const p0: Vec2 = [d.x - L.figCx, d.y - L.figCy];
  const p1: Vec2 = [0.04 * W, -0.38 * H];
  const p2: Vec2 = [0.3 * W, -0.62 * H];
  const p3: Vec2 = [0.78 * W, -0.46 * H];
  cubic(p0, p1, p2, p3, s, tmp);
  return {
    x: L.figCx + tmp[0],
    y: L.figCy + tmp[1],
    scale: lerp(d.scale, SUIT.outScale, s),
    yaw: d.yaw + SUIT.outYaw * s,
    tilt: SUIT.outTilt * s,
    alpha: 1 - smoothstep(0.82, 1, s),
  };
}

/** Transition 3 → 4: enters from beyond the top-left and lands on the final body. */
export function inPose(L: Layout, t: number, u: number): SuitPose {
  const [a, b] = WINDOWS.suitIn;
  const s = easeInOutSine(win(u, a, b));
  const W = L.sw;
  const H = L.sh;
  const p0: Vec2 = [-0.9 * W, -0.5 * H];
  const p1: Vec2 = [-0.5 * W, -0.72 * H];
  const p2: Vec2 = [-0.2 * W, 0.12 * H];
  const p3: Vec2 = [0, 0];
  cubic(p0, p1, p2, p3, s, tmp);
  return {
    x: L.figCx + tmp[0],
    y: L.figCy + tmp[1] + figFloat(t) * s,
    scale: lerp(SUIT.inScale, 1, s),
    yaw: SUIT.outYaw * (1 - s),
    tilt: -0.4 * (1 - s),
    alpha: smoothstep(0, 0.2, s),
  };
}

/** Landed on avatar 4 exactly: same scale, same float. */
export function landedPose(L: Layout, t: number): SuitPose {
  return { x: L.figCx, y: L.figCy + figFloat(t), scale: 1, yaw: 0, tilt: 0, alpha: 1 };
}

/** The suit as 40 vertical slices, each with its own perspective. */
export function createSuitGeometry() {
  const n = SUIT.slices;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((n + 1) * 2 * 3);
  const uv = new Float32Array((n + 1) * 2 * 2);
  const cen = new Float32Array((n + 1) * 2 * 2);
  const sid = new Float32Array((n + 1) * 2);
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    uv.set([u, 0], (i * 2) * 2);
    uv.set([u, 1], (i * 2 + 1) * 2);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const posA = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posA);
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("aCenter", new THREE.BufferAttribute(cen, 2));
  geo.setAttribute("aShard", new THREE.BufferAttribute(sid, 1));
  geo.setIndex(idx);
  return geo;
}

export function updateSuitGeometry(
  geo: THREE.BufferGeometry,
  pose: SuitPose,
  fw: number,
  fh: number,
) {
  const n = SUIT.slices;
  const posA = geo.getAttribute("position") as THREE.BufferAttribute;
  const pos = posA.array as Float32Array;
  const o: Vec2 = [0, 0];
  // slices share vertices, so there are no seams to hide
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    suitProject(pose, fw, fh, u, 0, o);
    let k = i * 2 * 3;
    pos[k] = o[0];
    pos[k + 1] = o[1];
    pos[k + 2] = 0;
    suitProject(pose, fw, fh, u, 1, o);
    k = (i * 2 + 1) * 3;
    pos[k] = o[0];
    pos[k + 1] = o[1];
    pos[k + 2] = 0;
  }
  posA.needsUpdate = true;
}

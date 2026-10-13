import * as THREE from "three";
import { MESH, MOTION, THREADS } from "./config";
import type { RowSet } from "./raster";
import { POSE_STRIDE } from "./shards";
import { ART_FRAG, ART_VERT } from "./shaders";

export interface ArtObj {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  xf: THREE.Vector4[];
  sa: number[];
  origin: THREE.Vector2;
  rows: THREE.Vector4[];
  range: THREE.Vector2;
}

/** A w × h quad in local px, with uv, the shard id 0 and a zero centre. */
export function planeGeometry(w: number, h: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, w, 0, 0, w, h, 0, 0, h, 0], 3),
  );
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setAttribute("aCenter", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0], 2));
  g.setAttribute("aShard", new THREE.Float32BufferAttribute([0, 0, 0, 0], 1));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

export function makeArt(
  map: THREE.Texture,
  geo: THREE.BufferGeometry,
  texW: number,
  texH: number,
  order: number,
): ArtObj {
  const xf = Array.from({ length: MESH.maxShards }, () => new THREE.Vector4(0, 0, 0, 1));
  const sa = new Array<number>(MESH.maxShards).fill(1);
  const origin = new THREE.Vector2();
  const rows = Array.from({ length: THREADS.rows }, () => new THREE.Vector4(0, 1, 0, 1));
  const range = new THREE.Vector2(0, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: ART_VERT,
    fragmentShader: ART_FRAG,
    uniforms: {
      uMap: { value: map },
      uXf: { value: xf },
      uSA: { value: sa },
      uOrigin: { value: origin },
      uFab: { value: 0 },
      uRel: { value: 0 },
      uTime: { value: 0 },
      uBoil: { value: MOTION.boilPx },
      uTexSize: { value: new THREE.Vector2(texW, texH) },
      uRowMode: { value: 0 },
      uRow: { value: rows },
      uRange: { value: range },
      uAlpha: { value: 1 },
      uCell: { value: MOTION.weaveCellPx },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.visible = false;
  return { mesh, mat, xf, sa, origin, rows, range };
}

export const uni = (a: ArtObj) => a.mat.uniforms;

/** Row masks: mode 0 = none, 1 = reveal woven rows, 2 = erase unwoven rows. */
export function setRows(a: ArtObj, rs: RowSet, progress: Float32Array, mode: 0 | 1 | 2) {
  uni(a).uRowMode.value = mode;
  if (mode === 0) return;
  a.range.set(rs.yFirst, rs.yLast);
  for (let i = 0; i < THREADS.rows; i++) {
    const r = rs.rows[i];
    a.rows[i].set(progress[i], r.dir, r.xmin, r.xmax);
  }
}

export function applyPose(a: ArtObj, pose: Float32Array, count: number) {
  for (let i = 0; i < count; i++) {
    const o = i * POSE_STRIDE;
    a.xf[i].set(pose[o], pose[o + 1], pose[o + 2], pose[o + 3]);
    a.sa[i] = pose[o + 4];
  }
}

export function resetPose(a: ArtObj) {
  for (let i = 0; i < a.xf.length; i++) {
    a.xf[i].set(0, 0, 0, 1);
    a.sa[i] = 1;
  }
}

import { THREADS, MESH } from "./config";

const NR = THREADS.rows;
const MS = MESH.maxShards;

const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
`;

/**
 * Art vertex shader. One shader serves a static plane, the shard mesh, the
 * yaw-projected suit strip and the pattern sheet: per-shard transforms come
 * from a uniform array, everything else is identity.
 */
export const ART_VERT = /* glsl */ `
uniform vec4 uXf[${MS}];
uniform float uSA[${MS}];
uniform vec2 uOrigin;
attribute vec2 aCenter;
attribute float aShard;
varying vec2 vUv;
varying float vA;
void main() {
  int id = int(aShard + 0.5);
  vec4 xf = uXf[id];
  vec2 loc = position.xy - aCenter;
  float c = cos(xf.z);
  float s = sin(xf.z);
  vec2 r = vec2(c * loc.x - s * loc.y, s * loc.x + c * loc.y) * xf.w;
  vec2 p = uOrigin + aCenter + r + xf.xy;
  vUv = uv;
  vA = uSA[id];
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 0.0, 1.0);
}
`;

export const ART_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uFab;
uniform float uRel;
uniform float uTime;
uniform float uBoil;
uniform vec2 uTexSize;
uniform int uRowMode;
uniform vec4 uRow[${NR}];
uniform vec2 uRange;
uniform float uAlpha;
uniform float uCell;
varying vec2 vUv;
varying float vA;

const vec3 INK   = vec3(0.271, 0.043, 0.086);
const vec3 BURG  = vec3(0.345, 0.063, 0.118);
const vec3 BURG2 = vec3(0.549, 0.184, 0.263);
const vec3 CREAM = vec3(0.973, 0.953, 0.918);

${NOISE}

// Everything the artwork contains is mapped onto ink → burgundy → cream.
vec3 ramp(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 o = mix(INK, BURG, smoothstep(0.0, 0.10, l));
  o = mix(o, BURG2, smoothstep(0.10, 0.24, l));
  o = mix(o, CREAM, smoothstep(0.24, 0.90, l));
  return o;
}

// Plain weave: over / under thread cross-sections, burgundy yarn on cream.
vec3 weave(vec2 q) {
  vec2 id = floor(q);
  vec2 f = fract(q);
  float odd = mod(id.x + id.y, 2.0);
  float warp = sin(3.14159 * f.x);
  float weft = sin(3.14159 * f.y);
  float h = mix(weft, warp, odd);
  float n = hash21(id) * 0.22;
  float tone = 0.50 + 0.46 * h - n;
  return mix(BURG, CREAM, clamp(tone, 0.0, 1.0));
}

// Soft diagonal wipe, 0 → 1. Edge width is 0.3 of the diagonal.
float wipe(float d, float p) {
  float w = 0.3;
  float e = p * (1.0 + w) - w;
  return 1.0 - smoothstep(e, e + w, d);
}

float rowMask(vec2 uv) {
  if (uRowMode == 0) return 1.0;
  float nr = ${NR}.0;
  float r = floor((uv.y - uRange.x) / (uRange.y - uRange.x) * nr);
  r = clamp(r, 0.0, nr - 1.0);
  vec4 d = uRow[int(r)];
  float inside;
  if (d.x <= 0.0) {
    inside = 0.0;
  } else if (d.x >= 1.0) {
    inside = 1.0;
  } else {
    float span = d.w - d.z;
    float edge = d.y > 0.0 ? d.z + d.x * span : d.w - d.x * span;
    inside = d.y > 0.0 ? step(uv.x, edge) : step(edge, uv.x);
  }
  return uRowMode == 1 ? inside : 1.0 - inside;
}

void main() {
  // hand-drawn "line boil": the ink re-wobbles a few times per second
  vec2 sd = vec2(uTime * 1.37, uTime * 2.11);
  vec2 n1 = vec2(vnoise(vUv * vec2(14.0, 21.0) + sd),
                 vnoise(vUv * vec2(14.0, 21.0) + sd + 31.7)) - 0.5;
  vec2 n2 = vec2(vnoise(vUv * vec2(48.0, 70.0) + sd * 1.7),
                 vnoise(vUv * vec2(48.0, 70.0) + sd * 1.7 + 17.3)) - 0.5;
  vec2 off = (n1 * 1.2 + n2 * 0.8) * uBoil / uTexSize;

  vec4 t = texture2D(uMap, vUv + off);
  float a = t.a;
  vec3 c = a > 0.004 ? t.rgb / a : vec3(1.0);
  c = ramp(c);

  float d = (vUv.x + vUv.y) * 0.5;
  float cloth = wipe(d, uFab) * (1.0 - wipe(1.0 - d, uRel));
  if (cloth > 0.001) {
    vec3 w = mix(weave(vUv * uTexSize / uCell), CREAM, 0.2);
    c = mix(c, w * mix(vec3(1.0), c, 0.9), cloth);
  }

  a *= uAlpha * vA * rowMask(vUv);
  gl_FragColor = vec4(c * a, a);
}
`;

export const BG_VERT = /* glsl */ `
varying vec2 vPx;
void main() {
  vPx = position.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0);
}
`;

/** Paper, grain, and a wobbly hand-ruled blueprint grid that lights up. Drawn
    twice: under everything as the bare paper (uOver 0), then over the drawings
    as the grid alone (uOver 1), so the figure looks drawn on the grid paper
    rather than pasted onto it. */
export const BG_FRAG = /* glsl */ `
uniform vec2 uSize;
uniform sampler2D uScratch;
uniform float uOver;
uniform float uHot;
uniform vec2 uHotC;
uniform float uHotR;
uniform float uSeed;
varying vec2 vPx;

const vec3 PAPER = vec3(0.973, 0.953, 0.918);
const vec3 BURG  = vec3(0.290, 0.047, 0.094);
const vec3 INK   = vec3(0.290, 0.047, 0.094);

${NOISE}

float ruled(float coord, float along, float cell, float w, float seed) {
  float g = coord / cell;
  float id = floor(g + 0.5);
  float dist = abs(g - id) * cell;
  float lw = w * (0.65 + 0.8 * hash21(vec2(id, seed)));
  float cov = 1.0 - smoothstep(lw * 0.5, lw * 0.5 + 0.9, dist);
  float dash = smoothstep(0.0, 0.12, vnoise(vec2(along * 0.028, id * 7.3 + seed)) + 0.12);
  float lite = 0.85 + 0.15 * hash21(vec2(id, seed + 3.0));
  return cov * dash * lite;
}

void main() {
  vec3 col = PAPER;

  float mott = vnoise(vPx * 0.011 + uSeed) * 0.55 + vnoise(vPx * 0.043) * 0.45;
  col *= 1.0 - 0.012 * mott;
  col -= (hash21(floor(vPx)) - 0.5) * 0.008;

  vec2 q = vPx;
  q.x += (vnoise(vec2(vPx.y * 0.013, uSeed)) - 0.5) * 3.0
       + (vnoise(vec2(vPx.y * 0.19, uSeed + 5.0)) - 0.5) * 0.7;
  q.y += (vnoise(vec2(vPx.x * 0.013, uSeed + 9.0)) - 0.5) * 3.0
       + (vnoise(vec2(vPx.x * 0.19, uSeed + 14.0)) - 0.5) * 0.7;
  float g = max(ruled(q.x, vPx.y, 22.0, 1.0, uSeed), ruled(q.y, vPx.x, 22.0, 1.0, uSeed + 40.0));

  float hot = smoothstep(uHotR, uHotR * 0.2, distance(vPx, uHotC)) * uHot;
  float k = g * mix(0.085, 0.30, hot);
  if (uOver > 0.5) {
    // the second pass: the grid alone, multiplied over everything drawn on the
    // paper, so it shows through the drawings as print shows through pencil
    gl_FragColor = vec4(mix(vec3(1.0), BURG / PAPER, k), 1.0);
    return;
  }

  // pencil shading round the page's edges: random scratches, painted once (scratch.ts)
  col = mix(col, BURG, texture2D(uScratch, vPx / uSize).a);

  gl_FragColor = vec4(col, 1.0);
}
`;

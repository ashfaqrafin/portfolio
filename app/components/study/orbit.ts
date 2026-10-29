import * as THREE from "three";

/* The education section's scene, drawn like a plate from an old astronomy
   notebook: the avatar standing on the page, and three balls of particles in
   orbit around him.

   - The orbit is a real ring in 3D, tilted towards us and rolled a little, seen
     in perspective: a ball swells as it swings round in front of him and
     shrinks, fading into the paper, behind. It keeps Kepler's habit of hurrying
     through the near side and lingering at the far one (the three share one
     orbit, a third of a turn apart).
   - The ring itself is pencilled in, stippled, its far half behind him and its
     near half in front.
   - Each ball is a few thousand points: a stippled sphere shaded like pencil
     (denser away from the light), its subject's mark inked on both faces, and
     dust shed from its trailing side. It spins on a tilted axis as it goes.
   - Each casts a hatched pencil shadow on the floor, under where it is: wider
     and fainter as it rises. He has one too.

   Positions are worked out here each frame and handed to `onFrame`, which
   places the HTML tags. The camera is orthographic in CSS pixels, y down; the
   perspective is ours. Renders only while `setVisible(true)`. */

export type Mark = "cs" | "econ" | "pol";
export type BallAt = { x: number; y: number; r: number; z: number };

export interface Orbit {
  /** which ball is under this point (stage CSS px), front ones first, or -1 */
  hit(x: number, y: number): number;
  /** loosen one ball's particles (pointed at), or none */
  excite(i: number | null): void;
  /** slow the orbit to a crawl (a window is open) */
  slow(on: boolean): void;
  setVisible(on: boolean): void;
  dispose(): void;
}

type Opts = {
  marks: Mark[];
  avatar: HTMLImageElement;
  still: boolean;
  onFrame: (balls: BallAt[]) => void;
};

// These shaders write their colour straight to the screen, so they take the
// site's sRGB colours as they are. (A THREE.Color set from "#8c2f43" holds the
// linear-light value, which on screen comes out darker and browner.)
const srgb = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
const BODY = srgb(0x8c2f43); // --thread
const INK = srgb(0x4a0c18); // --ink
const PAPER = srgb(0xf8f3ea); // --paper, the sheet's colour

const TURN = 34; // s for one orbit
const ECC = 0.16; // how much it hurries through the near side
const INC = 0.27; // rad the ring is tilted towards us (its near side lower)
const ROLL = -0.09; // rad the ring is rolled
const DEPTH = 4.2; // the eye's distance, in orbit radii: sets the perspective
const SPIN = 0.26; // rad/s each ball turns on its axis
// where each ball sits with reduced motion (mean anomaly): right, left, back
const STILL_AT = [1.15, -1.3, 2.75];

// ── shaders ──────────────────────────────────────────────────────────────────
const BALL_VERT = /* glsl */ `
attribute float aKind; // 0 the sphere, 1 its mark, 2 dust
attribute vec3 aRand;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uTime;
uniform float uPhase;
uniform vec2 uVel;
uniform float uExcite;
uniform float uDpr;
uniform float uScale;
varying float vAlpha;
varying float vInk;

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }

void main() {
  float t = uTime;
  // spinning on an axis tipped towards us, with a slow nod
  mat3 R = rotZ(0.16) * rotX(0.16 + 0.1 * sin(t * 0.37 + uPhase)) * rotY(t * ${SPIN.toFixed(2)} + uPhase);
  vec3 q = R * position;
  float j = 0.5 + 0.5 * sin(t * 2.2 + aRand.x * 40.0);
  q *= 1.0 + uExcite * (0.05 + 0.3 * aRand.y * j) + 0.01 * sin(t * 1.3 + aRand.z * 30.0);
  float alpha;
  vInk = 0.0;
  if (aKind < 1.5) {
    // pencil on paper: denser away from the light (up and to the left, in front)
    vec3 L = normalize(vec3(-0.55, -0.6, 0.6));
    float shade = 1.0 - max(dot(normalize(q), L), 0.0);
    float front = smoothstep(-0.4, 0.3, q.z);
    alpha = (0.1 + 0.64 * shade) * mix(0.2, 1.0, front);
    if (aKind > 0.5) {
      alpha = 0.95 * mix(0.06, 1.0, smoothstep(0.0, 0.42, q.z));
      vInk = 1.0;
    }
  } else {
    // dust: shed from the trailing side, drifting back and spreading out
    float speed = length(uVel);
    vec2 v = speed > 1.0 ? uVel / speed : vec2(1.0, 0.0);
    vec2 s = q.xy;
    float d = dot(s, v);
    if (d > 0.0) s -= 2.0 * d * v;
    float life = fract(t * 0.3 + aRand.x);
    vec2 drift = -v * life * (0.7 + 1.6 * aRand.y) + (aRand.zx - 0.5) * life * 0.9;
    q = vec3(s * (1.0 + life * 0.12) + drift * (0.55 + 0.9 * uExcite), q.z);
    alpha = pow(1.0 - life, 1.7) * 0.42 * clamp(speed / 70.0 + 0.3, 0.0, 1.0);
  }
  vAlpha = alpha;
  vec2 at = uCenter + q.xy * uRadius;
  gl_Position = projectionMatrix * viewMatrix * vec4(at, 0.0, 1.0);
  gl_PointSize = (aKind > 1.5 ? 1.3 : aKind > 0.5 ? 2.0 : 1.7) * uDpr * (0.8 + 0.4 * aRand.y) * uScale;
}
`;

const BALL_FRAG = /* glsl */ `
uniform vec3 uBody;
uniform vec3 uInk;
uniform float uFade;
varying float vAlpha;
varying float vInk;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(mix(uBody, uInk, vInk), vAlpha * uFade);
}
`;

// screen-placed points with their own alpha: the pencilled ring
const DOTS_VERT = /* glsl */ `
attribute float aAlpha;
uniform float uDpr;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0);
  gl_PointSize = 1.5 * uDpr;
}
`;
const DOTS_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(uColor, vAlpha * uFade);
}
`;

const PLANE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;
// a soft disc of paper behind each ball: unseen on the page, it keeps the
// ball readable when it passes in front of his dark suit
const DISC_FRAG = /* glsl */ `
uniform vec3 uPaper;
uniform float uFade;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  gl_FragColor = vec4(uPaper, (1.0 - smoothstep(0.6, 0.98, d)) * 0.62 * uFade);
}
`;
// a shadow on the floor, hatched in pencil: broken diagonal strokes in an oval
const SHADOW_FRAG = /* glsl */ `
uniform vec3 uInk;
uniform float uAlpha;
uniform vec2 uSize;
varying vec2 vUv;
float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  float d = length((vUv - 0.5) * 2.0);
  float body = 1.0 - smoothstep(0.35, 1.0, d);
  vec2 px = vUv * uSize;
  float u = (px.x + px.y * 2.2) / 3.6;
  float line = 1.0 - smoothstep(0.18, 0.42, abs(fract(u) - 0.5));
  float broken = step(0.3, h21(vec2(floor(u), floor(px.x / 9.0))));
  float a = body * (0.18 + 0.82 * line * broken) * uAlpha;
  gl_FragColor = vec4(uInk, a);
}
`;

// him, as an illustration on the page: his own colours, toned a little towards
// the paper, inked contours where the tone turns and round his outline, and a
// few hatched strokes only in the folds (where he's darker than around him).
// It holds still: the life is in the dust and the orbit around him, not on him.
// The hatching is fixed to the picture, so it never swims or flickers.
const PERSON_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uTexel;
uniform vec3 uInk;
uniform vec3 uThread;
uniform vec3 uPaper;
uniform float uFade;
varying vec2 vUv;
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float L(vec2 o) { return lum(texture2D(uMap, vUv + o * uTexel).rgb); }
float A(vec2 o) { return texture2D(uMap, vUv + o * uTexel).a; }
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a < 0.02) discard;
  float l = lum(t.rgb);
  // contours: where the tone turns sharply, and round his outline
  float gx = L(vec2(1.5, 0.0)) - L(vec2(-1.5, 0.0));
  float gy = L(vec2(0.0, 1.5)) - L(vec2(0.0, -1.5));
  float edge = smoothstep(0.1, 0.3, length(vec2(gx, gy)));
  float rim = smoothstep(0.3, 0.75, length(vec2(A(vec2(2.0, 0.0)) - A(vec2(-2.0, 0.0)), A(vec2(0.0, 2.0)) - A(vec2(0.0, -2.0)))));
  // the folds: darker than the cloth around them
  float around = (L(vec2(12.0, 0.0)) + L(vec2(-12.0, 0.0)) + L(vec2(0.0, 12.0)) + L(vec2(0.0, -12.0))
                + L(vec2(8.5, 8.5)) + L(vec2(-8.5, 8.5)) + L(vec2(8.5, -8.5)) + L(vec2(-8.5, -8.5))) / 8.0;
  float fold = smoothstep(0.02, 0.12, around - l);
  // a few hatched strokes in them, fixed to the picture, thin and slightly broken
  vec2 p = vUv / uTexel;
  float u = abs(fract((p.x * 0.7 + p.y * 0.7) / 6.0) - 0.5);
  float hatch = (1.0 - smoothstep(0.08, 0.16, u)) * fold * step(0.25, fract(sin(floor((p.x * 0.7 + p.y * 0.7) / 6.0) * 12.9898) * 43758.5) + 0.2);
  // his own colours, toned towards the paper so he sits on the page
  vec3 col = mix(uPaper, t.rgb, 0.86);
  col = mix(col, col * vec3(1.02, 0.97, 0.95), 0.5);
  vec3 pen = mix(uThread, uInk, 0.6);
  float ink = clamp(hatch * 0.32 + edge * 0.55 + rim * 0.85, 0.0, 1.0);
  gl_FragColor = vec4(mix(col, pen, ink), t.a * uFade);
}
`;

// the dust around him, in three kinds:
//   0 · a halo hugging his outline: each mote sits a little way out from the
//       edge, breathes in and out, slides slowly along it and twinkles;
//   1 · dust peeling off and drifting up, fading as it goes;
//   2 · motes circling him slowly at every height, a small orbit of his own,
//       hidden by him as they pass behind.
// Both are drawn towards a ball that's pointed at, as if the subjects were
// pulling at him. All outside his outline: his body stays still.
const DUST_VERT = /* glsl */ `
attribute vec3 aRand;
attribute vec2 aNormal; // outward, from his outline
attribute float aKind;
uniform vec4 uRect; // x, y, w, h of him on the stage
uniform float uTime;
uniform vec2 uPull;
uniform float uPullAmt;
uniform float uDpr;
uniform float uScale; // his height / 600: px distances scale with him
uniform sampler2D uMap; // him, to hide the motes passing behind
varying float vAlpha;
void main() {
  vec2 from = uRect.xy + position.xy * uRect.zw;
  vec2 n = aNormal;
  vec2 tg = vec2(-n.y, n.x);
  vec2 at;
  float alpha;
  float pull;
  if (aKind < 0.5) {
    // the halo
    float out0 = (2.0 + 34.0 * aRand.x * aRand.x * aRand.x) * uScale;
    float breathe = sin(uTime * (0.5 + 0.4 * aRand.y) + aRand.z * 6.283) * 5.0 * uScale;
    float slide = sin(uTime * 0.23 + aRand.y * 6.283) * (8.0 + 16.0 * aRand.z) * uScale;
    at = from + n * (out0 + breathe) + tg * slide;
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.3 + aRand.z * 2.0) + aRand.x * 40.0);
    alpha = (0.3 + 0.55 * (1.0 - aRand.x)) * twinkle;
    pull = 0.25 + 0.35 * aRand.y;
  } else if (aKind > 1.5) {
    // circling him: position.y is the height, aRand the radius, speed and phase
    float h = position.y;
    float ang = uTime * (0.18 + 0.22 * aRand.y) * (aRand.z > 0.3 ? 1.0 : -1.0) + aRand.z * 6.283;
    float rx = uRect.z * (0.42 + 0.5 * aRand.x);
    vec2 c = vec2(uRect.x + uRect.z * 0.5, uRect.y + uRect.w * h);
    float depth = cos(ang);
    at = c + vec2(sin(ang) * rx, depth * rx * 0.14 + sin(uTime * 0.6 + aRand.x * 9.0) * 3.0 * uScale);
    alpha = (0.18 + 0.4 * aRand.y) * (0.55 + 0.45 * depth);
    // behind him: hidden where he is
    if (depth < 0.0) {
      vec2 uv = (at - uRect.xy) / uRect.zw;
      if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) alpha *= 1.0 - texture2D(uMap, uv).a;
    }
    pull = 0.3 + 0.5 * aRand.y;
  } else {
    // peeling off and drifting up
    float life = fract(uTime * (0.05 + 0.05 * aRand.x) + aRand.y);
    vec2 drift = (n * (14.0 + 30.0 * aRand.z) + vec2(sin(uTime * 0.7 + aRand.z * 20.0) * 10.0, -80.0 - 70.0 * aRand.z)) * life * uScale;
    at = from + drift;
    alpha = sin(3.14159 * life) * (0.22 + 0.33 * aRand.x);
    pull = (0.4 + 0.6 * aRand.x) * smoothstep(0.0, 1.0, life);
  }
  at = mix(at, uPull, uPullAmt * pull);
  vAlpha = alpha;
  gl_Position = projectionMatrix * viewMatrix * vec4(at, 0.0, 1.0);
  gl_PointSize = (1.0 + 1.1 * aRand.z) * uDpr;
}
`;
const DUST_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uInk;
uniform float uFade;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  // the densest motes in ink, the rest in thread
  gl_FragColor = vec4(mix(uColor, uInk, smoothstep(0.45, 0.7, vAlpha)), vAlpha * uFade);
}
`;

/** points on his outline (in 0..1 of the picture), each with the outward normal there */
function outlinePoints(img: HTMLImageElement, halo: number, rising: number) {
  const W = 160;
  const H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, W, H);
  const a = g.getImageData(0, 0, W, H).data;
  const al = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? a[(y * W + x) * 4 + 3] / 255 : 0);
  const on = (x: number, y: number) => al(x, y) > 0.5;
  const edge: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (on(x, y) && !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1))) edge.push([x, y]);
  // outward: down the alpha slope, smoothed over a few pixels
  const normal = (x: number, y: number) => {
    let nx = 0;
    let ny = 0;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const v = al(x + dx, y + dy);
        nx -= dx * v;
        ny -= dy * v;
      }
    const l = Math.hypot(nx, ny) || 1;
    return [nx / l, ny / l];
  };
  const rand = seeded(29);
  const pos: number[] = [];
  const nrm: number[] = [];
  const rnd: number[] = [];
  const kind: number[] = [];
  const add = (k: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = edge[Math.floor(rand() * edge.length)];
      const [nx, ny] = normal(x, y);
      pos.push((x + 0.5) / W, (y + 0.5) / H, 0);
      // the picture's aspect: a normal in picture units, in screen px
      const sx = nx * (img.naturalHeight / img.naturalWidth) * (W / H);
      const l = Math.hypot(sx, ny) || 1;
      nrm.push(sx / l, ny / l);
      rnd.push(rand(), rand(), rand());
      kind.push(k);
    }
  };
  add(0, halo);
  add(1, rising);
  // circling: at heights through his body, more round the middle
  for (let i = 0; i < Math.round(halo * 0.4); i++) {
    const h = 0.12 + 0.82 * (0.5 + (rand() + rand() + rand() - 1.5) / 3);
    pos.push(0, h, 0);
    nrm.push(0, 0);
    rnd.push(rand(), rand(), rand());
    kind.push(2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aNormal", new THREE.Float32BufferAttribute(nrm, 2));
  geo.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 3));
  geo.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1));
  return geo;
}

/** a subject's mark, drawn into a small mask: 1 where there's ink */
function drawMark(mark: Mark): (u: number, v: number) => boolean {
  const S = 96;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = g.strokeStyle = "#fff";
  g.lineCap = "round";
  g.lineJoin = "round";
  if (mark === "cs") {
    // </>
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(32, 30);
    g.lineTo(14, 48);
    g.lineTo(32, 66);
    g.moveTo(64, 30);
    g.lineTo(82, 48);
    g.lineTo(64, 66);
    g.moveTo(55, 24);
    g.lineTo(41, 72);
    g.stroke();
  } else if (mark === "econ") {
    // supply meets demand, on a chart's axes
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(18, 16);
    g.lineTo(18, 78);
    g.lineTo(82, 78);
    g.stroke();
    g.lineWidth = 6.5;
    g.beginPath();
    g.moveTo(28, 68);
    g.quadraticCurveTo(54, 62, 76, 24);
    g.moveTo(28, 26);
    g.quadraticCurveTo(52, 62, 78, 66);
    g.stroke();
    g.beginPath();
    g.arc(52, 51, 6, 0, Math.PI * 2);
    g.fill();
  } else {
    // a hall with columns
    g.beginPath();
    g.moveTo(48, 16);
    g.lineTo(82, 34);
    g.lineTo(14, 34);
    g.closePath();
    g.fill();
    for (const x of [22, 37, 52, 67]) g.fillRect(x, 40, 7, 26);
    g.fillRect(14, 68, 68, 8);
  }
  const px = g.getImageData(0, 0, S, S).data;
  return (u, v) => {
    const x = Math.floor(u * S);
    const y = Math.floor(v * S);
    return x >= 0 && y >= 0 && x < S && y < S && px[(y * S + x) * 4 + 3] > 128;
  };
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** one ball's particles, on a unit sphere (y down) */
function ballGeometry(mark: Mark, count: number, seed: number) {
  const rand = seeded(seed);
  const inMark = drawMark(mark);
  const pos: number[] = [];
  const kind: number[] = [];
  const rnd: number[] = [];
  const push = (x: number, y: number, z: number, k: number) => {
    pos.push(x, y, z);
    kind.push(k);
    rnd.push(rand(), rand(), rand());
  };
  const onSphere = (): [number, number, number] => {
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(a), r * Math.sin(a), z];
  };
  // the sphere: mostly a thick shell, a little volume inside
  for (let i = 0; i < count; i++) {
    const [x, y, z] = onSphere();
    const depth = rand() < 0.82 ? 0.9 + rand() * 0.1 : Math.cbrt(rand()) * 0.9;
    push(x * depth, y * depth, z * depth, 0);
  }
  // its mark, on both faces (the back one mirrored, so it reads when it comes round)
  const want = Math.round(count * 0.16);
  for (const face of [1, -1]) {
    for (let made = 0, tries = 0; made < want && tries < want * 40; tries++) {
      const x = rand() * 2 - 1;
      const y = rand() * 2 - 1;
      if (x * x + y * y > 0.92 || !inMark(0.5 + x * 0.5, 0.5 + y * 0.5)) continue;
      push(x * face, y, face * Math.sqrt(1 - x * x - y * y), 1);
      made++;
    }
  }
  // dust
  for (let i = 0; i < Math.round(count * 0.3); i++) push(...onSphere(), 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1));
  g.setAttribute("aRand", new THREE.Float32BufferAttribute(rnd, 3));
  return g;
}

const plane = (frag: string, uniforms: Record<string, THREE.IUniform>) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ vertexShader: PLANE_VERT, fragmentShader: frag, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, uniforms }),
  );
  m.frustumCulled = false;
  return m;
};

export function createOrbit(stage: HTMLElement, { marks, avatar, still, onFrame }: Opts): Orbit {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = "ed-gl";
  canvas.setAttribute("aria-hidden", "true");
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  camera.position.z = 5;
  const disposables: { dispose(): void }[] = [renderer];
  const own = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  // draw order: far ring 0.2 · shadows 0.3 · far balls 0.4/0.5 · him 1 ·
  // near ring 1.5 · near balls 2.4/2.5
  const tex = own(new THREE.Texture(avatar));
  tex.flipY = false;
  // raw values: the engraving shader works on the picture's own tones
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  const personMat = own(
    new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: PERSON_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: tex },
        uTexel: { value: new THREE.Vector2(1 / avatar.naturalWidth, 1 / avatar.naturalHeight) },
        uInk: { value: INK },
        uThread: { value: BODY },
        uPaper: { value: PAPER },
        uFade: { value: 1 },
      },
    }),
  );
  const person = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), personMat);
  person.frustumCulled = false;
  person.renderOrder = 1;
  scene.add(person);

  const dustMat = own(
    new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRect: { value: new THREE.Vector4() },
        uTime: { value: 0 },
        uPull: { value: new THREE.Vector2() },
        uPullAmt: { value: 0 },
        uDpr: { value: 1 },
        uColor: { value: BODY },
        uInk: { value: INK },
        uScale: { value: 1 },
        uMap: { value: tex },
        uFade: { value: 0 },
      },
    }),
  );
  const small = stage.clientWidth < 640;
  const dust = new THREE.Points(own(outlinePoints(avatar, small ? 2600 : 5600, small ? 900 : 1800)), dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 1.1;
  scene.add(dust);
  let pullAmt = 0;

  const hatchUniforms = () => ({ uInk: { value: INK }, uAlpha: { value: 0 }, uSize: { value: new THREE.Vector2(1, 1) } });
  const feet = plane(SHADOW_FRAG, hatchUniforms());
  feet.renderOrder = 0.3;
  scene.add(feet);

  // the ring, pencilled in: far half and near half
  const ringMat = () =>
    own(
      new THREE.ShaderMaterial({
        vertexShader: DOTS_VERT,
        fragmentShader: DOTS_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: { uColor: { value: BODY }, uFade: { value: 0 }, uDpr: { value: 1 } },
      }),
    );
  const farRing = new THREE.Points(own(new THREE.BufferGeometry()), ringMat());
  const nearRing = new THREE.Points(own(new THREE.BufferGeometry()), ringMat());
  farRing.renderOrder = 0.2;
  nearRing.renderOrder = 1.5;
  farRing.frustumCulled = nearRing.frustumCulled = false;
  scene.add(farRing, nearRing);

  const narrow = () => stage.clientWidth < 640;
  const count = narrow() ? 4200 : 7000;
  const balls = marks.map((m, i) => {
    const mat = own(
      new THREE.ShaderMaterial({
        vertexShader: BALL_VERT,
        fragmentShader: BALL_FRAG,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uCenter: { value: new THREE.Vector2() },
          uRadius: { value: 50 },
          uTime: { value: 0 },
          uPhase: { value: i * 2.1 },
          uVel: { value: new THREE.Vector2() },
          uExcite: { value: 2.5 },
          uDpr: { value: 1 },
          uScale: { value: 1 },
          uBody: { value: BODY },
          uInk: { value: INK },
          uFade: { value: 0 },
        },
      }),
    );
    const pts = new THREE.Points(own(ballGeometry(m, count, 11 + i * 7)), mat);
    pts.frustumCulled = false;
    const disc = plane(DISC_FRAG, { uPaper: { value: PAPER }, uFade: { value: 0 } });
    const shadow = plane(SHADOW_FRAG, hatchUniforms());
    shadow.renderOrder = 0.3;
    own(disc.geometry);
    own(disc.material as THREE.Material);
    own(shadow.geometry);
    own(shadow.material as THREE.Material);
    scene.add(shadow, disc, pts);
    return { pts, mat, disc, shadow, at: { x: 0, y: 0, r: 0, z: 0 } as BallAt, excite: 2.5, want: 0, prev: null as { x: number; y: number } | null };
  });
  own(feet.geometry);
  own(feet.material as THREE.Material);

  // ── layout ─────────────────────────────────────────────────────────────────
  let W = 0;
  let H = 0;
  let L = { cx: 0, cy: 0, R: 0, r: 0, floor: 0, aw: 0 };

  /** a point on the ring, by its true angle: screen x, y; its scale; depth (−1 far … 1 near); and the floor below it */
  const project = (th: number) => {
    const x0 = L.R * Math.sin(th);
    const z0 = L.R * Math.cos(th);
    const y = z0 * Math.sin(INC);
    const z = z0 * Math.cos(INC);
    const xr = x0 * Math.cos(ROLL) - y * Math.sin(ROLL);
    const yr = x0 * Math.sin(ROLL) + y * Math.cos(ROLL);
    const s = DEPTH / (DEPTH - z / L.R);
    return { x: L.cx + xr * s, y: L.cy + yr * s, s, z: z / L.R, floorY: L.cy + L.floor * s, height: L.floor - yr };
  };

  const layout = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.right = W;
    camera.bottom = H;
    camera.updateProjectionMatrix();
    const thin = narrow();
    // on a phone he stands higher, leaving a strip at the bottom for the tags
    const ah = H * (thin ? 0.74 : 0.9);
    const aw = (ah * avatar.naturalWidth) / avatar.naturalHeight;
    const bottom = H * (thin ? 0.82 : 0.95);
    const top = bottom - ah;
    person.scale.set(aw, ah, 1);
    person.position.set(W / 2, top + ah / 2, 0);
    dustMat.uniforms.uRect.value.set(W / 2 - aw / 2, top, aw, ah);
    dustMat.uniforms.uDpr.value = dpr;
    dustMat.uniforms.uScale.value = ah / 600;
    const cy = top + ah * 0.42;
    L = {
      cx: W / 2,
      cy,
      R: thin ? W * 0.34 : Math.min(W * 0.34, 400),
      r: thin ? Math.max(30, W * 0.12) : Math.min(92, Math.max(52, Math.min(W, H) * 0.135)),
      floor: bottom - cy,
      aw,
    };
    // his shadow, at his feet
    feet.position.set(W / 2 + aw * 0.06, bottom - 2, 0);
    feet.scale.set(aw * 1.15, aw * 0.16, 1);
    const fu = (feet.material as THREE.ShaderMaterial).uniforms;
    fu.uSize.value.set(aw * 1.15, aw * 0.16);
    fu.uAlpha.value = 0.55;

    // the ring: a stippled pencil line, gone over twice
    const far: number[] = [];
    const farA: number[] = [];
    const near: number[] = [];
    const nearA: number[] = [];
    const rand = seeded(5);
    const dot = (x: number, y: number, z: number, a: number) => {
      (z < 0 ? far : near).push(x, y, 0);
      (z < 0 ? farA : nearA).push(a * (z < 0 ? 0.55 : 1));
    };
    const N = thin ? 900 : 1800;
    for (let pass = 0; pass < 2; pass++)
      for (let k = 0; k < N; k++) {
        const th = (k / N) * Math.PI * 2 + rand() * 0.004;
        const p = project(th);
        const wob = (rand() - 0.5) * 1.6 + Math.sin(th * 7 + pass * 2) * (pass ? 1.4 : 0.5);
        dot(p.x, p.y + wob, p.z, (0.25 + rand() * 0.35) * (rand() < 0.08 ? 0 : 1));
      }
    const set = (obj: THREE.Points, pts: number[], al: number[]) => {
      obj.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      obj.geometry.setAttribute("aAlpha", new THREE.Float32BufferAttribute(al, 1));
      (obj.material as THREE.ShaderMaterial).uniforms.uDpr.value = dpr;
    };
    set(farRing, far, farA);
    set(nearRing, near, nearA);
    for (const b of balls) b.mat.uniforms.uDpr.value = dpr;
  };
  layout();
  const ro = new ResizeObserver(() => {
    layout();
    if (!raf) frame(performance.now());
  });
  ro.observe(stage);

  // ── the loop ───────────────────────────────────────────────────────────────
  let raf = 0;
  let visible = false;
  let last = performance.now();
  let clock = 0; // s, the scene's own time (it stops while off screen)
  let mean = 0; // the shared mean anomaly
  let speed = 1;
  let slowWanted = false;
  let fade = 0;

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!still) clock += dt;
    // a window open, or a question pointed at: slow to a crawl, easy to click
    speed += ((slowWanted || balls.some((b) => b.want > 0) ? 0.07 : 1) - speed) * Math.min(1, dt * 3);
    if (!still) mean += ((Math.PI * 2) / TURN) * speed * dt;
    fade = Math.min(1, fade + dt * 1.6);
    for (const r of [farRing, nearRing]) (r.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
    (feet.material as THREE.ShaderMaterial).uniforms.uAlpha.value = 0.55 * fade;
    dustMat.uniforms.uTime.value = clock;
    dustMat.uniforms.uFade.value = fade;
    // a ball pointed at draws his dust towards it
    const pointed = balls.findIndex((b) => b.want > 0);
    pullAmt += ((pointed >= 0 ? 1 : 0) - pullAmt) * Math.min(1, dt * 2);
    if (pointed >= 0) dustMat.uniforms.uPull.value.set(balls[pointed].at.x, balls[pointed].at.y);
    dustMat.uniforms.uPullAmt.value = pullAmt;

    balls.forEach((b, i) => {
      const M = still ? STILL_AT[i] : mean + (i * Math.PI * 2) / 3;
      // the true angle: ahead of the mean through the near side, behind it at the far one
      const th = M + 2 * ECC * Math.sin(M);
      const p = project(th);
      const x = p.x;
      const y = p.y + Math.sin(clock * 0.9 + i * 2) * 3 * p.s;
      const r = L.r * p.s;
      const u = b.mat.uniforms;
      if (b.prev && dt > 0) u.uVel.value.set((x - b.prev.x) / dt, (y - b.prev.y) / dt);
      b.prev = { x, y };
      // settles in from scattered the first time, then loosens when pointed at
      b.excite += (b.want - b.excite) * Math.min(1, dt * (b.excite > 1 ? 1.6 : 6));
      // the far side fades a little into the paper
      const haze = 0.62 + 0.38 * ((p.z + 1) / 2);
      u.uCenter.value.set(x, y);
      u.uRadius.value = r;
      u.uTime.value = clock;
      u.uExcite.value = b.excite;
      u.uScale.value = 0.85 + 0.25 * p.s;
      u.uFade.value = fade * haze;
      const order = p.z < 0 ? 0.5 : 2.5;
      b.pts.renderOrder = order;
      b.disc.renderOrder = order - 0.1;
      b.disc.position.set(x, y, 0);
      b.disc.scale.set(r * 2.04, r * 2.04, 1);
      (b.disc.material as THREE.ShaderMaterial).uniforms.uFade.value = fade;
      // its shadow on the floor below: wider and fainter the higher it is
      const lift = Math.min(1, Math.max(0, p.height / L.floor));
      const sw = r * (1.5 + 0.5 * lift);
      const sh = sw * 0.17 * (0.7 + 0.3 * p.s);
      b.shadow.position.set(x + lift * r * 0.25, p.floorY, 0);
      b.shadow.scale.set(sw, sh, 1);
      const su = (b.shadow.material as THREE.ShaderMaterial).uniforms;
      su.uSize.value.set(sw, sh);
      su.uAlpha.value = fade * haze * (0.5 - 0.28 * lift);
      // behind him its shadow is too, so his legs hide it
      b.shadow.renderOrder = p.z < 0 ? 0.3 : 1.2;
      b.at = { x, y, r, z: p.z };
    });
    renderer.render(scene, camera);
    onFrame(balls.map((b) => b.at));
    if (visible && (!still || fade < 1 || balls.some((b) => Math.abs(b.excite - b.want) > 0.01))) raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  return {
    hit(x, y) {
      let best = -1;
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i].at;
        if (Math.hypot(x - a.x, y - a.y) > a.r * 1.08) continue;
        if (best < 0 || a.z > balls[best].at.z) best = i;
      }
      return best;
    },
    excite(i) {
      balls.forEach((b, k) => (b.want = k === i ? 1 : 0));
      if (visible) wake();
    },
    slow(on) {
      slowWanted = on;
    },
    setVisible(on) {
      visible = on;
      if (on) wake();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const d of disposables) d.dispose();
      canvas.remove();
    },
  };
}

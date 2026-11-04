/* The intro: a tailor's piece on cream paper that opens the home page on a
   first visit, then lifts away to the desk. Concentric rings round a centre
   off the left of the screen, stacked one on another like plates, each a
   little higher than the one outside it: every ring lies right against the
   next, its rim inked, and casts a warm shadow down onto the one below. The
   rings are a tailor's materials: thread wound round as on a spool, with a
   sheen that turns with it; rows of running stitches; burgundy pencil
   hatching, like the desk the site sits on; and fine ink speckles. Burgundy,
   wine, rose, ochre and ink. Each ring turns slowly at its own speed (the
   inner ones faster), and the layers drift a little against one another, the
   higher ones more, so the stack reads in depth.

   Each ring is drawn round, as with a compass, one after another from the
   centre out, alternately down and up the screen: its inked rim first, its
   thread and pencil and speckles following, and its stitches sewn in one by
   one as the needle reaches them. Once all are drawn the stack lifts a touch
   as it fades, and the site comes up from under it. Nothing moves fast and
   nothing moves far, so it stays smooth even where frames are few. It isn't
   on the page after that.

   It is painted per pixel, in one fragment shader over the screen: each pixel
   finds the highest ring over it (the innermost whose disc holds it, each disc
   where its layer has drifted to), then works out that ring's thread, stitch,
   stroke or speckle there (the speckles in a jittered grid in polar
   coordinates, so they are as dense as the art wants at any size, every one
   turning with its ring), the shadow of the ring above, and its own rim. The
   script only sets a few numbers a frame.

   It doesn't wait for the site's own scripts (React, three.js: about a
   megabyte): field() is written into the page's HTML right after its canvas
   (Field.tsx), so it runs the moment the browser reads it and is up about as
   soon as the page is. It does as little as it can while the page is still
   being read: the shader is compiled off the main thread where the browser
   can, and checked on the next frame. It is always drawn at the screen's own
   resolution (up to 2 device px per css px), never less: frames come slowly
   while the page is still loading, which says nothing about the GPU, and as
   nothing in it moves fast a late frame hardly shows, where blur always
   would. Only without a GPU (the browser drawing in software) is it painted
   at about a third of that, 30 times a second, once the page has loaded.

   The intro's steps are on <html> (INTRO_GATE in app/layout.tsx sets "play"):
   data-intro-reveal when the site starts to come up through the field, and
   data-intro="seen" when it has (the hero starts then). A click, key, scroll
   or touch sets "seen" (and data-intro-skip) straight away: the field fades at
   once (field.css), holding still, so the page has all the machine to come up
   with. Once it has faded, the field stops and frees the GPU. */

type V3 = [number, number, number];

// the intro, in s from the first frame
const DRAW_AT = 0.15; // the first (innermost) ring starts to be drawn
const DRAW_STAGGER = 0.13; // each ring out starts this much after the one inside it
const DRAW_FOR = 1.15; // and takes this long to draw round (the last is done at ~2.5 s)
const REVEAL_AT = 3.0; // the field fades (field.css: 1.2 s) as the site comes up and the stack lifts
const DONE_AT = 4.2;
const LIFT = 0.05; // how much larger the stack grows as it lifts away
const END = 0.7; // once it is over (or skipped), how long it holds its last frame while it fades out, then stops

// css px: the speckles' grid (most are under half of it across); without a GPU, coarser, as it paints fewer pixels
const CELL = 2.6, CELL_SOFT = 3.4;
const SHADOW: [number, number] = [7, 10]; // css px each layer's shadow falls from it, away from the light (top left)

const GROUND: V3 = [0.94, 0.9, 0.82]; // --page
const INK: V3 = [0.29, 0.047, 0.094]; // --ink
const THREAD: V3 = [0.55, 0.184, 0.263]; // --thread
const WINE: V3 = [0.42, 0.09, 0.15];
const RUST: V3 = [0.7, 0.27, 0.24];
const ROSE: V3 = [0.8, 0.55, 0.56];
const OCHRE: V3 = [0.76, 0.54, 0.34];
const UMBER: V3 = [0.53, 0.32, 0.22];

const SPECKS = 1, WOUND = 2, STITCH = 3, HATCH = 4;
type Pal = [V3, V3, V3, number, number]; // three colours, and the first two's shares
type Ring = { r: number; kind: number; speed: number; dens?: string; size?: number; pal: Pal };
/* The rings, inside out (the inner the higher): r is each one's outer edge, in
   units (a unit is about the screen's width); each runs in from there to the
   edge of the ring above it. dens: for speckles, how many of the cells hold
   one, and for hatching, how many strokes there are, by u (0 its inner edge …
   1 its outer), as GLSL. */
const RINGS: Ring[] = [
  { r: 0.3, kind: HATCH, speed: 0.03, dens: "0.62", pal: [THREAD, WINE, ROSE, 0.55, 0.3] },
  { r: 0.34, kind: SPECKS, speed: 0.036, dens: "0.35 + 0.55 * u", size: 0.9, pal: [INK, THREAD, ROSE, 0.45, 0.45] },
  { r: 0.405, kind: STITCH, speed: 0.031, pal: [INK, THREAD, OCHRE, 0.4, 0.4] },
  { r: 0.565, kind: WOUND, speed: 0.026, pal: [THREAD, ROSE, WINE, 0.5, 0.3] },
  { r: 0.862, kind: SPECKS, speed: 0.021, dens: "0.05 + 0.92 * pow(u, 2.0)", size: 1.0, pal: [THREAD, WINE, RUST, 0.45, 0.3] },
  { r: 0.948, kind: STITCH, speed: 0.017, pal: [OCHRE, THREAD, INK, 0.4, 0.35] },
  { r: 1.0, kind: SPECKS, speed: 0.015, dens: "0.4 + 0.5 * u", size: 0.9, pal: [INK, THREAD, UMBER, 0.45, 0.4] },
  { r: 1.035, kind: WOUND, speed: 0.013, pal: [ROSE, THREAD, ROSE, 0.6, 0.3] },
  { r: 1.47, kind: HATCH, speed: 0.011, dens: "0.7 * (1.0 - 0.75 * u)", pal: [THREAD, ROSE, WINE, 0.55, 0.3] },
  { r: 2.4, kind: SPECKS, speed: 0.008, dens: "0.22 * pow(1.0 - u, 1.6)", size: 0.9, pal: [ROSE, THREAD, INK, 0.55, 0.35] },
];
const NR = RINGS.length;

const f = (v: number) => v.toFixed(4);
const v3 = (c: V3) => `vec3(${f(c[0])}, ${f(c[1])}, ${f(c[2])})`;
const pick = ([a, b, c, wa, wb]: Pal) => `(h < ${f(wa)} ? ${v3(a)} : h < ${f(wa + wb)} ? ${v3(b)} : ${v3(c)})`;
/** the rings as GLSL: each one's kind, density, speed, size and colours */
function ringsGlsl() {
  const ifs = (fn: (b: Ring) => string, last: string) => RINGS.map((b, i) => `  if (id < ${i}.5) return ${fn(b)};`).join("\n") + `\n  return ${last};`;
  return `
float kindOf(float id) {
${ifs((b) => `${b.kind}.0`, "0.0")}
}
float dens(float id, float u) {
${ifs((b) => (b.dens ? `clamp(${b.dens}, 0.0, 1.0)` : "0.0"), "0.0")}
}
float speedOf(float id) {
${ifs((b) => f(b.speed), "0.0")}
}
float sizeOf(float id) {
${ifs((b) => f(b.size ?? 1), "1.0")}
}
vec3 colOf(float id, float h) {
${ifs((b) => pick(b.pal), "vec3(0.0)")}
}`;
}

const VS = `
attribute vec2 aQuad;
void main() { gl_Position = vec4(aQuad, 0.0, 1.0); }`;
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
const int NR = ${NR};
uniform vec2 uC;        // the stack's centre, css px
uniform vec2 uOff[NR];  // where each ring's layer has drifted to, from the centre, css px
uniform float uR[NR];   // each ring's outer edge, units
uniform float uU;       // css px per unit
uniform float uCell;    // the speckles' grid, css px
uniform float uT;       // s since the intro began
uniform float uSpin;    // rad the whole stack has turned as it lifts away
uniform vec2 uSh;       // a layer's shadow, from it, css px
uniform float uRes, uH; // device px per css px; the screen's height, css px
const float TAU = 6.2831853;
const float PI = 3.1415927;
const float HALF = 1.95; // the drawing's arc, either side of the stack's axis, rad (a little more than is on screen)
const float SOFT = 0.12; // its leading edge, as a share of the arc

float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
${ringsGlsl()}

/* How far a ring has been drawn round at an angle: > 0 drawn, the leading
   edge in (0, SOFT). Each is drawn round over DRAW_FOR, the inner first,
   alternately down the screen and up it. */
float drawn(float id, float th) {
  float p = clamp((uT - (${f(DRAW_AT)} + ${f(DRAW_STAGGER)} * id)) / ${f(DRAW_FOR)}, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  float dir = mod(id, 2.0) < 0.5 ? 1.0 : -1.0;
  float a = clamp((dir * th + HALF) / (2.0 * HALF), 0.0, 1.0);
  return p * (1.0 + SOFT) - a;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uH * uRes - gl_FragCoord.y) / uRes;
  // the paper discs' own shading comes up as the drawing goes round
  float build = smoothstep(0.1, 2.4, uT);

  // the ring on top here: the innermost whose disc holds this pixel; and the one above it
  float id = -1.0;
  vec2 cc = uC, pc = uC;
  float own = 0.0, pr = 0.0;
  for (int k = 0; k < NR; k++) {
    vec2 ck = uC + uOff[k];
    float rk = uR[k] * uU;
    if (distance(p, ck) < rk) {
      id = float(k);
      cc = ck;
      own = rk;
      break;
    }
    pc = ck;
    pr = rk;
  }
  if (id < 0.0) {
    gl_FragColor = vec4(${v3(GROUND)}, 1.0);
    return;
  }
  vec2 d = p - cc;
  float rp = length(d);
  float th = atan(d.y, d.x);
  float span = max(own - pr, 1.0);
  float u = clamp((rp - pr) / span, 0.0, 1.0);
  float sw = drawn(id, th);
  float mask = clamp(sw / SOFT, 0.0, 1.0);

  // the ring's own paper, each a shade apart from the next, with faint fibres running round it
  float alt = mod(id, 2.0);
  vec3 col = ${v3(GROUND)} * (1.0 - vec3(0.012, 0.028, 0.05) * alt * build);
  float sk = floor(rp / 1.5);
  float sh = h21(vec2(sk, 3.1 + id));
  float streak = step(0.88, sh) * (0.4 + 0.6 * h21(vec2(sk, 7.7))) * (0.55 + 0.45 * sin(th * 3.0 + sh * 40.0));
  col -= streak * vec3(0.035, 0.05, 0.045) * build;

  float kind = kindOf(id);
  float ph = speedOf(id) * uT + uSpin;

  if (kind > 1.5 && kind < 2.5) {
    /* thread wound round, as on a spool: a strand every 2.6 px, each its own
       weight and colour, with a sheen that turns with the ring. Each of the
       two strands nearest this pixel covers it by how much of the pixel it
       overlaps (a box filter), so the finest come out fainter, never breaking
       up into moiré */
    float sp = 2.6;
    float fp = 1.0 / uRes;
    float x = rp / sp;
    float k0 = floor(x);
    float side = fract(x) < 0.5 ? -1.0 : 1.0;
    for (int n = 0; n < 2; n++) {
      float k = k0 + float(n) * side;
      float hk = h21(vec2(k, 11.0 + id));
      float hw = 0.25 + 0.35 * hk;
      float c = (k + 0.5) * sp;
      float cov = clamp((min(rp + 0.5 * fp, c + hw) - max(rp - 0.5 * fp, c - hw)) / fp, 0.0, 1.0);
      float sheen = 0.5 + 0.5 * sin((th - ph) * (2.0 + floor(hk * 3.0)) + hk * 30.0);
      float a = cov * (0.45 + 0.55 * h21(vec2(k, 5.0))) * (0.55 + 0.45 * sheen) * mask;
      col = mix(col, colOf(id, h21(vec2(k, 23.0))), a);
    }
  } else if (kind > 2.5 && kind < 3.5) {
    /* running stitches: rows 9 px apart, about half of them sewn, each row in
       one thread; every stitch a little longer or shorter than the next and
       not quite on the line, as by hand, and sewn in whole as the needle
       reaches it */
    float tsp = 9.0;
    float ti = floor((rp - pr) / tsp);
    float rt = pr + (ti + 0.5) * tsp;
    float ht = h21(vec2(ti, 31.0 + id));
    if (ht < 0.55 && rt < own - 4.0) {
      float N = max(floor(TAU * rt / (10.0 + 4.0 * h21(vec2(ti, 37.0 + id)))), 3.0);
      float P = TAU * rt / N;
      float tph = ph * (0.92 + 0.16 * ht);
      float ac = mod(th - tph, TAU) / TAU * N;
      float cell = floor(ac);
      float hc = h21(vec2(ti * 7.0 + id, cell));
      float len = P * (0.5 + 0.14 * hc);
      float uc = (fract(ac) - 0.5) * P;
      float jit = (h21(vec2(cell, ti + 3.0)) - 0.5) * 0.9;
      float w = 0.62 + 0.3 * ht;
      float dd = length(vec2(max(abs(uc) - len * 0.5, 0.0), rp - rt - jit)) - w;
      float cov = clamp(-dd * uRes + 0.5, 0.0, 1.0);
      float thc = mod(tph + (cell + 0.5) / N * TAU + PI, TAU) - PI;
      float sewn = clamp(drawn(id, thc) / 0.02, 0.0, 1.0);
      col = mix(col, colOf(id, ht / 0.55), cov * (0.72 + 0.28 * hc) * sewn);
    }
  } else if (kind > 3.5) {
    /* burgundy pencil hatching, like the desk's: long strokes laid side by
       side, each its own length and pressure, tapering at the ends, in the
       ring's own (turning) frame; here and there a few across them */
    float cs = cos(ph), sn = sin(ph);
    vec2 q = vec2(cs * d.x + sn * d.y, cs * d.y - sn * d.x);
    float dn = dens(id, u);
    for (int fam = 0; fam < 2; fam++) {
      float an = fam == 0 ? 0.85 : -0.6;
      vec2 dir = vec2(cos(an), sin(an));
      float fa = float(fam);
      float uu = dot(q, vec2(-dir.y, dir.x)) / 2.7;
      float k = floor(uu);
      float v = dot(q, dir) / 46.0 + h21(vec2(k, 3.0 + fa + id));
      float m = floor(v);
      float fv = fract(v);
      float hm = h21(vec2(k, m + 17.0 * fa + id));
      float len = 0.5 + 0.45 * h21(vec2(m, k + 5.0 + fa));
      if (hm < dn * (fam == 0 ? 1.0 : 0.16) && fv < len) {
        float x = fv / len;
        float taper = smoothstep(0.0, 0.12, x) * smoothstep(1.0, 0.7, x);
        float w = 0.24 + 0.22 * h21(vec2(k, m));
        float across = (fract(uu) - 0.5) * 2.7 + (hm - 0.5) * 0.6;
        float cov = clamp((w - abs(across)) * uRes + 0.5, 0.0, 1.0);
        col = mix(col, colOf(id, hm / max(dn, 0.01)), cov * taper * (0.26 + 0.34 * len) * mask);
      }
    }
  } else {
    /* speckles: this pixel's cell in the ring's polar grid, and its three
       nearest neighbours. Each is kept far enough inside its cell (by how far
       it reaches) to spill at most 0.3 of a cell into the next, so those four
       are all the cells that can reach this pixel. */
    float sz = sizeOf(id);
    float rc = rp / uCell;
    float i0 = floor(rc);
    float iStep = rc - i0 < 0.5 ? -1.0 : 1.0;
    for (int di = 0; di < 2; di++) {
      float i = i0 + float(di) * iStep;
      if (i < 0.0) continue;
      float rr = (i + 0.5) * uCell;
      float N = floor(TAU * (i + 0.5));
      float hi = h21(vec2(i, 1.7 + id));
      // each ring of cells a touch faster or slower than the next: grooves, like a record's
      float pc2 = speedOf(id) * uT * (0.95 + 0.1 * hi) + uSpin;
      float ac = mod(th - pc2, TAU) / TAU * N;
      float j0 = floor(ac);
      float jStep = ac - j0 < 0.5 ? -1.0 : 1.0;
      float dn = dens(id, clamp((rr - pr) / span, 0.0, 1.0)) * (0.9 + 0.6 * h21(vec2(i, 9.1 + id)));
      for (int dj = 0; dj < 2; dj++) {
        float j = mod(j0 + float(dj) * jStep, N);
        vec2 c = vec2(i, j);
        if (h21(c) > dn) continue;
        float a1 = h21(c + vec2(13.7, 3.3));
        float a2 = h21(c + vec2(5.1, 29.9));
        float a3 = h21(c + vec2(41.3, 17.1));
        float a4 = h21(c + vec2(2.9, 61.7));
        float a5 = h21(c + vec2(23.3, 71.9));
        float a6 = h21(c + vec2(31.1, 7.3));
        // its shape and size (mostly small, a few larger), and how far it reaches, in cells
        float size = uCell * (0.18 + 0.3 * a3 * a3) * sz;
        float hl = 0.0;
        float ea = size / uCell;
        float er = ea;
        if (a5 >= 0.6 && a5 < 0.78) {
          hl = uCell * min(0.25 + 0.45 * a4, 0.8 - 0.5 * size / uCell);
          ea = (hl + 0.5 * size) / uCell;
          er = 0.5 * size / uCell;
        } else if (a5 >= 0.78 && a5 < 0.91) {
          size = min(size, 0.42 * uCell);
          ea = 1.8 * size / uCell;
          er = ea;
        } else if (a5 >= 0.91) {
          ea = 1.07 * size / uCell;
          er = ea;
        }
        float cr = er > 0.8 ? 0.5 : mix(er - 0.3, 1.3 - er, a1);
        float ca = ea > 0.8 ? 0.5 : mix(ea - 0.3, 1.3 - ea, a2);
        float rd = (i + cr) * uCell;
        float ad = (j + ca) / N * TAU + pc2;
        vec2 q = cc + rd * vec2(cos(ad), sin(ad));
        // the pixel in the speckle's own frame: along its ring, and across it
        vec2 tg = vec2(-sin(ad), cos(ad));
        vec2 o = p - q;
        vec2 l = vec2(dot(o, tg), o.x * tg.y - o.y * tg.x);
        float dist;
        if (a5 < 0.6) {
          dist = length(l) - size; // a dot
        } else if (a5 < 0.78) {
          // a dash, drawn along the ring
          dist = length(vec2(max(abs(l.x) - hl, 0.0), l.y)) - size * 0.5;
        } else if (a5 < 0.91) {
          // a grain, at a slant
          float an = a6 * 3.1416;
          vec2 m = vec2(cos(an) * l.x + sin(an) * l.y, cos(an) * l.y - sin(an) * l.x);
          dist = (length(m * vec2(0.55, 1.7)) - size) / 1.2;
        } else {
          // a speck: a tiny square, turned
          float an = a6 * 1.5708;
          vec2 m = abs(vec2(cos(an) * l.x + sin(an) * l.y, cos(an) * l.y - sin(an) * l.x));
          dist = max(m.x, m.y) - size * 0.75;
        }
        float cov = clamp(-dist * uRes + 0.5, 0.0, 1.0);
        if (cov <= 0.0) continue;
        // (scattered in just behind the drawing's edge)
        float a = cov * clamp((sw - a4 * 0.1) / SOFT, 0.0, 1.0);
        col = mix(col, colOf(id, a3) * (0.86 + 0.28 * a4), a);
      }
    }
  }

  // the ring above casts its shadow down onto this one (warm, as on paper), and darkens it close under its edge
  if (id > 0.5) {
    float sd = distance(p, pc + uSh) - pr;
    float shadow = 1.0 - smoothstep(-5.0, 24.0, sd);
    float ao = exp(-max(distance(p, pc) - pr, 0.0) / 34.0);
    float s = clamp(0.62 * shadow + 0.3 * ao, 0.0, 0.85) * build;
    col = mix(col, col * vec3(0.82, 0.73, 0.68), s * 0.85);
  }
  // and its own rim: a crisp ink line, drawn round ahead of the rest like a compass's, the paper just inside it lifted a touch
  float e = own - rp;
  float inked = clamp(sw / 0.025, 0.0, 1.0);
  col = mix(col * (1.0 + 0.035 * exp(-e / 26.0) * build), ${v3(INK)}, exp(-e / 1.4) * 0.32 * inked);
  gl_FragColor = vec4(col, 1.0);
}`;

/** everything the intro needs at run time: it is sent to the page as data, with field() as source */
export type FieldConfig = {
  vs: string;
  fs: string;
  /** each ring's outer edge, units */
  rings: number[];
  timing: { revealAt: number; doneAt: number; end: number };
  lift: number;
  ground: V3;
  cell: number;
  cellSoft: number;
  shadow: [number, number];
};

export const FIELD: FieldConfig = {
  vs: VS,
  fs: FS,
  rings: RINGS.map((r) => r.r),
  timing: { revealAt: REVEAL_AT, doneAt: DONE_AT, end: END },
  lift: LIFT,
  ground: GROUND,
  cell: CELL,
  cellSoft: CELL_SOFT,
  shadow: SHADOW,
};

declare global {
  interface Window {
    __field?: { start(cv: HTMLCanvasElement): void };
  }
}

/* The intro at run time. Self-contained (it is written into the page as
   source, via toString, by Field.tsx): it sets up window.__field and starts on
   the canvas it was written in after. Unless the intro is playing it does
   nothing at all (no GPU context); starting twice on one canvas does nothing;
   a canvas taken off the page stops its field and frees the GPU. */
export function field(C: FieldConfig) {
  // the canvas this copy of the code was written in after, as the page is read
  const own = document.currentScript?.previousElementSibling;
  const mine = own instanceof HTMLCanvasElement && own.classList.contains("field") ? own : null;
  if (window.__field) {
    if (mine) window.__field.start(mine);
    return;
  }
  const smooth = (u: number) => {
    const v = Math.min(1, Math.max(0, u));
    return v * v * v * (v * (v * 6 - 15) + 10);
  };
  /** where the stack is: its centre (css px), and css px per unit */
  const frame0 = (W: number, H: number): [number, number, number] => (W >= H ? [-0.18 * W, 0.5 * H, 0.9 * W] : [-0.35 * W, 0.5 * H, 0.75 * H]);
  const NR = C.rings.length;
  const T = C.timing;
  const started = new WeakSet<HTMLCanvasElement>();

  function start(cv: HTMLCanvasElement) {
    if (started.has(cv)) return;
    started.add(cv);
    const html = document.documentElement;
    // only ever the intro: a page without it never touches the GPU
    if (html.dataset.intro !== "play") return void cv.setAttribute("data-done", "");
    const done = () => {
      html.dataset.introReveal = "";
      html.dataset.intro = "seen";
    };
    const opts: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, powerPreference: "low-power" };
    const fast = cv.getContext("webgl", { ...opts, failIfMajorPerformanceCaveat: true });
    const gl = fast ?? cv.getContext("webgl", opts);
    if (!gl) return done();
    // the paper, until the first frame
    gl.clearColor(C.ground[0], C.ground[1], C.ground[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // (Chrome doesn't count its own software renderer as a caveat: ask it by name)
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const soft = !fast || /swiftshader|llvmpipe|software|basic render/i.test(String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)));

    const prog = gl.createProgram()!;
    // where the browser compiles shaders off the main thread, wait for it rather than block on it
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    let fallback = window.setTimeout(() => html.dataset.intro === "play" && done(), 9000);
    // skipped (or gone) before it got going: never mind
    const abandon = () => {
      window.clearTimeout(fallback);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      cv.setAttribute("data-done", "");
    };
    const ready = () => {
      if (!cv.isConnected || html.dataset.intro !== "play") return abandon();
      if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) return void requestAnimationFrame(ready);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        window.clearTimeout(fallback);
        done();
        return;
      }
      run();
    };
    const compile = () => {
      if (html.dataset.intro !== "play") return abandon();
      for (const [type, src] of [
        [gl.VERTEX_SHADER, C.vs],
        [gl.FRAGMENT_SHADER, C.fs],
      ] as const) {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        gl.attachShader(prog, sh);
        gl.deleteShader(sh);
      }
      gl.linkProgram(prog);
      // (checked on the next frame, so a page still being read isn't held up waiting for it)
      requestAnimationFrame(ready);
    };
    /* A GPU compiles the shader in a moment: at once. Without one, the browser
       compiles it in software on its first draw, which stalls its painting (and
       the page's clicks and keys with it) for a second or two: then it waits
       until the page has loaded and is idle. */
    if (!soft) compile();
    else {
      const later = () => (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200)))(compile, { timeout: 2000 });
      if (document.readyState === "complete") later();
      else addEventListener("load", later, { once: true });
    }

    function run() {
      const g = gl!;
      g.useProgram(prog);
      const quad = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, quad);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      const aQuad = g.getAttribLocation(prog, "aQuad");
      g.enableVertexAttribArray(aQuad);
      g.vertexAttribPointer(aQuad, 2, g.FLOAT, false, 0, 0);
      const U = (name: string) => g.getUniformLocation(prog, name);
      const loc = {
        C: U("uC"), off: U("uOff"), R: U("uR"), U: U("uU"), cell: U("uCell"), T: U("uT"), spin: U("uSpin"),
        sh: U("uSh"), res: U("uRes"), H: U("uH"),
      };
      g.uniform1fv(loc.R, C.rings);
      g.uniform2f(loc.sh, C.shadow[0], C.shadow[1]);
      g.uniform1f(loc.cell, soft ? C.cellSoft : C.cell);
      const off = new Float32Array(NR * 2);

      /* The resolution: the screen's own (up to 2 device px per css px), and
         never less (see above); without a GPU, 0.35. */
      let W = 0, H = 0, res = 1;
      const fit = () => {
        W = cv.clientWidth;
        H = cv.clientHeight;
        res = soft ? 0.35 : Math.min(2, devicePixelRatio || 1);
        cv.width = Math.max(1, Math.round(W * res));
        cv.height = Math.max(1, Math.round(H * res));
        g.viewport(0, 0, cv.width, cv.height);
      };
      fit();
      const ro = new ResizeObserver(() => cv.clientWidth && cv.clientHeight && fit());
      ro.observe(cv);

      let revealed = false, endAt = -1;
      const t0 = performance.now() / 1000;
      let last = -1, raf = 0;
      // over, or off the page: stop, and free the GPU
      const stop = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.clearTimeout(fallback);
        fallback = 0;
        g.deleteBuffer(quad);
        g.deleteProgram(prog);
        g.getExtension("WEBGL_lose_context")?.loseContext();
        cv.setAttribute("data-done", "");
      };

      const frame = () => {
        if (!cv.isConnected) return stop();
        raf = requestAnimationFrame(frame);
        const now = performance.now() / 1000;
        const t = now - t0;
        // over, or skipped: it holds its last frame while it fades out (field.css), then stops
        if (html.dataset.intro !== "play") {
          if (endAt < 0) endAt = now;
          if (now - endAt >= T.end) stop();
          return;
        }
        if (t >= T.revealAt && !revealed) {
          revealed = true;
          html.dataset.introReveal = "";
        }
        if (t >= T.doneAt) done();
        if (!cv.clientWidth) return;
        /* without a GPU the browser paints in software on every core, and the
           page starting up needs them too: 30 frames a second */
        if (soft && now - last < 1 / 30 - 0.002) return;
        last = now;

        // lifting away as the site comes up: a touch larger, turning a little further
        const lift = smooth((t - T.revealAt) / (T.doneAt - T.revealAt));
        const [cx, cy, px] = frame0(W, H);
        /* the layers' drift: each by its height (the innermost highest),
           floating slowly, settling together as they are drawn, and parting a
           little as they lift */
        const settle = Math.pow(1 - smooth(t / 2.6), 2);
        for (let k = 0; k < NR; k++) {
          const h = (NR - 1 - k) / (NR - 1);
          off[k * 2] = h * (Math.sin(t * 0.13 + k * 0.4) * 9 - (settle + lift) * 14);
          off[k * 2 + 1] = h * (Math.cos(t * 0.1 + k * 0.3) * 7 - (settle + lift) * 18);
        }
        g.uniform2f(loc.C, cx - 0.02 * W * lift, cy);
        g.uniform2fv(loc.off, off);
        g.uniform1f(loc.U, px * (1 + C.lift * lift));
        g.uniform1f(loc.T, t);
        g.uniform1f(loc.spin, 0.06 * lift);
        g.uniform1f(loc.res, res);
        g.uniform1f(loc.H, H);
        g.drawArrays(g.TRIANGLES, 0, 3);
        if (!cv.hasAttribute("data-live")) cv.setAttribute("data-live", "");
      };
      raf = requestAnimationFrame(frame);
    }
  }

  window.__field = { start };
  if (mine) start(mine);
}

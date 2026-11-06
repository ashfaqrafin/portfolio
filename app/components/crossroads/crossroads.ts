/* The intro: the crossroads. On a first visit the home page opens on its own
   desk (the canvas is transparent: the cream paper, the pencil-shaded edges,
   the stray marks are the page's), and a little story plays out on it in the
   site's burgundy ink:

   - a road comes up the page and forks into four lanes, unrolled to the
     horizon like bolts of cloth, a running stitch down each; a signpost drops
     in at the fork and its boards swing round on their nails to point down
     them: Tailoring, Distributed systems, Economics, Linux; and "Pick a
     lane." is written where the hero's headline will be;
   - I walk off up the Tailoring lane, stop, and shrug; turn round, and walk
     back to the fork; an idea (a panel, as in a comic: a grin, then a finger
     up); turn round again and take out the shears: two snips, and the lanes
     are cut loose, their ends curling and a few threads falling ("or don't."
     is scribbled after the headline as they go);
   - the lanes swing together into one striped road, every board spinning round
     to point up it; a needle runs up it, sewing the stripes into one;
   - and I walk off up it, getting smaller, as the view eases in after me and
     the drawing fades, and the site comes up on the same paper, its headline
     where this one was.

   I am drawn frame by frame (design/crossroads/frames.png, cut out and packed
   by `npm run intro:art` into public/intro/crossroads.webp, with frames.json:
   where each frame is, its anchor between the feet, each sequence's scale),
   set down on the road in its perspective and shown at the drawings' own
   pace: a walk at about eight drawings a second, a turn faster. Everything
   else is drawn here, in ink: its lines boil (each is redrawn a touch off true
   eight times a second), as hand-drawn animation does, and what swings or
   drops in, springs (overshoots a little, and settles).

   The headline is measured off the hero itself (face, size, letter-spacing,
   colour, place, the aside's tilt and stitched underline), so the one gives
   way to the other exactly where they stand.

   It doesn't wait for the site's own scripts (React, three.js: about a
   megabyte): crossroads() is written into the page's HTML right after its
   canvas (Crossroads.tsx), and starts on the next frame; the frames' image is
   fetched from the page's head, by INTRO_GATE, the moment the intro is decided
   on. If it hasn't come by the time I'm to move, the story waits for it (up to
   a couple of seconds, then the intro is let go).

   The intro's steps are on <html> (INTRO_GATE in app/layout.tsx sets "play"):
   data-intro-reveal when the site starts to come up, and data-intro="seen"
   when it has (the hero starts then). Between the two, a drop of burgundy
   watercolour falls where the road goes off and blooms out across the paper:
   under its spreading, ragged edge (darker at the rim, as watercolour dries)
   the story gives way and the site comes up (the site is masked to the bloom,
   from here, as it grows), and the wash dries away. The headline holds
   throughout, and at "seen" the hero's own takes its place in the same frame
   as this one goes. A click, key, scroll or touch sets
   "seen" (and data-intro-skip) straight away: the drawing fades at once
   (crossroads.css). Then it stops and lets its canvas go. */

import FRAMES from "./frames.json";

/** the drawings of me: where they are, packed by `npm run intro:art` */
export const ATLAS = "/intro/crossroads.webp";

/** the story, in s from the first frame */
/* (paced to be followed: each beat has a moment to itself before the next) */
const BEATS = {
  // the scene comes in: the road, the hills, the lanes ([first start, each's length, each after the last]),
  // the signpost and its boards (the same), the headline; and I appear at the fork
  trunk: [0, 0.55],
  hills: [0.1, 1.0],
  lanes: [0.3, 0.8, 0.1],
  post: [0.55, 1.3],
  boards: [0.8, 0.75, 0.12],
  head: [0.35, 1.4],
  appear: [0.15, 0.55],
  // I look the signs over, then
  walkUp: [2.1, 3.35], // up the Tailoring lane
  shrug: [3.45, 4.2],
  turnFront: [4.2, 4.6],
  walkBack: [4.6, 5.6],
  idea: [5.7, 6.95], // the panel: a grin, then a finger up
  turnBack: [6.95, 7.35],
  shears: [7.35, 8.4], // two snips
  snips: [0.45, 0.77], // (into the shears beat)
  aside: [7.7, 8.3], // "or don't."
  underline: [8.3, 8.55],
  merge: [8.45, 9.35], // the lanes swing together
  needle: [9.2, 10.05], // and are sewn into one
  walkOff: [9.95, 11.8],
  drop: [10.7, 11.05], // a drop of burgundy watercolour falls where the road goes off
  reveal: 11.05, // and blooms out across the paper, the site coming up under its spreading edge
  bloom: [11.05, 12.85],
  dry: [12.55, 13.15], // the wash dries away
  done: 13.15, // the site is all there: the hero's own headline takes over from this one, which goes
  end: 0.7, // once over (or skipped), how long it holds while it fades out, then stops
};

/** the scene, on a board of w × h units: the horizon; where the lanes leave
    the trunk road; the trunk's half-width there (and how it widens towards
    us); the lanes' far ends; where I start (my feet) and how tall I am there;
    the signpost (x, foot, top) and its boards; the boards' lettering */
type Scene = {
  w: number;
  h: number;
  horizon: number;
  fork: number;
  trunk: [number, number];
  far: number[];
  farHalf: number;
  start: [number, number];
  figure: number;
  post: [number, number, number];
  boards: number[];
  label: number;
};

const LAND: Scene = {
  w: 1600,
  h: 900,
  horizon: 330,
  fork: 690,
  trunk: [70, 0.35],
  far: [260, 630, 970, 1340],
  farHalf: 4,
  start: [800, 812],
  figure: 250,
  post: [1000, 840, 425],
  boards: [452, 497, 542, 587],
  label: 22,
};
const PORT: Scene = {
  w: 900,
  h: 1600,
  horizon: 640,
  fork: 1130,
  trunk: [70, 0.35],
  far: [70, 330, 570, 830],
  farHalf: 4,
  start: [450, 1360],
  figure: 270,
  post: [700, 1450, 960],
  boards: [995, 1050, 1105, 1160],
  label: 31,
};

/** the lanes, left to right, and the colour each is hatched in */
const LANES = [
  ["Tailoring", "#8c2f43"],
  ["Distributed systems", "#4a0c18"],
  ["Economics", "#b5687a"],
  ["Linux", "#a8743f"],
];

type Sets = Record<string, { scale: number; frames: number[][] }>;
export type IntroConfig = { beats: typeof BEATS; land: Scene; port: Scene; lanes: string[][]; atlas: string; frames: { height: number; sets: Sets } };
export const INTRO_CONFIG: IntroConfig = { beats: BEATS, land: LAND, port: PORT, lanes: LANES, atlas: ATLAS, frames: FRAMES };

declare global {
  interface Window {
    __crossroads?: { start(cv: HTMLCanvasElement): void };
  }
}

/* The intro at run time. Self-contained (it is written into the page as
   source, via toString, by Crossroads.tsx): it sets up window.__crossroads and
   starts on the canvas it was written in after. Unless the intro is playing it
   does nothing at all; starting twice on one canvas does nothing; a canvas
   taken off the page stops. */
export function crossroads(C: IntroConfig) {
  // the canvas this copy of the code was written in after, as the page is read
  const own = document.currentScript?.previousElementSibling;
  const mine = own instanceof HTMLCanvasElement && own.classList.contains("crossroads") ? own : null;
  if (window.__crossroads) {
    if (mine) window.__crossroads.start(mine);
    return;
  }
  const B = C.beats;
  const started = new WeakSet<HTMLCanvasElement>();
  const INK = "#4a0c18", THREAD = "#8c2f43", PAPER = "#f8f3ea";

  /** 0..1 through a beat */
  const through = (t: number, [a, b]: number[]) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const ease = (u: number) => u * u * (3 - 2 * u);
  const out = (u: number) => 1 - (1 - u) * (1 - u) * (1 - u);
  /** a spring: there by about a third of the way, a touch past, and settled */
  const spring = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-8 * u) * Math.cos(10 * u));
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

  function start(cv: HTMLCanvasElement) {
    if (started.has(cv)) return;
    started.add(cv);
    const html = document.documentElement;
    if (html.dataset.intro !== "play") return void cv.setAttribute("data-done", "");
    const done = () => {
      html.dataset.introReveal = "";
      html.dataset.intro = "seen";
    };
    const ctx = cv.getContext("2d");
    if (!ctx) return done();

    // the drawings of me (already on their way: INTRO_GATE asked for them in the page's head)
    const atlas = new Image();
    let ready = false;
    atlas.onload = () => void (ready = true);
    atlas.onerror = () => done();
    atlas.src = C.atlas;
    if (atlas.complete && atlas.naturalWidth) ready = true;

    const css = getComputedStyle(html);
    const HAND = css.getPropertyValue("--font-hand").trim() || "cursive";

    let W = 0, H = 0, dpr = 1, U = 1, ox = 0, oy = 0, S = C.land;
    const fit = () => {
      W = cv.clientWidth;
      H = cv.clientHeight;
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      S = W > H ? C.land : C.port;
      U = Math.min(W / S.w, H / S.h);
      ox = (W - S.w * U) / 2;
      oy = (H - S.h * U) / 2;
      head = null;
    };
    // board units to the screen (css px)
    const X = (x: number) => ox + x * U, Y = (y: number) => oy + y * U;

    /* the hero's headline, measured where it will stand (the page is laid out
       under the drawing, only not shown): its face, size, colour and place,
       and the aside's tilt and stitched underline */
    type Line = { font: string; spacing: string; color: string; x: number; top: number; base: number; w: number; h: number; m: DOMMatrix | null };
    let head: { main: Line; aside: Line } | null = null;
    const measure = () => {
      const main = document.querySelector<HTMLElement>(".hero-h1-main"), aside = document.querySelector<HTMLElement>(".hero-h1-hand");
      if (!main || !aside) return null;
      const box = cv.getBoundingClientRect();
      const line = (el: HTMLElement): Line => {
        const st = getComputedStyle(el);
        // its box as laid out, before its own transform (put back as it was)
        const had = el.getAttribute("style");
        el.style.transform = "none";
        const r = el.getBoundingClientRect();
        if (had === null) el.removeAttribute("style");
        else el.setAttribute("style", had);
        const font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
        ctx.font = font;
        const fm = ctx.measureText("Hg");
        const A = fm.fontBoundingBoxAscent || parseFloat(st.fontSize) * 0.8, D = fm.fontBoundingBoxDescent || parseFloat(st.fontSize) * 0.2;
        const lh = parseFloat(st.lineHeight) || r.height;
        const tr = st.transform && st.transform !== "none" ? new DOMMatrix(st.transform) : null;
        return {
          font,
          spacing: st.letterSpacing === "normal" ? "0px" : st.letterSpacing,
          color: st.color,
          x: r.left - box.left,
          top: r.top - box.top,
          base: r.top - box.top + (lh - (A + D)) / 2 + A,
          w: r.width,
          h: r.height,
          m: tr,
        };
      };
      return { main: line(main), aside: line(aside) };
    };

    // ── drawing by hand ───────────────────────────────────────────────────
    let bf = 0; // the boil's frame: eight a second
    const hs = (i: number, k: number) => {
      const v = Math.sin(i * 12.9898 + k * 78.233 + bf * 37.719) * 43758.5453;
      return v - Math.floor(v);
    };
    /** a straight-edged line or shape through the points, a little off true */
    const poly = (pts: number[], closed: boolean, id: number, amp: number) => {
      ctx.beginPath();
      for (let i = 0; i < pts.length / 2; i++) {
        const x = pts[2 * i] + (hs(id + i, 1) - 0.5) * amp, y = pts[2 * i + 1] + (hs(id + i, 2) - 0.5) * amp;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      if (closed) ctx.closePath();
    };
    /** a smooth line through the points (through their midpoints), a little off true */
    const curve = (pts: number[], id: number, amp: number) => {
      const n = pts.length / 2, q: number[] = [];
      for (let i = 0; i < n; i++) q.push(pts[2 * i] + (hs(id + i, 1) - 0.5) * amp, pts[2 * i + 1] + (hs(id + i, 2) - 0.5) * amp);
      ctx.beginPath();
      ctx.moveTo(q[0], q[1]);
      for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(q[2 * i], q[2 * i + 1], (q[2 * i] + q[2 * i + 2]) / 2, (q[2 * i + 1] + q[2 * i + 3]) / 2);
      ctx.lineTo(q[2 * n - 2], q[2 * n - 1]);
    };
    const ink = (w: number, c = INK) => {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.stroke();
    };
    const fill = (c: string) => {
      ctx.fillStyle = c;
      ctx.fill();
    };
    const ellipse = (cx: number, cy: number, rx: number, ry: number, id: number, amp: number, n = 16) => {
      const p: number[] = [];
      for (let i = 0; i < n; i++) p.push(cx + Math.cos((i / n) * 6.2832) * rx, cy + Math.sin((i / n) * 6.2832) * ry);
      poly(p, true, id, amp);
    };
    /** pencil hatching over whatever is clipped: diagonal strokes, a few px apart */
    const hatch = (x0: number, y0: number, x1: number, y1: number, gap: number, c: string, a: number, w: number) => {
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let s = x0 - (y1 - y0); s < x1; s += gap) {
        ctx.moveTo(s, y1);
        ctx.lineTo(s + (y1 - y0), y0);
      }
      ctx.stroke();
      ctx.restore();
    };
    const lw = (w: number) => w * Math.max(0.8, U);

    // ── the scene ─────────────────────────────────────────────────────────
    /** a lane's edges (screen px): base left, base right, far right, far left; m: how far it has swung in with the others */
    const lane = (i: number, m: number) => {
      const half = S.trunk[0] / 4;
      const bx = S.start[0] + (i - 1.5) * half * 2;
      // together, they narrow to the road's vanishing point
      const fh = lerp(S.farHalf, 1.1, m);
      const fx = lerp(S.far[i], S.start[0] + (i - 1.5) * fh * 2, m);
      return [X(bx - half), Y(S.fork), X(bx + half), Y(S.fork), X(fx + fh), Y(S.horizon), X(fx - fh), Y(S.horizon)];
    };
    const trunkHalf = (y: number) => S.trunk[0] + Math.max(0, y - S.fork) * S.trunk[1];
    /** where my feet are (board units), at depth z (1 where I start), up lane i (or the trunk and the road beyond it, i < 0) */
    const along = (z: number, i: number, m: number) => {
      const y = S.horizon + (S.start[1] - S.horizon) / z;
      const bx = S.start[0] + (i - 1.5) * (S.trunk[0] / 2);
      if (i < 0) return [S.start[0], y];
      if (y >= S.fork) return [lerp(S.start[0], bx, Math.min(1, (S.start[1] - y) / (S.start[1] - S.fork))), y];
      const fx = lerp(S.far[i], S.start[0] + (i - 1.5) * lerp(S.farHalf, 1.1, m) * 2, m);
      return [fx + ((bx - fx) * (y - S.horizon)) / (S.fork - S.horizon), y];
    };
    const snips = B.snips.map((d) => B.shears[0] + d);

    /* the far hills, where the roads go off: two rounded ones either side of
       where they vanish, a taller and fainter one behind (seen only above
       them), a few small trees; in light pencil, each ridge fading out at its
       ends (no line across the page), shading strokes down their far sides.
       Drawn out from the middle as the scene comes in. (Across: shares of the
       board's width from its middle; heights in its units.) */
    type Hill = { c: number; half: number; peak: number; a: number; bump?: number[] };
    const NEAR: Hill[] = [
      { c: -0.2, half: 0.21, peak: 54, a: 0.6, bump: [-0.31, 0.06, 16] },
      { c: 0.21, half: 0.23, peak: 68, a: 0.6, bump: [0.34, 0.07, 22] },
    ];
    const BACK: Hill = { c: 0.03, half: 0.17, peak: 92, a: 0.28 };
    const TREES = [-0.27, -0.13, 0.12, 0.27];
    const rise = (h: Hill, x: number) => {
      let y = Math.abs(x - h.c) < h.half ? (h.peak * (1 + Math.cos((Math.PI * (x - h.c)) / h.half))) / 2 : 0;
      if (h.bump && Math.abs(x - h.bump[0]) < h.bump[1]) y += (h.bump[2] * (1 + Math.cos((Math.PI * (x - h.bump[0])) / h.bump[1]))) / 2;
      return y;
    };
    const HX = (x: number) => X(S.start[0] + x * S.w), HY = (y: number) => Y(S.horizon - y);
    /** a hill's ridge, in pencil, fading in from one foot and out to the other */
    const ridge = (h: Hill, id: number) => {
      const n = 40, x0 = h.c - h.half - (h.bump && h.bump[0] < h.c ? h.bump[1] : 0), x1 = h.c + h.half + (h.bump && h.bump[0] > h.c ? h.bump[1] : 0);
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n, xa = lerp(x0, x1, u0), xb = lerp(x0, x1, u1);
        ctx.globalAlpha = h.a * Math.min(1, ((u0 + u1) / 2) * 4, (1 - (u0 + u1) / 2) * 4);
        poly([HX(xa), HY(rise(h, xa)), HX(xb), HY(rise(h, xb))], false, id + i, 0.5);
        ink(lw(1.3));
      }
    };
    const drawHills = (t: number) => {
      const hp = out(through(t, B.hills));
      if (hp <= 0) return;
      ctx.save();
      // drawn out from the middle
      const reach = (W / 2 + 60) * hp;
      ctx.beginPath();
      ctx.rect(X(S.start[0]) - reach, -H, reach * 2, H * 3);
      ctx.clip();
      // the one behind, only where it shows above the near ones
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(HX(-0.6), HY(0));
      for (let x = -0.6; x <= 0.6; x += 0.01) ctx.lineTo(HX(x), HY(Math.max(rise(NEAR[0], x), rise(NEAR[1], x))));
      ctx.lineTo(HX(0.6), -H);
      ctx.lineTo(HX(-0.6), -H);
      ctx.closePath();
      ctx.clip();
      ridge(BACK, 470);
      ctx.restore();
      NEAR.forEach((h, k) => {
        ridge(h, 480 + k * 50);
        // shading, down the side away from the light
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        for (let x = h.c + h.half * 0.15; x < h.c + h.half * 0.9; x += 0.012) {
          const y = HY(rise(h, x)), len = (4 + 10 * (rise(h, x) / h.peak)) * U;
          ctx.moveTo(HX(x), y + 2 * U);
          ctx.lineTo(HX(x) - len * 0.5, y + 2 * U + len);
        }
        ink(lw(0.9));
      });
      // a few small trees on the ridges: a stem, and a scribbled crown
      TREES.forEach((x, k) => {
        const g = HY(Math.max(rise(NEAR[0], x), rise(NEAR[1], x))), s = (k % 2 ? 1 : 0.8) * U;
        ctx.globalAlpha = 0.5;
        poly([HX(x), g + 1, HX(x), g - 7 * s], false, 530 + k * 5, 0.3);
        ink(lw(1));
        const crown: number[] = [];
        for (let i = 0; i <= 14; i++) {
          const a = (i / 14) * 6.2832 * 1.15, r = (5 + Math.sin(i * 2.3) * 1.2) * s;
          crown.push(HX(x) + Math.cos(a) * r, g - 12 * s + Math.sin(a) * r * 0.9);
        }
        curve(crown, 540 + k * 20, 0.5);
        ink(lw(1));
      });
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    /** how far the lanes have swung together: eased (a spring's overshoot would cross them) */
    const merged = (t: number) => out(ease(through(t, B.merge)));
    const drawScene = (t: number) => {
      const m = merged(t);
      const amp = 1.1 * U;
      // the trunk road, coming up the page to the fork
      const tp = out(through(t, B.trunk));
      const ty = lerp(H, Y(S.fork), tp);
      const yb = (H - oy) / U;
      ctx.save();
      poly([X(S.start[0] - trunkHalf(yb)), H, X(S.start[0] - S.trunk[0]), Y(S.fork), X(S.start[0] + S.trunk[0]), Y(S.fork), X(S.start[0] + trunkHalf(yb)), H], true, 9, 0);
      ctx.clip();
      ctx.fillStyle = "rgba(140, 47, 67, 0.05)";
      ctx.fillRect(0, ty, W, H - ty);
      hatch(X(S.start[0] - trunkHalf(yb)), ty, X(S.start[0] + trunkHalf(yb)), H, 7 * Math.max(0.8, U), THREAD, 0.12, 1);
      ctx.restore();
      for (const sgn of [-1, 1]) {
        poly([X(S.start[0] + sgn * trunkHalf(yb)), H, lerp(X(S.start[0] + sgn * trunkHalf(yb)), X(S.start[0] + sgn * S.trunk[0]), tp), ty], false, 20 + sgn, amp);
        ink(lw(2));
      }
      ctx.setLineDash([9 * U, 7 * U]);
      poly([X(S.start[0]), H, X(S.start[0]), ty], false, 30, amp * 0.4);
      ink(lw(2), THREAD);
      ctx.setLineDash([]);

      // the lanes: hatched strips of cloth, unrolled from the fork like bolts, a stitch down each
      C.lanes.forEach(([, col], i) => {
        const lp = out(through(t, [B.lanes[0] + i * B.lanes[2], B.lanes[0] + B.lanes[1] + i * B.lanes[2]]));
        if (lp <= 0) return;
        const e = lane(i, m);
        // a snipped lane's cut end, lifting and curling as it comes loose
        const cutAt = snips[i < 2 ? 0 : 1];
        const lift = t >= cutAt ? Math.sin(Math.min(1, (t - cutAt) / 0.6) * Math.PI) * 9 * U * (1 - m * 0.6) : 0;
        const base = Y(S.fork) - lift;
        const reach = lerp(base, Y(S.horizon), lp);
        const at = (a: number, b: number, y: number) => lerp(e[a], e[b], (Y(S.fork) - y) / (Y(S.fork) - Y(S.horizon)));
        ctx.save();
        poly([at(0, 6, base), base, at(2, 4, base), base, e[4], e[5], e[6], e[7]], true, 40 + i * 8, 0);
        ctx.clip();
        ctx.beginPath();
        ctx.rect(0, reach, W, base - reach + 1);
        ctx.clip();
        ctx.globalAlpha = 0.09;
        fill(col);
        ctx.globalAlpha = 1;
        hatch(Math.min(e[0], e[6]) - 4, reach, Math.max(e[2], e[4]) + 4, base, 6 * Math.max(0.8, U), col, 0.3, 1);
        ctx.restore();
        for (const [a, b] of [[0, 6], [2, 4]]) {
          poly([at(a, b, base), base, at(a, b, reach), reach], false, 60 + i * 4 + a, amp * 0.5);
          ink(lw(1.6));
        }
        ctx.setLineDash([7 * U, 6 * U]);
        poly([(at(0, 6, base) + at(2, 4, base)) / 2, base, (at(0, 6, reach) + at(2, 4, reach)) / 2, reach], false, 80 + i, 0);
        ink(lw(1.6), col);
        ctx.setLineDash([]);
        // the bolt, still rolling up towards the horizon
        if (lp < 1) {
          const l = at(0, 6, reach), r = at(2, 4, reach), rr = Math.max(1.5, (r - l) * 0.28);
          ctx.globalAlpha = Math.min(1, (1 - lp) * 6);
          ellipse((l + r) / 2, reach - rr * 0.4, (r - l) / 2 + 1, rr, 90 + i * 20, 0.6);
          fill(PAPER);
          ink(lw(1.4));
          ellipse((l + r) / 2, reach - rr * 0.4, (r - l) / 4, rr * 0.45, 95 + i * 20, 0.4, 10);
          ink(lw(1), col);
          ctx.globalAlpha = 1;
        }
        if (t >= cutAt) {
          // the cut: a jagged edge where it left the trunk
          const zz: number[] = [];
          const l = at(0, 6, base), r = at(2, 4, base);
          for (let k = 0; k <= 6; k++) zz.push(lerp(l, r, k / 6), base - 2 * U - (k % 2) * 4 * U);
          poly(zz, false, 100 + i, 0.5);
          ink(lw(1.6));
        }
      });

      // a burst where each snip lands, and threads falling from the cut
      snips.forEach((at, k) => {
        const u = (t - at) / 0.35;
        const cx = X(S.start[0] + (k ? 1 : -1) * S.trunk[0] * 0.5), cy = Y(S.fork) - 4 * U;
        if (u > 0 && u < 1) {
          ctx.globalAlpha = 1 - u;
          for (let r = 0; r < 7; r++) {
            const a = (r / 7) * 6.2832 + k;
            poly([cx + Math.cos(a) * (6 + 12 * out(u)) * U, cy + Math.sin(a) * (6 + 12 * out(u)) * U, cx + Math.cos(a) * (12 + 18 * out(u)) * U, cy + Math.sin(a) * (12 + 18 * out(u)) * U], false, 120 + r, 0);
            ink(lw(1.5), THREAD);
          }
          ctx.globalAlpha = 1;
        }
        const f = (t - at) / 1.1;
        if (f > 0 && f < 1) {
          for (let q = 0; q < 5; q++) {
            const sx = cx + (q - 2) * 9 * U + Math.sin(q * 7.1) * 4 * U, sy = cy + f * f * 46 * U + q * 2 * U;
            const rot = (q - 2) * 0.6 + f * (q % 2 ? 3 : -3);
            ctx.save();
            ctx.globalAlpha = 1 - f;
            ctx.translate(sx, sy);
            ctx.rotate(rot);
            curve([-5 * U, 0, -2 * U, -3 * U, 2 * U, 3 * U, 5 * U, 0], 130 + q * 5, 0.3);
            ink(lw(1.2), C.lanes[k * 2 + (q % 2)][1]);
            ctx.restore();
          }
        }
      });

      // the needle, sewing the stripes into one road: a lacing of straight stitches up it, criss-crossing
      const nq = ease(through(t, B.needle));
      if (nq > 0) {
        const L = lane(0, 1), R = lane(3, 1);
        const F = Y(S.fork), Hz = Y(S.horizon);
        // where the stitches go in: from edge to edge, closer together towards the horizon (narrower, and further)
        const pos = (k: number) => {
          const v = 1 - Math.pow(1 - k / 30, 1.7);
          return v;
        };
        const at = (v: number, side: number) => [side ? lerp(R[2], R[4], v) - 2 * U : lerp(L[0], L[6], v) + 2 * U, lerp(F, Hz, v)];
        let tip = at(0, 0), from = tip;
        for (const lace of [0, 1]) {
          const pts: number[] = [];
          for (let k = 0; k <= 30; k++) {
            const v = pos(k);
            if (v > nq) {
              // the thread still being drawn through to the next hole
              const a = at(pos(k - 1), (k - 1 + lace) % 2), b = at(v, (k + lace) % 2), u = (nq - pos(k - 1)) / (v - pos(k - 1));
              const p = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
              pts.push(...p);
              if (lace) [tip, from] = [p, a];
              break;
            }
            pts.push(...at(v, (k + lace) % 2));
          }
          poly(pts, false, 140 + lace * 40, 0.5);
          ink(lw(1.4), THREAD);
        }
        if (nq < 1) {
          // the needle itself, leading the thread, its eye trailing it
          const [tx, ty2] = tip, [px, py] = from;
          ctx.save();
          ctx.translate(tx, ty2);
          ctx.rotate(Math.atan2(ty2 - py, tx - px) + Math.PI / 2);
          ctx.scale(Math.max(0.7, U), Math.max(0.7, U));
          poly([-2.2, 24, 0, -16, 2.2, 24], true, 150, 0);
          fill(PAPER);
          ink(1.4);
          ellipse(0, 18, 1.1, 2.4, 152, 0, 8);
          ink(1);
          ctx.restore();
        }
      }

      /* into the distance: the lanes (and the seam up them) fade out over
         their last stretch, so they go off into the hills, not up to a line */
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const fy0 = Y(S.horizon) - 1, fy1 = Y(S.horizon) + 48 * U;
      const fade = ctx.createLinearGradient(0, fy0, 0, fy1);
      fade.addColorStop(0, "rgba(0, 0, 0, 1)");
      fade.addColorStop(0.45, "rgba(0, 0, 0, 0.55)");
      fade.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = fade;
      ctx.fillRect(-W, fy0, W * 3, fy1 - fy0);
      ctx.fillStyle = "#000";
      ctx.fillRect(-W, fy0 - 200 * U, W * 3, 200 * U);
      ctx.restore();
      drawHills(t);

      // the signpost: it drops in, and each board swings round on its nail; at the end they all spin to point up the one road
      const sp = spring(through(t, B.post));
      if (t > B.post[0]) {
        const [px, foot, topY] = S.post;
        const drop = (1 - sp) * -70 * U;
        ctx.save();
        ctx.translate(0, drop);
        poly([X(px - 5), Y(foot), X(px - 5), Y(topY), X(px + 5), Y(topY), X(px + 5), Y(foot)], true, 160, U * 0.8);
        fill("#f1e3cd");
        ink(lw(1.8));
        ctx.save();
        ctx.clip();
        hatch(X(px - 6), Y(topY), X(px + 6), Y(foot), 4, INK, 0.25, 0.8);
        ctx.restore();
        C.lanes.forEach(([name], i) => {
          const bu = through(t, [B.boards[0] + i * B.boards[2], B.boards[0] + B.boards[1] + i * B.boards[2]]);
          if (bu <= 0) return;
          const by = S.boards[i];
          const toward = Math.atan2(Y(S.horizon) - Y(by), X(S.start[0]) - X(px));
          const a0 = i < 2 ? Math.PI + 0.08 : -0.08;
          let d = toward - a0;
          d -= Math.round(d / 6.2832) * 6.2832;
          const turn = spring(through(t, [B.merge[0] + 0.07 * i, B.merge[0] + 0.95 + 0.07 * i]));
          // swinging up into place from hanging off its nail
          const hang = (i < 2 ? -1 : 1) * (1 - spring(bu)) * 1.4;
          const a = a0 + d * turn + hang;
          ctx.font = `${S.label * U}px ${HAND}`;
          const tw = ctx.measureText(name).width;
          const bw = tw + 34 * U, bh = S.label * 1.4 * U;
          ctx.save();
          ctx.translate(X(px), Y(by));
          ctx.rotate(a);
          poly([0, -bh / 2, bw - 12 * U, -bh / 2, bw, 0, bw - 12 * U, bh / 2, 0, bh / 2], true, 170 + i * 6, U * 0.7);
          fill(PAPER);
          ink(lw(1.6));
          // its nail
          ellipse(5 * U, 0, 1.6 * U, 1.6 * U, 176 + i, 0, 6);
          fill(INK);
          const flip = Math.cos(a) < 0;
          ctx.translate(bw / 2 - 4 * U, 0);
          if (flip) ctx.rotate(Math.PI);
          ctx.fillStyle = INK;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(name, 0, 1 * U);
          ctx.restore();
        });
        ctx.restore();
      }
    };

    // ── me ────────────────────────────────────────────────────────────────
    type Pose = { set: string; i: number; z: number; lane: number; alpha: number };
    /** a frame from a sequence, by a schedule of [frame, seconds] */
    const sched = (t: number, a: number, steps: number[][]) => {
      let u = t - a;
      for (const [f, d] of steps) {
        if (u < d) return f;
        u -= d;
      }
      return steps[steps.length - 1][0];
    };
    const cycle = (t: number, a: number, n: number, per: number) => Math.floor(((t - a) / per) * n) % n;
    /** which drawing of me, and where, at time t */
    const pose = (t: number): Pose => {
      const alpha = ease(through(t, B.appear));
      const at = (z: number, set: string, i: number, lane = 0): Pose => ({ set, i, z, lane, alpha });
      if (t < B.walkUp[0]) return at(1, "turn", 0);
      if (t < B.walkUp[1]) return at(lerp(1, 1.9, ease(through(t, B.walkUp))), "walkAway", cycle(t, B.walkUp[0], 7, 0.95));
      if (t < B.shrug[0]) return at(1.9, "turn", 0);
      if (t < B.shrug[1]) return at(1.9, "shrug", sched(t, B.shrug[0], [[0, 0.07], [1, 0.1], [2, 0.42], [3, 0.12], [0, 1]]));
      if (t < B.turnFront[1]) return at(1.9, "turn", Math.min(4, Math.floor(through(t, B.turnFront) * 5)));
      if (t < B.walkBack[1]) return at(lerp(1.9, 1, ease(through(t, B.walkBack))), "walkToward", cycle(t, B.walkBack[0], 6, 0.9));
      if (t < B.idea[1]) return at(1, "turn", 4);
      if (t < B.turnBack[1]) return at(1, "turn", 4 - Math.min(4, Math.floor(through(t, B.turnBack) * 5)));
      // the shears: out, up, open, snip, open, snip (on B.snips), held up, and down
      if (t < B.walkOff[0]) return at(1, "shears", sched(t, B.shears[0], [[0, 0.15], [1, 0.16], [2, 0.14], [3, 0.18], [2, 0.14], [3, 0.2], [4, 0.35], [0, 9]]));
      const u = through(t, B.walkOff);
      return at(lerp(1, 10, u * u * 0.5 + u * 0.5), "walkAway", cycle(t, B.walkOff[0], 7, 0.95), -1);
    };
    const drawMe = (t: number, q: Pose) => {
      if (!ready || q.alpha <= 0) return;
      const set = C.frames.sets[q.set], f = set.frames[q.i];
      const [bx, by] = along(q.z, q.lane, merged(t));
      // css px for each of the drawing's own px
      const k = ((S.figure * U) / q.z / C.frames.height) * set.scale;
      const x = X(bx), y = Y(by), tall = C.frames.height * k;
      ctx.save();
      ctx.globalAlpha = q.alpha;
      // standing on the road: a soft shadow under the feet
      ctx.save();
      ellipse(x, y - tall * 0.006, tall * 0.17, tall * 0.035, 400, 0, 18);
      ctx.globalAlpha *= 0.14;
      fill(INK);
      ctx.restore();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(atlas, f[0], f[1], f[2], f[3], x - f[4] * k, y - f[5] * k, f[2] * k, f[3] * k);
      if (q.set === "shears") {
        // the shears are up at the drawing's top right: a glint as they come up open, and "snip!" at each snip
        const left = x - f[4] * k, top = y - f[5] * k, w = f[2] * k, h = f[3] * k;
        const g = (t - (B.shears[0] + 0.3)) / 0.3;
        if (g > 0 && g < 1) {
          const r = Math.sin(g * Math.PI) * 9 * U, gx = left + w * 0.93, gy = top + h * 0.12;
          ctx.save();
          ctx.translate(gx, gy);
          ctx.rotate(g * 0.8);
          for (const a of [0, Math.PI / 2]) {
            ctx.rotate(a);
            poly([-r, 0, r, 0], false, 460, 0);
            ink(lw(1.4), THREAD);
          }
          ctx.restore();
        }
        snips.forEach((at, n) => {
          const u = (t - at) / 0.7;
          if (u <= 0 || u >= 1) return;
          ctx.save();
          ctx.globalAlpha *= 1 - u * u;
          ctx.translate(left + w + 10 * U + n * 8 * U, top + h * 0.3 - u * 12 * U - n * 10 * U);
          ctx.rotate(-0.18 + n * 0.12);
          const sc = spring(Math.min(1, u * 2.5));
          ctx.scale(sc, sc);
          ctx.font = `${24 * Math.max(0.8, U)}px ${HAND}`;
          ctx.fillStyle = THREAD;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText("snip!", 0, 0);
          ctx.restore();
        });
      }
      ctx.restore();
    };

    /* the idea: a panel by my head, as in a comic: it pops up (and settles),
       a grin, then a finger up, and it's gone; a trail of dots to it */
    const drawIdea = (t: number) => {
      const u = through(t, B.idea);
      if (!ready || u <= 0 || u >= 1) return;
      const grin = C.frames.sets.grin.frames;
      const which = u < 0.42 ? 0 : 1;
      const f = grin[which];
      const [bx, by] = along(1, 0, 0);
      const tall = S.figure * U;
      // where: up beside my head, kept on the screen
      const pw = tall * 0.78, ph = pw * 1.12;
      let cx = X(bx) - tall * 0.66, cy = Y(by) - tall * 1.02;
      cx = Math.min(W - pw / 2 - 12, Math.max(pw / 2 + 12, cx));
      cy = Math.max(ph / 2 + 12, cy);
      const pop = u < 0.88 ? spring(Math.min(1, u / 0.24)) : 1 - ease((u - 0.88) / 0.12);
      // a little bounce as the drawing changes
      const bump = which ? 1 + 0.05 * Math.sin(Math.min(1, (u - 0.42) / 0.12) * Math.PI) : 1;
      // the dots, from my head out to it
      const hx = X(bx) - tall * 0.1, hy = Y(by) - tall * 0.92;
      for (let d = 0; d < 3; d++) {
        const v = (d + 1) / 4;
        if (pop < v) continue;
        ellipse(lerp(hx, cx + pw * 0.35, v), lerp(hy, cy + ph * 0.38, v), (2 + d * 1.6) * U, (2 + d * 1.6) * U, 420 + d * 9, 0.4, 10);
        fill(PAPER);
        ink(lw(1.4));
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((1 - pop) * 0.18 + 0.03);
      ctx.scale(pop * bump, pop * bump);
      // the panel: paper, its outline doubled and rough, like the site's cards
      poly([-pw / 2, -ph / 2, pw / 2, -ph / 2, pw / 2, ph / 2, -pw / 2, ph / 2], true, 440, 1.6 * U);
      fill(PAPER);
      ctx.save();
      ctx.clip();
      // the drawing, head and shoulders, filling the panel's width
      const k = (pw * 1.04) / f[2];
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(atlas, f[0], f[1], f[2], f[3], -f[2] * k * 0.5, ph / 2 - f[3] * k + 2, f[2] * k, f[3] * k);
      ctx.restore();
      poly([-pw / 2, -ph / 2, pw / 2, -ph / 2, pw / 2, ph / 2, -pw / 2, ph / 2], true, 440, 1.6 * U);
      ink(lw(2.2));
      poly([-pw / 2 + 4 * U, -ph / 2 - 3 * U, pw / 2 + 3 * U, -ph / 2 + 2 * U, pw / 2 - 2 * U, ph / 2 + 4 * U, -pw / 2 - 3 * U, ph / 2 - 1 * U], true, 450, 1.6 * U);
      ctx.globalAlpha *= 0.55;
      ink(lw(1.2), THREAD);
      ctx.restore();
    };

    // ── the headline, as the hero has it ──────────────────────────────────
    const drawHead = (t: number) => {
      if (!head) head = measure();
      if (!head) return;
      const { main, aside } = head;
      // "Pick a lane.", written out left to right
      const p = out(through(t, B.head));
      if (p > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(main.x - 4, main.base - main.h * 1.4, (main.w + 8) * p, main.h * 2);
        ctx.clip();
        ctx.font = main.font;
        ctx.letterSpacing = main.spacing;
        ctx.fillStyle = main.color;
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        ctx.fillText("Pick a lane.", main.x, main.base);
        ctx.restore();
      }
      // "or don't.", tilted as the hero tilts it, and its stitched underline
      const ap = through(t, B.aside), up = through(t, B.underline);
      if (ap <= 0) return;
      ctx.save();
      ctx.font = aside.font;
      ctx.letterSpacing = aside.spacing;
      // its transform turns about its bottom left corner (hero.css)
      ctx.translate(aside.x, aside.top + aside.h);
      if (aside.m) ctx.transform(aside.m.a, aside.m.b, aside.m.c, aside.m.d, aside.m.e, aside.m.f);
      ctx.translate(0, -aside.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-4, -aside.h, (aside.w + 8) * ap, aside.h * 3);
      ctx.clip();
      ctx.fillStyle = aside.color;
      ctx.textBaseline = "alphabetic";
      ctx.fillText("or don't.", 0, aside.base - aside.top);
      ctx.restore();
      if (up > 0) {
        // hero.tsx's underline: a dashed stitch, 106% as wide, 7 px below
        const sx = (aside.w * 1.06) / 120, sy = 11 / 12, x0 = -0.03 * aside.w, y0 = aside.h + 7 - 11;
        const P = (x: number, y: number): [number, number] => [x0 + x * sx, y0 + y * sy];
        ctx.beginPath();
        ctx.rect(x0 - 2, y0 - 6, (aside.w * 1.06 + 4) * up, 24);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(...P(3, 8));
        ctx.bezierCurveTo(...P(16, 4), ...P(26, 9), ...P(40, 6));
        ctx.bezierCurveTo(...P(54, 3), ...P(64, 2), ...P(78, 6));
        ctx.bezierCurveTo(...P(92, 10), ...P(104, 9), ...P(117, 4));
        ctx.setLineDash([7 * sx, 5 * sx]);
        ink(2 * sy, aside.color);
      }
      ctx.restore();
    };

    /* ── the end: a drop of watercolour, blooming out across the paper ───
       The site (.home) is shown only inside the bloom, masked to a circle a
       little within its ragged edge; the story is cleared inside the same
       circle, so the two cross over under the band of wash. */
    let home: HTMLElement | null = null;
    const WASH = "140, 47, 67";
    /** the bloom's centre (where the road goes off) and how far it has to go to cover the screen */
    const bloomAt = (t: number) => {
      const cx = X(S.start[0]), cy = Y(S.horizon);
      const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
      // spreading at a steady pace, easing off a little at the end, as a wash does (not all at once)
      const u = through(t, B.bloom);
      return { cx, cy, r: ((far + 40) / 0.9) * (0.6 * u + 0.4 * (1 - (1 - u) * (1 - u))) };
    };
    const maskSite = (t: number) => {
      home ||= document.querySelector<HTMLElement>(".home");
      if (!home) return;
      const { cx, cy, r } = bloomAt(t);
      const box = home.getBoundingClientRect(), c = cv.getBoundingClientRect();
      const x = cx + c.left - box.left, y = cy + c.top - box.top, outer = Math.max(0.5, r * 0.9), inner = Math.max(0, outer - 36);
      const g = `radial-gradient(circle ${outer.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 ${inner.toFixed(1)}px, transparent ${outer.toFixed(1)}px)`;
      home.style.setProperty("-webkit-mask-image", g);
      home.style.setProperty("mask-image", g);
    };
    const unmaskSite = () => {
      home?.style.removeProperty("-webkit-mask-image");
      home?.style.removeProperty("mask-image");
    };
    /** the drop, falling (a little drawn out as it goes), and its splash as it lands */
    const drawDrop = (t: number) => {
      const u = through(t, B.drop), { cx, cy } = bloomAt(t);
      if (u > 0 && u < 1) {
        const y = lerp(cy - 280 * U, cy, u * u), r = 10 * Math.max(0.8, U), st = 1 + u * 0.7;
        ctx.save();
        ctx.translate(cx, y);
        ctx.scale(1 / Math.sqrt(st), st);
        ctx.beginPath();
        ctx.moveTo(0, -r * 2.1);
        ctx.bezierCurveTo(r * 0.5, -r * 1.2, r, -r * 0.4, r, r * 0.15);
        ctx.arc(0, r * 0.15, r, 0, Math.PI);
        ctx.bezierCurveTo(-r, -r * 0.4, -r * 0.5, -r * 1.2, 0, -r * 2.1);
        ctx.fillStyle = `rgba(${WASH}, 0.85)`;
        ctx.fill();
        ctx.restore();
      }
      const sp = (t - B.drop[1]) / 0.45;
      if (sp > 0 && sp < 1) {
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI * (0.08 + (0.84 * k) / 8), d = (14 + 22 * (k % 3)) * U * out(sp);
          ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6 + sp * sp * 10 * U, (1.6 + (k % 2)) * U, (1.6 + (k % 2)) * U, 600 + k * 7, 0, 8);
          fill(`rgba(${WASH}, ${0.8 * (1 - sp)})`);
        }
      }
    };
    /** the bloom: the story cleared inside it, and the wash itself, ragged, pale within and deep at its rim, drying away */
    const drawBloom = (t: number) => {
      const { cx, cy, r } = bloomAt(t);
      if (r <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const clear = ctx.createRadialGradient(cx, cy, Math.max(0, r * 0.9 - 36), cx, cy, r * 0.9);
      clear.addColorStop(0, "rgba(0, 0, 0, 1)");
      clear.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = clear;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const wet = 1 - ease(through(t, B.dry));
      if (wet <= 0) return;
      // its edge: never quite round, as a wash spreads along the paper's grain
      const edge = (a: number) => r * (1 + 0.055 * Math.sin(3 * a + 1.3) + 0.035 * Math.sin(7 * a + 4.1) + 0.02 * Math.sin(13 * a + 0.4));
      ctx.beginPath();
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * 6.2832, e = edge(a);
        if (k) ctx.lineTo(cx + Math.cos(a) * e, cy + Math.sin(a) * e);
        else ctx.moveTo(cx + Math.cos(a) * e, cy + Math.sin(a) * e);
      }
      ctx.closePath();
      const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
      wash.addColorStop(0, `rgba(${WASH}, 0)`);
      wash.addColorStop(0.55, `rgba(${WASH}, ${0.05 * wet})`);
      wash.addColorStop(0.85, `rgba(${WASH}, ${0.15 * wet})`);
      wash.addColorStop(1, `rgba(${WASH}, ${0.24 * wet})`);
      ctx.fillStyle = wash;
      ctx.fill();
      // the rim, where the pigment gathers as it dries: a soft band, and a fine dark line
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(120, 32, 52, ${0.12 * wet})`;
      ctx.lineWidth = 10;
      ctx.stroke();
      ctx.strokeStyle = `rgba(110, 28, 48, ${0.42 * wet})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // grains of pigment settling just inside it
      ctx.fillStyle = `rgba(110, 28, 48, ${0.3 * wet})`;
      for (let k = 0; k < 160; k++) {
        const a = (k * 2.39996) % 6.2832, d = edge(a) * (0.9 + 0.09 * ((k * 0.618) % 1)), z = 1 + (k % 3) * 0.6;
        ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z, z);
      }
    };

    fit();
    const ro = new ResizeObserver(() => {
      if (cv.clientWidth && cv.clientHeight && (cv.clientWidth !== W || cv.clientHeight !== H)) fit();
    });
    ro.observe(cv);
    // the headline moves when the site's faces come in: measure it again then
    document.fonts?.ready.then(() => void (head = null));
    // if the story stalls: let the site come up anyway, a little after it would have (and after any wait for the drawings)
    let fallback = window.setTimeout(() => html.dataset.intro === "play" && done(), (B.done + 6) * 1000);
    let t0 = -1, last = -1, raf = 0, endAt = -1, revealed = false, waited = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.clearTimeout(fallback);
      fallback = 0;
      cv.width = cv.height = 0;
      cv.setAttribute("data-done", "");
      unmaskSite();
    };

    const frame = () => {
      if (!cv.isConnected) return stop();
      raf = requestAnimationFrame(frame);
      const now = performance.now() / 1000;
      if (t0 < 0) t0 = now;
      const dt = last < 0 ? 0 : now - last;
      last = now;
      // over, or skipped: it holds while it fades out (crossroads.css), then stops; the site shown whole at once
      if (html.dataset.intro !== "play") {
        unmaskSite();
        if (endAt < 0) endAt = now;
        if (now - endAt >= B.end) stop();
        return;
      }
      // the story waits for the drawings of me, if they are slow to come (a little while)
      let t = now - t0 - waited;
      if (!ready && t > B.walkUp[0] - 0.1) {
        waited += dt;
        t = now - t0 - waited;
        if (waited > 2.5) return done();
      }
      // the bloom: the site, shown only inside it (masked before it is shown at all, in the same frame)
      if (t >= B.reveal) {
        maskSite(t);
        if (!revealed) {
          revealed = true;
          html.dataset.introReveal = "";
        }
      }
      // all down: the hero's headline (shown from "seen", crossroads.css) takes this one's place in the same frame
      if (t >= B.done) {
        done();
        return stop();
      }
      if (!W) return;
      // drawing: from here the story runs the show (crossroads.css lets its stand-in failsafes go)
      if (!cv.hasAttribute("data-live")) cv.setAttribute("data-live", "");
      bf = Math.floor(t * 8);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // as I walk off, the view eases in a little after me, towards the horizon
      const cam = 1 + 0.07 * ease(through(t, B.walkOff));
      ctx.save();
      ctx.translate(X(S.start[0]), Y(S.horizon));
      ctx.scale(cam, cam);
      ctx.translate(-X(S.start[0]), -Y(S.horizon));
      drawScene(t);
      drawMe(t, pose(t));
      ctx.restore();
      drawIdea(t);
      drawDrop(t);
      drawBloom(t);
      drawHead(t);
    };
    raf = requestAnimationFrame(frame);
  }

  window.__crossroads = { start };
  if (mine) start(mine);
}

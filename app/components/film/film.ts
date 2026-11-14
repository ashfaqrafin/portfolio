import { ACT1 } from "./act1";
import { ACT2 } from "./act2";
import { ACT3 } from "./act3";
import { C, clamp, ease, hash, out, seg } from "./draw";
import { BEAT, END, SLAMS, beat, type Ctx, type Shot, type Tear, type View } from "./kit";

/* ALL OF US: the film, as a function of its own time (seconds). It is cut
   like anime: some forty shots, each a drawing of the stage (1600 × 900,
   painted far beyond its edges) seen through that shot's camera; hard cuts,
   on the music's beat where there is music. Nothing is remembered from
   frame to frame, so it can be paused, jumped and replayed, and any frame
   is a poster.

   The shot list is in design/experience_my_world_view/FILM_SCRIPT.md. */

export { END };
export const SCENES = [
  { at: 0, key: 0.6, name: "The clock", line: "A clock, close up. Between its ticks: tired, half-closed eyes." },
  { at: 5, key: 7.2, name: "The factory", line: "An endless line of grey workers pumping in step under cold light. Every pump sends a coin up a pipe into a glass tower, and on the tower sits a top hat with a cigar. Fourteen hours; pay: two." },
  { at: 18, key: 23, name: "The squeeze", line: "A press comes down on the line, and with every slam the picture splits into more, narrower panels. One worker's hand slips from the lever; he falls. Nobody looks." },
  { at: 28, key: 34.7, name: "No.", line: "One of them stops. His eye opens, and it is red: the first colour. He tears a strip from the belt, ties it round his head, and stands. No." },
  { at: 36, key: 44.6, name: "All of us", line: "The march begins, and on every beat another one wakes: two, ten, a screen full of red eyes. All of us. They run; the belts burst; the roof tears away to a sunset full of flags." },
  { at: 54, key: 56.9, name: "The wall", line: "The hat rises over the horizon and its shadow falls on them. Shields slam down in a wall. They charge, and at the blow the picture itself tears in half. Silence." },
  { at: 64, key: 70.2, name: "Still here", line: "In the rubble he is on his knees. His hand closes on the flagpole. He gets up, the flag opens over him, the sun breaks, and behind him the others rise. The wall shatters; the gold comes down as light; the hat is gone." },
  { at: 76, key: 89, name: "One table", line: "Morning. One long table, everyone at it at the same height, bread passed along, someone laughing, a child on someone's shoulders. Not a ladder. A table." },
] as const;
export function sceneAt(t: number) {
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (SCENES[i].at <= t) k = i;
  return k;
}

const SHOTS: Shot[] = [...ACT1, ...ACT2, ...ACT3];
const shotAt = (t: number) => {
  let k = 0;
  for (let i = 0; i < SHOTS.length; i++) if (SHOTS[i].at <= t) k = i;
  return k;
};
/** what jolts the camera: [when, how hard] */
const HITS: [number, number][] = [[30.2, 0.3], [32.62, 0.45], [33.78, 0.3], [34, 1], [43.65, 1], [49.6, 1.1], [55.6, 0.7], [55.9, 0.7], [56.2, 0.8], [58, 1.5], [66.82, 0.35], [68.8, 1], [71.95, 0.7], [73.55, 0.8]];
/** impact frames: for an instant the picture is its own negative, in red and black */
const IMPACT = [30.2, 34, 43.65, 49.6, 58, 68.8];
/** cuts that land with a flash */
const FLASH = [...Array.from({ length: 8 }, (_, k) => beat(k)), 39.4, 39.4 + 2 * BEAT, 39.4 + 4 * BEAT, 39.4 + 6 * BEAT, 46.2, 51.3, 71.5];

let glowA: HTMLCanvasElement | null = null, glowB: HTMLCanvasElement | null = null;
/** the soft light anime lays over a bright scene: the picture, blurred, screened back over itself */
function bloom(g: CanvasRenderingContext2D, W: number, H: number, k: number) {
  glowA ??= document.createElement("canvas");
  glowB ??= document.createElement("canvas");
  const w1 = Math.max(1, W >> 2), h1 = Math.max(1, H >> 2), w2 = Math.max(1, W >> 4), h2 = Math.max(1, H >> 4);
  if (glowA.width !== w1 || glowA.height !== h1) {
    glowA.width = w1;
    glowA.height = h1;
    glowB.width = w2;
    glowB.height = h2;
  }
  glowA.getContext("2d")!.drawImage(g.canvas, 0, 0, w1, h1);
  glowB.getContext("2d")!.drawImage(glowA, 0, 0, w2, h2);
  g.save();
  g.globalCompositeOperation = "screen";
  g.globalAlpha = k;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(glowB, 0, 0, W, H);
  g.restore();
}

export function film(v: View) {
  const { g, W, H, t } = v;
  v.zones.length = 0;
  v.holdable = false;
  const i = shotAt(t), sh = SHOTS[i], dur = (SHOTS[i + 1]?.at ?? END) - sh.at, lt = t - sh.at;
  // a wide screen sees the whole stage; a tall one sees its middle 760, and more of what is above and below
  const a = W / H, s = a >= 16 / 9 ? W / 1600 : Math.min(H / 900, W / 760), vw0 = W / s;
  const c: Ctx = {
    g, v, t, lt, dur, u: clamp(lt / dur), now: v.now, tw: Math.floor(lt * 12) / 12, cx: 800, cy: 450, vw: vw0, vh: H / s, tall: a < 1,
    zone: (id, x, y, r) => {
      const m = g.getTransform(), p = m.transformPoint({ x, y });
      v.zones.push({ id, x: p.x, y: p.y, r: r * Math.hypot(m.a, m.b) });
    },
  };
  const [cx, cy, z, r = 0] = sh.cam ? sh.cam(c) : [vw0 >= 1600 ? 800 : clamp(sh.fx ?? 800, vw0 / 2, 1600 - vw0 / 2), 450, 1, 0];
  let shake = 0;
  for (const [at, amt] of HITS) if (t >= at) shake += amt * Math.exp(-(t - at) * 5);
  for (const sl of SLAMS) if (t >= sl && !v.pressHeld) shake += 0.45 * Math.exp(-(t - sl) * 7);
  for (let k = 1; k <= 5; k++) if (t >= k && t < 6) shake += 0.1 * Math.exp(-(t - k) * 10);
  if (t >= 36 && t < 58) shake += 0.12 * Math.exp(-4 * (((t - 36) / BEAT) % 1));
  const amp = v.reduced ? 0 : shake * 18 * s;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W / 2 + Math.sin(v.now * 83) * amp, H / 2 + Math.cos(v.now * 61) * amp);
  g.rotate(r);
  g.scale(s * z, s * z);
  g.translate(-cx, -cy);
  c.cx = cx;
  c.cy = cy;
  c.vw = W / (s * z);
  c.vh = H / (s * z);
  sh.draw(c);
  g.restore();

  if (sh.bloom) bloom(g, W, H, sh.bloom);
  if (!v.reduced) for (const at of FLASH) if (t >= at && t < at + 0.1) {
    g.fillStyle = `rgba(251,246,234,${(0.6 * (1 - (t - at) / 0.1)).toFixed(3)})`;
    g.fillRect(0, 0, W, H);
  }
  // where someone has torn at the picture themselves: it opens, and is sewn shut
  for (const tr of v.tears) userTear(v, tr, s);
  // print: a little grit over everything
  if (v.grit) {
    g.save();
    g.globalAlpha = 0.28;
    g.globalCompositeOperation = "multiply";
    g.fillStyle = v.grit;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  if (!v.reduced)
    for (const at of IMPACT) {
      if (t >= at && t < at + 0.08) {
        g.save();
        g.globalCompositeOperation = "difference";
        g.fillStyle = "#fff";
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = "color";
        g.fillStyle = C.red;
        g.fillRect(0, 0, W, H);
        g.restore();
      } else if (t >= at + 0.08 && t < at + 0.36) {
        g.fillStyle = `rgba(255,252,240,${(0.7 * (1 - seg(t, at + 0.08, at + 0.36))).toFixed(3)})`;
        g.fillRect(0, 0, W, H);
      }
    }
}

/** a tear someone made by dragging: it gapes, the light shows, and red thread closes it */
function userTear(v: View, tr: Tear, s: number) {
  const { g, now } = v;
  const a = now - tr.born;
  if (a > 2.4 || tr.pts.length < 4) return;
  const open = out(seg(a, 0, 0.18)) * (1 - ease(seg(a, 1, 1.9)));
  const wd = 26 * s * open;
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  const path = (jig: number) => {
    g.beginPath();
    for (let k = 0; k < tr.pts.length; k += 2) {
      const x = tr.pts[k] + (hash(k + jig) - 0.5) * 10 * s, y = tr.pts[k + 1] + (hash(k + jig + 0.5) - 0.5) * 10 * s;
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
  };
  if (wd > 0.5) {
    path(1);
    g.lineWidth = wd + 7 * s;
    g.strokeStyle = C.paper;
    g.stroke();
    path(1);
    g.lineWidth = wd;
    g.strokeStyle = C.gold;
    g.stroke();
  }
  const sew = seg(a, 0.9, 1.9);
  if (sew > 0) {
    g.beginPath();
    const n = tr.pts.length / 2;
    for (let k = 1; k < n * sew; k += 2) {
      const x = tr.pts[k * 2], y = tr.pts[k * 2 + 1], d = 8 * s + wd * 0.5;
      g.moveTo(x - d, y - d);
      g.lineTo(x + d, y + d);
      g.moveTo(x + d, y - d);
      g.lineTo(x - d, y + d);
    }
    g.lineWidth = 3 * s;
    g.strokeStyle = C.red;
    g.globalAlpha = 1 - seg(a, 2, 2.4);
    g.stroke();
  }
  g.restore();
}

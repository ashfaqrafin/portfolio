import { C, DUSK, POSE, TAU, bez, brush, burst, cloud, crowd, disc, drawRig, dust, ease, figure, flag, focus, gear, hash, lerp, mix, out, outBack, poly, rays, rig, ring, seg, sky, sparks, speed, tails, tint } from "./draw";
import { BEAT, type Ctx, type Shot, beat, pumps, word } from "./kit";
import { GREY, RED, bearer, eyeScene, fistScene, grid, hall, knotScene, sideLine, wash, who } from "./sets";

/* Scenes 4 and 5: one of them stops, and then all of them. The colour comes
   in with an eye; the march comes in with the cuts. */

const PALE = "#eef1f5";
/** skin, once it has warm light on it */
const SKINS = ["#ffe3c7", "#f3cfae", "#e2b592", "#c99672"];
/** 1 on the beat, falling away after it */
const pulse = (t: number) => {
  const b = (t - 36) / BEAT;
  return Math.exp(-4 * (b - Math.floor(b)));
};
const punchIn = (c: Ctx, amt = 0.14) => 1 + amt * Math.exp(-c.lt * 16);

/** the line; one of them stops; the world slows, and drains to white round him */
function theStop(c: Ctx) {
  const { g, t, lt, now } = c, s = Math.sin(pumps(Math.floor(t * 12) / 12) * TAU);
  const mine = mix(POSE.work(s), POSE.stand, 0.5 * ease(seg(lt, 0.25, 1)));
  sideLine(c, { rate: pumps(t), pose: (i) => (i === 2 ? mine : POSE.work(s)), look: (i) => who(i === 2 ? 0 : i + 20, GREY) });
  wash(g, `rgba(238,241,245,${(0.86 * ease(seg(lt, 0.3, 1.3))).toFixed(3)})`);
  figure(g, 800, 800, 340, 1, mine, who(0, GREY), now);
}

function awaken(c: Ctx) {
  const { lt } = c, lit = ease(seg(lt, 0.8, 0.95));
  const open = lt < 0.6 ? 0.02 : 1.15 * outBack(seg(lt, 0.6, 0.72)) - 0.12 * seg(lt, 0.9, 1.3);
  eyeScene(c, {
    seed: 11, open, iris: tint("#7f93a8", C.red, lit), lit, brow: lerp(-0.3, 1, ease(seg(lt, 0.6, 1))), skin: PALE, hair: C.ink,
    lines: lt > 0.8 ? "rgba(232,52,28,0.55)" : lt > 0.6 ? "rgba(23,17,28,0.22)" : undefined,
  });
}

function clench(c: Ctx) {
  const { g, lt } = c;
  fistScene(c, { bg: PALE, col: C.grey, shade: C.greyD, rim: lt > 0.5 ? C.redHi : undefined, lines: "rgba(23,17,28,0.28)", clench: ease(seg(lt, 0.1, 0.55)), tremble: seg(lt, 0.25, 1) });
  sparks(g, 1100, 420, 16, lt - 0.55, 3, C.red, 800, 500);
}

/** from low down: he straightens up, and tears a strip off the belt */
function rise(c: Ctx) {
  const { g, lt, tw, now } = c;
  wash(g, "#dfe6ee");
  for (let i = -2; i < 8; i++) poly(g, [i * 420 - 80, -400, i * 420 + 150, -400, i * 420 + 90, 560, i * 420 - 140, 560], PALE);
  speed(g, -900, -300, 2500, 1100, 16, "rgba(23,17,28,0.1)", Math.floor(now * 12), 0.5);
  const up = ease(seg(tw, 0, 0.36)), grab = seg(tw, 0.28, 0.42), yank = ease(seg(tw, 0.42, 0.64));
  let pose = mix(POSE.work(0.2), POSE.stand, up);
  pose = mix(pose, { ...POSE.stand, lean: 0.4, aF: [1, 0.15] }, grab * (1 - yank));
  pose = mix(pose, { ...POSE.hero, aB: [-0.2, 0.3] }, yank);
  // the belt at his knees, a piece gone out of it
  poly(g, [-4000, 800, 1010, 800, 990, 850, 1020, 900, -4000, 900], C.steel, C.ink, 10);
  poly(g, [1250, 800, 5600, 800, 5600, 900, 1230, 900, 1265, 850], C.steel, C.ink, 10);
  const at = rig(700, 1130, 980, 1, pose);
  if (tw >= 0.42) tails(g, at.hand.x, at.hand.y, 120 + 560 * out(seg(tw - 0.42, 0, 0.3)), 1, now, 2, 0.4 + 0.6 * seg(tw - 0.42, 0.1, 0.4));
  drawRig(g, at, who(0, GREY, { wind: seg(lt, 0.3, 0.8), rim: yank > 0.5 ? C.redHi : undefined }), now);
  if (tw >= 0.42) {
    const a = tw - 0.42;
    sparks(g, 1130, 850, 22, a, 9, C.gold, 1100, 700);
    if (a < 0.14) burst(g, 1130, 850, 90, 260, 9, C.paper, 4, C.ink, 8);
  }
}

function bandOn(c: Ctx) {
  eyeScene(c, { seed: 11, open: 0.62, iris: C.red, lit: 0.6, brow: 1, skin: PALE, hair: C.ink, band: out(seg(c.lt, 0, 0.22)), lines: "rgba(232,52,28,0.4)" });
}

function no(c: Ctx) {
  const { g, lt, now } = c;
  wash(g, C.paper);
  rays(g, 800, 600, 3400, now * 0.05, C.red, 16, 0.55);
  focus(g, 800, 520, 560, 3400, 60, "rgba(23,17,28,0.4)", Math.floor(now * 12));
  const hx = c.tall ? 800 : 500;
  burst(g, hx, 640, 430, 640, 14, C.paper, Math.floor(now * 6));
  if (c.tall) word(c, "NO.", c.cy - c.vh * 0.29, 330, seg(lt, 0, 0.16), C.red, -0.06);
  else word(c, "NO.", 400, 470, seg(lt, 0, 0.16), C.red, -0.06, 1100);
  figure(g, hx, 1100, 880, 1, POSE.hero, who(0, RED, { wind: 1, glint: Math.exp(-lt * 2.2), rim: C.goldHi }), now);
  // the breath before the music
  if (lt > 1.62) wash(g, `rgba(251,246,234,${(0.92 * ease(seg(lt, 1.62, 2))).toFixed(3)})`);
}

// ── the beat cuts ──
const snap = (seed: number, d: number, band = 0) => (c: Ctx) =>
  eyeScene(c, { seed, d, open: Math.min(1.12, 0.1 + 1.15 * outBack(seg(c.lt, 0, 0.1))), iris: C.red, lit: 0.45 + 0.55 * Math.exp(-c.lt * 6), brow: 1, skin: SKINS[seed % 4], hair: seed % 2 ? C.ink : C.hair, band, lines: "rgba(232,52,28,0.5)" });

function two(c: Ctx) {
  const { g, lt, t, now } = c;
  wash(g, "#ff7a3d");
  rays(g, 800, 760, 3400, 0.2, "#ffb43e", 14, 0.5);
  word(c, "TWO.", 230, 300, seg(lt, 0, 0.14), C.paper, 0.05);
  figure(g, 520, 1040, 760, 1, POSE.fist(pulse(t)), who(0, RED, { wind: 0.8 }), now);
  figure(g, 1040, 1060, 720, 1, POSE.fist(0.4 + 0.6 * pulse(t)), who(6, RED, { wind: 0.8 }), now);
}
function fistUp(c: Ctx) {
  fistScene(c, { bg: "#ffb43e", col: C.red, shade: C.redD, rim: C.goldHi, lines: "rgba(168,29,14,0.5)", clench: 1, tremble: 0.5 });
}
function getUp(c: Ctx) {
  const { g, tw, now } = c;
  wash(g, "#e2455f");
  g.save();
  g.translate(800, 450);
  g.rotate(-Math.PI / 2);
  g.translate(-800, -450);
  speed(g, -1200, -1200, 2800, 2100, 40, "rgba(255,217,107,0.7)", Math.floor(now * 12), 0.5);
  g.restore();
  figure(g, 720, 1080, 860, 1, mix(POSE.work(0), POSE.fist(1), outBack(seg(tw, 0, 0.26))), who(9, RED, { wind: 0.7, rim: C.goldHi, glint: 0.8 }), now);
}
function ten(c: Ctx) {
  const { g, lt, t, now } = c;
  wash(g, "#ffb43e");
  rays(g, 800, 900, 3400, 0.1, "#ff7a3d", 18, 0.5);
  word(c, "TEN.", 200, 300, seg(lt, 0, 0.14), C.red, -0.05);
  for (let i = 0; i < 5; i++) figure(g, 210 + i * 300, 800, 400, 1, POSE.fist(pulse(t + i * 0.03)), who(i + 30, { ...RED, body: "#cf2c18", shade: C.redD }, { wind: 0.6 }), now);
  for (let i = 0; i < 5; i++) figure(g, 60 + i * 330, 1040, 560, 1, POSE.fist(pulse(t + 0.05 + i * 0.03)), who(i + 40, RED, { wind: 0.6 }), now);
}

const LAY = [[2, 1], [2, 2], [4, 2], [4, 4]], TALL = [[1, 2], [2, 2], [2, 4], [4, 4]];
const tile = (c: Ctx, i: number, k: number, lit: number, open: number) =>
  eyeScene(c, { seed: 60 + i * 7 + k * 31, d: i % 2 ? -1 : 1, open, iris: C.red, lit, brow: 1, skin: SKINS[(i + k) % 4], hair: i % 3 ? C.ink : C.hair, band: 1 });
/** two, four, eight, sixteen: every two beats the frame holds twice as many of them */
function tiles(c: Ctx) {
  const k = Math.min(3, Math.floor((c.t - 39.4) / (2 * BEAT) + 1e-6)), age = (c.t - 39.4 - k * 2 * BEAT) % BEAT, [cols, rows] = (c.tall ? TALL : LAY)[k];
  grid(c, cols, rows, (i) => tile(c, i, k, 0.4 + 0.6 * Math.exp(-age * 7), 1 + 0.1 * Math.exp(-age * 10)), 18 * Math.exp(-age * 10));
}
function flareOut(c: Ctx) {
  const { g, now } = c, [cols, rows] = (c.tall ? TALL : LAY)[3];
  grid(c, cols, rows, (i) => tile(c, i, 3, 1, 1.1), 10 * Math.sin(now * 60) * c.u);
  focus(g, c.cx, c.cy, 500 * (1 - c.u), 3400, 80, "rgba(251,246,234,0.8)", Math.floor(now * 12));
  wash(g, `rgba(251,246,234,${(0.96 * ease(c.u)).toFixed(3)})`);
}

/** pull back: the whole floor, on its feet */
function allOfUs(c: Ctx) {
  const { g, lt, t, now } = c, p = pulse(t);
  hall(c, 800, 300);
  g.globalAlpha = 0.55;
  rays(g, 800, 300, 3400, now * 0.04, C.red, 12, 0.5);
  g.globalAlpha = 1;
  word(c, "ALL OF US.", 190, 250, seg(lt, 0, 0.16), C.red, -0.04);
  crowd(g, 60, 1540, 480, 46, 96, "#7d1509", 1, p, now);
  crowd(g, -80, 1680, 580, 34, 160, C.redD, 2, p, now);
  crowd(g, -200, 1800, 720, 24, 250, "#c92a16", 3, p, now);
  for (let i = 0; i < 9; i++) {
    const x = -40 + i * 205, pose = POSE.fist(pulse(t + i * 0.02)), look = who(i, RED, { wind: 0.5 });
    if (i % 3 === 1) bearer(g, x, 1030, 440, 1, pose, look, now, { len: 330, w: 260, fh: 150, seed: i });
    else figure(g, x, 1030, 440, 1, pose, look, now);
  }
}

/** alongside them, at ground level, flat out */
function run(c: Ctx) {
  const { g, lt, tw, now } = c, sc = lt * 1900;
  wash(g, C.wall);
  for (let i = 0; i < 9; i++) {
    const x = ((((i * 420 - sc * 0.45) % 3780) + 3780) % 3780) - 1000;
    poly(g, [x + 60, 60, x + 250, 60, x + 190, 480, x, 480], C.lamp);
  }
  for (let i = 0; i < 6; i++) {
    const x = ((((i * 640 - sc * 0.8) % 3840) + 3840) % 3840) - 1100;
    poly(g, [x + 70, -4000, x + 210, -4000, x + 140, 770, x, 770], C.wallLo);
  }
  poly(g, [-4000, 760, 5600, 760, 5600, 5000, -4000, 5000], C.floor);
  speed(g, -1200, 770, 2800, 1300, 30, C.wallLo, Math.floor(now * 12), 0.5);
  const runner = (x: number, y: number, h: number, id: number, look = who(id, RED, { wind: 1 }), flagged = false) => {
    const ph = tw * 15 + id * 1.9, pose = POSE.run(ph, id % 3 === 0 ? 1 : 0), fy = y - Math.abs(Math.sin(ph)) * h * 0.05;
    if (flagged) bearer(g, x, fy, h, 1, { ...pose, aB: [2.3, 0.5] }, look, now, { len: h * 0.95, w: h * 0.9, fh: h * 0.45, seed: id, speedK: 1.6, back: true });
    else figure(g, x, fy, h, 1, pose, look, now);
  };
  for (let i = 0; i < 10; i++) runner(-200 + i * 215 + Math.sin(lt + i) * 30, 772, 215, i + 50, who(i + 50, { body: "#b5271a", shade: "#8a1c12", band: 1 }, { wind: 1 }));
  for (let i = 0; i < 6; i++) {
    const x = -80 + i * 235 + Math.sin(lt * 1.3 + i * 2) * 26, a = (tw * 1.6 + i * 0.37) % 0.5;
    dust(g, x - 90, 862, 60, a * 1.8, i, C.lamp, C.wallHi);
    runner(x, 862, 345, i + 2, undefined, i === 1 || i === 4);
  }
  dust(g, 1250, 890, 70, ((tw * 1.6) % 0.5) * 1.8, 77, C.lamp, C.wallHi);
  runner(1340, 890, 400, 0);
  for (let i = 0; i < 2; i++) runner(120 + i * 900 + Math.sin(lt * 0.9 + i) * 50, 1400, 760, i + 70, who(i + 70, { body: C.redD, shade: "#7d1509", band: 1 }, { wind: 1 }));
  speed(g, c.cx - c.vw, c.cy - c.vh / 2, c.cx + c.vw, c.cy + c.vh / 2, 24, "rgba(251,246,234,0.75)", Math.floor(now * 12), 0.5);
}

/** a belt goes; what it drove comes straight at us */
function explode(c: Ctx) {
  const { g, lt, now } = c;
  wash(g, "#ffb43e");
  rays(g, 800, 470, 3400, 0.3, "#ff7a3d", 14, 0.5);
  burst(g, 800, 470, 260 + 900 * out(seg(lt, 0, 0.25)), 480 + 1700 * out(seg(lt, 0, 0.25)), 16, C.paper, 3);
  ring(g, 800, 470, 200 + 1900 * out(seg(lt, 0, 0.8)), 70 * (1 - seg(lt, 0, 0.8)), C.paper);
  for (const side of [-1, 1]) {
    const p = bez(800 + side * 60, 470, 800 + side * 400, 470 - 380 * out(seg(lt, 0, 0.5)), 800 + side * 900, 470 + side * 200 * Math.sin(lt * 9), 800 + side * 1500, 300 + 500 * Math.sin(lt * 6 + side), 12);
    brush(g, p, 110, C.ink, 1);
    brush(g, p, 76, C.steel, 1);
  }
  for (let i = 0; i < 5; i++) {
    const a = hash(i * 3.3) * TAU, d = lt * (300 + 500 * hash(i)), sc = 1 + lt * (0.7 + 2 * hash(i + 4));
    gear(g, 800 + Math.cos(a) * d, 470 + Math.sin(a) * d - 260 * lt + 520 * lt * lt, 80 * sc, lt * (5 + 5 * hash(i + 1)) * (i % 2 ? 1 : -1));
  }
  for (let i = 0; i < 14; i++) {
    const a = hash(i * 1.7 + 2) * TAU, d = lt * (500 + 900 * hash(i + 9)), x = 800 + Math.cos(a) * d, y = 470 + Math.sin(a) * d + 400 * lt * lt, r = 24 + 40 * hash(i + 5), ro = lt * 8 + i;
    poly(g, [x + Math.cos(ro) * r, y + Math.sin(ro) * r, x + Math.cos(ro + 2.2) * r * 0.8, y + Math.sin(ro + 2.2) * r * 0.8, x + Math.cos(ro + 4) * r, y + Math.sin(ro + 4) * r], i % 2 ? C.wallLo : C.steel, C.ink, 5);
  }
  sparks(g, 800, 470, 34, lt, 5, C.goldHi, 1500, 500);
  for (let i = 0; i < 3; i++) figure(g, -300 + lt * 1100 + i * 420, 980 - i * 60 - 260 * Math.sin(seg(lt, 0, 1.7) * Math.PI), 520, 1, POSE.leap, who(i + 3, { body: C.redD, shade: "#7d1509", band: 1 }, { wind: 1 }), now);
  focus(g, 800, 470, 760, 3400, 50, "rgba(23,17,28,0.3)", Math.floor(now * 12));
}

/** looking up: the roof comes off, the sunset pours in, the flags open */
function roof(c: Ctx) {
  const { g, lt, t, now } = c;
  sky(g, DUSK, -900, 980, 3);
  disc(g, 800, 900, 330, "#ffe9a8");
  disc(g, 800, 900, 270, "#fff6d6");
  for (let i = 0; i < 6; i++) cloud(g, -500 + hash(i * 3.1) * 2600, 100 + hash(i) * 560, 500 + hash(i + 7) * 500, i % 2 ? "#b8336e" : "#ff9a52", i);
  g.globalAlpha = 0.22;
  rays(g, 800, 900, 3400, now * 0.03, C.goldHi, 16, 0.45);
  g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const x = 150 + i * 325, top = 250 + 90 * hash(i + 2);
    brush(g, [x - 30, 1100, x, top], 16, C.ink, 2);
    flag(g, x, top, 340, 200, -1, now, i, ease(seg(lt, 0.2 + i * 0.22, 1.3 + i * 0.22)), 0.35);
  }
  // the roof, in sheets, torn away from the middle outward
  for (let j = -2; j < 2; j++)
    for (let i = -3; i < 6; i++) {
      const x = -200 + i * 500, y = -500 + j * 560, k = i * 11 + j * 5, d = Math.hypot(i - 1.5, j + 0.5);
      const a = lt - (0.08 + 0.22 * d + 0.25 * hash(k));
      g.save();
      if (a > 0) {
        g.translate(x + 250 + (i - 1.5) * 700 * a, y + 280 - 900 * a - 500 * a * a);
        g.rotate((hash(k + 1) - 0.5) * 5 * a);
        g.scale(Math.max(0, 1 - a * 0.5), Math.max(0, 1 - a * 0.5));
        g.translate(-x - 250, -y - 280);
      }
      poly(g, [x, y, x + 506, y, x + 506, y + 566, x, y + 566], C.roof, C.ink, 9);
      poly(g, [x + 40, y + 40, x + 466, y + 40, x + 466, y + 110, x + 40, y + 110], C.wallLo);
      g.restore();
    }
  const p = pulse(t);
  crowd(g, -200, 1800, 960, 30, 270, C.redD, 7, p, now);
  crowd(g, -200, 1800, 1070, 20, 380, "#7d1509", 8, p, now);
}

const cut = (k: number, draw: (c: Ctx) => void, amt = 0.14, tilt = 0): Shot => ({ at: beat(k), cam: (c) => [800, 460, punchIn(c, amt), tilt], draw });

export const ACT2: Shot[] = [
  { at: 28, cam: (c) => [800, lerp(450, 610, ease(c.u)), lerp(1.04, 1.75, ease(c.u)), 0], draw: theStop },
  { at: 29.4, cam: (c) => [800, 490, 1 + 0.2 * ease(c.u) + (c.lt > 0.8 ? 0.1 * Math.exp(-(c.lt - 0.8) * 8) : 0), 0.03], draw: awaken },
  { at: 31.2, cam: (c) => [860, 460, 1.02 + 0.16 * c.u, -0.05], draw: clench },
  { at: 32.2, fx: 760, cam: (c) => [760, lerp(720, 420, ease(seg(c.lt, 0, 0.5))), 1, -0.06], draw: rise },
  { at: 33.2, cam: (c) => [800, 400, 0.96 * punchIn(c), 0.04], draw: bandOn },
  { at: 33.6, cam: (c) => [860, 520, 1.02 * punchIn(c), -0.05], draw: (c) => knotScene(c, c.lt * 2.2, 2, PALE) },
  { at: 34, cam: (c) => [lerp(800, c.tall ? 800 : 530, ease(seg(c.lt, 1.55, 2))), lerp(470, 300, ease(seg(c.lt, 1.55, 2))), 1 + 0.3 * Math.exp(-c.lt * 14) + 0.05 * c.u + 1.4 * ease(seg(c.lt, 1.55, 2)), 0.06], draw: no },
  cut(0, snap(21, 1), 0.2, 0.03),
  cut(1, two, 0.14, -0.04),
  cut(2, fistUp, 0.2, -0.06),
  cut(3, (c) => knotScene(c, 0.3 + c.lt * 2.2, 4, "#ff7a3d", { body: C.red, shade: C.redD }), 0.14, 0.05),
  cut(4, snap(34, -1), 0.2, -0.03),
  cut(5, getUp, 0.1, 0.06),
  cut(6, snap(47, 1, 1), 0.2, 0.03),
  cut(7, ten, 0.14, -0.03),
  { at: 39.4, draw: tiles },
  { at: 42.8, cam: (c) => [800, 450, 1 + 0.12 * c.u, 0], draw: flareOut },
  { at: 43.65, bloom: 0.1, cam: (c) => [800, 450 + 50 * Math.exp(-c.lt * 5), 1 + 0.5 * Math.exp(-c.lt * 7) + 0.04 * c.u, -0.03], draw: allOfUs },
  { at: 46.2, fx: 1000, cam: (c) => [c.tall ? 1040 : 800, 480 - 12 * Math.abs(Math.sin((c.lt * Math.PI) / BEAT)), 1.04, -0.04], draw: run },
  { at: 49.6, bloom: 0.12, cam: (c) => [800, 470, 1.25 - 0.25 * out(seg(c.lt, 0, 0.3)) + 0.03 * c.u, 0.08], draw: explode },
  { at: 51.3, bloom: 0.18, cam: (c) => [800, 540 - 90 * ease(c.u), 1.02, 0.03], draw: roof },
];

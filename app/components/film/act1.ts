import { C, POSE, TAU, brush, coin, disc, ease, figure, hat, lerp, mix, poly, rays, seg, speed, stamp, tint, twos } from "./draw";
import { type Ctx, type Shot, pumps, slamAge, slamsBy } from "./kit";
import { GREY, RED, coinsScene, eyeScene, gaugeScene, hall, handsScene, pressScene, sideLine, strips, wash, who, workerScene } from "./sets";

/* Scenes 1 to 3: the clock, the factory, the squeeze. Cold light, grey
   people, and gold going one way. */

const STAMP = "#35435a";

function clock(c: Ctx) {
  const { g, t, now } = c, k = Math.floor(t), age = t - k, R = 330;
  wash(g, C.wallLo);
  disc(g, 800, 450, 660, C.wall);
  disc(g, 800, 450, R + 28, C.ink);
  disc(g, 800, 450, R, "#e9eff5");
  g.beginPath();
  g.arc(800, 450, R - 22, 0.5, 2.7);
  g.lineWidth = 44;
  g.strokeStyle = "#cdd7e1";
  g.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU, r0 = i % 5 ? R - 30 : R - 66;
    brush(g, [800 + Math.cos(a) * r0, 450 + Math.sin(a) * r0, 800 + Math.cos(a) * (R - 10), 450 + Math.sin(a) * (R - 10)], i % 5 ? 5 : 16, C.ink, 2);
  }
  const hand = (a: number, len: number, w: number) => brush(g, [800 - Math.cos(a) * len * 0.14, 450 - Math.sin(a) * len * 0.14, 800 + Math.cos(a) * len, 450 + Math.sin(a) * len], w, C.ink, 1);
  hand(Math.PI / 2 - 0.012, R * 0.52, 30);
  hand(-Math.PI / 2 - (k >= 5 ? 0 : TAU / 60), R * 0.8, 22);
  // the second hand: it lands on each second and shivers; one second from the hour, it trembles
  const sec = 55 + Math.min(k, 5);
  hand(-Math.PI / 2 + (sec / 60) * TAU + 0.075 * Math.exp(-age * 16) * Math.cos(age * 55) + (k === 4 ? Math.sin(now * 70) * 0.006 * age : 0), R * 0.9, 9);
  disc(g, 800, 450, 20, C.ink);
  disc(g, 800, 450, 8, C.lamp);
}

const tired = (seed: number, d: number) => (c: Ctx) => {
  const blink = Math.exp(-Math.pow((c.lt - 0.55) / 0.13, 2));
  eyeScene(c, { seed, d, open: 0.5 - 0.34 * blink, iris: "#7f93a8", brow: -0.7, tired: 1, look: -0.3 + 0.25 * c.u });
};

/** the line, from low down, running away to the far end of the hall */
function line(c: Ctx) {
  const { g, t, now, v } = c, VX = 1260, VY = 400, N = 12;
  hall(c, VX, VY);
  poly(g, [VX - 32, VY + 70, VX + 32, VY + 70, VX + 32, VY - 150, VX - 32, VY - 150], "rgba(228,238,247,0.55)", C.ink, 3);
  poly(g, [VX - 30, VY + 68, VX + 30, VY + 68, VX + 30, VY - 40, VX - 30, VY - 40], C.gold);
  hat(g, VX, VY - 152, 0.42, 0, now);
  const P = (k: number, x: number, y: number): [number, number] => [lerp(VX, x, k), lerp(VY + 70, y, k)];
  // the belt, on their right
  poly(g, [VX - 2, VY + 70, VX + 4, VY + 70, 1560, 1120, 640, 1120], C.steel, C.ink, 6);
  const ph = pumps(t) * 1.2, fr = ph - Math.floor(ph);
  for (let m = 0; m < 16; m++) {
    const d = m - fr;
    if (d < -0.6) continue;
    const k = 1 / (1 + 0.45 * d), [ax, ay] = P(k, 640, 1120), [bx, by] = P(k, 1560, 1120);
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.lineWidth = Math.max(1.5, 7 * k);
    g.strokeStyle = C.ink;
    g.stroke();
    if ((m + Math.floor(ph)) % 3 === 0) {
      const [qx, qy] = P(k, 1120, 1120), w = 190 * k;
      poly(g, [qx - w / 2, qy - w * 0.15, qx + w / 2, qy - w * 0.15, qx + w / 2, qy - w * 0.75, qx - w / 2, qy - w * 0.75], C.wallHi, C.ink, Math.max(2, 7 * k));
      poly(g, [qx - w / 2, qy - w * 0.15, qx + w / 2, qy - w * 0.15, qx + w / 2, qy - w * 0.36, qx - w / 2, qy - w * 0.36], C.wall);
    }
  }
  // the pipe overhead, and the gold in it: the only warm thing in the hall
  g.beginPath();
  g.moveTo(-300, -120);
  g.lineTo(VX - 60, VY - 236);
  g.moveTo(-300, -20);
  g.lineTo(VX - 60, VY - 228);
  g.lineWidth = 5;
  g.strokeStyle = C.ink;
  g.stroke();
  for (let i = 0; i < 9; i++) {
    const u = (i / 9 + pumps(t) * 0.11) % 1, k = Math.pow(1 - u, 1.6);
    coin(g, lerp(VX - 60, -300, k), lerp(VY - 232, -70, k), 4 + 38 * k, Math.cos(u * 40));
  }
  const s = Math.sin(pumps(twos(t)) * TAU);
  for (let i = N - 1; i >= 0; i--) {
    const k = 1 / (1 + 0.45 * i), x = lerp(VX, 250, k), y = lerp(VY + 70, 1090, k), h = 1080 * k, fog = (1 - Math.pow(k, 0.55)) * 0.8;
    let look = who(i + 20, { body: tint(C.grey, C.wall, fog), shade: tint(C.greyD, C.wall, fog), ink: tint(C.ink, C.wallLo, fog * 0.8) });
    let pose = POSE.work(s);
    const woke = v.poked.get(i);
    if (woke !== undefined) {
      // someone watching woke this one early
      const a = now - woke;
      pose = mix(pose, POSE.fist(0.5 + 0.5 * Math.exp(-a * 3)), ease(seg(a, 0, 0.25)));
      look = who(i + 20, RED, { glint: Math.max(0, 1 - a * 1.4), wind: 0.5 });
    }
    const [lx, ly] = P(k, 628, 1100);
    const at = figure(g, x, y, h, 1, pose, look, now);
    if (woke === undefined) {
      g.beginPath();
      g.moveTo(lx, ly);
      g.lineTo(lx, ly - 330 * k);
      g.lineTo(at.hand.x, at.hand.y);
      g.lineWidth = Math.max(2, 20 * k);
      g.lineCap = "round";
      g.strokeStyle = look.ink ?? C.ink;
      g.stroke();
    }
    if (i < 8) c.zone(i, at.head.x, at.head.y, Math.max(36, h * 0.17));
  }
  stamp(g, "14 HOURS", c.cx + c.vw * 0.22, c.cy + c.vh * 0.3, 80, c.lt - 2.4, v.fonts.poster, STAMP);
}

/** up the glass tower, as it fills */
function tower(c: Ctx) {
  const { g, t, now } = c;
  wash(g, C.wallLo);
  for (let j = -3; j < 3; j++) for (let i = -2; i < 7; i++) if (i < 1 || i > 3) poly(g, [i * 340 - 60, j * 560 + 80, i * 340 + 120, j * 560 + 80, i * 340 + 120, j * 560 + 470, i * 340 - 60, j * 560 + 470], C.wall);
  const gy = 620 - 1500 * ease(seg(c.lt, 0, 2.7));
  poly(g, [620, 1300, 980, 1300, 980, -1250, 620, -1250], "rgba(228,238,247,0.5)", C.ink, 12);
  poly(g, [628, 1300, 972, 1300, 972, gy, 628, gy], C.gold);
  g.beginPath();
  for (let y = Math.min(1290, c.cy + c.vh / 2 + 40); y > Math.max(gy + 14, c.cy - c.vh / 2 - 40); y -= 36)
    for (let x = 660; x < 960; x += 58) {
      const ox = (Math.round(y / 36) % 2) * 29;
      g.moveTo(x + ox + 24, y);
      g.arc(x + ox, y, 24, 0, Math.PI);
    }
  g.lineWidth = 4;
  g.strokeStyle = C.goldD;
  g.stroke();
  poly(g, [650, 1300, 684, 1300, 684, -1250, 650, -1250], "rgba(255,255,255,0.4)");
  // the pipes that feed it, floor after floor, and what falls from them
  for (let j = 0; j < 5; j++) {
    const py = 420 - j * 390;
    poly(g, [-4000, py - 26, 620, py - 26, 620, py + 26, -4000, py + 26], "rgba(228,238,247,0.45)", C.ink, 7);
    for (let i = 0; i < 5; i++) coin(g, 620 - ((i / 5 + pumps(t) * 0.3 + j * 0.17) % 1) * 900, py, 20, Math.cos(i + pumps(t) * 4));
    for (let i = 0; i < 3; i++) {
      const u = (i / 3 + pumps(t) * 0.5 + j * 0.3) % 1;
      if (py + u * 420 < gy) coin(g, 700 + i * 60, py + u * 420, 20, Math.cos(u * 9));
    }
    g.fillStyle = C.ink;
    g.fillRect(612, py - 200, 376, 12);
  }
  for (const x of [330, 450, 1180, 1300]) figure(g, x, 1290, 96, x < 800 ? 1 : -1, POSE.work(Math.sin(pumps(twos(t)) * TAU)), who(x, GREY), now);
  hat(g, 800, -1262, 2.5, 0, now, { smoke: 1 });
}

function hatShot(c: Ctx) {
  const { g, lt, now, v } = c;
  wash(g, C.wallLo);
  disc(g, 800, 380, 540, C.wall);
  disc(g, 800, 380, 440, C.wallHi);
  disc(g, 800, 380, 360, C.lamp);
  g.strokeStyle = C.wallHi;
  g.lineWidth = 16;
  g.beginPath();
  for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    g.moveTo(800 - Math.cos(a) * 360, 380 - Math.sin(a) * 360);
    g.lineTo(800 + Math.cos(a) * 360, 380 + Math.sin(a) * 360);
  }
  g.stroke();
  g.globalAlpha = 0.1;
  rays(g, 800, 380, 3000, now * 0.03, C.lamp, 14, 0.4);
  g.globalAlpha = 1;
  poly(g, [470, 2000, 1130, 2000, 1130, 640, 470, 640], "rgba(228,238,247,0.5)", C.ink, 14);
  poly(g, [484, 2000, 1116, 2000, 1116, 712, 484, 712], C.gold);
  g.beginPath();
  for (let y = 740; y < 1400; y += 44)
    for (let x = 520; x < 1110; x += 70) {
      const ox = (Math.round(y / 44) % 2) * 35;
      g.moveTo(x + ox + 28, y);
      g.arc(x + ox, y, 28, Math.PI, 0);
    }
  g.lineWidth = 5;
  g.strokeStyle = C.goldD;
  g.stroke();
  hat(g, 800, 632, 3.3, -0.04, now, { ember: 0.7 + 0.3 * Math.sin(now * 3), smoke: 1, glint: Math.exp(-Math.pow((lt - 1.25) / 0.16, 2)) * 1.6 });
  stamp(g, "PAY: 2", c.cx - c.vw * 0.25, c.cy + c.vh * 0.3, 86, lt - 1.6, v.fonts.poster, STAMP);
}

/** the press, hanging over the line; it goes up before it comes down */
function pressWide(c: Ctx) {
  const { t, lt, v } = c, s = Math.sin(pumps(twos(t)) * TAU);
  v.holdable = true;
  const y = 250 - 150 * ease(seg(lt, 0.15, 1.25)) + (v.pressHeld ? 0 : 520 * Math.pow(seg(lt, 1.4, 1.5), 2));
  sideLine(c, { rate: pumps(t), pose: () => POSE.work(s), look: (i) => who(i + 20, GREY), pressY: y });
}

const INSERTS = [workerScene, handsScene, (c: Ctx) => gaugeScene(c, seg(c.t, 19, 28)), coinsScene, pressScene];
/** every slam cuts the frame into more, narrower panels */
function panels(c: Ctx) {
  const { g, t, v } = c, n = slamsBy(t), age = slamAge(t), held = v.pressHeld;
  v.holdable = true;
  const count = Math.min(c.tall ? 3 : 9, n <= 4 ? n + 1 : n <= 7 ? 5 : n <= 9 ? 6 : 7);
  strips(c, count, c.tall ? 40 : 70, (i) => INSERTS[(i + n) % INSERTS.length](c), held ? 0 : 30 * Math.exp(-age * 9));
  if (!held && age < 0.1) wash(g, `rgba(251,246,234,${(0.6 * (1 - age / 0.1)).toFixed(3)})`);
  if (t > 27.9) wash(g, `rgba(251,246,234,${(0.85 * seg(t, 27.9, 28)).toFixed(3)})`);
}

/** one of them goes down, slowly; behind him the line doesn't miss a stroke */
function collapse(c: Ctx) {
  const { g, t, lt, now, v } = c;
  v.holdable = true;
  wash(g, "#dfe6ee");
  poly(g, [-4000, 800, 5600, 800, 5600, 5000, -4000, 5000], "#cdd7e2");
  const s = Math.sin(pumps(twos(t)) * TAU);
  for (let i = 0; i < 7; i++) figure(g, -100 + i * 300, 770, 300, 1, POSE.work(s), { body: "#c6d0db", shade: "#b6c2cf", ink: "#a3b0bf", hair: i % 5 }, now);
  const f = ease(seg(lt, 0, 1.45));
  // the lever he was holding, swinging free
  g.strokeStyle = C.ink;
  g.lineWidth = 26;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(1180, 900);
  g.lineTo(1180, 520);
  g.lineTo(1180 - 200 * Math.cos(f * 1.2), 520 - 60 + 150 * Math.sin(f * 2.6));
  g.stroke();
  for (let k = 3; k >= 0; k--) {
    const ff = ease(seg(lt - k * 0.09, 0, 1.45));
    g.globalAlpha = k ? 0.14 : 1;
    figure(g, 760 - 90 * ff, 880, 600, 1, mix(POSE.work(0.7), POSE.fallen, ff), who(7, GREY), now);
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 9; i++) {
    const x = 700 + (i * 97) % 520, y = 300 + ((i * 61) % 300) + lt * 26;
    poly(g, [x, y - 18, x + 9, y + 6, x, y + 15, x - 9, y + 6], C.lamp, C.ink, 3);
  }
  // the press comes down again all the same: its shadow
  const age = slamAge(t);
  if (!v.pressHeld && age < 0.3) poly(g, [-4000, -4000, 5600, -4000, 5600, 190 * (1 - age / 0.3), -4000, 190 * (1 - age / 0.3)], C.wallLo, C.ink, 9);
}

const whip = (c: Ctx) => {
  if (c.lt < 0.3) speed(c.g, c.cx - c.vw, c.cy - c.vh, c.cx + c.vw, c.cy + c.vh, 40, "rgba(255,255,255,0.75)", Math.floor(c.now * 24), 0.9);
};

export const ACT1: Shot[] = [
  { at: 0, cam: (c) => [800, 450, 1 + 0.06 * c.u, 0], draw: clock },
  { at: 1, cam: (c) => [800 + 24 * c.u, 480, 1.05, 0.02], draw: tired(1, 1) },
  { at: 2, cam: (c) => [800, 320, 1.55 + 0.08 * c.u, -0.03], draw: clock },
  { at: 3, cam: (c) => [800 - 24 * c.u, 480, 1.05, -0.02], draw: tired(5, -1) },
  { at: 4, cam: (c) => [800, 210, 2.5 + 0.25 * c.u, 0.04], draw: clock },
  { at: 5, cam: (c) => [(c.tall ? 620 : 790) + 50 * c.u + 1500 * Math.pow(seg(c.lt, c.dur - 0.14, c.dur), 2), 470, 1.01 + 0.06 * c.u, -0.025], draw: line },
  { at: 9.2, cam: (c) => [800 - 1100 * Math.pow(1 - seg(c.lt, 0, 0.3), 3), 450, 1.04, 0.03], draw: (c) => { handsScene(c); whip(c); } },
  { at: 12, cam: (c) => [800, lerp(780, -960, ease(c.u)), 1.04, 0], draw: tower },
  { at: 15, cam: (c) => [800, 440 - 30 * c.u, 1 + 0.1 * c.u, 0.05], draw: hatShot },
  { at: 18, cam: () => [800, 430, 1.02, -0.03], draw: pressWide },
  { at: 19.5, draw: panels },
  { at: 24.3, cam: (c) => [800 - 40 * c.u, 480 + 30 * c.u, 1.1 + 0.12 * c.u, 0.04], draw: collapse },
  { at: 26, draw: panels },
];

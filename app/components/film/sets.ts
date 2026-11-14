import { C, DUSK, POSE, TAU, type G, type Look, type Pose, bez, brush, clamp, cloud, coin, disc, drawRig, dust, ease, eye, figure, fist, flag, flare, focus, hash, lerp, out, poly, rig, seg, sky, sparks, speed, tails, tint } from "./draw";
import { type Ctx, pumps, slamAge, slamsBy } from "./kit";

/* The film's sets and inserts: the places its shots happen in, and the
   close-ups it cuts to (an eye, a fist, a knot, hands on a lever, a gauge).
   An insert is drawn round the middle of the stage (800, 450), filling far
   beyond it, so the same one can fill the screen or a panel of it. */

export const GREY: Look = { body: C.grey, shade: C.greyD };
export const RED: Look = { body: C.red, shade: C.redD, band: 1 };
/** one of them: the same hair every time they are seen */
export const who = (id: number, base: Look, extra: Partial<Look> = {}): Look => ({ ...base, hair: id === 0 ? 0 : Math.floor(hash(id * 3.3 + 1) * 5), seed: id * 7.1, ...extra });
/** someone carrying a flag: the pole goes through their fist, the flag flies above and behind them */
export function bearer(g: G, x: number, y: number, h: number, dir: number, pose: Pose, look: Look, now: number, o: { len: number; w: number; fh: number; seed?: number; open?: number; speedK?: number; back?: boolean; pole?: number; to?: number }) {
  const q = rig(x, y, h, dir, pose), hand = o.back ? q.hand2 : q.hand;
  const tx = hand.x - dir * o.len * 0.05, ty = hand.y - o.len;
  const by = o.to ?? hand.y + h * 0.3;
  brush(g, [hand.x + (dir * o.len * 0.05 * (by - hand.y)) / o.len, by, tx, ty], o.pole ?? Math.max(5, h * 0.03), C.ink, 2);
  flag(g, tx, ty, o.w, o.fh, -dir, now, o.seed ?? 0, o.open ?? 1, o.speedK ?? 1);
  return drawRig(g, q, look, now);
}
/** fill far beyond the frame */
export const wash = (g: G, col: string) => {
  g.fillStyle = col;
  g.fillRect(-4000, -4000, 9600, 9000);
};

/** the factory hall, seen down its length to a vanishing point */
export function hall(c: Ctx, vx: number, vy: number) {
  const { g } = c;
  wash(g, C.wallLo);
  poly(g, [-4000, -4000, 5600, -4000, vx + 420, vy - 330, vx - 420, vy - 330], C.roof);
  poly(g, [-4000, 5000, 5600, 5000, vx + 420, vy + 70, vx - 420, vy + 70], C.floor);
  poly(g, [vx - 420, vy - 330, vx + 420, vy - 330, vx + 420, vy + 70, vx - 420, vy + 70], C.wall);
  for (let i = -3; i <= 3; i++) poly(g, [vx + i * 112 - 32, vy - 290, vx + i * 112 + 32, vy - 290, vx + i * 112 + 32, vy - 60, vx + i * 112 - 32, vy - 60], C.lamp);
  g.strokeStyle = C.wallLo;
  g.lineWidth = 3;
  g.beginPath();
  for (let i = -9; i <= 9; i++) {
    g.moveTo(vx + i * 46, vy + 70);
    g.lineTo(vx + i * 900, 5000);
  }
  g.stroke();
  // lamps down both sides of the roof, each with its cone of cold light
  for (const side of [-1, 1])
    for (let k = 5; k >= 0; k--) {
      const s = 1 / (1 + k * 0.75), lx = vx + side * 760 * s, ly = vy - 560 * s;
      poly(g, [lx, ly, lx - 190 * s, ly + 900 * s, lx + 190 * s, ly + 900 * s], "rgba(228,238,247,0.09)");
      poly(g, [lx - 46 * s, ly, lx + 46 * s, ly, lx + 22 * s, ly - 34 * s, lx - 22 * s, ly - 34 * s], C.ink);
      g.fillStyle = C.ink;
      g.fillRect(lx - 2 * s, ly - 400 * s, 4 * s, 370 * s);
      disc(g, lx, ly + 4 * s, 16 * s, C.lamp);
    }
}

/** the line seen from the side: a belt behind five workers, a lever each */
export function sideLine(c: Ctx, o: { rate: number; pose: (i: number) => ReturnType<typeof POSE.work>; look: (i: number) => Look; pressY?: number }) {
  const { g, now } = c;
  wash(g, C.wall);
  for (let i = -6; i < 12; i++) poly(g, [i * 300 + 40, 90, i * 300 + 190, 90, i * 300 + 190, 470, i * 300 + 40, 470], C.wallHi);
  poly(g, [-4000, 760, 5600, 760, 5600, 5000, -4000, 5000], C.floor);
  poly(g, [-4000, 760, 5600, 760, 5600, 790, -4000, 790], C.wallLo);
  // the belt, behind them
  poly(g, [-4000, 560, 5600, 560, 5600, 618, -4000, 618], C.steel, C.ink, 7);
  g.strokeStyle = C.ink;
  g.lineWidth = 5;
  g.beginPath();
  const run = (o.rate * 170) % 90;
  for (let x = -900 - run; x < 2600; x += 90) {
    g.moveTo(x, 618);
    g.lineTo(x + 34, 560);
  }
  for (let x = -800; x < 2600; x += 400) {
    g.moveTo(x, 618);
    g.lineTo(x, 760);
  }
  g.stroke();
  for (let i = 0; i < 5; i++) {
    const x = 220 + i * 290;
    const at = figure(g, x, 800, 340, 1, o.pose(i), o.look(i), now);
    // the lever they work
    g.strokeStyle = C.ink;
    g.lineWidth = 12;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x + 190, 800);
    g.lineTo(x + 190, 640);
    g.lineTo(at.hand.x, at.hand.y);
    g.stroke();
    disc(g, x + 190, 640, 13, C.steel);
  }
  if (o.pressY !== undefined) {
    const y = o.pressY;
    poly(g, [-4000, -4000, 5600, -4000, 5600, y, -4000, y], C.wallLo, C.ink, 9);
    poly(g, [-4000, y - 70, 5600, y - 70, 5600, y, -4000, y], C.gold, C.ink, 7);
    g.fillStyle = C.ink;
    g.beginPath();
    for (let x = -900; x < 2600; x += 120) {
      g.moveTo(x, y);
      g.lineTo(x + 60, y);
      g.lineTo(x + 100, y - 70);
      g.lineTo(x + 40, y - 70);
      g.closePath();
    }
    g.fill();
  }
}

export type EyeO = { seed: number; d?: number; open: number; iris: string; lit?: number; brow?: number; tired?: number; skin?: string; hair?: string; band?: number; lines?: string; look?: number };
/** an eye, filling the frame: the skin as flat colour, the hair hanging over the brow, the band if it's on */
export function eyeScene(c: Ctx, o: EyeO) {
  const { g, now } = c, d = o.d ?? 1, ey = 500, skin = o.skin ?? C.skin, hair = o.hair ?? C.hair;
  wash(g, skin);
  poly(g, [800 + d * 760, ey - 900, 800 + d * 540, ey - 100, 800 + d * 660, ey + 240, 800 + d * 360, ey + 1500, 800 + d * 4000, ey + 1500, 800 + d * 4000, ey - 900], tint(skin, C.wallLo, 0.3));
  brush(g, bez(800 - d * 500, ey - 40, 800 - d * 590, ey + 120, 800 - d * 600, ey + 300, 800 - d * 520, ey + 460, 8), 16, tint(skin, C.ink, 0.45), 0);
  if (o.band) {
    const xa = d > 0 ? -4000 : 5600, xb = lerp(xa, d > 0 ? 5600 : -4000, o.band);
    poly(g, [xa, ey - 452, xb, ey - 470, xb, ey - 288, xa, ey - 270], C.ink);
    poly(g, [xa, ey - 438, xb, ey - 456, xb, ey - 302, xa, ey - 284], C.red);
    poly(g, [xa, ey - 330, xb, ey - 348, xb, ey - 302, xa, ey - 284], C.redD);
  }
  g.fillStyle = hair;
  g.fillRect(-4000, -4000, 9600, 4000 + ey - 520);
  for (let i = -3; i < 13; i++) {
    const x0 = -200 + i * 240 + (hash(o.seed + i) - 0.5) * 90, w = 210 + hash(o.seed + i * 2.2) * 130;
    const tip = ey - 410 + 190 * hash(o.seed + i * 1.3), tx = x0 + w * (0.3 + 0.5 * hash(o.seed + i * 4.1)) + Math.sin(now * 5 + i) * 10;
    poly(g, [x0, ey - 524, x0 + w, ey - 524, tx, tip], hair);
  }
  eye(g, 800, ey, 660, { open: o.open, iris: o.iris, lit: o.lit, brow: o.brow, dir: d, look: o.look, tired: o.tired });
  if (o.lit && o.lit > 0.5) flare(g, 800 + (o.look ?? 0) * 66, ey - 30, 360 * (o.lit - 0.5) * 2, C.redHi);
  if (o.lines) focus(g, 800, ey, 640, 3200, 80, o.lines, o.seed + Math.floor(now * 12));
}

/** a fist, closing */
export function fistScene(c: Ctx, o: { bg: string; col: string; shade: string; rim?: string; lines: string; clench: number; tremble: number }) {
  const { g, now } = c;
  wash(g, o.bg);
  focus(g, 880, 470, 430 - 90 * o.clench, 3200, 70, o.lines, Math.floor(now * 12));
  const jx = (hash(Math.floor(now * 30)) - 0.5) * 16 * o.tremble, jy = (hash(Math.floor(now * 30) + 9) - 0.5) * 16 * o.tremble;
  fist(g, 880 + jx, 470 + jy, 330 * (1 + 0.08 * o.clench), -0.42, o.col, o.shade, o.rim);
  // the strain in it
  if (o.clench > 0.3)
    for (let i = 0; i < 5; i++) {
      const a = -1.1 + i * 0.42, r0 = 300, r1 = 300 + 90 * o.clench;
      brush(g, [1010 + Math.cos(a) * r0, 390 + Math.sin(a) * r0, 1010 + Math.cos(a) * r1, 390 + Math.sin(a) * r1], 16, C.ink, 1);
    }
}

/** the back of a head: the band pulled tight, the knot yanked (at p = 0.45), the tails snapping out */
export function knotScene(c: Ctx, p: number, seed: number, bg: string, body: Look = GREY) {
  const { g, now } = c;
  wash(g, bg);
  speed(g, -600, -200, 2400, 1100, 26, "rgba(255,255,255,0.5)", seed + Math.floor(now * 12), 0.6);
  poly(g, [300, 1500, 420, 900, 620, 820, 900, 820, 1100, 900, 1220, 1500], body.body, C.ink, 14);
  poly(g, [300, 1500, 420, 900, 620, 820, 700, 820, 560, 1500], body.shade);
  disc(g, 760, 560, 348, C.ink);
  for (let i = 0; i < 7; i++) {
    const a = -2.75 + i * 0.4, r = 330, rr = 470 + 150 * hash(seed + i);
    poly(g, [760 + Math.cos(a - 0.22) * r, 560 + Math.sin(a - 0.22) * r, 760 + Math.cos(a + 0.1) * rr - 40, 560 + Math.sin(a + 0.1) * rr, 760 + Math.cos(a + 0.24) * r, 560 + Math.sin(a + 0.24) * r], C.ink);
  }
  const pull = p < 0.45 ? ease(seg(p, 0, 0.4)) : 1;
  poly(g, [408, 520, 1112, 468, 1112, 566, 408, 618], C.red, C.ink, 12);
  poly(g, [408, 586, 1112, 534, 1112, 566, 408, 618], C.redD);
  if (p < 0.45) {
    // two hands hauling on the ends
    const hx = 1220 + 110 * pull;
    poly(g, [1100, 490, hx, 430, hx, 474, 1100, 540], C.red, C.ink, 10);
    poly(g, [1100, 500, hx, 590, hx, 634, 1100, 548], C.red, C.ink, 10);
    fist(g, hx + 60, 440, 120, Math.PI - 0.2, body.body, body.shade);
    fist(g, hx + 60, 620, 120, Math.PI + 0.2, body.body, body.shade);
  } else {
    const a = p - 0.45;
    tails(g, 1120, 516, 760 * out(seg(a, 0, 0.16)), -1, now, seed, 1);
    sparks(g, 1120, 516, 14, a * 0.8, seed, C.paper, 900, 200);
    if (a < 0.2) flare(g, 1120, 516, 300 * (1 - a / 0.2), C.redHi);
  }
  poly(g, [1080, 516, 1125, 462, 1170, 516, 1125, 570], C.red, C.ink, 12);
}

/** hands on a lever, pumping; every pump sends a coin up the pipe */
export function handsScene(c: Ctx) {
  const { g, t } = c, ph = pumps(t), s = Math.sin(ph * TAU), fr = ph - Math.floor(ph);
  wash(g, C.wallLo);
  poly(g, [-4000, 640, 5600, 640, 5600, 5000, -4000, 5000], C.steel, C.ink, 9);
  g.strokeStyle = C.ink;
  g.lineWidth = 7;
  g.beginPath();
  for (let x = -1200 - ((ph * 260) % 160); x < 3000; x += 160) {
    g.moveTo(x, 5000);
    g.lineTo(x + 420, 640);
  }
  g.stroke();
  // the pipe, and the coin this pump made
  poly(g, [1330, -4000, 1450, -4000, 1450, 640, 1330, 640], "rgba(228,238,247,0.35)", C.ink, 7);
  for (let k = 0; k < 3; k++) coin(g, 1390, 620 - (fr + k) * 520, 44, Math.cos((fr + k) * 5));
  const hy = 430 + 150 * s;
  poly(g, [160, 590, 1180, hy - 26, 1180, hy + 26, 160, 640], C.steel, C.ink, 9);
  poly(g, [160, 622, 1180, hy + 6, 1180, hy + 26, 160, 640], C.wallLo);
  disc(g, 190, 612, 46, C.ink);
  disc(g, 190, 612, 24, C.steel);
  for (const [f, rot] of [[0.6, -0.92], [0.86, -0.78]] as const) fist(g, lerp(160, 1180, f), lerp(615, hy, f) - 6, 165, rot, C.grey, C.greyD);
  // sweat, thrown off on the downstroke
  for (let i = 0; i < 7; i++) {
    const a = fr * 0.9, ang = -2.4 + hash(i) * 1.6, sp = 500 + 500 * hash(i + 3);
    const x = 900 + Math.cos(ang) * sp * a, y = hy - 120 + Math.sin(ang) * sp * a + 900 * a * a;
    if (a < 0.6) poly(g, [x, y - 20, x + 10, y + 6, x, y + 16, x - 10, y + 6], C.lamp, C.ink, 3);
  }
}

/** the pressure, on a dial */
export function gaugeScene(c: Ctx, level: number) {
  const { g, now } = c;
  wash(g, C.wallLo);
  const sh = level > 0.75 ? (hash(Math.floor(now * 30)) - 0.5) * 14 : 0;
  disc(g, 800 + sh, 470, 330, C.ink);
  disc(g, 800 + sh, 470, 300, C.lamp);
  g.lineWidth = 46;
  g.lineCap = "butt";
  for (const [a, b, col] of [[-3.9, -1.4, C.wallHi], [-1.4, -0.3, C.gold], [-0.3, 0.76, C.red]] as const) {
    g.beginPath();
    g.arc(800 + sh, 470, 232, a, b);
    g.strokeStyle = col;
    g.stroke();
  }
  const a = lerp(-3.9, 0.76, clamp(level)) + Math.sin(now * 40) * 0.03 * level;
  brush(g, [800 + sh - Math.cos(a) * 40, 470 - Math.sin(a) * 40, 800 + sh + Math.cos(a) * 250, 470 + Math.sin(a) * 250], 34, C.ink, 1);
  disc(g, 800 + sh, 470, 30, C.ink);
}

/** coins rushing up the pipe */
export function coinsScene(c: Ctx) {
  const { g, t } = c, ph = pumps(t);
  wash(g, C.wallLo);
  poly(g, [640, -4000, 960, -4000, 960, 5000, 640, 5000], "rgba(228,238,247,0.4)", C.ink, 9);
  poly(g, [668, -4000, 700, -4000, 700, 5000, 668, 5000], "rgba(255,255,255,0.5)");
  for (let i = 0; i < 16; i++) {
    const u = (hash(i) + ph * (0.5 + 0.3 * hash(i + 5))) % 1;
    coin(g, 720 + hash(i + 2) * 160, 1500 - u * 2100, 46, Math.cos(u * 30 + i));
  }
}

/** the press, coming down */
export function pressScene(c: Ctx) {
  const { g, t, now } = c, age = slamAge(t), held = c.v.pressHeld;
  const y = held ? 150 + Math.sin(now * 50) * 5 : 190 + 420 * (1 - ease(seg(age, 0.04, 0.5)));
  wash(g, C.wall);
  poly(g, [-4000, 640, 5600, 640, 5600, 5000, -4000, 5000], C.steel, C.ink, 9);
  if (!held && age < 0.9)
    for (const side of [-1, 1]) dust(g, 800 + side * 330, 640, 150, age, side + slamsBy(t), C.lamp, C.wallHi);
  poly(g, [-4000, -4000, 5600, -4000, 5600, y, -4000, y], C.wallLo, C.ink, 10);
  poly(g, [-4000, y - 90, 5600, y - 90, 5600, y, -4000, y], C.gold, C.ink, 8);
  g.fillStyle = C.ink;
  g.beginPath();
  for (let x = -900; x < 2600; x += 150) {
    g.moveTo(x, y);
    g.lineTo(x + 75, y);
    g.lineTo(x + 125, y - 90);
    g.lineTo(x + 50, y - 90);
    g.closePath();
  }
  g.fill();
  if (!held && age < 0.12) focus(g, 800, 640, 200, 3000, 50, C.paper, Math.floor(now * 24));
}

/** one of them at the lever, as the machine is driven harder */
export function workerScene(c: Ctx) {
  const { g, t, now } = c, s = Math.sin(pumps(Math.floor(t * 12) / 12) * TAU);
  wash(g, C.wall);
  poly(g, [-4000, 90, 5600, 90, 5600, 470, -4000, 470], C.wallHi);
  poly(g, [-4000, 820, 5600, 820, 5600, 5000, -4000, 5000], C.floor);
  const at = figure(g, 640, 880, 700 * (1 - 0.015 * slamsBy(t)), 1, POSE.work(s), who(3, GREY), now);
  g.strokeStyle = C.ink;
  g.lineWidth = 22;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(1060, 900);
  g.lineTo(1060, 560);
  g.lineTo(at.hand.x, at.hand.y);
  g.stroke();
  for (let i = 0; i < 4; i++) {
    const a = ((now * 1.7 + i * 0.25) % 1) * 0.7, x = at.head.x - 40 - 260 * a + i * 12, y = at.head.y - 60 - 160 * a + 600 * a * a;
    poly(g, [x, y - 16, x + 8, y + 5, x, y + 13, x - 8, y + 5], C.lamp, C.ink, 3);
  }
}

/** the frame cut into slanted strips, a different insert in each */
export function strips(c: Ctx, n: number, slant: number, draw: (i: number) => void, jolt = 0) {
  const { g } = c, x0 = c.cx - c.vw / 2, w = c.vw / n, top = c.cy - c.vh / 2 - 60, bot = c.cy + c.vh / 2 + 60;
  wash(g, C.paper);
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w - (i === 0 ? slant * 2 + 40 : 0), b = x0 + (i + 1) * w + (i === n - 1 ? slant * 2 + 40 : 0), gut = 9;
    const edge = () => {
      g.beginPath();
      g.moveTo(a + slant + gut, top);
      g.lineTo(b + slant - gut, top);
      g.lineTo(b - slant - gut, bot);
      g.lineTo(a - slant + gut, bot);
      g.closePath();
    };
    g.save();
    edge();
    g.clip();
    g.translate(x0 + (i + 0.5) * w - 800, c.cy - 450 + jolt * (i % 2 ? 1 : -1));
    draw(i);
    g.restore();
    edge();
    g.lineWidth = 8;
    g.strokeStyle = C.ink;
    g.stroke();
  }
}
/** the frame cut into a grid of tiles, an insert (scaled to fit) in each */
export function grid(c: Ctx, cols: number, rows: number, draw: (i: number) => void, jolt = 0) {
  const { g } = c, w = (c.vw * 1.14) / cols, h = (c.vh * 1.06) / rows, x0 = c.cx - (w * cols) / 2, y0 = c.cy - (h * rows) / 2;
  wash(g, C.paper);
  g.save();
  g.translate(c.cx, c.cy);
  g.transform(1, 0, -0.1, 1, 0, 0);
  g.translate(-c.cx, -c.cy);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i, x = x0 + i * w + 7, y = y0 + j * h + 7 + jolt * ((i + j) % 2 ? 1 : -1);
      g.save();
      g.beginPath();
      g.rect(x, y, w - 14, h - 14);
      g.clip();
      const s = Math.max(w / 1150, h / 640);
      g.translate(x + w / 2 - 7, y + h / 2 - 7);
      g.scale(s, s);
      g.translate(-800, -470);
      draw(k);
      g.restore();
      g.lineWidth = 7;
      g.strokeStyle = C.ink;
      g.strokeRect(x, y, w - 14, h - 14);
    }
  g.restore();
}

/** the sunset they break out under: sky, a low sun, streaks of cloud; the ground below `hz` */
export function dusk(c: Ctx, hz: number, sunX = 800, ground = "#7c2b55", ground2 = "#5a2150") {
  const { g } = c;
  sky(g, DUSK, hz - 1100, hz, 3);
  disc(g, sunX, hz - 40, 250, "#ffe9a8");
  disc(g, sunX, hz - 40, 205, "#fff6d6");
  for (let i = 0; i < 6; i++) cloud(g, -600 + hash(i * 3.1) * 2800, hz - 150 - hash(i) * 520, 500 + hash(i + 7) * 500, i % 2 ? "#b8336e" : "#ff9a52", i);
  poly(g, [-4000, hz, 5600, hz, 5600, 5000, -4000, 5000], ground);
  poly(g, [-4000, hz + 90, 5600, hz + 60, 5600, 5000, -4000, 5000], ground2);
}

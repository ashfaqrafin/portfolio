import { C, DAWN, DUSK, POSE, TAU, type Look, type Pose, brush, burst, coin, crowd, disc, dust, ease, figure, fist, flag, flare, focus, hash, hat, lerp, mix, out, outBack, poly, ransom, rays, ring, seg, shield, sitter, sky, speed, tint } from "./draw";
import type { Ctx, Shot } from "./kit";
import { RED, bearer, dusk, wash, who } from "./sets";

/* Scenes 6 to 8: the wall, the tear, getting back up, and the table. The
   sunset goes violet under the hat's shadow, white at the impact, and comes
   back as morning. */

const FAR: Look = { body: C.redD, shade: "#7d1509", band: 1 };
const MAUVE = "#d9cdd3";

/** the hat comes up over the horizon like a second, darker sun */
function hatLooms(c: Ctx) {
  const { g, lt, now } = c, up = ease(seg(lt, 0, 1.3)), hy = 1330 - 660 * up;
  dusk(c, 700, 380);
  hat(g, 1000, hy, 4.6, -0.08, now, { ember: 1, col: "#231a33" });
  const gl = Math.exp(-Math.pow((lt - 1.1) / 0.13, 2)) * 1.5;
  flare(g, 900, hy + 110, 150 * gl, C.goldHi);
  flare(g, 1090, hy + 96, 150 * gl, C.goldHi);
  poly(g, [-4000, 700, 5600, 700, 5600, 5000, -4000, 5000], "#7c2b55");
  poly(g, [-4000, 790, 5600, 760, 5600, 5000, -4000, 5000], "#5a2150");
  // its shadow, laid across them
  poly(g, [480, 700, 1520, 700, 1520 - 2600 * up, 1500, 480 - 2600 * up, 1500], "rgba(46,25,74,0.5)");
  crowd(g, -300, 1900, 930, 30, 250, C.redD, 5, 0.6 * (1 - up), now);
  crowd(g, -300, 1900, 1060, 20, 380, "#7d1509", 6, 0.6 * (1 - up), now);
  wash(g, `rgba(58,31,92,${(0.3 * up).toFixed(3)})`);
}

/** the wall comes down in front of them, slab by slab */
function shieldsSlam(c: Ctx) {
  const { g, lt } = c;
  dusk(c, 760, 300);
  for (let i = 0; i < 7; i++) {
    const a = lt - [0, 0, 0.3, 0.3, 0.6, 0.6, 0.6][i], x = 40 + i * 255;
    if (a < 0) continue;
    const drop = 1 - Math.min(1, a / 0.07);
    dust(g, x, 900, 130, a, i, "#b05b78", "#8c3c63");
    shield(g, x, 900 - 1500 * drop * drop, 250, 720, { flare: Math.max(0, 1 - a * 3.2) });
  }
}

/** the two sides, and the ground between them */
function standoff(c: Ctx) {
  const { g, lt, now } = c;
  dusk(c, 640, 760);
  poly(g, [1385, 640, 1475, 640, 1475, 330, 1385, 330], "rgba(255,246,214,0.5)", C.ink, 5);
  poly(g, [1389, 640, 1471, 640, 1471, 380, 1389, 380], C.gold);
  hat(g, 1430, 328, 0.85, -0.05, now, { col: "#231a33" });
  for (let i = 8; i >= 0; i--) shield(g, 1090 + i * 56, 672 + (i % 2) * 12, 62, 200, { flare: i === 0 ? 0.5 + 0.5 * Math.sin(now * 7) : 0 });
  crowd(g, -400, 500, 652, 26, 150, "#7d1509", 3, 0, now);
  for (let i = 0; i < 7; i++) figure(g, 40 + i * 76, 696 + (i % 2) * 18, 232, 1, POSE.stand, who(i + 2, i % 2 ? RED : FAR, { wind: 1 }), now);
  const step = ease(seg(lt, 0.25, 0.7));
  figure(g, 640 + 80 * step, 716, 256, 1, mix(POSE.stand, POSE.march(step * Math.PI, 0, 0.1), Math.sin(step * Math.PI)), who(0, RED, { wind: 1 }), now);
  speed(g, 380, 520, 1250, 730, 12, "rgba(251,246,234,0.5)", Math.floor(now * 12), 0.4);
  dust(g, 900, 716, 60, now % 1, 1, "#b05b78", "#8c3c63");
  dust(g, 1010, 722, 44, (now + 0.5) % 1, 2, "#b05b78", "#8c3c63");
}

/** they go; he leaves the ground, the fist drawn back, and hangs there */
function charge(c: Ctx) {
  const { g, lt, tw, now } = c;
  sky(g, DUSK, -500, 760, 3);
  poly(g, [-4000, 760, 5600, 760, 5600, 5000, -4000, 5000], "#7c2b55");
  speed(g, -1200, -200, 3200, 760, 30, "rgba(255,217,107,0.5)", Math.floor(now * 12), 0.7);
  speed(g, -1200, 770, 3200, 1300, 24, "#5a2150", Math.floor(now * 12) + 5, 0.6);
  for (let i = 0; i < 8; i++) figure(g, -300 + i * 190 + lt * 260, 800, 250, 1, POSE.run(tw * 16 + i * 1.7, i % 2), who(i + 50, FAR, { wind: 1 }), now);
  for (let i = 0; i < 4; i++) {
    const ph = tw * 16 + i * 2.1, x = -80 + i * 250 + lt * 300;
    dust(g, x - 90, 900, 60, ((tw * 2 + i * 0.3) % 0.5) * 1.8, i, "#b05b78", "#8c3c63");
    figure(g, x, 900 - Math.abs(Math.sin(ph)) * 18, 380, 1, POSE.run(ph, i % 2), who(i + 2, RED, { wind: 1 }), now);
  }
  const air = seg(lt, 0.4, 0.68), hold = lt > 0.68;
  figure(g, 880 + 360 * out(seg(lt, 0, 0.68)), 900 - 330 * Math.sin(air * Math.PI * 0.62), 430, 1, mix(POSE.run(tw * 16, 0), POSE.leap, ease(seg(lt, 0.36, 0.52))), who(0, RED, { wind: 1, rim: C.goldHi, glint: hold ? 1 : 0 }), now);
  for (let i = 0; i < 3; i++) shield(g, 2150 - 420 * out(seg(lt, 0.2, 0.7)) + i * 240, 900, 240, 700);
  if (hold) focus(g, 1560, 480, 380, 3400, 70, "rgba(251,246,234,0.6)", Math.floor(now * 12));
}

/** the blow, as one held drawing */
function impact(c: Ctx) {
  const { g } = c;
  wash(g, C.paper);
  burst(g, 960, 450, 520, 2600, 18, C.red, 2);
  burst(g, 960, 450, 300, 760, 14, C.goldHi, 5, C.ink, 10);
  burst(g, 960, 450, 150, 380, 12, C.paper, 8);
  focus(g, 960, 450, 520, 3400, 70, "rgba(23,17,28,0.55)", 3);
  shield(g, 1230, 960, 380, 980, { rot: 0.16 });
  for (let i = 0; i < 6; i++) {
    const a = -1.4 + i * 0.55, p: number[] = [1090, 450];
    for (let j = 1; j <= 4; j++) p.push(1090 + Math.cos(a + (hash(i * 4 + j) - 0.5) * 0.9) * j * 70, 450 + Math.sin(a + (hash(i * 7 + j) - 0.5) * 0.9) * j * 70);
    brush(g, p, 16, C.paper, 1);
  }
  figure(g, 330, 800, 760, 1, POSE.punch, who(0, RED, { wind: 1, rim: C.goldHi }), 0);
  for (let i = 0; i < 12; i++) {
    const a = hash(i * 1.9) * TAU, d = 300 + 500 * hash(i + 3), x = 960 + Math.cos(a) * d, y = 450 + Math.sin(a) * d, r = 20 + 34 * hash(i + 5);
    poly(g, [x + r, y, x - r * 0.5, y + r * 0.8, x - r * 0.6, y - r * 0.7], i % 2 ? C.slate : C.slateD, C.ink, 5);
  }
}
let sheet: HTMLCanvasElement | null = null;
/** impact: the drawing itself tears down the middle, and light comes through */
function tear(c: Ctx) {
  const { g, lt, now } = c, W = g.canvas.width, H = g.canvas.height, m = g.getTransform();
  sheet ??= document.createElement("canvas");
  if (sheet.width !== W || sheet.height !== H) {
    sheet.width = W;
    sheet.height = H;
  }
  const sg = sheet.getContext("2d", { alpha: false })!;
  sg.setTransform(m);
  impact({ ...c, g: sg });
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const d = W * (0.15 * out(seg(lt, 0.06, 2.8)) + 0.004 * lt), seam = W * 0.56, u = H / 900;
  const lg = g.createLinearGradient(seam - d - 30, 0, seam + d + 30, 0);
  lg.addColorStop(0, C.gold);
  lg.addColorStop(0.5, "#fffdf2");
  lg.addColorStop(1, C.gold);
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.5;
  rays(g, seam, H / 2, Math.max(W, H) * 1.2, now * 0.05, "#fffdf2", 22, 0.4);
  g.globalAlpha = 1;
  const jag = (y: number) => seam + (hash(Math.round(y / (26 * u)) * 0.37) - 0.5) * 60 * u;
  for (const side of [-1, 1]) {
    g.save();
    g.translate(seam + side * d, H / 2);
    g.rotate(side * 0.022 * out(seg(lt, 0.06, 3)));
    g.translate(-seam, -H / 2);
    const edge = () => {
      g.beginPath();
      for (let y = -80 * u; y <= H + 80 * u; y += 26 * u) g.lineTo(jag(y), y);
    };
    edge();
    g.lineTo(side < 0 ? -W : W * 2, H + 80 * u);
    g.lineTo(side < 0 ? -W : W * 2, -80 * u);
    g.closePath();
    g.save();
    g.clip();
    g.drawImage(sheet, 0, 0);
    g.restore();
    edge();
    g.lineWidth = 8 * u;
    g.strokeStyle = "#fffdf2";
    g.stroke();
    g.restore();
  }
  for (let k = 0; k < 36; k++) {
    g.save();
    g.globalAlpha = Math.min(1, d / (60 * u)) * (0.5 + 0.5 * hash(k + 3));
    g.translate(seam + (hash(k) - 0.5) * d * 1.8, ((hash(k + 9) * H * 1.2 + lt * u * (14 + 30 * hash(k + 5))) % (H * 1.2)) - H * 0.1);
    g.rotate(hash(k + 1) * 6 + lt * (hash(k + 2) - 0.5) * 1.2);
    const s = (8 + hash(k + 4) * 22) * u;
    poly(g, [-s, -s * 0.5, s * 0.8, -s * 0.7, s, s * 0.4, -s * 0.6, s * 0.6], C.paper, C.ink, 1.5 * u);
    g.restore();
  }
  g.fillStyle = `rgba(251,246,234,${(0.96 * ease(seg(lt, 3.4, 5.9))).toFixed(3)})`;
  g.fillRect(0, 0, W, H);
  g.restore();
}

const rubbleGround = (c: Ctx, hz: number, a = "#c9b9c4", b = "#a88fa3", rock = "#8d7391") => {
  const { g } = c;
  poly(g, [-4000, hz - 200, 5600, hz - 250, 5600, 5000, -4000, 5000], a);
  poly(g, [-4000, hz, 5600, hz - 20, 5600, 5000, -4000, 5000], b);
  for (let i = 0; i < 16; i++) {
    const x = -300 + hash(i * 2.3) * 2300, y = hz + 10 + hash(i + 4) * 150, r = 30 + 70 * hash(i + 8);
    poly(g, [x - r, y, x - r * 0.4, y - r * 0.9, x + r * 0.5, y - r * 0.7, x + r, y], rock, C.ink, 6);
  }
};
function rubble(c: Ctx) {
  const { g, lt, now } = c;
  wash(g, MAUVE);
  rubbleGround(c, 760);
  shield(g, 330, 800, 150, 330, { rot: 1.35 });
  shield(g, 1500, 810, 150, 330, { rot: -1.2 });
  brush(g, [900, 790, 1430, 752], 16, C.ink, 2);
  poly(g, [1160, 760, 1450, 705, 1530, 770, 1290, 806], C.red, C.ink, 8);
  poly(g, [1290, 760, 1450, 730, 1530, 770, 1290, 806], C.redD);
  figure(g, 760, 800, 430, 1, POSE.kneel, who(0, { body: "#c8452f", shade: "#93301f", band: 1 }, { wind: 0.04 }), now);
  for (let i = 0; i < 22; i++) {
    const x = hash(i) * 1900 - 150, y = 950 - ((hash(i + 3) + lt * 0.05 * (1 + hash(i + 5))) % 1) * 1100, s = 8 + 14 * hash(i + 7);
    g.save();
    g.translate(x, y);
    g.rotate(hash(i + 1) * 6 + lt * (hash(i + 2) - 0.5));
    poly(g, [-s, -s * 0.5, s * 0.8, -s * 0.7, s, s * 0.4, -s * 0.6, s * 0.6], C.paper, C.ink, 2);
    g.restore();
  }
  wash(g, `rgba(251,246,234,${(1 - ease(seg(lt, 0, 1.3))).toFixed(3)})`);
}

/** his hand finds the pole */
function grip(c: Ctx) {
  const { g, lt, now } = c, p = ease(seg(lt, 0, 0.42)), hit = lt - 0.42;
  wash(g, MAUVE);
  poly(g, [-4000, 420, 5600, 380, 5600, 5000, -4000, 5000], "#a88fa3");
  poly(g, [1240, 470, 2600, 300, 2600, 900, 1500, 760], C.red, C.ink, 12);
  poly(g, [1400, 620, 2600, 560, 2600, 900, 1500, 760], C.redD);
  brush(g, [-600, 690, 2400, 470], 78, C.ink, 2);
  brush(g, [-600, 690, 2400, 470], 50, "#6b5546", 2);
  if (hit > 0) dust(g, 800, 640, 150, hit, 3, C.paper, "#c9b9c4");
  const j = hit > 0 ? (hash(Math.floor(now * 30)) - 0.5) * 12 * seg(hit, 0, 0.5) : 0;
  fist(g, lerp(560, 800, p) + j, lerp(160, 570, p), 300, 0.95, "#c8452f", "#93301f", hit > 0.3 ? C.goldHi : undefined);
  if (hit > 0 && hit < 0.12) focus(g, 800, 570, 300, 3400, 50, "rgba(23,17,28,0.4)", Math.floor(now * 24));
}

const HOLD: Pose = { lean: -0.04, head: -0.24, aF: [1.75, 0.6], aB: [-0.5, 1.02], lF: [0.42, -0.1], lB: [-0.4, 0] };
/** up: off his knees, onto the pole, onto his feet */
function getsUp(c: Ctx) {
  const { g, lt, tw, now } = c, up = ease(seg(tw, 0.1, 1));
  wash(g, tint(MAUVE, "#ffd9a0", c.u));
  g.globalAlpha = 0.3 * c.u;
  rays(g, 2300, 250, 4600, 0, C.goldHi, 26, 0.45);
  g.globalAlpha = 1;
  rubbleGround(c, 1040, tint("#c9b9c4", "#f0b878", c.u), tint("#a88fa3", "#c9743a", c.u), tint("#8d7391", "#9a4a2c", c.u));
  bearer(g, 660, 1150, 900, 1, mix(POSE.kneel, HOLD, up), who(0, { body: tint("#c8452f", C.red, up), shade: tint("#93301f", C.redD, up), band: 1 }, { wind: 0.2 + 0.8 * up, rim: up > 0.6 ? C.goldHi : undefined }), now, { len: 780, w: 520, fh: 300, seed: 1, open: 0.12 + 0.3 * up, speedK: 0.6, pole: 26, to: 1210 });
  g.save();
  g.translate(800, 450);
  g.rotate(-Math.PI / 2);
  g.translate(-800, -450);
  speed(g, -1200, -1200, 2800, 2100, 14, "rgba(251,246,234,0.55)", Math.floor(now * 12), 0.4);
  g.restore();
  if (lt > 1.05) wash(g, `rgba(251,246,234,${(0.5 * seg(lt, 1.05, 1.2)).toFixed(3)})`);
}

const morning = (c: Ctx, hz: number, sx: number, spin: number, sun = 300) => {
  const { g } = c;
  sky(g, DAWN, hz - 1200, hz, 5);
  g.globalAlpha = 0.5;
  rays(g, sx, hz - 30, 4000, spin, "#fff6d6", 20, 0.5);
  g.globalAlpha = 1;
  disc(g, sx, hz - 30, sun, "#fff0c0");
  disc(g, sx, hz - 30, sun * 0.82, "#fffbe8");
  poly(g, [-4000, hz, 5600, hz, 5600, 5000, -4000, 5000], "#e09a3c");
  poly(g, [-4000, hz + 110, 5600, hz + 80, 5600, 5000, -4000, 5000], "#c9762b");
};

/** he stands; the flag opens over him; the sun breaks; behind him the others get up, one by one */
function flagRise(c: Ctx) {
  const { g, lt, now } = c;
  morning(c, 780, 1120, now * 0.05);
  ring(g, 1120, 750, 300 + 2400 * out(seg(lt, 0, 0.9)), 80 * (1 - seg(lt, 0, 0.9)), "#fffbe8");
  for (let i = 0; i < 14; i++) {
    const x = -260 + i * 150, ti = 0.25 + hash(i * 1.7) * 1.7, f = ease(seg(lt, ti, ti + 0.45));
    if (x > 440 && x < 780) continue;
    figure(g, x, 806 + (i % 2) * 14, 250, 1, mix(POSE.kneel, POSE.fist(0.5 + 0.5 * Math.sin(now * 6 + i)), f), who(i + 3, FAR, { wind: 0.9, rim: f > 0.8 ? C.goldHi : undefined }), now);
  }
  // him: the pole through his fist, the flag well clear of his head, his chest going like bellows
  const breath = Math.sin(c.tw * 5) * 0.012;
  bearer(g, 600, 1090, 720, 1, { ...HOLD, lean: HOLD.lean + breath, head: HOLD.head - breath * 2 }, who(0, RED, { wind: 1, rim: C.goldHi, glint: Math.exp(-lt * 1.6) }), now, { len: 610, w: 940, fh: 400, seed: 1, open: outBack(seg(lt, 0, 0.9)), speedK: 0.5, pole: 26, to: 1210 });
}

/** the wall cracks, and goes to pieces, slowly */
function shatter(c: Ctx) {
  const { g, lt, now } = c, b = Math.max(0, lt - 0.45) * 0.55;
  morning(c, 900, 800, now * 0.05, 380);
  for (let i = 0; i < 7; i++) {
    const x = 40 + i * 255;
    if (lt < 0.45) {
      shield(g, x + (hash(Math.floor(now * 30) + i) - 0.5) * 10 * lt, 900, 250, 720);
      for (let k = 0; k < 3; k++) {
        const p: number[] = [x + (hash(i + k) - 0.5) * 80, 560];
        for (let j = 1; j <= 5 * seg(lt, 0, 0.42); j++) p.push(p[0] + (hash(i * 3 + k * 5 + j) - 0.5) * 190, 560 + (k - 1) * j * 62 + (hash(i + j) - 0.5) * 50);
        brush(g, p, 14, "#fffbe8", 1);
      }
    } else
      for (let k = 0; k < 9; k++) {
        const s = i * 9 + k, px = x + (hash(s) - 0.5) * 230 + (120 + 520 * hash(s + 1)) * b * (hash(s + 2) > 0.3 ? 1 : -0.6), py = 900 - 60 - hash(s + 3) * 620 + (hash(s + 4) - 0.65) * 520 * b + 260 * b * b, r = 50 + 80 * hash(s + 5), ro = hash(s + 6) * 6 + b * (hash(s + 7) - 0.5) * 6;
        poly(g, [px + Math.cos(ro) * r, py + Math.sin(ro) * r, px + Math.cos(ro + 2.3) * r * 0.8, py + Math.sin(ro + 2.3) * r * 0.8, px + Math.cos(ro + 4.1) * r, py + Math.sin(ro + 4.1) * r], k % 3 ? C.slate : C.slateD, C.ink, 6);
        if (k % 4 === 0) flare(g, px, py, 70 * Math.abs(Math.sin(ro * 2 + now * 3)), C.goldHi);
      }
  }
  if (lt >= 0.45) {
    ring(g, 800, 560, 200 + 2600 * out(seg(lt, 0.45, 1.5)), 90 * (1 - seg(lt, 0.45, 1.5)), "#fffbe8");
    wash(g, `rgba(255,251,232,${(0.7 * (1 - seg(lt, 0.45, 0.8))).toFixed(3)})`);
  }
}

/** the tower goes; the gold comes down as light; the hat leaves */
function towerBurst(c: Ctx) {
  const { g, lt, now } = c, a = Math.max(0, lt - 0.35);
  morning(c, 800, 420, now * 0.04, 260);
  if (lt < 0.35) {
    poly(g, [880, 800, 1120, 800, 1120, 190, 880, 190], "rgba(255,246,214,0.55)", C.ink, 9);
    poly(g, [888, 800, 1112, 800, 1112, 250, 888, 250], C.gold);
    brush(g, [930, 190, 1010, 330, 950, 470, 1060, 610, 990, 800], 12 * seg(lt, 0, 0.3) + 3, C.ink, 2);
    hat(g, 1000, 188, 1.5, 0.05 * Math.sin(now * 40), now, {});
  } else {
    burst(g, 1000, 480, 200 + 500 * out(seg(a, 0, 0.3)), 400 + 900 * out(seg(a, 0, 0.3)), 14, `rgba(255,251,232,${(0.9 * (1 - seg(a, 0.12, 0.5))).toFixed(3)})`, 4);
    for (let i = 0; i < 16; i++) {
      const an = hash(i * 2.9) * TAU, d = a * (260 + 420 * hash(i + 2)), x = 1000 + Math.cos(an) * d, y = 500 + Math.sin(an) * d * 1.3 + 320 * a * a, r = 30 + 50 * hash(i + 6), ro = a * 4 + i;
      poly(g, [x + Math.cos(ro) * r, y + Math.sin(ro) * r, x + Math.cos(ro + 2.2) * r, y + Math.sin(ro + 2.2) * r, x + Math.cos(ro + 4) * r * 0.7, y + Math.sin(ro + 4) * r * 0.7], "rgba(255,246,214,0.7)", C.ink, 4);
    }
    // the gold: up, over, and on the way down it stops being money
    for (let i = 0; i < 90; i++) {
      const born = hash(i) * 0.9, ag = a - born;
      if (ag < 0) continue;
      const vx = (hash(i + 3) - 0.5) * 1500, vy = -700 - 800 * hash(i + 7), x = 1000 + vx * ag, y = 500 + vy * ag + 900 * ag * ag, turn = 0.7 + 0.5 * hash(i + 9);
      if (ag < turn) coin(g, x, y, 22, Math.cos(ag * 9 + i));
      else {
        const f = ag - turn, ly = 500 + vy * turn + 900 * turn * turn - 120 * f;
        g.globalAlpha = Math.max(0, 1 - f * 0.55);
        flare(g, 1000 + vx * turn + Math.sin(f * 2 + i) * 30, ly, 34 + 20 * Math.sin(now * 5 + i), C.goldHi);
        g.globalAlpha = 1;
      }
    }
    const hx = 1000 + 430 * a, hy = 188 - 760 * a + 150 * a * a, sc = Math.max(0, 1.5 * (1 - a * 0.48));
    if (sc > 0.05) hat(g, hx, hy, sc, a * 5, now, {});
    else flare(g, hx, hy, 150 * Math.exp(-Math.pow((a - 2.2) / 0.16, 2)), "#fffbe8");
  }
  crowd(g, -300, 1900, 960, 30, 260, C.redD, 5, Math.abs(Math.sin(now * 5)), now);
  crowd(g, -300, 1900, 1080, 20, 380, "#7d1509", 6, Math.abs(Math.sin(now * 5 + 1)), now);
}

// ── the table ──
const TY = 640, FARN = 16, NEARN = 15;
/** the long table in the morning; `sat(i)` is how far along each one is in coming to it (1 = sitting) */
function table(c: Ctx, sat: (i: number) => number, bread: number) {
  const { g, now } = c;
  morning(c, 610, 800, now * 0.02, 215);
  const walker = (i: number, f: number, x: number, y: number, h: number) => {
    const from = i % 2 ? 2100 + i * 30 : -500 - i * 30, px = lerp(from, x, f);
    figure(g, px, y, h, from < x ? 1 : -1, POSE.march(now * 8 + i, 0, 0.08), who(i + 100, RED, { wind: 0.3 }), now);
  };
  for (let n = 0; n < FARN; n++) {
    const f = sat(n * 2);
    if (f < 1) walker(n * 2, f, 190 + n * 80, TY + 96, 250);
  }
  brush(g, [1450, TY + 100, 1440, 400], 12, C.ink, 2);
  flag(g, 1440, 400, 200, 120, -1, now, 4, 1, 0.5);
  poly(g, [100, TY, 1500, TY, 1500, TY + 26, 100, TY + 26], C.paper, C.ink, 7);
  poly(g, [100, TY + 15, 1500, TY + 15, 1500, TY + 26, 100, TY + 26], "#ecdcb8");
  for (const x of [150, 800, 1450]) brush(g, [x, TY + 26, x, TY + 110], 12, C.ink, 2);
  g.save();
  g.beginPath();
  g.rect(-4000, -4000, 9600, 4000 + TY - 3);
  g.clip();
  for (let n = 0; n < FARN; n++) if (sat(n * 2) >= 1) sitter(g, 190 + n * 80, TY + 14, 124, who(n * 2 + 100, RED), false, Math.sin(now * 0.8 + n * 1.7), Math.max(0, Math.min(1, (Math.sin(now * 0.7 + n * 2.3) - 0.86) * 9)), now);
  g.restore();
  for (let k = 0; k < 13; k++) {
    const p = outBack(seg(bread, k * 0.2, k * 0.2 + 0.4));
    if (p <= 0) continue;
    const bx = 200 + k * 100;
    g.beginPath();
    g.ellipse(bx, TY - 2, 26 * p, 16 * p, 0, Math.PI, 0);
    g.closePath();
    g.fillStyle = C.gold;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = C.ink;
    g.stroke();
    brush(g, [bx - 12 * p, TY - 8 * p, bx - 4 * p, TY - 14 * p], 3, C.ink, 2);
    brush(g, [bx + 2 * p, TY - 8 * p, bx + 10 * p, TY - 14 * p], 3, C.ink, 2);
  }
  for (let n = 0; n < NEARN; n++) {
    const f = sat(n * 2 + 1);
    if (f < 1) walker(n * 2 + 1, f, 230 + n * 80, TY + 150, 280);
    else sitter(g, 230 + n * 80, TY + 56, 138, who(n * 2 + 101, RED), true, Math.sin(now * 0.8 + n * 2.1), 0, now);
  }
  for (const x of [200, 800, 1400]) brush(g, [x, TY + 70, x, TY + 112], 10, C.ink, 2);
  poly(g, [150, TY + 54, 1450, TY + 54, 1450, TY + 70, 150, TY + 70], C.paper, C.ink, 6);
}
const arrive = (c: Ctx) => table(c, (i) => seg(c.lt, 0.1 + (i % 16) * 0.07, 1.5 + (i % 16) * 0.07 + hash(i) * 0.6), c.lt - 2.4);

function bread(c: Ctx) {
  const { g, now } = c, x = lerp(600, 1000, ease(c.u));
  wash(g, "#ffd270");
  g.globalAlpha = 0.35;
  rays(g, 800, 1400, 3600, now * 0.03, C.paper, 18, 0.5);
  g.globalAlpha = 1;
  poly(g, [-4000, 720, 5600, 720, 5600, 5000, -4000, 5000], C.paper, C.ink, 9);
  fist(g, x - 300 - 240 * ease(seg(c.u, 0.5, 1)), 520, 210, 0, "#f3cfae", "#d6a886");
  fist(g, x + 300 + 240 * (1 - ease(seg(c.u, 0, 0.5))), 540, 210, Math.PI, "#c99672", "#a6744f");
  g.beginPath();
  g.ellipse(x, 520, 250, 150, 0, 0, TAU);
  g.fillStyle = C.gold;
  g.fill();
  g.lineWidth = 12;
  g.strokeStyle = C.ink;
  g.stroke();
  g.save();
  g.clip();
  g.fillStyle = C.goldD;
  g.fillRect(x - 300, 560, 600, 200);
  g.restore();
  for (const dx of [-110, 0, 110]) brush(g, [x + dx - 30, 470, x + dx + 20, 400], 16, C.goldHi, 0);
}
function laugh(c: Ctx) {
  const { g, now } = c;
  wash(g, "#ffbe4d");
  g.globalAlpha = 0.35;
  rays(g, 800, 300, 3600, now * 0.03, "#ffe6a0", 18, 0.5);
  g.globalAlpha = 1;
  for (const [x, h, id, ph] of [[530, 800, 3, 0], [1090, 760, 8, 1.3]] as const) {
    const bob = Math.abs(Math.sin(now * 10 + ph)) * 26;
    sitter(g, x, 900 - bob, h, who(id, RED), false, Math.sin(now * 5 + ph) * 0.7 * (x < 800 ? 1 : -1), id === 8 ? 0.8 : 0, now);
    // laughing: little strokes thrown off the head, on the side away from the other
    const side = x < 800 ? -1 : 1, hy2 = 900 - bob - h * 0.44;
    for (let k = 0; k < 3; k++) {
      const a = -0.9 + k * 0.5, r0 = h * 0.15, r1 = h * (0.2 + 0.03 * Math.sin(now * 12 + k));
      brush(g, [x + side * Math.cos(a) * r0, hy2 + Math.sin(a) * r0, x + side * Math.cos(a) * r1, hy2 + Math.sin(a) * r1], 12, C.ink, 1);
    }
  }
  poly(g, [-4000, 800, 5600, 800, 5600, 5000, -4000, 5000], C.paper, C.ink, 10);
  for (const bx of [330, 800, 1270]) {
    g.beginPath();
    g.ellipse(bx, 800, 120, 70, 0, Math.PI, 0);
    g.closePath();
    g.fillStyle = C.gold;
    g.fill();
    g.lineWidth = 9;
    g.strokeStyle = C.ink;
    g.stroke();
  }
}
function kid(c: Ctx) {
  const { g, now } = c, bob = Math.abs(Math.sin(now * 7)) * 22;
  morning(c, 880, 800, now * 0.03, 360);
  const at = figure(g, 760, 1150 - bob, 760, 1, { ...POSE.stand, aF: [2.55, 0.5], aB: [2.4, 0.6], head: -0.1 }, who(4, RED, { wind: 0.5 }), now);
  bearer(g, at.sh.x - 30, at.head.y - 20, 360, 1, { lean: 0.02, head: -0.15, aF: [2.15 + 0.2 * Math.sin(now * 9), 0.7], aB: [0.5, 0.7], lF: [1.25, -1.45], lB: [1.05, -1.35] }, who(91, RED, { hair: 3, wind: 0.5 }), now, { len: 190, w: 210, fh: 120, seed: 3, speedK: 1.4, pole: 9 });
}

/** everyone, at one table; and the words */
function last(c: Ctx) {
  const { g, lt, v } = c;
  table(c, () => 1, 9);
  const fonts = [v.fonts.poster, v.fonts.mono, v.fonts.display], size = Math.min(92, c.vw * 0.066), y = c.cy - c.vh * 0.34;
  ransom(g, "NOT A LADDER.", c.cx, y, size, (lt - 0.2) * 7, fonts, 11);
  ransom(g, "A TABLE.", c.cx, y + size * 1.45, size * 1.25, (lt - 2.5) * 7, fonts, 29);
  const sig = seg(lt, 4.8, 6);
  if (sig > 0) {
    g.save();
    g.font = `700 ${size * 0.66}px ${v.fonts.hand}`;
    g.textAlign = "left";
    const text = "— Ashfaq", tw = g.measureText(text).width, x = c.cx + size * 2, ty = y + size * 2.8;
    g.beginPath();
    g.rect(x - 4, ty - size, (tw + 8) * sig, size * 1.5);
    g.clip();
    g.fillStyle = C.ink;
    g.fillText(text, x, ty);
    g.restore();
  }
}

export const ACT3: Shot[] = [
  { at: 54, fx: 900, bloom: 0.12, cam: (c) => [c.tall ? 940 : 800, 470, 1.02 + 0.05 * c.u, 0.03], draw: hatLooms },
  { at: 55.6, bloom: 0.12, cam: () => [800, 480, 1.04, 0.04], draw: shieldsSlam },
  { at: 56.4, bloom: 0.12, cam: (c) => [c.tall ? 900 : 800, 540, 1.14 + 0.06 * c.u, 0], draw: standoff },
  { at: 57.2, fx: 1100, bloom: 0.12, cam: (c) => [(c.tall ? 1050 : 900) + 200 * c.u, 480, 1.04 + 0.3 * seg(c.lt, 0.45, 0.8), -0.07], draw: charge },
  { at: 58, cam: () => [800, 450, 1, 0.05], draw: tear },
  { at: 64, cam: (c) => [800, 580, 1 + 0.2 * ease(c.u), 0], draw: rubble },
  { at: 66.4, cam: (c) => [800, 520, 1.04 + 0.12 * c.u, 0.05], draw: grip },
  { at: 67.6, fx: 700, cam: (c) => [720, lerp(700, 420, ease(c.u)), 1, -0.04], draw: getsUp },
  { at: 68.8, fx: 640, bloom: 0.18, cam: (c) => [c.tall ? 600 : 780, 430 - 40 * c.u, 1.35 - 0.35 * out(seg(c.lt, 0, 0.5)) + 0.03 * c.u, -0.05], draw: flagRise },
  { at: 71.5, bloom: 0.2, cam: (c) => [800, 520, 1.1 - 0.06 * c.u, 0.03], draw: shatter },
  { at: 73.2, fx: 1000, bloom: 0.18, cam: (c) => [c.tall ? 1000 : 900, 480 - 60 * c.u, 1.04, -0.03], draw: towerBurst },
  { at: 76, bloom: 0.14, cam: (c) => [800, lerp(330, 560, ease(c.u)), lerp(1.3, 1.14, ease(c.u)), 0], draw: arrive },
  { at: 79.5, bloom: 0.14, cam: (c) => [800, 500, 1.04 + 0.04 * c.u, -0.03], draw: bread },
  { at: 80.47, bloom: 0.14, cam: (c) => [800, 520, 1.02 + 0.04 * c.u, 0.03], draw: laugh },
  { at: 81.43, fx: 760, bloom: 0.14, cam: (c) => [760, 340, 0.9 + 0.05 * c.u, -0.03], draw: kid },
  { at: 82.4, bloom: 0.14, cam: (c) => [800, c.tall ? 560 : 520, (c.tall ? 1.55 : 1.32) - 0.14 * ease(c.u), 0], draw: last },
];

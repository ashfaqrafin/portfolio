/* The intro's character: a cut-out puppet of me, in profile (his pieces are
   cut from green-screen sheets by scripts/intro-actor.mjs). He walks a few
   steps in from the left edge, reaches out and pinches the linen, leans back
   and drags it, and backs out of the frame with it; out of sight, he yanks it
   the rest of the way off the page. He never goes far from the edge.

   Everything is a smooth function of time, so it plays (and scrubs) without a
   hitch: his hips follow eased paths and his lean and head follow monotone
   curves through their keys, so nothing stops at a key. His steps are worked
   out from the distance each walk covers (a whole number of them, evenly
   spaced, ending with both feet down), each foot lifting and rolling as it
   swings; his hips ride as high as both legs allow, so they bob as he walks.
   Each limb is two-bone IK (knees bend forward, elbows back). His trouser legs
   are drawn as thin strips laid along hip, knee and ankle, so they bend at the
   knee like cloth; arms, hands, shoes, torso and head are rigid. An arm blends
   from swinging to reaching along an arc round the shoulder, and hands and
   faces cross-fade from one to the next. The near hand's grip is where the
   cloth is held.

   Like drape.ts, which drives him, this is sent to the page as source: all it
   needs is inside the function. */

type Pt = [number, number];
type Part = { x: number; y: number; w: number; h: number; joints: Record<string, readonly number[]> };

export type ActorConfig = { src: string; parts: Record<string, Part> };

export type Actor = {
  /** resolves once his pieces have loaded (rejects if they can't) */
  ready: Promise<void>;
  /** pose him t s into his scene, on a W × H screen: where his hand holds the cloth (if it does yet), and whether he has gone */
  at(t: number, W: number, H: number): { hold: Pt | null; gone: boolean };
  /** draw him as last posed (on a context scaled to CSS px) */
  draw(ctx: CanvasRenderingContext2D): void;
};

export function actor(A: ActorConfig): Actor {
  const P = A.parts;
  const img = new Image();
  img.src = A.src;
  const ready = img.decode();

  const J = (part: string, joint: string): Pt => [P[part].joints[joint][0], P[part].joints[joint][1]];
  const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
  const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const len = (v: Pt) => Math.hypot(v[0], v[1]);
  const rot = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  const ang = (v: Pt) => Math.atan2(v[1], v[0]);
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  // smootherstep: eases in and out with no jolt at either end
  const smooth = (a: number, b: number, t: number) => {
    const u = clamp((t - a) / (b - a), 0, 1);
    return u * u * u * (u * (u * 6 - 15) + 10);
  };
  // a monotone cubic through keys [t, v]: smooth, never overshooting, at rest at both ends
  function curve(ks: number[][]) {
    const n = ks.length, xs = ks.map((k) => k[0]), ys = ks.map((k) => k[1]);
    const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
    const m = ys.map((_, i) => {
      if (i === 0 || i === n - 1 || d[i - 1] * d[i] <= 0) return 0;
      const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i];
      return (3 * (h0 + h1)) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]);
    });
    return (t: number) => {
      if (t <= xs[0]) return ys[0];
      if (t >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (t > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
    };
  }

  // ── how he's built (body px, as the pieces are cut) ──
  const LEG_STRETCH = 1.42; // the sheet's trouser pieces are short for him
  const UPPER_STRETCH = 1.12;
  const thighLen = (J("legNear", "knee")[1] - J("legNear", "hip")[1]) * LEG_STRETCH;
  const shinLen = (J("legNear", "ankle")[1] - J("legNear", "knee")[1]) * LEG_STRETCH;
  const ankleH = J("shoeNear", "sole")[1] - J("shoeNear", "ankle")[1];
  const upperLen = len(sub(J("upperNear", "elbow"), J("upperNear", "shoulder"))) * UPPER_STRETCH;
  const foreLen = len(sub(J("foreNear", "wrist"), J("foreNear", "elbow")));
  const waistUp = sub(J("hips", "waist"), J("hips", "hip")); // the hips' waist, from the hip joint
  const toNeck = sub(J("torso", "neck"), J("torso", "waist"));
  const toShoulder = sub(J("torso", "shoulder"), J("torso", "waist"));
  const legMost = (thighLen + shinLen) * 0.985;
  const hipHeight = legMost + ankleH;
  const HEIGHT = hipHeight - waistUp[1] - toNeck[1] + J("headCalm", "neck")[1];

  // ── two-bone IK: where the middle joint goes (bend +1: clockwise of the reach, on a y-down screen) ──
  function ik(a: Pt, t: Pt, l1: number, l2: number, bend: number): [Pt, Pt] {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy);
    const most = (l1 + l2) * 0.999;
    if (d > most) {
      dx *= most / d;
      dy *= most / d;
      d = most;
    }
    const k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * Math.max(d, 1e-6)), -1, 1));
    const a1 = Math.atan2(dy, dx) + bend * k;
    return [[a[0] + Math.cos(a1) * l1, a[1] + Math.sin(a1) * l1], [a[0] + dx, a[1] + dy]];
  }

  // ── his scene: when things happen (s) ──
  const T = {
    walkIn: 0.85, // a few steps in from the edge, slowing to a stop
    reach: [0.6, 1.0], // the near arm swings up to the cloth, pinching it at the end
    grip: 1.1, // the pinch closes to a fist
    other: [1.02, 1.28], // the far hand comes in beside it
    pull: [1.08, 1.45], // he leans back and his hips go back
    walkOut: [1.5, 2.35], // he backs out of the frame, faster and faster
  };
  const H = HEIGHT;
  const lean = curve([
    [0, 0.08],
    [0.7, 0.1],
    [0.9, 0.17],
    [1.05, 0.08],
    [1.4, -0.3],
    [1.65, -0.26],
    [2.35, -0.17],
  ]);
  const tilt = curve([
    [0, 0.03],
    [0.75, 0.07],
    [1.0, 0.0],
    [1.3, -0.12],
    [1.7, -0.06],
    [2.05, 0.06],
  ]);
  const lower = (t: number) => 0.035 * H * (smooth(1.08, 1.4, t) - smooth(1.7, 2.1, t));
  const faces: [string, number][] = [
    ["headCalm", 0],
    ["headStrain", 1.04],
    ["headPleased", 1.8],
  ];
  const FADE = 0.07; // s a hand or face takes to change into the next

  type Walk = { t0: number; t1: number; x0: number; x1: number; dir: number; n: number; s: number; move: (u: number) => number };
  type Plan = { xs: number; xb: number; walkIn: Walk; walkOut: Walk; out: { x: number; v: number } };
  let plan: Plan | null = null, planFor = "";

  // the walks, for a W-unit-wide screen
  function planFor_(Wu: number): Plan {
    const xs = clamp(0.13 * Wu, 0.2 * H, 0.3 * Wu); // where he stops: near the edge
    const xb = xs - 0.09 * H; // where the pull takes his hips
    const walk = (t0: number, t1: number, x0: number, x1: number, stride: number, move: (u: number) => number): Walk => {
      const d = Math.abs(x1 - x0), n = Math.max(2, Math.round(d / stride));
      return { t0, t1, x0, x1, dir: Math.sign(x1 - x0), n, s: d / n, move };
    };
    // in: entering at a walk, slowing to a stop; out: from a standstill, faster and faster
    const walkIn = walk(0, T.walkIn, -0.5 * H, xs, 0.25 * H, (u) => 1 - (1 - u) * (1 - u));
    const walkOut = walk(T.walkOut[0], T.walkOut[1], xb, -0.62 * H, 0.22 * H, (u) => Math.pow(u, 1.6));
    const v = ((walkOut.x1 - walkOut.x0) * 1.6) / (walkOut.t1 - walkOut.t0);
    return { xs, xb, walkIn, walkOut, out: { x: walkOut.x1, v } };
  }

  // where his hips are at t
  function hipX(t: number, p: Plan) {
    const { walkIn: a, walkOut: c } = p;
    if (t <= a.t1) return lerp(a.x0, a.x1, a.move(clamp(t / a.t1, 0, 1)));
    if (t <= c.t0) return lerp(p.xs, p.xb, smooth(T.pull[0], T.pull[1], t));
    if (t <= c.t1) return lerp(c.x0, c.x1, c.move((t - c.t0) / (c.t1 - c.t0)));
    // out of sight: yanked off with the cloth
    const u = t - c.t1;
    return p.out.x + p.out.v * u - 2.2 * H * u * u * 2;
  }

  /* The feet during a walk: the trailing foot steps first; step i lands half a
     stride past where the hips will be when it lands, so the last two leave him
     standing between them, a stride apart. Each foot swings in the later part
     of its step (both feet are down for the first part; on the first step of a
     walk, from a standstill, it goes at once) and lifts on a sine. */
  type Foot = { x: number; lift: number; u: number; swinging: boolean; dir: number };
  function walkFeet(w: Walk, x: number, start: [number, number], lift: number): [Foot, Foot] {
    const phase = clamp(Math.abs(x - w.x0) / w.s, 0, w.n);
    const pos = [start[0], start[1]];
    const out: Foot[] = [0, 1].map(() => ({ x: 0, lift: 0, u: 0, swinging: false, dir: w.dir }));
    // which of the two trails at the start (relative to the way he walks): it moves first
    const first = (start[0] - start[1]) * w.dir < 0 ? 0 : 1;
    const DS = 0.15; // the part of each step with both feet down
    for (let i = 1; i <= w.n; i++) {
      const f = (i % 2 === 1) === (first === 0) ? 0 : 1;
      const to = w.x0 + w.dir * (i * w.s + w.s / 2);
      if (phase >= i) {
        pos[f] = to;
        continue;
      }
      if (phase > i - 1) {
        const ds = i === 1 ? 0 : DS;
        const u = clamp((phase - (i - 1) - ds) / (1 - ds), 0, 1);
        const e = smooth(0, 1, u);
        out[f] = { x: lerp(pos[f], to, e), lift: Math.sin(Math.PI * u) * lift, u, swinging: u > 0 && u < 1, dir: w.dir };
        out[1 - f] = { x: pos[1 - f], lift: 0, u: 0, swinging: false, dir: w.dir };
        return out as [Foot, Foot];
      }
    }
    return [0, 1].map((f) => ({ x: pos[f], lift: 0, u: 0, swinging: false, dir: w.dir })) as [Foot, Foot];
  }
  // both feet at t: [near, far]
  function feetAt(t: number, p: Plan): [Foot, Foot] {
    const a = p.walkIn, c = p.walkOut;
    // he comes in with the far foot behind, the near one ahead
    const startIn: [number, number] = [a.x0 + a.s / 2, a.x0 - a.s / 2];
    if (t <= a.t1) return walkFeet(a, hipX(t, p), startIn, 0.05 * H);
    const stood = walkFeet(a, a.x1, startIn, 0);
    const at: [number, number] = [stood[0].x, stood[1].x];
    if (t <= c.t0) return [{ ...stood[0] }, { ...stood[1] }];
    if (t <= c.t1) return walkFeet(c, hipX(t, p), at, 0.03 * H);
    const x = hipX(t, p);
    return [0, 1].map(() => ({ x, lift: 0, u: 0, swinging: false, dir: -1 })) as [Foot, Foot];
  }

  // the hips' and torso's joints in the world, for hips at (px, py) leaning by l
  const pelvisOf = (l: number) => l * 0.35;
  function frame(px: number, py: number, l: number) {
    const hip: Pt = [px, py];
    const waist = add(hip, rot(waistUp, pelvisOf(l)));
    const neck = add(waist, rot(toNeck, l));
    const shoulder = add(waist, rot(toShoulder, l));
    return { hip, hipFar: add(hip, rot([7, -4], pelvisOf(l))), waist, neck, shoulder, shoulderFar: add(shoulder, rot([10, -6], l)) };
  }

  // ── arms and hands ──
  type Grip = "relaxed" | "reach" | "pinch" | "fist";
  const handName = (g: Grip, far: boolean) => `hand${g[0].toUpperCase()}${g.slice(1)}${far ? "Far" : ""}`;
  const gripVec = (g: Grip) => sub(J(handName(g, false), "grip"), J(handName(g, false), "wrist"));
  const FLEX: Record<Grip, number> = { relaxed: 0.08, reach: -0.28, pinch: -0.1, fist: 0.12 };
  // how far a hand's grip reaches with the arm all but straight
  const reachOf = (g: Grip) => (upperLen + foreLen) * 0.97 + len(gripVec(g));
  // a hand's shape at t, from a list of [shape, from]: the shape, the one it's fading into, and how far
  function shapeAt(list: [Grip, number][], t: number): [Grip, Grip, number] {
    let i = 0;
    while (i + 1 < list.length && t >= list[i + 1][1] - FADE / 2) i++;
    const next = list[i + 1];
    if (next && t > next[1] - FADE / 2) return [list[i][0], next[0], smooth(next[1] - FADE / 2, next[1] + FADE / 2, t)];
    if (i > 0 && t < list[i][1] + FADE / 2) return [list[i - 1][0], list[i][0], smooth(list[i][1] - FADE / 2, list[i][1] + FADE / 2, t)];
    return [list[i][0], list[i][0], 1];
  }
  const NEAR_HANDS: [Grip, number][] = [["relaxed", 0], ["reach", 0.7], ["pinch", 0.93], ["fist", T.grip]];
  const FAR_HANDS: [Grip, number][] = [["relaxed", 0], ["fist", T.other[1] - 0.06]];

  type Arm = { s: Pt; e: Pt; w: Pt; hands: [Grip, Grip, number]; angs: [number, number]; grip: Pt };
  // the arm hanging and swinging (swing -1 back … 1 forward)
  function hangTarget(s: Pt, swing: number, l: number): Pt {
    const a = Math.PI / 2 - swing * 0.42 + l * 0.4;
    const r = reachOf("relaxed") * (1 - 0.05 * Math.abs(swing));
    return [s[0] + Math.cos(a) * r, s[1] + Math.sin(a) * r];
  }
  // from one hand position to another, u of the way, swung round the shoulder as an arm lifts
  function arc(s: Pt, from: Pt, to: Pt, u: number): Pt {
    const r = lerp(len(sub(from, s)), len(sub(to, s)), u);
    const a = lerp(ang(sub(from, s)), ang(sub(to, s)), u);
    return [s[0] + Math.cos(a) * r, s[1] + Math.sin(a) * r];
  }
  // an arm whose hand's grip reaches target (the grip and wrist flex blended between two hand shapes)
  function placeArm(s: Pt, target: Pt, hands: [Grip, Grip, number]): Arm {
    const [ga, gb, m] = hands;
    const va = gripVec(ga), vb = gripVec(gb);
    const g: Pt = [lerp(va[0], vb[0], m), lerp(va[1], vb[1], m)];
    const flex = lerp(FLEX[ga], FLEX[gb], m);
    const gl = len(g);
    let e: Pt = s, w: Pt = s;
    let dir = ang(sub(target, s));
    for (let i = 0; i < 3; i++) {
      const wt = sub(target, [Math.cos(dir + flex) * gl, Math.sin(dir + flex) * gl]);
      [e, w] = ik(s, wt, upperLen, foreLen, 1);
      dir = ang(sub(w, e));
    }
    const angs: [number, number] = [dir + FLEX[ga] - ang(va), dir + FLEX[gb] - ang(vb)];
    return { s, e, w, hands, angs, grip: add(w, rot(g, dir + flex - ang(g))) };
  }

  // ── posing ──
  const pose = {
    k: 1, ground: 0, t: 0,
    px: 0, py: 0, lean: 0, tilt: 0,
    feet: [] as Foot[],
    near: null as Arm | null, far: null as Arm | null,
  };

  function at(t: number, W: number, Hs: number) {
    const k = Math.min(0.7 * Hs, 1.25 * W) / H;
    pose.k = k;
    pose.ground = Hs - Math.max(6, 0.012 * Hs);
    pose.t = t;
    const key = `${Math.round(W / k)}`;
    if (key !== planFor) {
      plan = planFor_(W / k);
      planFor = key;
    }
    const p = plan!;
    const px = hipX(t, p), l = lean(t);
    const feet = feetAt(t, p);
    pose.feet = feet;

    // the hips ride as high as both legs reach (a soft maximum, so they never jolt)
    let py = -hipHeight + lower(t);
    const fr0 = frame(px, 0, l);
    for (const [f, hip] of [[feet[0], fr0.hip], [feet[1], fr0.hipFar]] as const) {
      const dx = f.x - hip[0];
      const reachY = -ankleH - f.lift - Math.sqrt(Math.max(0, legMost * legMost - dx * dx)) - hip[1];
      const a = py, b = reachY, eps = 0.012 * H;
      py = (a + b + Math.sqrt((a - b) * (a - b) + eps * eps)) / 2;
    }
    Object.assign(pose, { px, py, lean: l, tilt: tilt(t) });
    const fr = frame(px, py, l);

    // how much he walks (the arms swing with it), from how fast his hips go
    const v = Math.abs(hipX(t + 0.02, p) - hipX(t - 0.02, p)) / 0.04;
    const walking = clamp(v / (0.9 * H), 0, 1) * (1 - smooth(T.reach[0] - 0.1, T.reach[0] + 0.15, t) * (t < T.walkOut[0] ? 1 : 0));
    const swing = clamp((feet[1].x - feet[0].x) / (0.3 * H), -1, 1) * walking;

    // the near arm: swinging, then up and round to the cloth; then holding it, at arm's length as he leans back
    const nearHands = shapeAt(NEAR_HANDS, t);
    const holdAt = add(fr.shoulder, [reachOf("fist") * Math.cos(0.12), reachOf("fist") * Math.sin(0.12)]);
    const hang = hangTarget(fr.shoulder, swing, l);
    const near = placeArm(fr.shoulder, arc(fr.shoulder, hang, holdAt, smooth(T.reach[0], T.reach[1], t)), nearHands);
    // the far arm: swinging against the near one, then in beside the near hand
    const farHands = shapeAt(FAR_HANDS, t);
    const farHang = hangTarget(fr.shoulderFar, -swing, l);
    const beside = add(near.grip, [-0.045 * H, 0.025 * H]);
    const far = placeArm(fr.shoulderFar, arc(fr.shoulderFar, farHang, beside, smooth(T.other[0], T.other[1], t)), farHands);
    pose.near = near;
    pose.far = far;

    const held = t >= T.reach[1] - 0.02;
    return { hold: held ? ([near.grip[0] * k, pose.ground + near.grip[1] * k] as Pt) : null, gone: t > T.walkOut[1] };
  }

  // ── drawing (in body px, the ground at y 0) ──
  function blit(ctx: CanvasRenderingContext2D, name: string) {
    const p = P[name];
    ctx.drawImage(img, p.x, p.y, p.w, p.h, 0, 0, p.w, p.h);
  }
  // a rigid piece with joint a at wa, turned by angle
  function rigid(ctx: CanvasRenderingContext2D, name: string, a: string, wa: Pt, angle: number, alpha = 1) {
    if (alpha <= 0.002) return;
    const ja = J(name, a);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(wa[0], wa[1]);
    ctx.rotate(angle);
    ctx.translate(-ja[0], -ja[1]);
    blit(ctx, name);
    ctx.restore();
  }
  // a piece laid from joint a at wa to joint b at wb, stretched along its length to fit
  function bone(ctx: CanvasRenderingContext2D, name: string, a: string, wa: Pt, b: string, wb: Pt) {
    const ja = J(name, a), jb = J(name, b);
    const local = ang(sub(jb, ja)), world = ang(sub(wb, wa));
    ctx.save();
    ctx.translate(wa[0], wa[1]);
    ctx.rotate(world);
    ctx.scale(len(sub(wb, wa)) / Math.max(1e-6, len(sub(jb, ja))), 1);
    ctx.rotate(-local);
    ctx.translate(-ja[0], -ja[1]);
    blit(ctx, name);
    ctx.restore();
  }
  /* A trouser leg, as thin strips laid along hip, knee and ankle: each row of
     the piece goes to its place along the bones, the direction turning
     smoothly through the knee, so it bends like cloth. */
  function legStrip(ctx: CanvasRenderingContext2D, name: string, hip: Pt, knee: Pt, ankle: Pt) {
    const p = P[name], cx = J(name, "hip")[0];
    const vh = J(name, "hip")[1], vk = J(name, "knee")[1], va = J(name, "ankle")[1];
    const a1 = ang(sub(knee, hip)), a2 = ang(sub(ankle, knee));
    const s1 = len(sub(knee, hip)) / (vk - vh), s2 = len(sub(ankle, knee)) / (va - vk);
    const B = 34; // rows either side of the knee over which it turns
    const place = (v: number): [Pt, number, number] => {
      if (v <= vk - B) return [add(hip, [Math.cos(a1) * (v - vh) * s1, Math.sin(a1) * (v - vh) * s1]), a1, s1];
      if (v >= vk + B) return [add(knee, [Math.cos(a2) * (v - vk) * s2, Math.sin(a2) * (v - vk) * s2]), a2, s2];
      // through the knee: a quadratic curve from B rows above it to B rows below, with the knee as its control
      const q0 = add(knee, [-Math.cos(a1) * B * s1, -Math.sin(a1) * B * s1]), q2 = add(knee, [Math.cos(a2) * B * s2, Math.sin(a2) * B * s2]);
      const u = (v - (vk - B)) / (2 * B), m = 1 - u;
      const pt: Pt = [m * m * q0[0] + 2 * m * u * knee[0] + u * u * q2[0], m * m * q0[1] + 2 * m * u * knee[1] + u * u * q2[1]];
      const tan: Pt = [2 * m * (knee[0] - q0[0]) + 2 * u * (q2[0] - knee[0]), 2 * m * (knee[1] - q0[1]) + 2 * u * (q2[1] - knee[1])];
      return [pt, ang(tan), s1 + (s2 - s1) * u];
    };
    const ROWS = 5;
    const half = p.w / 2;
    for (let v0 = 0; v0 < p.h; v0 += ROWS) {
      const vc = v0 + ROWS / 2;
      const [pt, a, s] = place(vc);
      let turn = Math.abs(place(vc + ROWS)[1] - a);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      const h = Math.min(ROWS + 1.5 + half * turn, p.h - v0); // enough overlap to cover the outside of a bend
      ctx.save();
      ctx.translate(pt[0], pt[1]);
      ctx.rotate(a - Math.PI / 2);
      ctx.scale(1, s);
      ctx.drawImage(img, p.x, p.y + v0, p.w, h, -cx, -ROWS / 2, p.w, h);
      ctx.restore();
    }
  }

  function leg(ctx: CanvasRenderingContext2D, f: Foot, far: boolean, hip: Pt) {
    // the foot rolls off its toe, swings, and lands on its heel (stepping back, only a little)
    const u = f.u;
    const roll = f.swinging ? (f.dir > 0 ? 1 : 0.4) * (u < 0.5 ? 0.3 * Math.sin(Math.PI * u * 2) : -0.22 * Math.sin(Math.PI * (u - 0.5) * 2)) : 0;
    const ankle: Pt = [f.x, -ankleH - f.lift];
    const [knee, end] = ik(hip, ankle, thighLen, shinLen, -1);
    const S = far ? "Far" : "Near";
    rigid(ctx, `shoe${S}`, "ankle", end, roll);
    legStrip(ctx, `leg${S}`, hip, knee, end);
  }

  function arm(ctx: CanvasRenderingContext2D, a: Arm, far: boolean) {
    const S = far ? "Far" : "Near";
    bone(ctx, `fore${S}`, "elbow", a.e, "wrist", a.w);
    const [ga, gb, m] = a.hands;
    if (ga === gb) rigid(ctx, handName(ga, far), "wrist", a.w, a.angs[0]);
    else {
      rigid(ctx, handName(ga, far), "wrist", a.w, a.angs[0], 1 - m * m);
      rigid(ctx, handName(gb, far), "wrist", a.w, a.angs[1], 1 - (1 - m) * (1 - m));
    }
    bone(ctx, `upper${S}`, "shoulder", a.s, "elbow", a.e);
  }

  function draw(ctx: CanvasRenderingContext2D) {
    if (!pose.near || !pose.far) return;
    const k = pose.k;
    ctx.save();
    ctx.translate(0, pose.ground);
    ctx.scale(k, k);
    // his shadow on the floor
    const cx = (pose.feet[0].x + pose.feet[1].x) / 2, r = 0.2 * H;
    const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, r);
    g.addColorStop(0, "rgba(30, 4, 10, 0.34)");
    g.addColorStop(1, "rgba(30, 4, 10, 0)");
    ctx.save();
    ctx.scale(1, 0.14);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const fr = frame(pose.px, pose.py, pose.lean);
    arm(ctx, pose.far, true);
    leg(ctx, pose.feet[1], true, fr.hipFar);
    leg(ctx, pose.feet[0], false, fr.hip);
    rigid(ctx, "hips", "hip", fr.hip, pelvisOf(pose.lean));
    // the face: one, or two cross-fading
    const headAng = pose.lean * 0.5 + pose.tilt;
    for (let i = 0; i < faces.length; i++) {
      const [name, from] = faces[i], next = faces[i + 1];
      const inn = i === 0 ? 1 : smooth(from - 0.06, from + 0.06, pose.t);
      const out = next ? 1 - smooth(next[1] - 0.06, next[1] + 0.06, pose.t) : 1;
      const a = Math.min(inn, out);
      // (the incoming face goes under the outgoing one at full strength, so nothing shows through)
      if (a > 0.002) rigid(ctx, name, "neck", fr.neck, headAng, next && out < 1 ? 1 : a);
    }
    rigid(ctx, "torso", "waist", fr.waist, pose.lean);
    arm(ctx, pose.near, false);
    ctx.restore();
  }

  return { ready, at, draw };
}

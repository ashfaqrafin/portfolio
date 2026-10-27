/* Drives the intro's thread, frame by frame: a needle on the end of the thread
   writes each stroke of the quote, then lifts and flies in an arc to where the
   next one starts. Behind it the thread either runs back to the spool, swinging
   on a spring as the needle darts about, or (with no spool, on phones) streams
   out as a short tail. When the last stroke is down the needle flies off and
   the loose thread fades.

   Timed off the intro's own CSS clock, so it stays in step with the rest of the
   opening (the typing, the reply, the lift) even if the page hydrates late. */

type Pt = { x: number; y: number };
type Seg =
  | { kind: "fly"; from: Pt; to: Pt; lift: number; t0: number; t1: number }
  | { kind: "draw"; i: number; len: number; t0: number; t1: number };

export interface WriterParts {
  /** the strokes' geometry, in writing order */
  strokes: SVGPathElement[];
  /** the mask paths that reveal the written thread (pathLength 1) */
  masks: SVGPathElement[];
  /** the loose thread, from the spool (or the tail) to the needle */
  live: SVGPathElement;
  needle: SVGGElement;
  /** where the thread comes off the spool, or null to trail a tail instead */
  spool: Pt | null;
  /** seconds since the intro began */
  clock: () => number;
  /** when the needle sets off, and how long the writing takes, in s */
  at: number;
  span: number;
}

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeSine = (k: number) => -(Math.cos(Math.PI * k) - 1) / 2;
const EXIT = 0.35; // s, the needle flying off at the end

export function startWriting(p: WriterParts): () => void {
  const lens = p.strokes.map((s) => s.getTotalLength());
  const startOf = (i: number) => p.strokes[i].getPointAtLength(0);
  const endOf = (i: number) => p.strokes[i].getPointAtLength(lens[i]);

  // the plan, in natural time: drawing at a steady hand's pace, flights by distance
  const plan: Seg[] = [];
  let t = 0;
  let pen: Pt = p.spool ?? { x: startOf(0).x - 160, y: startOf(0).y - 60 };
  lens.forEach((len, i) => {
    const s = startOf(i);
    const d = Math.hypot(s.x - pen.x, s.y - pen.y);
    if (d > 3) {
      const dur = 0.035 + d / 2400;
      plan.push({ kind: "fly", from: pen, to: { x: s.x, y: s.y }, lift: Math.min(90, 14 + d * 0.3), t0: t, t1: t + dur });
      t += dur;
    }
    const dur = 0.02 + len / 1500;
    plan.push({ kind: "draw", i, len, t0: t, t1: t + dur });
    t += dur;
    const e = endOf(i);
    pen = { x: e.x, y: e.y };
  });
  // fitted to the time the opening gives the writing
  const k = p.span / t;
  for (const s of plan) {
    s.t0 = p.at + s.t0 * k;
    s.t1 = p.at + s.t1 * k;
  }
  const done = p.at + p.span;
  const off: Pt = { x: pen.x + 260, y: pen.y - 220 };

  let idx = 0;
  let raf = 0;
  const first = plan[0];
  let tip: Pt = first.kind === "fly" ? first.from : { x: startOf(0).x, y: startOf(0).y };
  let ang = 0;
  // the thread's middle, on a spring, so the loose thread swings
  let mid: Pt = { ...tip };
  let vel: Pt = { x: 0, y: 0 };
  const tail: Pt[] = [];

  const finish = (i: number) => {
    p.masks[i].style.strokeDashoffset = "0";
  };

  const frame = () => {
    const now = p.clock();
    raf = requestAnimationFrame(frame);
    if (now < p.at) return;

    // everything that should be down by now is down
    while (idx < plan.length && plan[idx].t1 <= now) {
      const s = plan[idx];
      if (s.kind === "draw") finish(s.i);
      idx++;
    }

    let next: Pt;
    if (idx < plan.length) {
      const s = plan[idx];
      const u = Math.min(1, Math.max(0, (now - s.t0) / (s.t1 - s.t0)));
      if (s.kind === "draw") {
        const e = s.len > 30 ? easeSine(u) : u;
        p.masks[s.i].style.strokeDashoffset = String(1 - e);
        const q = p.strokes[s.i].getPointAtLength(e * lens[s.i]);
        next = { x: q.x, y: q.y };
      } else {
        // an arc up off the paper and down onto the next stroke
        const e = ease(u);
        const cx = (s.from.x + s.to.x) / 2;
        const cy = Math.min(s.from.y, s.to.y) - s.lift;
        next = {
          x: (1 - e) ** 2 * s.from.x + 2 * (1 - e) * e * cx + e * e * s.to.x,
          y: (1 - e) ** 2 * s.from.y + 2 * (1 - e) * e * cy + e * e * s.to.y,
        };
      }
    } else {
      // written: the needle flies off and the thread falls away
      const u = Math.min(1, (now - done) / EXIT);
      const e = ease(u);
      next = { x: pen.x + (off.x - pen.x) * e, y: pen.y + (off.y - pen.y) * e };
      const fade = String(1 - e);
      p.needle.style.opacity = fade;
      p.live.style.opacity = fade;
      if (u >= 1) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    // the needle points the way it's going
    const dx = next.x - tip.x;
    const dy = next.y - tip.y;
    if (Math.hypot(dx, dy) > 0.4) {
      const want = Math.atan2(dy, dx);
      let d = want - ang;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      ang += d * 0.35;
    }
    tip = next;
    // shown from the first frame it moves (hidden by intro.css until then)
    p.needle.style.opacity ||= "1";
    p.live.style.opacity ||= "1";
    p.needle.setAttribute("transform", `translate(${tip.x.toFixed(1)} ${tip.y.toFixed(1)}) rotate(${((ang * 180) / Math.PI).toFixed(1)})`);

    if (p.spool) {
      // from the spool to the needle, sagging, its middle lagging on a spring
      const s = p.spool;
      const span = Math.hypot(tip.x - s.x, tip.y - s.y);
      const want = { x: (s.x + tip.x) / 2, y: (s.y + tip.y) / 2 + 30 + span * 0.06 };
      vel = { x: (vel.x + (want.x - mid.x) * 0.16) * 0.78, y: (vel.y + (want.y - mid.y) * 0.16) * 0.78 };
      mid = { x: mid.x + vel.x, y: mid.y + vel.y };
      const c = { x: 2 * mid.x - (s.x + tip.x) / 2, y: 2 * mid.y - (s.y + tip.y) / 2 };
      p.live.setAttribute("d", `M${s.x.toFixed(1)} ${s.y.toFixed(1)}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`);
    } else {
      // a short tail streaming out behind the needle
      tail.unshift({ ...tip });
      if (tail.length > 9) tail.pop();
      p.live.setAttribute("d", "M" + tail.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("L"));
    }
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    // stopped early (skipped): leave everything written
    for (const s of plan) if (s.kind === "draw") finish(s.i);
  };
}

/* The red that runs out of the rag (WorldDoor.tsx), and the world view
   coming up out of it.

   spreadRed: opening the door, the rag's dye blooms out across the page from
   the cloth the way the intro's drop of burgundy watercolour does
   (crossroads.ts): an edge never quite round, deeper at its rim, with grains of
   pigment settling just inside it, and a few droplets thrown off ahead that it
   swallows as it comes. Only this one is opaque, and doesn't stop: it soaks
   out of the cloth, gathers pace and runs right out past the corners, until
   the window is red. Then the world view loads under it.

   clearRed: there, the page opens still red (film.css, from the first paint),
   and clear water lands in the middle of it: the red is pushed back from it
   in a bloom, the pigment piling up dark at the bloom's ragged rim as it
   does when water runs into a wet wash, and the title comes up on the bare
   paper behind it.

   Both are drawn on a canvas over the page and under the paper's tooth, so
   the red has the paper's grain. */

const RED = "#c8102e"; // --flag
const RIM = "120, 6, 26";
const TAU = Math.PI * 2;
/** ms from the rag to the corners */
const SPREAD = 950;
/** ms for the water to clear the red off the world view's page */
const CLEAR = 1000;

/** a canvas over the whole window, under the paper's tooth */
function sheet() {
  const cv = document.createElement("canvas");
  cv.className = "door-bloom";
  cv.setAttribute("aria-hidden", "true");
  // its own styles: it's drawn on pages that don't load site.css (the world view's)
  cv.style.cssText = "position:fixed;inset:0;z-index:59;width:100%;height:100%;display:block";
  document.body.appendChild(cv);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  const ctx = cv.getContext("2d");
  ctx?.scale(dpr, dpr);
  return { cv, ctx, W, H };
}

/** how far from (cx, cy) the window's furthest corner is */
const farCorner = (cx: number, cy: number, W: number, H: number) =>
  Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));

/** a bloom's edge, never quite round: at angle a, for a bloom of radius r, t seconds in, it creeps along the paper's grain */
function edgeOf(seed: number) {
  return (a: number, r: number, t: number) =>
    r *
    (1 +
      0.06 * Math.sin(3 * a + 1.3 + seed + t * 0.9) +
      0.04 * Math.sin(7 * a + 4.1 - t * 1.3) +
      0.022 * Math.sin(13 * a + 0.4 + seed * 2) +
      0.012 * Math.sin(23 * a + t * 2.4));
}

function tracePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, at: (a: number) => number) {
  ctx.beginPath();
  for (let k = 0; k <= 128; k++) {
    const a = (k / 128) * TAU;
    const e = at(a);
    if (k) ctx.lineTo(cx + Math.cos(a) * e, cy + Math.sin(a) * e);
    else ctx.moveTo(cx + Math.cos(a) * e, cy + Math.sin(a) * e);
  }
  ctx.closePath();
}

export function spreadRed(from: DOMRect, onCovered: () => void): () => void {
  const { cv, ctx, W, H } = sheet();
  if (!ctx) {
    onCovered();
    return () => cv.remove();
  }

  const cx = from.left + from.width * 0.55;
  const cy = from.top + from.height * 0.5;
  const far = farCorner(cx, cy, W, H);
  const r0 = Math.max(10, Math.min(from.width, from.height) * 0.42);
  // far enough that even the edge's deepest bay has cleared the corners
  const r1 = far * 1.22;
  const seed = Math.random() * TAU;
  const edge = edgeOf(seed);
  // droplets thrown off as the dye first runs, a little way out ahead of the bloom
  const drops = Array.from({ length: 11 }, (_, k) => {
    const a = (k * 2.39996 + seed) % TAU;
    return { a, d: r0 * 1.9 + Math.min(220, far * 0.2) * ((k * 0.618) % 1), s: 1.6 + (k % 4) * 1.2, st: 1 + (k % 3) * 0.35 };
  });

  let raf = 0;
  let t0 = -1;
  const draw = (r: number, t: number, u: number) => {
    ctx.clearRect(0, 0, W, H);
    // the droplets, until the bloom reaches them
    ctx.fillStyle = RED;
    for (const d of drops) {
      if (edge(d.a, r, t) > d.d - d.s) continue;
      const appear = Math.min(1, u * 9);
      ctx.save();
      ctx.translate(cx + Math.cos(d.a) * d.d, cy + Math.sin(d.a) * d.d);
      ctx.rotate(d.a);
      ctx.scale(d.st, 1 / d.st);
      ctx.beginPath();
      ctx.arc(0, 0, d.s * appear, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // the bloom
    tracePath(ctx, cx, cy, (a) => edge(a, r, t));
    ctx.fillStyle = RED;
    ctx.fill();
    // a little paler where it's wettest, deeper towards the rim, as a wash is
    const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.08);
    wash.addColorStop(0, "rgba(255, 92, 104, 0.12)");
    wash.addColorStop(0.7, "rgba(255, 92, 104, 0)");
    wash.addColorStop(1, `rgba(${RIM}, 0.16)`);
    ctx.fillStyle = wash;
    ctx.fill();
    // the rim, where the pigment gathers: a soft band, and a fine dark line
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${RIM}, 0.2)`;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = `rgba(${RIM}, 0.55)`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // grains of pigment settling just inside it
    ctx.fillStyle = `rgba(${RIM}, 0.4)`;
    for (let k = 0; k < 220; k++) {
      const a = (k * 2.39996) % TAU;
      const d = edge(a, r, t) * (0.93 + 0.065 * ((k * 0.618) % 1));
      const z = 1 + (k % 3) * 0.7;
      ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z, z);
    }
  };

  const frame = (now: number) => {
    if (t0 < 0) t0 = now;
    const u = Math.min(1, (now - t0) / SPREAD);
    // soaks out of the cloth, gathers pace, then runs out past the corners
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    draw(r0 + (r1 - r0) * e, (now - t0) / 1000, u);
    if (u < 1) {
      raf = requestAnimationFrame(frame);
      return;
    }
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, H);
    onCovered();
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    cv.remove();
  };
}

/** Clears the red off the world view's page, if it was reached through the
   door (data-door="in", set by layout.tsx before the first paint, while
   film.css keeps the page red). From the middle of the title, a bloom of
   clear water pushes the dye back, its pigment gathering dark at the ragged
   rim, out past the corners; data-door="clearing" brings the title up behind it. */
export function clearRed(): (() => void) | undefined {
  const html = document.documentElement;
  if (html.dataset.door !== "in") return;
  const { cv, ctx, W, H } = sheet();
  const title = document.querySelector(".film-title h1")?.getBoundingClientRect();
  const cx = title ? title.left + title.width / 2 : W / 2;
  const cy = title ? title.top + title.height / 2 : H * 0.46;
  const far = farCorner(cx, cy, W, H);
  const edge = edgeOf(Math.random() * TAU);
  let raf = 0;
  let t0 = -1;
  const finish = () => {
    cancelAnimationFrame(raf);
    cv.remove();
    html.dataset.door = "done";
  };
  if (!ctx) {
    finish();
    return;
  }
  const draw = (r: number, t: number) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, H);
    if (r <= 0) return;
    // the pigment pushed out ahead of the water: a deeper band just outside its edge
    tracePath(ctx, cx, cy, (a) => edge(a, r, t) + 9);
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${RIM}, 0.32)`;
    ctx.lineWidth = 22;
    ctx.stroke();
    // the water: the paper, bare
    ctx.globalCompositeOperation = "destination-out";
    tracePath(ctx, cx, cy, (a) => edge(a, r, t));
    ctx.fillStyle = "#000";
    ctx.fill();
    // and the hard, dark line the pigment dries to at the rim
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${RIM}, 0.6)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `rgba(${RIM}, 0.45)`;
    for (let k = 0; k < 260; k++) {
      const a = (k * 2.39996) % TAU;
      const d = edge(a, r, t) * (1.01 + 0.05 * ((k * 0.618) % 1)) + 2;
      const z = 1 + (k % 3) * 0.7;
      ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z, z);
    }
  };
  draw(0, 0);
  html.dataset.door = "clearing";
  const frame = (now: number) => {
    if (t0 < 0) t0 = now;
    const u = Math.min(1, (now - t0) / CLEAR);
    // the water runs out fast where it lands, and slows as it spreads
    const e = 1 - Math.pow(1 - u, 2.6);
    draw(far * 1.25 * e, (now - t0) / 1000);
    if (u < 1) raf = requestAnimationFrame(frame);
    else finish();
  };
  raf = requestAnimationFrame(frame);
  return finish;
}

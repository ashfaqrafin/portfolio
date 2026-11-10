import { cell, makeMesh, waveFlag, type Mesh, type Wave } from "./wave";

/* The flag that can be torn. Whole, it is exactly the flag of wave.ts.
   A stroke across it cuts the links it crosses: the cells on a cut link
   aren't drawn, so it opens along the cut; points near the cut, and any
   part cut right off, leave the wave's shape and move as cloth does (points
   and links, the wind, their own weight), held by the cut links as by slack
   threads. Mending draws every cut link back in from the length it has to
   its length at rest, and hands the points back to the wave; the thread is
   drawn across where it was cut. */

type Link = { a: number; b: number; horiz: boolean; span: number; structural: boolean; broken: boolean; from: number };
export type Scar = { a: number; b: number; order: number };

export class Cloth {
  readonly nx: number;
  readonly ny: number;
  /** what is drawn */
  readonly mesh: Mesh;
  /** the wave's shape this frame */
  private wave: Mesh;
  private px: Float32Array;
  private py: Float32Array;
  /** how firmly each point is held to the wave (1 whole, 0 loose) */
  private hold: Float32Array;
  private links: Link[] = [];
  private hIdx: Int32Array;
  private vIdx: Int32Array;
  private live = false;
  private mending = -1;
  private acc = 0;
  private dl = 1;
  private dh = 1;
  scars: Scar[] = [];

  constructor(nx: number, ny: number) {
    this.nx = nx;
    this.ny = ny;
    this.mesh = makeMesh(nx, ny);
    this.wave = makeMesh(nx, ny);
    const n = nx * ny;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.hold = new Float32Array(n).fill(1);
    this.hIdx = new Int32Array((nx - 1) * ny);
    this.vIdx = new Int32Array(nx * (ny - 1));
    const link = (a: number, b: number, horiz: boolean, span: number, structural: boolean) => this.links.push({ a, b, horiz, span, structural, broken: false, from: -1 }) - 1;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 1; i++) this.hIdx[j * (nx - 1) + i] = link(j * nx + i, j * nx + i + 1, true, 1, true);
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx; i++) this.vIdx[j * nx + i] = link(j * nx + i, (j + 1) * nx + i, false, 1, true);
    // two apart, for a little body
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx - 2; i++) link(j * nx + i, j * nx + i + 2, true, 2, false);
    for (let j = 0; j < ny - 2; j++) for (let i = 0; i < nx; i++) link(j * nx + i, (j + 2) * nx + i, false, 2, false);
  }

  get torn() {
    return this.links.some((l) => l.broken);
  }

  /** this frame's flag: the wave, and the cloth where it's torn */
  update(o: Wave, dt: number) {
    const { mesh, wave } = this;
    waveFlag(wave, o);
    this.dl = (o.len * Math.max(0.05, Math.min(1, o.open ?? 1))) / (this.nx - 1);
    this.dh = o.height / (this.ny - 1);
    mesh.shade.set(wave.shade);
    if (!this.live) {
      mesh.pos.set(wave.pos);
      return;
    }
    this.acc = Math.min(this.acc + dt, 3 / 60);
    const h = 1 / 60;
    let time = o.time;
    while (this.acc >= h) {
      this.acc -= h;
      this.tick(o, (time += h));
    }
    // a squeezed cell is in a fold
    const { nx, ny, pos } = mesh;
    for (let j = 0; j < ny; j++)
      for (let i = 1; i < nx; i++) {
        const k = j * nx + i;
        const d = Math.hypot(pos[k * 2] - pos[k * 2 - 2], pos[k * 2 + 1] - pos[k * 2 - 1]);
        const sq = 1 - Math.min(1, d / this.dl);
        if (sq > 0.3) mesh.shade[k] *= 1 - 0.5 * (sq - 0.3);
      }
  }

  private tick(o: Wave, time: number) {
    const { nx, ny, hold, px, py } = this;
    const pos = this.mesh.pos, target = this.wave.pos;
    const L = o.len;
    const wind = o.wind ?? 1;
    const m = this.mending >= 0 ? this.mending * this.mending * (3 - 2 * this.mending) : 0;
    const damp = this.mending >= 0 ? 0.9 : 0.972;
    const h = 1 / 60;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i, x = k * 2, y = x + 1;
        const held = i === 0 ? 1 : hold[k] + (1 - hold[k]) * m;
        if (held >= 0.999) {
          px[k] = pos[x] = target[x];
          py[k] = pos[y] = target[y];
          continue;
        }
        const s = i / (nx - 1);
        const gust = 0.75 + 0.3 * Math.sin(time * 2.3 + j * 0.3) + 0.2 * Math.sin(time * 5.7 - i * 0.4);
        const ax = o.dir * wind * L * 3.2 * gust * (0.35 + 0.65 * s) + Math.cos(time * 6.1 - i * 0.7) * L * 0.5 * s * o.dir;
        const ay = L * 0.75 + Math.sin(time * 8.4 - i * 0.85 + j * 0.22) * L * 2.2 * s;
        const vx = (pos[x] - px[k]) * damp, vy = (pos[y] - py[k]) * damp;
        px[k] = pos[x];
        py[k] = pos[y];
        pos[x] += vx + ax * h * h;
        pos[y] += vy + ay * h * h;
        // and as far as it is still held, drawn toward the wave
        const pull = held * 0.3;
        pos[x] += (target[x] - pos[x]) * pull;
        pos[y] += (target[y] - pos[y]) * pull;
      }
    for (let it = 0; it < 4; it++)
      for (const l of this.links) {
        const a = l.a, b = l.b;
        const fa = a % nx === 0 || hold[a] + (1 - hold[a]) * m >= 0.999, fb = b % nx === 0 || hold[b] + (1 - hold[b]) * m >= 0.999;
        if (fa && fb) continue;
        const dx = pos[b * 2] - pos[a * 2], dy = pos[b * 2 + 1] - pos[a * 2 + 1];
        const d = Math.hypot(dx, dy) || 1e-6;
        let rest = (l.horiz ? this.dl : this.dh) * l.span;
        if (l.broken) {
          // cut: a slack thread, pulling only once the piece strays past it
          if (d < rest * 2.6) continue;
          rest *= 2.6;
        } else if (l.from >= 0) rest = l.from + (rest - l.from) * m;
        const k = ((d - rest) / d) * (l.broken ? 0.2 : 0.5);
        if (fa) { pos[b * 2] -= dx * k * 2; pos[b * 2 + 1] -= dy * k * 2; }
        else if (fb) { pos[a * 2] += dx * k * 2; pos[a * 2 + 1] += dy * k * 2; }
        else { pos[a * 2] += dx * k; pos[a * 2 + 1] += dy * k; pos[b * 2] -= dx * k; pos[b * 2 + 1] -= dy * k; }
      }
  }

  /** break every link the stroke a→b crosses; returns how many of the weave's own broke */
  cut(ax: number, ay: number, bx: number, by: number, order: number): number {
    const pos = this.mesh.pos;
    let n = 0;
    for (const l of this.links) {
      if (l.broken) continue;
      if (!crosses(ax, ay, bx, by, pos[l.a * 2], pos[l.a * 2 + 1], pos[l.b * 2], pos[l.b * 2 + 1])) continue;
      l.broken = true;
      l.from = -1;
      if (l.structural) {
        n++;
        this.scars.push({ a: l.a, b: l.b, order });
      }
    }
    if (n) {
      if (!this.live) {
        this.live = true;
        for (let k = 0; k < this.nx * this.ny; k++) {
          this.px[k] = pos[k * 2];
          this.py[k] = pos[k * 2 + 1];
        }
      }
      this.mending = -1;
      for (const l of this.links) l.from = -1;
      this.loosen();
    }
    return n;
  }

  /* how firmly each point is held: not at all if it's cut off from the
     hoist; less, the nearer it is to a cut */
  private loosen() {
    const { nx, ny, hold } = this;
    const n = nx * ny;
    const near = new Int16Array(n).fill(99);
    const joined = new Uint8Array(n);
    const queue: number[] = [];
    for (const l of this.links)
      if (l.broken && l.structural) for (const p of [l.a, l.b]) if (near[p]) { near[p] = 0; queue.push(p); }
    const side = (p: number) => {
      const i = p % nx, j = (p - i) / nx;
      const out: [number, number][] = [];
      if (i > 0) out.push([p - 1, this.hIdx[j * (nx - 1) + i - 1]]);
      if (i < nx - 1) out.push([p + 1, this.hIdx[j * (nx - 1) + i]]);
      if (j > 0) out.push([p - nx, this.vIdx[(j - 1) * nx + i]]);
      if (j < ny - 1) out.push([p + nx, this.vIdx[j * nx + i]]);
      return out;
    };
    for (let k = 0; k < queue.length; k++) {
      const p = queue[k];
      for (const [q] of side(p)) if (near[q] > near[p] + 1) { near[q] = near[p] + 1; queue.push(q); }
    }
    const walk: number[] = [];
    for (let j = 0; j < ny; j++) { joined[j * nx] = 1; walk.push(j * nx); }
    for (let k = 0; k < walk.length; k++)
      for (const [q, li] of side(walk[k])) if (!joined[q] && !this.links[li].broken) { joined[q] = 1; walk.push(q); }
    for (let p = 0; p < n; p++) hold[p] = joined[p] ? Math.min(1, Math.max(0, (near[p] - 0.5) / 4)) : 0;
  }

  /** the cut links come back, drawn in as `m` goes 0..1 */
  mend(m: number) {
    const pos = this.mesh.pos;
    for (const l of this.links) {
      if (!l.broken) continue;
      l.broken = false;
      l.from = Math.hypot(pos[l.b * 2] - pos[l.a * 2], pos[l.b * 2 + 1] - pos[l.a * 2 + 1]);
    }
    if (m >= 1) {
      for (const l of this.links) l.from = -1;
      this.mending = -1;
      this.live = false;
      this.hold.fill(1);
    } else this.mending = Math.max(0, m);
  }

  private shown(i: number, j: number) {
    if (i < 0 || j < 0 || i >= this.nx - 1 || j >= this.ny - 1) return false;
    // a mended cell shows once it's drawn most of the way back in
    const ok = (k: number) => {
      const l = this.links[k];
      return !l.broken && (l.from < 0 || this.mending > 0.6);
    };
    return ok(this.hIdx[j * (this.nx - 1) + i]) && ok(this.hIdx[(j + 1) * (this.nx - 1) + i]) && ok(this.vIdx[j * this.nx + i]) && ok(this.vIdx[j * this.nx + i + 1]);
  }

  /** which cells are drawn (call after update, before drawing) */
  cells() {
    const m = this.mesh;
    let c = 0;
    for (let j = 0; j < this.ny - 1; j++) for (let i = 0; i < this.nx - 1; i++) if (this.shown(i, j)) c = cell(m, i, j, c);
    m.count = c;
  }

  centre() {
    const pos = this.mesh.pos;
    let x = 0, y = 0;
    for (let k = 0; k < pos.length; k += 2) { x += pos[k]; y += pos[k + 1]; }
    return { x: (x * 2) / pos.length, y: (y * 2) / pos.length };
  }

  bounds() {
    const pos = this.mesh.pos;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < pos.length; k += 2) {
      if (pos[k] < x0) x0 = pos[k];
      if (pos[k] > x1) x1 = pos[k];
      if (pos[k + 1] < y0) y0 = pos[k + 1];
      if (pos[k + 1] > y1) y1 = pos[k + 1];
    }
    return { x0, y0, x1, y1 };
  }

  /** the ink round it: every side of a drawn cell with no drawn cell beyond it */
  outline(g: CanvasRenderingContext2D, ink: string, width: number) {
    const { nx, ny } = this;
    const pos = this.mesh.pos;
    g.beginPath();
    const edge = (a: number, b: number) => {
      g.moveTo(pos[a * 2], pos[a * 2 + 1]);
      g.lineTo(pos[b * 2], pos[b * 2 + 1]);
    };
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        if (!this.shown(i, j)) continue;
        const a = j * nx + i;
        if (!this.shown(i, j - 1)) edge(a, a + 1);
        if (!this.shown(i, j + 1)) edge(a + nx, a + nx + 1);
        if (!this.shown(i - 1, j)) edge(a, a + nx);
        if (!this.shown(i + 1, j)) edge(a + 1, a + nx + 1);
      }
    g.strokeStyle = ink;
    g.lineWidth = width;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.stroke();
  }

  /** the thread: across every cut, one slack strand while it gapes, a cross-stitch once it's drawn shut */
  thread(g: CanvasRenderingContext2D, colour: string, width: number) {
    const pos = this.mesh.pos;
    g.save();
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.lineCap = "round";
    g.beginPath();
    for (const s of this.scars) {
      const ax = pos[s.a * 2], ay = pos[s.a * 2 + 1], bx = pos[s.b * 2], by = pos[s.b * 2 + 1];
      const dx = bx - ax, dy = by - ay;
      const d = Math.hypot(dx, dy) || 1;
      const rest = s.b - s.a === 1 ? this.dl : this.dh;
      if (d > rest * 1.5) {
        // a strand hanging between the two edges, sagging a little
        g.moveTo(ax, ay);
        g.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + d * 0.12, bx, by);
      } else {
        const nxn = (-dy / d) * width * 2.1, nyn = (dx / d) * width * 2.1;
        g.moveTo(ax + nxn, ay + nyn);
        g.lineTo(bx - nxn, by - nyn);
        g.moveTo(ax - nxn, ay - nyn);
        g.lineTo(bx + nxn, by + nyn);
      }
    }
    g.stroke();
    g.restore();
  }
}

/** do segments p1p2 and p3p4 cross? */
function crosses(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const s = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const t = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

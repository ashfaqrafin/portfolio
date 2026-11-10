/* A flag in the wind, worked out rather than simulated: ripples run out
   from the hoist to the fly, growing as they go; where the cloth turns
   toward or away from us it takes up less width (its length is kept, so
   the ripples bunch it), it sags under its own weight as the wind drops,
   and every point is lit by which way the cloth faces there. The result is
   a grid of points with a light value each, drawn by flaggl.ts.

   It has no memory, so it is smooth at any frame rate and the same at any
   moment the story is jumped to. The one flag that can be torn (cloth.ts)
   follows this shape wherever it is whole. */

export type Mesh = {
  nx: number;
  ny: number;
  /** x, y per point (stage pixels) */
  pos: Float32Array;
  /** depth per point (toward the viewer), for the light */
  z: Float32Array;
  /** where each point is on the flag's picture (0..1) */
  uv: Float32Array;
  /** light per point: about 1 facing us, less in a fold, more where it catches the light */
  shade: Float32Array;
  /** two per point: how much of the second picture shows (0..1), how burnt (0..1, 1 is gone) */
  aux: Float32Array;
  index: Uint16Array;
  /** how many of the indices are in use */
  count: number;
};

export function makeMesh(nx: number, ny: number): Mesh {
  const n = nx * ny;
  const uv = new Float32Array(n * 2);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      uv[(j * nx + i) * 2] = i / (nx - 1);
      uv[(j * nx + i) * 2 + 1] = j / (ny - 1);
    }
  const m: Mesh = { nx, ny, pos: new Float32Array(n * 2), z: new Float32Array(n), uv, shade: new Float32Array(n).fill(1), aux: new Float32Array(n * 2), index: new Uint16Array((nx - 1) * (ny - 1) * 6), count: 0 };
  allCells(m);
  return m;
}

/** every cell's two triangles */
export function allCells(m: Mesh) {
  let c = 0;
  for (let j = 0; j < m.ny - 1; j++) for (let i = 0; i < m.nx - 1; i++) c = cell(m, i, j, c);
  m.count = c;
}

export function cell(m: Mesh, i: number, j: number, c: number) {
  const a = j * m.nx + i, b = a + 1, d = a + m.nx, e = d + 1;
  m.index[c++] = a; m.index[c++] = b; m.index[c++] = e;
  m.index[c++] = a; m.index[c++] = e; m.index[c++] = d;
  return c;
}

export type Wave = {
  /** the top of the hoist */
  x: number;
  y: number;
  /** a unit vector down the hoist (down the pole) */
  hx: number;
  hy: number;
  /** the flag's length (hoist to fly) and height */
  len: number;
  height: number;
  /** which way it flies: 1 to the right, -1 to the left */
  dir: 1 | -1;
  time: number;
  /** so two flags don't wave in step */
  phase?: number;
  /** 0 hanging, 1 streaming */
  wind?: number;
  /** 0 furled on the pole, 1 open */
  open?: number;
  /** the way the cloth leaves the hoist (a unit vector), where it isn't simply downwind: a flag hanging from a slanted stick */
  fly?: [number, number];
};

// the light: from the upper left, in front
const LX = -0.47, LY = -0.6, LZ = 0.647;

export function waveFlag(m: Mesh, o: Wave) {
  const { nx, ny, pos, z, shade } = m;
  const wind = Math.max(0, Math.min(1.4, o.wind ?? 1));
  const open = Math.max(0.05, Math.min(1, o.open ?? 1));
  const ph = o.phase ?? 0, t = o.time;
  const calm = 1 - Math.min(1, wind);
  const L = o.len * open;
  // the angle it hangs below the horizontal, and the way it flies
  const beta = 0.06 + 1.0 * calm + 0.035 * Math.sin(0.7 * t + ph);
  const fx = o.fly ? o.fly[0] : o.dir * Math.cos(beta), fy = o.fly ? o.fly[1] : Math.sin(beta);
  const amp = (0.07 + 0.075 * Math.min(1, wind)) * (0.85 + 0.2 * Math.sin(0.9 * t + 1.7 * ph)) * (0.6 + 0.4 * open);
  const speed = 0.5 + 0.62 * wind;
  const dl = L / (nx - 1), dh = o.height / (ny - 1);
  const TAU = Math.PI * 2;
  for (let j = 0; j < ny; j++) {
    const v = j / (ny - 1);
    let x = 0, zPrev = 0;
    for (let i = 0; i < nx; i++) {
      const s = i / (nx - 1), k = j * nx + i;
      const e = Math.pow(s, 0.8);
      // (the folds run slantwise, from the top of the hoist down toward the fly's lower corner)
      const th1 = TAU * (1.15 * s - 1.1 * speed * t) + 2.5 * v + ph;
      const th2 = TAU * (2.5 * s - 1.7 * speed * t) - 1.4 * v + 2.3 * ph;
      const th3 = TAU * (4.4 * s - 2.4 * speed * t) + 3.1 * v + 0.7 * ph;
      const zz = L * amp * e * (Math.sin(th1) + 0.45 * Math.sin(th2) + 0.18 * Math.sin(th3));
      let squeeze = 0;
      if (i > 0) {
        const dz = zz - zPrev;
        const dx = Math.sqrt(Math.max(dl * dl - dz * dz, 0.06 * dl * dl));
        x += dx;
        squeeze = 1 - dx / dl;
      }
      zPrev = zz;
      z[k] = zz;
      // its own weight (more as the wind drops; the free lower corner most), and a flutter along the edges
      const sag = L * ((0.05 + 0.28 * calm) * s * s + 0.035 * s * v * (0.4 + calm)) + L * e * (0.05 * Math.sin(th1 - 0.9) + 0.022 * Math.sin(th2 + 0.6)) * (0.5 + 0.5 * Math.min(1, wind));
      pos[k * 2] = o.x + o.hx * v * o.height + fx * x;
      pos[k * 2 + 1] = o.y + o.hy * v * o.height + fy * x + sag;
      shade[k] = squeeze;
    }
  }
  // the light: which way the cloth faces at each point
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const i0 = i > 0 ? k - 1 : k, i1 = i < nx - 1 ? k + 1 : k;
      const j0 = j > 0 ? k - nx : k, j1 = j < ny - 1 ? k + nx : k;
      const dzs = (z[i1] - z[i0]) / ((i1 - i0) * dl || dl);
      const dzv = (z[j1] - z[j0]) / (((j1 - j0) / nx) * dh || dh);
      // the normal in the flag's own frame (along the fly, down the hoist, toward us), then on the stage
      const inv = 1 / Math.sqrt(dzs * dzs + dzv * dzv + 1);
      const ax = -dzs * inv, ay = -dzv * inv, az = inv;
      const sx = ax * fx + ay * o.hx, sy = ax * fy + ay * o.hy;
      const diffuse = Math.max(0, sx * LX + sy * LY + az * LZ);
      const squeeze = shade[k];
      let s = 0.4 + 0.92 * diffuse + 0.35 * Math.pow(diffuse, 9);
      s *= 1 - 0.35 * squeeze;
      // the pole's side is in the pole's shade
      s *= 0.88 + 0.12 * Math.min(1, (i / (nx - 1)) * 7);
      shade[k] = s;
    }
}

/** the flag's edge, as a path (for its ink) */
export function border(g: CanvasRenderingContext2D, m: Mesh) {
  const { nx, ny, pos } = m;
  g.beginPath();
  g.moveTo(pos[0], pos[1]);
  for (let i = 1; i < nx; i++) g.lineTo(pos[i * 2], pos[i * 2 + 1]);
  for (let j = 1; j < ny; j++) g.lineTo(pos[(j * nx + nx - 1) * 2], pos[(j * nx + nx - 1) * 2 + 1]);
  for (let i = nx - 2; i >= 0; i--) g.lineTo(pos[((ny - 1) * nx + i) * 2], pos[((ny - 1) * nx + i) * 2 + 1]);
  g.closePath();
}

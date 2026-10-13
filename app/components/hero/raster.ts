import { THREADS } from "./config";

export interface Row {
  /** left / right extent of opaque pixels, normalised 0..1 of raster width */
  xmin: number;
  xmax: number;
  /** +1 = weaves left → right, -1 = right → left (loom shuttle) */
  dir: 1 | -1;
  /** vertical centre of the band, normalised 0..1 of raster height */
  ymid: number;
}

export interface RowSet {
  yFirst: number;
  yLast: number;
  rows: Row[];
}

export interface Raster {
  canvas: HTMLCanvasElement;
  /** CSS-pixel size of the art on stage */
  w: number;
  h: number;
  alpha: Uint8Array;
  aw: number;
  ah: number;
  /** alpha 0..255 at normalised coordinates */
  alphaAt: (nx: number, ny: number) => number;
  rows: RowSet;
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

/**
 * Rasterise an SVG once at stage size × dpr, keep a small alpha grid (never
 * read back per frame) and build the loom rows used by the weaving system.
 */
export function rasterize(
  img: HTMLImageElement,
  w: number,
  h: number,
  dpr: number,
): Raster {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(w * dpr));
  canvas.height = Math.max(2, Math.round(h * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const aw = Math.max(8, Math.ceil(w / 2));
  const ah = Math.max(8, Math.ceil(h / 2));
  let alpha = new Uint8Array(aw * ah).fill(255);
  try {
    const small = document.createElement("canvas");
    small.width = aw;
    small.height = ah;
    const sctx = small.getContext("2d", { willReadFrequently: true })!;
    sctx.drawImage(img, 0, 0, aw, ah);
    const data = sctx.getImageData(0, 0, aw, ah).data;
    for (let i = 0; i < aw * ah; i++) alpha[i] = data[i * 4 + 3];
  } catch {
    // tainted canvas: treat everything as opaque
    alpha = new Uint8Array(aw * ah).fill(255);
  }

  const alphaAt = (nx: number, ny: number) => {
    const x = Math.min(aw - 1, Math.max(0, Math.floor(nx * aw)));
    const y = Math.min(ah - 1, Math.max(0, Math.floor(ny * ah)));
    return alpha[y * aw + x];
  };

  return { canvas, w, h, alpha, aw, ah, alphaAt, rows: buildRows(alpha, aw, ah) };
}

function buildRows(alpha: Uint8Array, aw: number, ah: number): RowSet {
  const lineMin = new Int32Array(ah).fill(aw);
  const lineMax = new Int32Array(ah).fill(-1);
  let first = -1;
  let last = -1;
  for (let y = 0; y < ah; y++) {
    const o = y * aw;
    for (let x = 0; x < aw; x++) {
      if (alpha[o + x] > 40) {
        if (x < lineMin[y]) lineMin[y] = x;
        if (x > lineMax[y]) lineMax[y] = x;
      }
    }
    if (lineMax[y] >= 0) {
      if (first < 0) first = y;
      last = y;
    }
  }
  if (first < 0) {
    first = 0;
    last = ah - 1;
  }
  const NR = THREADS.rows;
  const span = last + 1 - first;
  const rows: Row[] = [];
  for (let i = 0; i < NR; i++) {
    const y0 = first + Math.floor((i * span) / NR);
    const y1 = first + Math.floor(((i + 1) * span) / NR);
    let xmin = aw;
    let xmax = -1;
    for (let y = y0; y < Math.max(y1, y0 + 1); y++) {
      if (lineMax[y] >= 0) {
        xmin = Math.min(xmin, lineMin[y]);
        xmax = Math.max(xmax, lineMax[y]);
      }
    }
    if (xmax < 0) {
      // empty band: collapse onto the nearest column so threads still behave
      xmin = Math.floor(aw / 2);
      xmax = xmin;
    }
    rows.push({
      xmin: xmin / aw,
      xmax: (xmax + 1) / aw,
      dir: i % 2 === 0 ? 1 : -1,
      ymid: (y0 + y1) / 2 / ah,
    });
  }
  return { yFirst: first / ah, yLast: (last + 1) / ah, rows };
}

/** Random opaque point (normalised), or the raster centre if none found. */
export function randomOpaque(
  r: Raster,
  rng: () => number,
  tries = 24,
): [number, number] {
  for (let i = 0; i < tries; i++) {
    const x = rng();
    const y = r.rows.yFirst + rng() * (r.rows.yLast - r.rows.yFirst);
    if (r.alphaAt(x, y) > 128) return [x, y];
  }
  return [0.5, 0.5];
}

import { ART_ASPECT, LAYOUT } from "./config";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  sw: number;
  sh: number;
  dpr: number;
  mobile: boolean;
  /** figure box (avatar + suit rasters share it) */
  fig: Rect;
  figCx: number;
  figCy: number;
  /** pattern sheet box */
  pat: Rect;
  suitScale: number;
  suitRight: number;
}

/** All positions derive from the stage size, never from fixed pixels. */
export function computeLayout(
  sw: number,
  sh: number,
  rawDpr: number,
  mobile: boolean,
): Layout {
  const dpr = Math.min(2, Math.max(1, rawDpr));
  const cfg = mobile ? LAYOUT.mobile : LAYOUT.desktop;
  const fh = cfg.figHeight * sh;
  const fw = fh * ART_ASPECT;
  const figCx = cfg.figCx * sw;
  const fig: Rect = { x: figCx - fw / 2, y: cfg.figTop * sh, w: fw, h: fh };
  const figCy = fig.y + fh / 2;

  const pSize = mobile
    ? LAYOUT.mobile.patternWidth * sw
    : LAYOUT.desktop.patternHeight * sh;
  const pat: Rect = { x: figCx - pSize / 2, y: sh / 2 - pSize / 2, w: pSize, h: pSize };

  return {
    sw,
    sh,
    dpr,
    mobile,
    fig,
    figCx,
    figCy,
    pat,
    suitScale: cfg.suitScale,
    suitRight: cfg.suitRight,
  };
}

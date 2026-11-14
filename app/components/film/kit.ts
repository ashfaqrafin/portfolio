import { C, type G, slam } from "./draw";

/* What the film's shots share: its clock's landmarks, the machine's rhythm,
   and the types a shot is written against. */

export const END = 90;
/** the march's beat (Warszawianka, measured): cuts, fists and words land on it */
export const BEAT = 0.425;
export const beat = (k: number) => 36 + k * BEAT;
export const MUSIC = { march: { from: 36, to: 58, offset: 14.225 }, anthem: { from: 68.8, offset: 2.6 } };
/** when the press comes down */
export const SLAMS = [19.5, 20.9, 22.2, 23.3, 24.3, 25.2, 26.0, 26.7, 27.3, 27.9];
export const slamsBy = (t: number) => SLAMS.filter((s) => s <= t).length;
/** seconds since the press last came down */
export const slamAge = (t: number) => {
  let a = 99;
  for (const s of SLAMS) if (s <= t) a = t - s;
  return a;
};
/** how many pumps the machine has made by `t` (it speeds up under the press; it stops when he does) */
export function pumps(t: number) {
  const u = Math.min(t, 28.3);
  if (u < 5) return 0;
  if (u < 18) return u - 5;
  const a = Math.min(u, 26) - 18;
  return 13 + a + (1.2 * a * a) / 16 + Math.max(0, u - 26) * 2.2;
}

export type Zone = { id: number; x: number; y: number; r: number };
export type Tear = { pts: number[]; born: number };
export type View = {
  g: G; W: number; H: number; t: number; now: number; reduced: boolean;
  fonts: { poster: string; hand: string; mono: string; display: string };
  /** workers a visitor has woken (by a click), and when */
  poked: Map<number, number>;
  pressHeld: boolean;
  tears: Tear[];
  grit: CanvasPattern | null;
  /** what can be clicked in this frame, in canvas pixels; and whether the press can be held */
  zones: Zone[];
  holdable: boolean;
};
/** what a shot draws with: its own time, and the frame it is seen through */
export type Ctx = {
  g: G; v: View; t: number; lt: number; dur: number; u: number; now: number;
  /** the shot's time, held on twos (12 a second), for poses */
  tw: number;
  /** where the camera looks, and how much of the stage it sees */
  cx: number; cy: number; vw: number; vh: number; tall: boolean;
  zone: (id: number, x: number, y: number, r: number) => void;
};
/** x, y, zoom, tilt */
export type Cam = [number, number, number, number?];
export type Shot = { at: number; fx?: number; bloom?: number; cam?: (c: Ctx) => Cam; draw: (c: Ctx) => void };

/** a word slammed in, never wider than the frame */
export function word(c: Ctx, text: string, y: number, size: number, p: number, colour: string = C.red, rot = -0.05, x = c.cx) {
  const { g } = c;
  g.font = `400 ${size}px ${c.v.fonts.poster}`;
  const fit = Math.min(1, (c.vw * 0.9) / g.measureText(text).width);
  slam(g, text, x, y, size * fit, p, c.v.fonts.poster, colour, rot);
}

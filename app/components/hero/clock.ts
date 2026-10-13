import { H, LEN, P, T } from "./config";
import { easeInOutCubic } from "./utils";

export interface ClockState {
  /** stage index 0..3 (also the index of the transition that follows it) */
  k: number;
  /** transition progress, 0 while holding */
  u: number;
  /** k + eased u, for UI fill and the active step */
  p: number;
}

/** Maps scene time to {stage, transition progress, eased position}. */
export function clock(t: number): ClockState {
  const w = ((t % LEN) + LEN) % LEN;
  const k = Math.min(3, Math.floor(w / P));
  const r = w - k * P;
  const u = r < H ? 0 : Math.min(1, (r - H) / T);
  return { k, u, p: k + easeInOutCubic(u) };
}

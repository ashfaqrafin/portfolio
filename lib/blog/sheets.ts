import { newerFirst } from "./graph.ts";
import type { ArticleMeta, Edge, EdgeKind } from "./types";

/* A big archive is pinned across several sheets of the same board, the way a
   real pin board gets a second board. Sheets are consecutive runs of articles,
   newest first (sheet 0 is the newest), and balanced: sizes differ by at most
   one (107 articles make 2 sheets of 16 and 5 of 15, not 6 × 16 + 11). Threads are still computed over everything;
   a thread whose other end is on another sheet is drawn running off the edge
   (see `offboardOf`). */

/** up to this many articles stay on a single sheet */
export const SHEET_MAX = 20;
/** past SHEET_MAX, sheets hold about this many */
export const SHEET_TARGET = 16;

export type SheetInfo = {
  /** "Apr 2026", "Nov 2025 – Apr 2026" */
  label: string;
  count: number;
  /** oldest and newest dates on the sheet */
  from: string;
  to: string;
};

export function splitSheets<T extends Pick<ArticleMeta, "slug" | "date">>(articles: readonly T[]): { info: SheetInfo[]; sheets: T[][] } {
  const newest = [...articles].sort(newerFirst);
  if (!newest.length) return { info: [], sheets: [] };
  const n = newest.length;
  const k = n <= SHEET_MAX ? 1 : Math.ceil(n / SHEET_TARGET);
  // the first (n % k) sheets take one extra, so sizes differ by at most one
  const base = Math.floor(n / k);
  const extra = n % k;
  const sheets: T[][] = [];
  for (let i = 0, at = 0; i < k; i++) {
    const size = base + (i < extra ? 1 : 0);
    sheets.push(newest.slice(at, at + size));
    at += size;
  }
  return { info: sheets.map(sheetInfo), sheets };
}

function sheetInfo(items: readonly Pick<ArticleMeta, "date">[]): SheetInfo {
  const to = items[0].date;
  const from = items[items.length - 1].date;
  return { label: rangeLabel(from, to), count: items.length, from, to };
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

/** "Apr 2026" · "Mar – Oct 2025" · "Nov 2025 – Apr 2026" */
export function rangeLabel(from: string, to: string): string {
  const a = short(from);
  const b = short(to);
  if (a === b) return a;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${a.split(" ")[0]} – ${b}`;
  return `${a} – ${b}`;
}

export type OffTarget = { slug: string; title: string; sheet: number; kind: EdgeKind };
/** the threads leaving one pin for other sheets, in one direction */
export type Offboard = {
  from: string;
  dir: "older" | "newer";
  /** the sheet the tag jumps to: the nearest one holding a target */
  sheet: number;
  targets: OffTarget[];
};

/** Threads from pins on `sheet` to articles on other sheets, one stub per pin and direction. */
export function offboardOf(
  sheet: number,
  edges: readonly Edge[],
  sheetOf: ReadonlyMap<string, number>,
  titleOf: (slug: string) => string,
): Offboard[] {
  const groups = new Map<string, Offboard>();
  for (const e of edges) {
    const sa = sheetOf.get(e.from);
    const sb = sheetOf.get(e.to);
    if (sa === undefined || sb === undefined || sa === sb) continue;
    for (const [here, there, other] of [
      [sa, sb, e.to],
      [sb, sa, e.from],
    ] as const) {
      if (here !== sheet) continue;
      const pin = here === sa ? e.from : e.to;
      // sheet 0 is the newest, so a higher index is older
      const dir = there > here ? "older" : "newer";
      const key = `${pin}|${dir}`;
      const g = groups.get(key) ?? { from: pin, dir, sheet: there, targets: [] };
      g.targets.push({ slug: other, title: titleOf(other), sheet: there, kind: e.kind });
      if (Math.abs(there - here) < Math.abs(g.sheet - here)) g.sheet = there;
      groups.set(key, g);
    }
  }
  return [...groups.values()];
}

/* The world view page's story, as data: when things happen (in story
   seconds), what is said, and how far the page scrolls for each beat.

   The story runs on a clock of its own. Scrolling sets where the clock is
   headed: a beat is a stretch of story that ends on a still moment (a rest),
   and once the page is scrolled into a beat, the clock plays that beat
   through to its rest at the story's own pace, however little was scrolled.
   So the characters never freeze mid-stride, and scrolling back rewinds. */

/** the rests, in story seconds: each beat runs from one rest to the next */
export const RESTS = [
  0, 3, 6, 11, 14, // I   the weight
  17.5, 21.5, 25, // II  the spark
  29, 33, 37, 42, // III the march
  46, 50.5, 56.5, // IV  the fire
  60.5, 64, 67.2, 70.4, 73.6, 76.8, 80, 84, // V the flag
  88, 90.6, 93.2, 95.8, 98.4, 101, // VI the comrades
  105, 109, 113, 116, // VII the table
] as const;

export const END = RESTS[RESTS.length - 1];

/** screens of scrolling for a beat of `d` story seconds */
const screens = (d: number) => Math.min(1.5, Math.max(0.85, d * 0.28));

/** cumulative scroll (in screens) at each rest */
export const SCROLL_AT: number[] = RESTS.reduce<number[]>((acc, r, k) => {
  acc.push(k === 0 ? 0 : acc[k - 1] + screens(r - RESTS[k - 1]));
  return acc;
}, []);
export const SCROLL_SCREENS = SCROLL_AT[SCROLL_AT.length - 1];

/** story time at a scroll position (in screens) */
export function storyAt(s: number): number {
  if (s <= 0) return 0;
  for (let k = 1; k < RESTS.length; k++) {
    if (s <= SCROLL_AT[k]) {
      const f = (s - SCROLL_AT[k - 1]) / (SCROLL_AT[k] - SCROLL_AT[k - 1]);
      return RESTS[k - 1] + f * (RESTS[k] - RESTS[k - 1]);
    }
  }
  return END;
}

/** scroll position (in screens) where story time `t` sits */
export function scrollAt(t: number): number {
  for (let k = 1; k < RESTS.length; k++) {
    if (t <= RESTS[k]) {
      const f = (t - RESTS[k - 1]) / (RESTS[k] - RESTS[k - 1]);
      return SCROLL_AT[k - 1] + f * (SCROLL_AT[k] - SCROLL_AT[k - 1]);
    }
  }
  return SCROLL_SCREENS;
}

/** where the clock is headed from story time `s`: the rest at or after it
    (a few hundredths in counts as in, so a nudge plays the beat) */
export function restAfter(s: number): number {
  for (const r of RESTS) if (r >= s - 0.04) return r;
  return END;
}

export type Chapter = { no: string; name: string; at: number };
export const CHAPTERS: Chapter[] = [
  { no: "I", name: "The weight", at: 0 },
  { no: "II", name: "The spark", at: 14 },
  { no: "III", name: "The march", at: 25 },
  { no: "IV", name: "The fire", at: 42 },
  { no: "V", name: "The flag", at: 56.5 },
  { no: "VI", name: "The comrades", at: 84 },
  { no: "VII", name: "The table", at: 101 },
];

/* What is said. A caption shows from t0 to t1 (it fades in and out over
   half a second at each end). `tone` follows the scene under it: light type
   on the painted and night scenes, ink on the paper ones. */
export type Caption = { t0: number; t1: number; text: string; tone: "dark" | "paper"; chapter: number };
export const CAPTIONS: Caption[] = [
  { chapter: 0, t0: 1.0, t1: 4.2, tone: "dark", text: "They told us the world was finished." },
  { chapter: 0, t0: 3.6, t1: 7.2, tone: "dark", text: "That the stairs only go one way, and only a few are allowed to climb." },
  { chapter: 0, t0: 8.0, t1: 11.2, tone: "dark", text: "So we kept our heads down. Every day, the same street." },
  { chapter: 0, t0: 11.0, t1: 14.6, tone: "dark", text: "Until one day, somebody looked up." },
  { chapter: 1, t0: 14.4, t1: 17.9, tone: "dark", text: "It was only a rag, and a stick." },
  { chapter: 1, t0: 18.6, t1: 21.9, tone: "dark", text: "One person with a rag is a joke." },
  { chapter: 1, t0: 22.9, t1: 25.4, tone: "paper", text: "Two is a conversation." },
  { chapter: 2, t0: 25.9, t1: 29.4, tone: "dark", text: "And a conversation can walk." },
  { chapter: 2, t0: 29.6, t1: 33.4, tone: "dark", text: "The campus came. Then the fields." },
  { chapter: 2, t0: 33.6, t1: 37.4, tone: "dark", text: "Then the shop floors, the stations, the rickshaw stands." },
  { chapter: 2, t0: 38.0, t1: 42.4, tone: "dark", text: "A thousand people behind one rag is history." },
  { chapter: 3, t0: 43.4, t1: 46.4, tone: "dark", text: "They answered with shields." },
  { chapter: 3, t0: 47.2, t1: 50.6, tone: "dark", text: "The march broke. The flag fell into the fire." },
  { chapter: 3, t0: 51.4, t1: 54.4, tone: "dark", text: "But a flag is only cloth." },
  { chapter: 3, t0: 54.4, t1: 57.0, tone: "dark", text: "And cloth can be sewn." },
  { chapter: 4, t0: 57.4, t1: 60.6, tone: "paper", text: "He climbed out of the ashes." },
  { chapter: 5, t0: 85.0, t1: 89.6, tone: "dark", text: "It was never one person’s flag." },
  { chapter: 5, t0: 98.6, t1: 101.6, tone: "dark", text: "It belongs to everyone who has ever carried it." },
  { chapter: 6, t0: 102.4, t1: 105.6, tone: "paper", text: "And the stairs?" },
  { chapter: 6, t0: 106.0, t1: 109.6, tone: "paper", text: "We fold them down into a table." },
  { chapter: 6, t0: 109.8, t1: 113.6, tone: "paper", text: "Long enough for everyone. The same height for everyone." },
];

/* The flag in the climax: each tear is stitched back in red thread as the
   next one. The order is a choice (edit it here; the patterns are drawn in
   flags.ts). Each shows a line, the place and the year, when it's sewn in. */
export type FlagId = "red" | "bangladesh" | "palestine" | "cuba" | "congo" | "soviet";
export const FLAGS: { id: FlagId; line: string }[] = [
  { id: "red", line: "" },
  { id: "bangladesh", line: "Dhaka · 1971, and again in 2024" },
  { id: "palestine", line: "Palestine · every day since 1948" },
  { id: "cuba", line: "Havana · 1959" },
  { id: "congo", line: "Kinshasa · 1960" },
  { id: "soviet", line: "Petrograd · 1917" },
];

/* the climax's beats: a tear is made for whoever only scrolls, at each of
   these, unless the flag has already been torn that far by hand */
export const AUTO_TEARS = [64.8, 68.0, 71.2, 74.4, 77.6];

/* lines spoken in the climax (drawn in the picture, beside him) */
export const BUBBLES = {
  burn: { t0: 61.4, t1: 65.6, text: ["Burn it.", "We have more thread."] },
  see: { t0: 81.0, t1: 84.6, text: ["দেখলে?"], gloss: "(See?)" },
  slam: { t: 80.2, text: "ধ্রাম!" },
};

/** the closing card shows from here */
export const CLOSE_AT = 113.4;

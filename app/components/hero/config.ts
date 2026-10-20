/**
 * Every tunable of the hero lives here. See README.md in this folder.
 *
 * The animation is a pure function of one number, the time `t` (seconds).
 * Four stages, four transitions, one loop.
 */

// ── Timeline (reference values from the brief) ─────────────────────────────
export const H = 3.0; // hold per stage
export const T = 4.2; // transition
export const P = H + T; // period
export const STAGE_COUNT = 4;
export const LEN = STAGE_COUNT * P; // full loop

// ── Artwork ────────────────────────────────────────────────────────────────
export const ART_W = 894; // shared viewBox of avatars + suit
export const ART_H = 1342;
export const ART_ASPECT = ART_W / ART_H;
/* The artwork ships twice: the source SVGs, and WebPs pre-rendered from them at
   HERO_ART_PX tall by `npm run hero:art`. The WebPs decode off the main thread and
   are ~5× smaller; rasterising the SVGs cost ~0.8 s of main-thread work on load.
   Only a stage that would draw the figure taller than the WebP (portrait tablets
   at 2×) gets the SVGs. Decided once, when the engine loads the art. */
export const HERO_ART_PX = 1300;

function artExt(): "webp" | "svg" {
  if (typeof window === "undefined") return "webp";
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const mobile = window.matchMedia(MOBILE_QUERY).matches;
  // tallest the figure can be drawn: mobile stages are 3:4 at full width, desktop
  // stages are capped by the 1240px card (≈ 630px tall)
  const stageH = mobile ? (window.innerWidth * 4) / 3 : 630;
  const figPx = stageH * (mobile ? LAYOUT.mobile : LAYOUT.desktop).figHeight * dpr;
  return figPx > HERO_ART_PX ? "svg" : "webp";
}

export const ART_URLS = {
  get avatars(): readonly string[] {
    const e = artExt();
    return [1, 2, 3, 4].map((i) => `/hero/avatar-${i}.${e}`);
  },
  get suit() {
    return `/hero/suit.${artExt()}`;
  },
  get patterns() {
    return `/hero/patterns.${artExt()}`;
  },
};

// ── Palette: one burgundy ink on warm paper, plus tints. ────────────────
export const PALETTE = {
  ink: "#4a0c18",
  burgundy: "#4a0c18",
  burgundyDeep: "#4a0c18",
  burgundyLift: "#8c2f43",
  threadHighlight: "#f2c4cb",
  cream: "#faf5eb",
  paper: "#f8f3ea",
} as const;

// ── Layout (desktop / mobile) ──────────────────────────────────────────────
/** Viewport width at or below which the mobile layout is used (CSS + engine agree). */
export const MOBILE_QUERY = "(max-width: 720px)";
export const LAYOUT = {
  desktop: {
    figHeight: 0.98,
    figTop: 0.01,
    figCx: 0.585,
    patternHeight: 0.9,
    suitScale: 0.7,
    suitRight: 0.168,
  },
  mobile: {
    figHeight: 0.92,
    figTop: 0.06,
    figCx: 0.5,
    patternWidth: 0.98,
    suitScale: 0.52,
    suitRight: 0.27,
  },
} as const;

// ── Tear mesh ──────────────────────────────────────────────────────────────
export const MESH = {
  desktop: {
    xs: [0, 0.2, 0.38, 0.5, 0.62, 0.8, 1],
    ys: [0, 0.17, 0.36, 0.56, 0.76, 1],
  },
  mobile: {
    xs: [0, 0.2, 0.4, 0.6, 0.8, 1],
    ys: [0, 0.25, 0.5, 0.75, 1],
  },
  jitterX: 0.035,
  jitterY: 0.03,
  edgeSpacingDiv: 55, // sample spacing = W / this
  edgeJag: 2.6,
  fringeShare: 0.45,
  bridgeShare: 0.55,
  bridgeMaxDist: 0.17, // × figure width
  maxShards: 32,
} as const;

// ── Threads ────────────────────────────────────────────────────────────────
export const THREADS = {
  rows: 64, // NR
  looseDesktop: 56,
  looseMobile: 34,
  trailSamples: 18,
  trailSpacing: [0.0034, 0.0058] as const, // × thread life, per sample
  maxVerts: 90000,
} as const;

// ── Motion polish ──────────────────────────────────────────────────────────
export const MOTION = {
  figFloat: 3, // px
  suitFloat: 4, // px
  strainPx: 1.8,
  strainHz: 70,
  boilPx: 0.75, // hand-drawn "line boil" amplitude
  boilFps: 7,
  weaveCellPx: 3.4,
  tweenSpeed: 3.2, // scene-seconds per real second for prev/next
} as const;

// ── Content ────────────────────────────────────────────────────────────────
export interface QuoteSeg {
  text: string;
  kind?: "chip" | "stitch";
}

export interface StageCopy {
  title: string;
  sub: string;
  quote: QuoteSeg[];
  tag: string;
  alt: string;
}

export const STAGES: StageCopy[] = [
  {
    title: "The Tailor",
    sub: "Physical Foundation & Pattern Drafting",
    quote: [
      {
        text: "Wait, should I just become a bespoke tailor? Hand-stitching lapels looks therapeutic...",
      },
    ],
    tag: "DRAFT No.01 · 1:1",
    alt: "Ashfaq as a tailor, chin on hand, pattern pieces drawn behind him",
  },
  {
    title: "The Fashion Enthusiast",
    sub: "Materiality, Draping & Aesthetics",
    quote: [
      {
        text: "No, wait... maybe high-end streetwear and silhouette design is my true calling.",
      },
    ],
    tag: "No.02 · DRAPE",
    alt: "Ashfaq holding a tablet, studying a finished suit that hangs beside him",
  },
  {
    title: "The Linux Tech Guy",
    sub: "Kernel Panics & Open-Source Architecture",
    quote: [
      {
        text: "Ehh, nah\u2014let's be real, I live in the terminal. Time to rice my dotfiles and automate everything.",
      },
    ],
    tag: "zsh \u2014 tty1",
    alt: "Ashfaq gesturing at floating code windows and circuit lines",
  },
  {
    title: "The Unified Creative",
    sub: "Full-Stack Multihyphenate",
    quote: [
      { text: "Damn... why choose? I'm just " },
      { text: "shipping code by day", kind: "chip" },
      { text: " and " },
      { text: "tailoring the architecture by night", kind: "stitch" },
      { text: "." },
    ],
    tag: "{ both }",
    alt: "Ashfaq wearing the tailored suit and working on a laptop",
  },
];

export interface TransitionCfg {
  name: string;
  desc: string;
  /** figure turns to cloth */
  fab: [number, number];
  /** old figure tears */
  tear: [number, number];
  /** new figure assembles (null = no new shards) */
  assemble: [number, number] | null;
  /** new figure relaxes to line art */
  relax: [number, number] | null;
  /** share of fringe that become circuit traces on this transition's meshes */
  tech: number;
}

export const TRANSITIONS: TransitionCfg[] = [
  {
    name: "Pattern \u2192 Silhouette",
    desc: "Drafting paper unspools; a suit is woven from the thread.",
    fab: [0, 0.1],
    tear: [0.1, 0.52],
    assemble: [0.18, 0.54],
    relax: [0.5, 0.6],
    tech: 0,
  },
  {
    name: "Silhouette \u2192 Source",
    desc: "The suit takes flight while the figure frays and is restitched.",
    fab: [0, 0.1],
    tear: [0.14, 0.76],
    assemble: [0.34, 0.88],
    relax: [0.86, 1.0],
    tech: 0.55,
  },
  {
    name: "Source \u2192 Self",
    desc: "The suit returns; every row is re-woven into one person.",
    fab: [0, 0.1],
    tear: [0.1, 0.52],
    assemble: null,
    relax: null,
    tech: 0.3,
  },
  {
    name: "Self \u2192 Pattern",
    desc: "The loop closes: thread goes back to the drafting table.",
    fab: [0, 0.12],
    tear: [0.14, 0.76],
    assemble: [0.34, 0.88],
    relax: [0.86, 1.0],
    tech: 0,
  },
];

/** Special windows (transition progress u). */
export const WINDOWS = {
  // 1 → 2
  patternUnweave: [0.08, 0.55] as [number, number],
  suitWeave: [0.6, 1.0] as [number, number],
  // 2 → 3
  suitOut: [0.04, 0.46] as [number, number],
  // 3 → 4
  suitIn: [0.1, 0.52] as [number, number],
  finalWeave: [0.56, 0.96] as [number, number],
  // 4 → 1
  patternWeave: [0.58, 0.98] as [number, number],
  // thread storm per transition
  storm: [
    [0.05, 1.0],
    [0.05, 0.95],
    [0.1, 0.96],
    [0.14, 0.98],
  ] as [number, number][],
};

export const SUIT = {
  yaw: 0.78,
  slices: 40,
  outYaw: 2.4,
  outScale: 0.38,
  outTilt: 0.5,
  inScale: 0.45,
};

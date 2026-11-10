import { FlagGL } from "./flaggl";
import { COMRADES, LAYERS, clamp, ease, fade, lerp, raggedCircle, seg, tornEdge, type SceneState, type World } from "./kit";
import * as S from "./scenes";
import { Sound, type Hit } from "./sound";
import { AUTO_TEARS, CAPTIONS, CHAPTERS, CLOSE_AT, END, FLAGS, SCROLL_AT, SCROLL_SCREENS, restAfter, storyAt } from "./story";

/* The world view page's runtime: one canvas on a stage that stays in view
   while a long track scrolls past it. The scroll position sets where the
   story clock is headed (story.ts); the clock plays toward it at the
   story's pace (faster when far behind, quicker still going back), and every
   frame the scene for the clock's time is drawn, crossing into the next one
   by its own transition (torn paper, a flash, a brush, ink, a bloom of
   watercolour). Captions, the chapter's name and the progress line are the
   page's own elements, shown and hidden from here.

   Pictures load in the order the story needs them; the clock waits at a
   scene's door until that scene's pictures are in. */

type SceneId = "desk" | "stairs" | "street" | "hands" | "march" | "night" | "manga" | "comrades" | "table";
type Enter = "cut" | "tear" | "flash" | "wipe" | "ink" | "bloom";
type Scene = { id: SceneId; from: number; enter: Enter; dur: number; tone: "dark" | "paper"; draw: (w: World) => void; needs: string[] };

const COMRADE_KEYS = COMRADES.flatMap((c) => [c.a, c.b].map((s) => s.replace("/worldview/", "").replace(".webp", "")));
const SCENES: Scene[] = [
  /* the page opens as the rest of the site does, on the desk (nothing is
     drawn: the canvas is clear and the site's own paper shows through), and
     the story soaks into it like watercolour */
  { id: "desk", from: 0, enter: "cut", dur: 0, tone: "paper", draw: () => {}, needs: [] },
  { id: "stairs", from: 0.1, enter: "bloom", dur: 1.5, tone: "dark", draw: S.stairs, needs: ["sky-storm", "stairs", "masked"] },
  { id: "street", from: 6.6, enter: "tear", dur: 1, tone: "dark", draw: S.street, needs: ["skyline", "street", "railing", "railing-cloth", "wall", "hero"] },
  { id: "hands", from: 21.5, enter: "flash", dur: 0.3, tone: "paper", draw: S.hands, needs: ["paper"] },
  { id: "march", from: 25, enter: "wipe", dur: 0.9, tone: "dark", draw: S.march, needs: ["road-a", "road-b", "march"] },
  { id: "night", from: 42, enter: "ink", dur: 1.2, tone: "dark", draw: S.night, needs: ["night", "debris", "shields"] },
  { id: "manga", from: 56.5, enter: "flash", dur: 0.5, tone: "paper", draw: S.manga, needs: ["rock", "hero2"] },
  { id: "comrades", from: 84, enter: "tear", dur: 1, tone: "dark", draw: S.comrades, needs: ["sky-hero", "clouds", "leaves-a", "leaves-b", ...COMRADE_KEYS] },
  { id: "table", from: 101, enter: "bloom", dur: 1.4, tone: "paper", draw: S.table, needs: ["dawn", "feast", "feast-cloth"] },
];

/** a level that runs smoothly through the points [when, how loud] */
function along(t: number, pts: [number, number][]) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) if (t <= pts[k][0]) return lerp(pts[k - 1][1], pts[k][1], ease(seg(t, pts[k - 1][0], pts[k][0])));
  return pts[pts.length - 1][1];
}

/* one-off sounds, and the jolts that go with them, as the story passes them
   going forward: [when, which, shake, flash, how much / which note] */
const CUES: [number, Hit, number?, number?, number?][] = [
  [6.6, "whoosh"], [12.2, "grab"], [12.25, "cymbal", 0, 0, 0.35], [17.7, "snap"],
  // a second hand on the pole
  [22.6, "impact", 0.3, 0.7], [22.62, "cymbal", 0, 0, 0.8],
  // the march: a shout for each who joins; the band comes in when they're a crowd
  [25, "whoosh"], [25.02, "tom", 0, 0, 70], [29.3, "hey", 0, 0, 0.6], [30.6, "hey", 0, 0, 0.7],
  [33, "cymbal", 0, 0, 0.9], [33.02, "cheer", 0, 0, 0.7], [34.6, "hey", 0, 0, 0.8],
  [37, "cheer", 0, 0, 0.8], [39.5, "cheer", 0.1, 0, 1], [39.55, "whistle"],
  // the shields, closing in, faster and faster
  [42, "boom", 0.25, 0, 0.8], [43.6, "shield"], [44.2, "whistle"], [44.4, "shield"], [45.1, "shield"], [45.7, "shield", 0.08],
  [45.9, "whistle"], [46.2, "shield", 0.1], [46.6, "shield", 0.12], [46.9, "shield", 0.15],
  [47, "whoosh"], [48, "boom", 0.45, 0.2, 1],
  // out of the smoke; then the page turns to ink
  [54.4, "impact", 0.1], [55.5, "roll", 0, 0, 0.95], [56.5, "impact", 0.3, 0.6], [56.52, "cymbal", 0, 0, 0.9],
  // each hold of the climb a drum higher; the flag cracks open
  [57.6, "tom", 0, 0, 60], [58.08, "tom", 0, 0, 68], [58.56, "tom", 0, 0, 76], [59.04, "tom", 0, 0, 86], [59.52, "tom", 0, 0, 98],
  [60, "impact", 0.15], [60.6, "snap", 0.2], [60.65, "cheer", 0, 0, 0.9],
  [79.3, "roll", 0, 0, 0.9], [80.2, "slam", 0.7, 0.85],
  // the comrades, one group after another
  [84, "whoosh"], [86.3, "tom", 0, 0, 64], [89.5, "tom", 0, 0, 70], [92.1, "tom", 0, 0, 76], [94.7, "tom", 0, 0, 84], [97.3, "tom", 0, 0, 92], [99.9, "cheer", 0, 0, 0.8],
  [101, "whoosh"], [106.5, "thud", 0.25, 0, 0.5], [109.4, "whoosh"],
];

export function startWorldView(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>(".wv-stage")!;
  const track = root.querySelector<HTMLElement>(".wv-track")!;
  const canvas = root.querySelector<HTMLCanvasElement>(".wv-canvas")!;
  const g = canvas.getContext("2d")!;
  const caps = [...root.querySelectorAll<HTMLElement>(".wv-cap")];
  const title = root.querySelector<HTMLElement>(".wv-title")!;
  const close = root.querySelector<HTMLElement>(".wv-end")!;
  const chapterEl = root.querySelector<HTMLElement>(".wv-chapter")!;
  const bar = root.querySelector<HTMLElement>(".wv-progress > span")!;
  const hint = root.querySelector<HTMLElement>(".wv-hint")!;
  const soundBtn = root.querySelector<HTMLButtonElement>(".wv-sound")!;
  const tearBtn = root.querySelector<HTMLButtonElement>(".wv-tear")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── pictures, in the story's order ──
  const imgs = new Map<string, HTMLImageElement>();
  const ready = new Set<string>();
  const queue: string[] = [];
  let loading = 0;
  const srcOf = (key: string) => LAYERS[key]?.src ?? `/worldview/${key}.webp`;
  const pump = () => {
    while (loading < 4 && queue.length) {
      const key = queue.shift()!;
      if (imgs.has(key)) continue;
      const im = new Image();
      im.decoding = "async";
      loading++;
      im.onload = () => {
        loading--;
        ready.add(key);
        if (key === "paper") {
          const pat = g.createPattern(im, "repeat");
          pat?.setTransform(new DOMMatrix().scale(0.55));
          state.paper = pat;
        }
        pump();
      };
      im.onerror = () => {
        loading--;
        pump();
      };
      im.src = srcOf(key);
      imgs.set(key, im);
    }
  };
  const want = (keys: string[]) => {
    for (const k of keys) if (!imgs.has(k) && !queue.includes(k)) queue.push(k);
    pump();
  };
  const variants = (keys: string[], portrait: boolean) => keys.flatMap((k) => (portrait && LAYERS[`${k}-p`] ? [`${k}-p`, k] : [k]));
  const needsOf = (sc: Scene, portrait: boolean) => variants([...sc.needs, ...(sc.id === "street" ? ["sky-storm"] : []), ...(sc.id === "hands" || sc.id === "night" ? ["masked"] : []), ...(sc.id === "march" ? ["hero", "carry"] : []), ...(sc.id === "manga" || sc.id === "table" ? ["paper"] : []), ...(sc.id === "table" ? ["stairs"] : [])], portrait);
  const sceneReady = (sc: Scene, portrait: boolean) => needsOf(sc, portrait).every((k) => ready.has(k) || (k.endsWith("-p") && ready.has(k.slice(0, -2))));

  // ── the world the scenes draw in ──
  const state: SceneState = {
    gl: new FlagGL(),
    meshes: new Map(),
    scratch: null,
    ragTex: null,
    flag: null,
    flagTex: [],
    flagIndex: 0,
    stitch: null,
    slash: null,
    cutOrder: 1,
    tearHintGone: false,
    flagNote: null,
    particles: [],
    road: null,
    tinted: new Map(),
    paper: null,
    shake: 0,
    flash: 0,
  };
  const sound = new Sound();
  const css = getComputedStyle(root);
  const fam = (v: string, fallback: string) => css.getPropertyValue(v).trim() || fallback;
  const w: World = {
    g, W: 0, H: 0, dpr: 1, portrait: false, t: 0, prevT: 0, now: 0, dt: 0, reduced,
    img: (k) => (ready.has(k) ? imgs.get(k)! : null),
    sound,
    fonts: {
      hand: fam("--font-hand", "cursive"),
      bangla: fam("--font-bangla", "sans-serif"),
      mono: fam("--font-mono", "monospace"),
      display: fam("--font-display", "serif"),
    },
    state,
  };
  // (a font that can't be fetched just leaves the canvas on its fallback)
  document.fonts?.load(`800 40px ${w.fonts.bangla}`, "ধ্রাম! দেখলে?").catch(() => {});
  document.fonts?.load(`700 40px ${w.fonts.hand}`, "Burn it.").catch(() => {});

  // ── the stage's size ──
  let dpr = 1;
  const size = () => {
    const r = stage.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.75 : 2);
    if (W === w.W && H === w.H && canvas.width === Math.round(W * dpr)) return;
    w.W = W;
    w.H = H;
    w.dpr = dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const portrait = W / H < 0.8;
    if (portrait !== w.portrait) {
      w.portrait = portrait;
      queue.length = 0;
      for (const sc of SCENES) want(needsOf(sc, portrait));
    }
    // (cloth laid out for the old size is rescaled by the scenes as they meet it)
  };
  const ro = new ResizeObserver(size);
  ro.observe(stage);
  size();
  for (const sc of SCENES) want(needsOf(sc, w.portrait));

  // ── where the scroll says the story should be ──
  let target = 0;
  const readScroll = () => {
    const r = track.getBoundingClientRect();
    const range = Math.max(1, r.height - window.innerHeight);
    const s = clamp(-r.top / range) * SCROLL_SCREENS;
    target = restAfter(storyAt(s));
    lastScroll = performance.now();
  };
  let lastScroll = performance.now();
  addEventListener("scroll", readScroll, { passive: true });
  readScroll();
  /* a jump straight to a moment (the tests use it to look at one frame):
     dispatch new CustomEvent("wv:seek", { detail: seconds }) on the root, or
     detail: [from, to] to play on from one moment to another; the next
     scroll takes the story back */
  let seek: [number, number] | null = null;
  const onSeek = (e: Event) => {
    const d = (e as CustomEvent).detail;
    const [a, b] = Array.isArray(d) ? d : [d, d];
    seek = [clamp(Number(a) || 0, 0, END), clamp(Number(b) || 0, 0, END)];
  };
  root.addEventListener("wv:seek", onSeek);

  // ── input: tearing the flag ──
  let drag: { x: number; y: number; cut: number; snd: number } | null = null;
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const overFlag = (x: number, y: number) => {
    const b = S.climax.flagBox;
    return S.climax.ready && current === "manga" && x > b.x0 - 40 && x < b.x1 + 40 && y > b.y0 - 40 && y < b.y1 + 40;
  };
  // a stroke can start anywhere in the climax: it tears wherever it crosses the cloth
  const onDown = (e: PointerEvent) => {
    if (!(S.climax.ready && current === "manga")) return;
    drag = { ...local(e), cut: 0, snd: 0 };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    canvas.style.cursor = overFlag(p.x, p.y) ? "crosshair" : "";
    if (!drag) return;
    const n = S.tearStroke(w, drag.x, drag.y, p.x, p.y);
    if (n > 0) {
      drag.cut += n;
      if (performance.now() - drag.snd > 90) {
        sound.play("tear");
        drag.snd = performance.now();
      }
    }
    drag.x = p.x;
    drag.y = p.y;
  };
  const onUp = () => {
    if (drag && drag.cut > 0) S.finishTear(w);
    drag = null;
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  // without a pointer: a button tears it (shown on focus, in the climax)
  const onTearBtn = () => {
    state.tearHintGone = true;
    S.autoTear(w, state.flagIndex);
  };
  tearBtn.addEventListener("click", onTearBtn);

  // ── sound ──
  const setSound = (on: boolean) => {
    if (on) sound.enable();
    else sound.disable();
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.textContent = on ? "Sound on" : "Sound off";
  };
  const onSoundBtn = () => setSound(!sound.on);
  soundBtn.addEventListener("click", onSoundBtn);
  const begin = (withSound: boolean) => () => {
    if (withSound) {
      setSound(true);
      sound.play("begin");
    }
    const top = track.getBoundingClientRect().top + scrollY;
    const range = track.offsetHeight - innerHeight;
    scrollTo({ top: top + (SCROLL_AT[1] / SCROLL_SCREENS) * range * 0.6, behavior: reduced ? "auto" : "smooth" });
  };
  const beginLoud = begin(true), beginQuiet = begin(false);
  root.querySelector(".wv-begin-sound")?.addEventListener("click", beginLoud);
  root.querySelector(".wv-begin-quiet")?.addEventListener("click", beginQuiet);
  const onReplay = () => {
    scrollTo({ top: track.getBoundingClientRect().top + scrollY, behavior: "auto" });
    w.t = w.prevT = 0;
    Object.assign(state, { flag: null, flagIndex: 0, stitch: null, slash: null, tearHintGone: false, flagNote: null, particles: [] });
    readScroll();
  };
  root.querySelector(".wv-replay")?.addEventListener("click", onReplay);

  // ── the frame ──
  let raf = 0;
  let last = performance.now();
  let first = true;
  let current: SceneId = "stairs";
  const shown = new Map<HTMLElement, number>();
  const show = (el: HTMLElement, op: number, y = 10) => {
    const v = Math.round(op * 100) / 100;
    if (shown.get(el) === v) return;
    shown.set(el, v);
    el.style.opacity = String(v);
    el.style.transform = `translate3d(0, ${((1 - v) * y).toFixed(1)}px, 0)`;
    el.toggleAttribute("data-on", v > 0.02);
  };
  let chapterShown = -1;

  const loop = (ms: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (ms - last) / 1000);
    last = ms;
    w.now = ms / 1000;
    w.dt = dt;
    size();

    // the clock heads for the target: at the story's pace, faster when far behind
    let t = w.t;
    if (seek !== null) {
      // (the clock's last time stays as it was, so a jump forward passes the tears on the way)
      [t, target] = seek;
      seek = null;
      first = false;
    }
    const T = target;
    if (first) {
      t = T > 1 ? T : 0;
      first = false;
    } else {
      const gap = T - t;
      if (gap === 0) {
        // at rest
      } else if (gap > 0) t += Math.min(gap, dt * Math.max(1, gap / 1.8));
      else if (gap < 0) t -= Math.min(-gap, dt * Math.max(3, -gap / 0.8));
    }
    // ...but waits at a scene whose pictures aren't in yet
    let idx = 0;
    for (let k = 0; k < SCENES.length; k++) if (SCENES[k].from <= t) idx = k;
    let waiting = false;
    while (idx > 0 && !sceneReady(SCENES[idx], w.portrait)) {
      waiting = true;
      t = Math.min(t, SCENES[idx].from - 0.001);
      idx--;
    }
    w.prevT = w.t;
    w.t = t;
    const sc = SCENES[idx];
    current = sc.id;
    if (stage.dataset.scene !== sc.id) stage.dataset.scene = sc.id;
    // (type is ink on paper until the story has covered the desk)
    const tone = sc.id === "stairs" && t < 0.9 ? "paper" : sc.tone;
    if (stage.dataset.tone !== tone) root.dataset.tone = stage.dataset.tone = tone;
    stage.toggleAttribute("data-waiting", waiting || !sceneReady(SCENES[0], w.portrait));

    cues(w.prevT, t, dt);
    // back before the climax: it starts over, with the red rag, next time
    if (t < 60 && (state.flag || state.flagIndex > 0)) {
      Object.assign(state, { flag: null, flagIndex: 0, stitch: null, slash: null, flagNote: null, tearHintGone: false });
    }

    // draw
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, w.W, w.H);
    if (t >= SCENES[1].from + SCENES[1].dur) {
      g.fillStyle = "#14100f";
      g.fillRect(0, 0, w.W, w.H);
    }
    state.shake = Math.max(0, state.shake - dt * 1.6);
    if (state.shake > 0 && !reduced) {
      const a = state.shake * 18 * (w.H / 900);
      g.translate(Math.sin(w.now * 71) * a, Math.cos(w.now * 53) * a * 0.7);
    }
    if (sceneReady(SCENES[0], w.portrait)) drawStory(t, idx);
    state.flash = Math.max(0, state.flash - dt * 2.2);
    if (state.flash > 0) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = `rgba(255,253,245,${state.flash.toFixed(3)})`;
      g.fillRect(0, 0, w.W, w.H);
    }

    // the page's own elements
    caps.forEach((el, k) => show(el, fade(t, CAPTIONS[k].t0, CAPTIONS[k].t1, 0.5)));
    show(title, 1 - seg(t, 0.15, 1.3), -14);
    title.toggleAttribute("inert", t > 1.2);
    const endOp = seg(t, CLOSE_AT, CLOSE_AT + 1.2);
    show(close, endOp, 14);
    close.toggleAttribute("inert", endOp < 0.5);
    let ch = 0;
    for (let k = 0; k < CHAPTERS.length; k++) if (CHAPTERS[k].at <= t + 0.01) ch = k;
    if (ch !== chapterShown) {
      chapterShown = ch;
      chapterEl.textContent = `${CHAPTERS[ch].no} · ${CHAPTERS[ch].name}`;
    }
    bar.style.transform = `scaleX(${(t / END).toFixed(4)})`;
    const idle = Math.abs(T - t) < 0.01 && performance.now() - lastScroll > 3500 && t < CLOSE_AT - 0.5 && t > 0.5;
    hint.toggleAttribute("data-on", idle);
    tearBtn.toggleAttribute("data-live", current === "manga" && S.climax.ready && t < 84);
    root.dataset.t = t.toFixed(1);
    root.dataset.flag = String(state.flagIndex);
    if (!root.hasAttribute("data-ready") && sceneReady(SCENES[0], w.portrait)) root.setAttribute("data-ready", "");

    // the mix
    if (sound.on) {
      const on = (a: number, b: number) => (t >= a && t < b ? 1 : 0);
      sound.mix({
        beds: {
          wind: 0.55 * on(0, 7) + 0.45 * on(56.5, 84) + 0.2 * on(42, 56.5) + 0.25 * on(84, 101),
          city: 0.6 * on(6.6, 21.5),
          fire: 0.9 * on(42.6, 56.8),
          // the crowd's roar grows with the crowd; it's still there, off the page, when the flag goes up
          crowd: 0.9 * seg(t, 29, 38) * (1 - seg(t, 47, 47.6)) + 0.35 * on(60.6, 84) + 0.3 * on(84, 101) + 0.12 * on(106.5, END + 1),
          siren: 0.8 * on(42.4, 48) + 0.8 * (1 - seg(t, 48, 50.5)) * on(48, 50.5),
          // the march plays from the story's first step, low under the street, full with the crowd, cut off when the flag falls
          march: along(t, [[0.4, 0], [2.5, 0.34], [7, 0.4], [14, 0.5], [25, 0.72], [33, 0.95], [47, 0.95], [50, 0.3], [57, 0.22], [60.6, 0.12], [63, 0]]),
          anthem: along(t, [[59.8, 0], [62.5, 1], [101, 1], [105, 0.65], [END, 0.65]]),
        },
        heartbeat: 0,
        // (no drum line of the page's own: the music is the recordings); the crowd's feet and shouts
        drums: 0,
        crowd: on(25, 47.2) * clamp(0.22 + 0.1 * on(29.3, 99) + 0.1 * on(30.6, 99) + 0.1 * on(33.3, 99) + 0.1 * on(34.6, 99) + 0.38 * seg(t, 35.4, 38.5)) * (1 - seg(t, 46.6, 47.2)),
        step: S.beat,
        toll: 0,
        boots: on(51, 54.4),
        birds: on(101.5, END + 1) + 0.4 * on(84, 101),
      });
    }
  };

  /* the transitions: the scene before, the scene coming in over it */
  function drawStory(t: number, idx: number) {
    const sc = SCENES[idx];
    const p = sc.dur ? seg(t, sc.from, sc.from + sc.dur) : 1;
    if (p >= 1 || idx === 0) {
      sc.draw(w);
      return;
    }
    const prev = () => SCENES[idx - 1].draw(w);
    const cur = () => sc.draw(w);
    const { W, H } = w;
    const diag = Math.hypot(W, H);
    switch (sc.enter) {
      case "tear": {
        prev();
        const y = H * (1.05 - ease(p) * 1.22);
        const pts = tornEdge(W, y, idx);
        g.save();
        g.beginPath();
        g.moveTo(-20, H + 20);
        for (const [x, yy] of pts) g.lineTo(x, yy);
        g.lineTo(W + 20, H + 20);
        g.closePath();
        g.clip();
        cur();
        g.restore();
        g.save();
        g.beginPath();
        pts.forEach(([x, yy], k) => (k ? g.lineTo(x, yy) : g.moveTo(x, yy)));
        g.lineWidth = 7;
        g.strokeStyle = "#f6f0e4";
        g.shadowColor = "rgba(0,0,0,0.45)";
        g.shadowBlur = 14;
        g.shadowOffsetY = -4;
        g.stroke();
        g.restore();
        break;
      }
      case "flash": {
        if (p < 0.45) prev();
        else cur();
        state.flash = Math.max(state.flash, 1 - Math.abs(p - 0.45) / 0.55);
        break;
      }
      case "wipe": {
        prev();
        const x = lerp(-0.12 * W, 1.18 * W, ease(p));
        g.save();
        g.beginPath();
        g.moveTo(-20, -20);
        for (let y = -20, k = 0; y <= H + 20; y += 16, k++) g.lineTo(x + Math.sin(y * 0.02 + idx) * 22 + (Math.sin(k * 12.9898) * 43758.5 % 1) * 14, y);
        g.lineTo(-20, H + 20);
        g.closePath();
        g.clip();
        cur();
        g.restore();
        // a band of red along the edge, like a loaded brush laying the colour down
        g.save();
        g.fillStyle = "rgba(200,16,46,0.94)";
        g.beginPath();
        const ragged = (y: number, k: number) => Math.sin(y * 0.045 + idx) * 10 + Math.sin(y * 0.17 + k) * 5;
        for (let y = -20; y <= H + 20; y += 8) g.lineTo(x - 46 + ragged(y, 1), y);
        for (let y = H + 20; y >= -20; y -= 8) g.lineTo(x + 8 + ragged(y, 4) * 1.4, y);
        g.closePath();
        g.fill();
        // and dry bristle marks trailing out of it
        g.strokeStyle = "rgba(200,16,46,0.7)";
        g.lineCap = "round";
        for (let k = 0; k < 40; k++) {
          const y = ((k * 37) % 100) / 100 * H;
          g.lineWidth = 1 + (k % 4);
          g.beginPath();
          g.moveTo(x - 40, y);
          g.lineTo(x + 14 + ((k * 53) % 40), y + 2);
          g.stroke();
        }
        g.restore();
        break;
      }
      case "ink": {
        if (p < 0.5) {
          prev();
          const r = (p / 0.5) * diag * 0.62;
          g.fillStyle = "#050404";
          for (const [cx, cy, k] of [[0.3, 0.4, 1], [0.7, 0.55, 0.85], [0.5, 0.8, 0.9]] as const) {
            raggedCircle(g, cx * W, cy * H, r * k, cx * 9);
            g.fill();
          }
        } else {
          cur();
          const r = ((p - 0.5) / 0.5) * diag * 0.8;
          g.save();
          g.beginPath();
          g.rect(-10, -10, W + 20, H + 20);
          raggedCircle(g, W / 2, H * 0.55, r, 3);
          g.fillStyle = "#050404";
          g.fill("evenodd");
          g.restore();
        }
        break;
      }
      case "bloom": {
        prev();
        const r = Math.pow(p, 0.8) * diag * 0.66;
        g.save();
        raggedCircle(g, W / 2, H * 0.55, r, 5);
        g.clip();
        cur();
        g.restore();
        raggedCircle(g, W / 2, H * 0.55, r, 5);
        g.lineWidth = 12;
        g.strokeStyle = "rgba(170,40,60,0.18)";
        g.stroke();
        g.lineWidth = 2;
        g.strokeStyle = "rgba(150,30,50,0.4)";
        g.stroke();
        break;
      }
      default:
        cur();
    }
  }

  /* things that happen as the story passes a moment, going forward at the story's pace */
  const once = new Set<string>();
  function cues(from: number, to: number, dt: number) {
    if (to <= from) return;
    const pace = (to - from) / Math.max(dt, 1e-3);
    const live = pace < 2.6;
    for (const [at, name, shake, flash, arg] of CUES) {
      if (from < at && to >= at && live) {
        sound.play(name, arg);
        if (shake) state.shake = Math.max(state.shake, shake);
        if (flash) state.flash = Math.max(state.flash, flash);
      }
    }
    // the recordings start from their beginning the first time they're reached
    if (from < 0.4 && to >= 0.4 && !once.has("march")) {
      once.add("march");
      sound.restart("march");
    }
    if (from < 59.8 && to >= 59.8 && !once.has("anthem")) {
      once.add("anthem");
      sound.restart("anthem");
    }
    // the climax's tears, for whoever only scrolls
    AUTO_TEARS.forEach((at, k) => {
      if (!(from < at && to >= at)) return;
      if (live && state.flag) S.autoTear(w, k);
      else if (!live) state.flagIndex = Math.max(state.flagIndex, Math.min(k + 1, FLAGS.length - 1));
    });
  }

  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    removeEventListener("scroll", readScroll);
    root.removeEventListener("wv:seek", onSeek);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    tearBtn.removeEventListener("click", onTearBtn);
    soundBtn.removeEventListener("click", onSoundBtn);
    root.querySelector(".wv-begin-sound")?.removeEventListener("click", beginLoud);
    root.querySelector(".wv-begin-quiet")?.removeEventListener("click", beginQuiet);
    root.querySelector(".wv-replay")?.removeEventListener("click", onReplay);
    sound.dispose();
    state.gl.dispose();
  };
}

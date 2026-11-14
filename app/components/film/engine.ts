import { hash } from "./draw";
import { END, SCENES, film, sceneAt } from "./film";
import type { Tear, View } from "./kit";
import { CUES, Sound } from "./sound";

/* The film's player. One canvas, redrawn every frame from the film's clock
   (film.ts draws whatever moment it is given, so pausing, jumping and
   replaying are only a matter of setting the clock). Around it: the title
   card, the timeline with its eight scene marks, the sound, and the ways to
   play with the picture: click a grey worker and they stand, hold the press
   and it can't come down, drag across the paper and it tears (and is sewn
   back), save any frame as a poster. "Explore" loops the scene you are in.

   With reduced motion nothing plays: the film is eight still posters, one a
   scene, each with its caption. */

type State = "title" | "playing" | "paused" | "ended";

const HINTS = [
  "Drag across the picture: it tears, and is sewn back.",
  "In the shot down the line, click a worker: their eye lights, and the headband goes on.",
  "Press and hold: the press can\u2019t come down while you do.",
  "Drag across the picture to tear it. Pause anywhere and save the frame as a poster.",
];
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** photocopy grit and halftone dots, printed over every frame */
function gritTile() {
  const n = 320;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, n, n);
  x.fillStyle = "rgba(70,45,30,0.13)";
  for (let j = 0; j < n / 8; j++)
    for (let i = 0; i < n / 8; i++) {
      x.beginPath();
      x.arc(i * 8 + (j % 2) * 4, j * 8, 0.9 + 0.7 * hash(i * 7 + j * 13), 0, 7);
      x.fill();
    }
  for (let k = 0; k < 1500; k++) {
    x.fillStyle = `rgba(30,20,15,${(0.05 + 0.22 * hash(k + 0.3)).toFixed(3)})`;
    x.fillRect(hash(k) * n, hash(k + 0.7) * n, 1 + hash(k + 0.1) * 1.8, 1 + hash(k + 0.5) * 1.8);
  }
  x.strokeStyle = "rgba(30,20,15,0.16)";
  x.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    const px = hash(k + 20) * n, py = hash(k + 30) * n;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px + 20 * hash(k + 1) - 10, py + 14, px + 30 * hash(k + 2) - 15, py + 30 * hash(k + 3));
    x.stroke();
  }
  return c;
}

export function startFilm(root: HTMLElement): () => void {
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>(".film-canvas");
  const g = canvas.getContext("2d", { alpha: false })!;
  const fill = $(".film-fill"), timeEl = $(".film-time"), caption = $(".film-caption");
  const toggleBtn = $<HTMLButtonElement>(".film-toggle"), soundBtn = $<HTMLButtonElement>(".film-sound"), exploreBtn = $<HTMLButtonElement>(".film-explore");
  const line = $(".film-line"), endCard = $(".film-end"), titleCard = $(".film-title");
  const marks = [...root.querySelectorAll<HTMLButtonElement>(".film-marks button")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sound = new Sound();
  const tile = gritTile();

  let state: State = "title";
  let t = 0, cueI = 0, jumped = false, explore = false, autoPaused = false, stills = reduce.matches;
  let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), now = 0, dirty = true, idleAt = 0;
  let shownScene = -1, shownSec = -1, shownState = "";
  let quality = 1, slow = 0, counted = 0;
  const css = getComputedStyle(root);
  const face = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const view: View = {
    g, W: 0, H: 0, t: 0, now: 0, reduced: stills,
    fonts: { poster: face("--font-poster", "Impact, sans-serif"), hand: face("--font-hand", "cursive"), mono: face("--font-mono", "monospace"), display: face("--font-display", "serif") },
    poked: new Map(), pressHeld: false, tears: [], grit: null, zones: [], holdable: false,
  };
  let drag: { x: number; y: number; id: number; at: number; tear: Tear | null; press: boolean; worker?: number } | null = null;
  const timers = new Set<number>();
  const later = (ms: number, f: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      f();
    }, ms);
    timers.add(id);
  };

  // ── size ──
  function size() {
    // sharp, but no more pixels than a laptop can redraw sixty times a second (fewer still if it has shown it can't)
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.2e6 / (cw * ch))) * quality;
    const w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (w === W && h === H) return;
    W = canvas.width = w;
    H = canvas.height = h;
    view.W = W;
    view.H = H;
    view.grit = g.createPattern(tile, "repeat");
    view.grit?.setTransform(new DOMMatrix().scale(dpr));
    dirty = true;
  }
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  size();

  // ── the clock ──
  function setState(s: State) {
    state = s;
    root.dataset.state = s;
    dirty = true;
  }
  function seek(to: number) {
    const back = to < t;
    t = Math.min(END, Math.max(0, to));
    cueI = CUES.findIndex((c) => c[0] > t);
    if (cueI < 0) cueI = CUES.length;
    jumped = true;
    if (back) view.poked.clear();
    view.pressHeld = false;
    dirty = true;
  }
  function begin(withSound: boolean) {
    if (withSound && !stills) setSound(true);
    explore = false;
    seek(stills ? SCENES[0].key : 0);
    setState(stills ? "paused" : "playing");
    (stills ? $<HTMLButtonElement>(".film-next") : toggleBtn).focus({ preventScroll: true });
  }
  function toggle() {
    if (stills || state === "title") return;
    if (state === "ended") return begin(false);
    setState(state === "playing" ? "paused" : "playing");
  }
  function jump(k: number) {
    const s = SCENES[Math.max(0, Math.min(SCENES.length - 1, k))];
    seek(stills ? s.key : s.at);
    if (stills) setState("paused");
    else if (state === "title" || state === "ended") setState("playing");
  }
  function setSound(on: boolean) {
    if (on) sound.enable();
    else sound.disable();
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.textContent = on ? "Sound on" : "Sound off";
    root.dataset.sound = on ? "on" : "off";
  }
  function setExplore(on: boolean) {
    explore = on && !stills;
    exploreBtn.setAttribute("aria-pressed", String(explore));
    dirty = true;
  }

  // ── the frame ──
  function frame(ms: number) {
    raf = requestAnimationFrame(frame);
    const gap = ms - last;
    const dt = Math.min(0.05, Math.max(0, gap / 1000));
    last = ms;
    // falling behind? draw fewer pixels
    if (state === "playing" && gap < 200) {
      counted++;
      if (gap > 24) slow++;
      if (counted >= 90) {
        if (slow > 45 && quality > 0.5) {
          quality *= 0.8;
          size();
        }
        counted = slow = 0;
      }
    }
    if (!stills) now += dt;
    if (state === "playing") {
      t += dt;
      if (explore) {
        const k = sceneAt(Math.min(t - dt, END - 0.01));
        const to = k + 1 < SCENES.length ? SCENES[k + 1].at : END;
        if (t >= to) seek(SCENES[k].at);
      }
      if (t >= END) {
        t = END;
        setState("ended");
      }
      while (cueI < CUES.length && CUES[cueI][0] <= t) {
        const [, name, arg] = CUES[cueI++];
        sound.play(name === "press" && view.pressHeld ? "strain" : name, arg);
      }
    }
    // the music is the film's metronome: while it sounds, the clock leans toward it
    const err = sound.frame(t, state === "playing", state === "ended", jumped);
    if (state === "playing" && err && Math.abs(err) < 0.45 && t < END - 0.5) t += err * 0.1;
    jumped = false;
    if (drag?.tear) drag.tear.born = now - 0.2;
    if (view.tears.length) view.tears = view.tears.filter((tr) => now - tr.born < 2.5);

    if (!stills || dirty) {
      view.t = t;
      view.now = now;
      view.reduced = stills;
      if (state === "title") {
        // behind the title card: bare paper
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = 1;
        g.fillStyle = "#fbf6ea";
        g.fillRect(0, 0, W, H);
        if (view.grit) {
          g.save();
          g.globalAlpha = 0.28;
          g.globalCompositeOperation = "multiply";
          g.fillStyle = view.grit;
          g.fillRect(0, 0, W, H);
          g.restore();
        }
      } else film(view);
    }
    chrome(ms);
    dirty = false;
  }

  /** everything around the picture: the timeline, the cards, what the page says about itself */
  function chrome(ms: number) {
    fill.style.transform = `scaleX(${(t / END).toFixed(4)})`;
    root.dataset.t = t.toFixed(2);
    // (for the tests: where the first thing that can be clicked is)
    const z = view.zones[0], zs = z ? `${Math.round(z.x / dpr)},${Math.round(z.y / dpr)}` : "";
    if (root.dataset.zone !== zs) root.dataset.zone = zs;
    const sec = Math.floor(t);
    if (sec !== shownSec) {
      shownSec = sec;
      timeEl.textContent = `${clock(t)} / ${clock(END)}`;
    }
    const k = sceneAt(t);
    const key = `${state}|${explore}|${stills}`;
    if (k !== shownScene || key !== shownState) {
      shownScene = k;
      shownState = key;
      root.dataset.state = state;
      root.dataset.scene = String(k + 1);
      root.toggleAttribute("data-explore", explore);
      root.toggleAttribute("data-stills", stills);
      marks.forEach((m, i) => (i === k ? m.setAttribute("aria-current", "true") : m.removeAttribute("aria-current")));
      toggleBtn.setAttribute("aria-label", state === "playing" ? "Pause" : state === "ended" ? "Watch again" : "Play");
      toggleBtn.dataset.icon = state === "playing" ? "pause" : "play";
      titleCard.inert = state !== "title";
      endCard.inert = !(state === "ended" && !explore);
      caption.textContent = state === "title" ? "" : stills ? `${k + 1} / ${SCENES.length} · ${SCENES[k].line}` : explore ? HINTS[Math.min(k, HINTS.length - 1)] : "";
    }
    // the controls step back while it plays and nobody is reaching for them
    root.toggleAttribute("data-idle", state === "playing" && !explore && ms - idleAt > 2600);
  }

  // ── hands on the picture ──
  const at = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
    const z = view.zones.find((q) => Math.hypot(x - q.x, y - q.y) < q.r);
    return { x, y, worker: z?.id, press: view.holdable && !z };
  };
  function down(e: PointerEvent) {
    if (state === "title" || stills || e.button > 0) return;
    const p = at(e);
    drag = { x: p.x, y: p.y, id: e.pointerId, at: performance.now(), tear: null, press: p.press, worker: p.worker };
    canvas.setPointerCapture(e.pointerId);
    if (p.press) {
      view.pressHeld = true;
      sound.play("strain");
    }
  }
  function move(e: PointerEvent) {
    idleAt = performance.now();
    if (state === "title" || stills) return;
    const p = at(e);
    if (!drag) {
      canvas.style.cursor = p.worker !== undefined || p.press ? "pointer" : "";
      return;
    }
    if (drag.press || e.pointerId !== drag.id) return;
    if (!drag.tear) {
      if (Math.hypot(p.x - drag.x, p.y - drag.y) < 12 * dpr) return;
      drag.tear = { pts: [drag.x, drag.y], born: now - 0.2 };
      view.tears.push(drag.tear);
      sound.play("rip");
    }
    const pts = drag.tear.pts;
    if (Math.hypot(p.x - pts[pts.length - 2], p.y - pts[pts.length - 1]) > 14 * dpr && pts.length < 400) pts.push(p.x, p.y);
  }
  function up(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.press) {
      view.pressHeld = false;
      // a tap is still a tap
      if (e.type === "pointerup" && performance.now() - d.at < 280) toggle();
    } else if (d.tear) {
      root.dataset.torn = String(Number(root.dataset.torn ?? 0) + 1);
      for (let k = 0; k < 6; k++) later(750 + k * 130, () => sound.play("stitch", k * 3));
    } else if (e.type === "pointerup") {
      if (d.worker !== undefined) {
        if (!view.poked.has(d.worker)) {
          view.poked.set(d.worker, now);
          root.dataset.stood = String(view.poked.size);
          sound.play("stand", 2);
        }
      } else toggle();
    }
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  /** the frame as it stands, printed large, with the film's name in the corner */
  function poster() {
    const c = document.createElement("canvas");
    const tall = H > W * 1.05;
    c.width = tall ? 1500 : 2400;
    c.height = tall ? 2400 : 1500;
    const pg = c.getContext("2d", { alpha: false })!;
    const grit = pg.createPattern(tile, "repeat");
    grit?.setTransform(new DOMMatrix().scale(2));
    film({ ...view, g: pg, W: c.width, H: c.height, t, now, grit, tears: [], zones: [], reduced: true });
    pg.font = `700 26px ${view.fonts.mono}`;
    pg.textBaseline = "alphabetic";
    pg.fillStyle = "#17110f";
    pg.fillText(`ALL OF US  ·  ${SCENES[sceneAt(t)].name.toUpperCase()}  ·  ${clock(t)}`, 48, c.height - 44);
    c.toBlob((blob) => {
      if (!blob) return;
      root.dataset.poster = String(blob.size);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `all-of-us-${clock(t).replace(":", "m")}s.png`;
      a.click();
      later(4000, () => URL.revokeObjectURL(a.href));
    }, "image/png");
  }

  // ── the controls ──
  function click(e: MouseEvent) {
    const b = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!b || !root.contains(b)) return;
    idleAt = performance.now();
    if (b.classList.contains("film-play-sound")) begin(true);
    else if (b.classList.contains("film-play-quiet")) begin(false);
    else if (b === toggleBtn) toggle();
    else if (b === soundBtn) setSound(!sound.on);
    else if (b === exploreBtn) {
      setExplore(!explore);
      if (explore && state === "ended") jump(1);
    }
    else if (b.classList.contains("film-again")) begin(false);
    else if (b.classList.contains("film-explore-go")) {
      setExplore(true);
      jump(1);
      exploreBtn.focus({ preventScroll: true });
    } else if (b.classList.contains("film-poster")) poster();
    else if (b.classList.contains("film-prev")) jump(sceneAt(t) - 1);
    else if (b.classList.contains("film-next")) jump(sceneAt(t) + 1);
    else if (b.dataset.scene) jump(Number(b.dataset.scene));
  }
  /** a click on the line itself (not on a mark) goes to that moment */
  function scrub(e: PointerEvent) {
    if ((e.target as HTMLElement).closest("button") || stills) return;
    const r = line.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * END);
    if (state === "ended" && t < END) setState("playing");
  }
  function key(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey || state === "title") return;
    const el = e.target as HTMLElement;
    const typing = el.closest("input, textarea, select, [contenteditable]");
    if (typing) return;
    idleAt = performance.now();
    // space plays and pauses, from anywhere but another control (on a scene mark, Enter is what jumps)
    if ((e.key === " " || e.key === "k") && (!el.closest("button, a") || el.closest(".film-marks"))) {
      e.preventDefault();
      if (stills) jump(sceneAt(t) + 1);
      else toggle();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      if (stills) jump(sceneAt(t) + dir);
      else {
        seek(t + dir * 5);
        if (state === "ended" && t < END) setState("playing");
      }
    } else if (e.key === "m" && !stills) setSound(!sound.on);
  }
  /** for the tests, and anything else that wants a moment of the film: { t, pause? } */
  function onSeek(e: Event) {
    const d = (e as CustomEvent<{ t: number; pause?: boolean }>).detail;
    seek(d.t);
    setState(d.pause || stills ? "paused" : t >= END ? "ended" : "playing");
  }
  function visible() {
    if (document.hidden && state === "playing") {
      autoPaused = true;
      setState("paused");
    } else if (!document.hidden && autoPaused) {
      autoPaused = false;
      if (state === "paused") setState("playing");
    }
    last = performance.now();
  }
  function motion() {
    stills = reduce.matches;
    if (stills) {
      setSound(false);
      setExplore(false);
      if (state !== "title") jump(sceneAt(t));
    }
    dirty = true;
  }
  root.addEventListener("click", click);
  line.addEventListener("pointerdown", scrub);
  window.addEventListener("keydown", key);
  root.addEventListener("film:seek", onSeek);
  root.addEventListener("pointermove", () => (idleAt = performance.now()));
  document.addEventListener("visibilitychange", visible);
  reduce.addEventListener("change", motion);

  // the type is set on the canvas: have its faces in before the first word lands
  const faces = [`400 80px ${view.fonts.poster}`, `700 40px ${view.fonts.hand}`, `700 40px ${view.fonts.mono}`, `400 40px ${view.fonts.display}`];
  void Promise.allSettled(faces.map((f) => document.fonts.load(f, "ALL OF US. NOT A LADDER"))).then(() => {
    root.dataset.ready = "";
    dirty = true;
  });
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    for (const id of timers) clearTimeout(id);
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", up);
    root.removeEventListener("click", click);
    line.removeEventListener("pointerdown", scrub);
    window.removeEventListener("keydown", key);
    root.removeEventListener("film:seek", onSeek);
    document.removeEventListener("visibilitychange", visible);
    reduce.removeEventListener("change", motion);
    sound.dispose();
  };
}

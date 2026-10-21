import * as THREE from "three";
import {
  applyPose,
  makeArt,
  planeGeometry,
  setRows,
  uni,
  type ArtObj,
} from "./art";
import { clock } from "./clock";
import {
  ART_URLS,
  H,
  LEN,
  MESH,
  MOBILE_QUERY,
  MOTION,
  P,
  PALETTE,
  STAGES,
  STAGE_COUNT,
  THREADS,
  TRANSITIONS,
  WINDOWS,
} from "./config";
import { computeLayout, type Layout } from "./stage-layout";
import { QuoteController } from "./quote";
import { loadArt, randomOpaque, rasterize, type ArtSource, type Raster } from "./raster";
import { RibbonBatch } from "./ribbons";
import { BG_FRAG, BG_VERT } from "./shaders";
import { buildShardMesh, poseShards, POSE_STRIDE, type ShardMesh } from "./shards";
import {
  createSuitGeometry,
  displayPose,
  figFloat,
  inPose,
  landedPose,
  outPose,
  suitProject,
  updateSuitGeometry,
  type SuitPose,
} from "./suit";
import {
  buildThreadSets,
  drawThreads,
  rowProgress,
  type Surface,
  type Thread,
} from "./threads";
import { easeInOutSine, mulberry32, win, type Vec2 } from "./utils";
import { drawShardYarn } from "./yarn";

export interface HeroEngine {
  dispose(): void;
}

interface ShardLayer {
  art: ArtObj;
  sm: ShardMesh;
  pose: Float32Array;
}

interface Built {
  scene: THREE.Scene;
  bgMat: THREE.ShaderMaterial;
  textures: THREE.Texture[];
  planes: ArtObj[];
  pattern: ArtObj;
  suit: ArtObj;
  suitGeo: THREE.BufferGeometry;
  shards: Record<string, ShardLayer>;
  all: ArtObj[];
  rasters: { av: Raster[]; suit: Raster; pat: Raster };
  threads: Thread[][];
  back: RibbonBatch;
  mid: RibbonBatch;
  front: RibbonBatch;
  lw: number;
  rowsP: Float32Array;
  rowsS: Float32Array;
  rowsA: Float32Array;
}

const FLAT = new Float32Array(THREADS.rows);

export class CancelledError extends Error {}

export async function createEngine(
  root: HTMLElement,
  isCancelled: () => boolean = () => false,
): Promise<HeroEngine> {
  THREE.ColorManagement.enabled = false;
  const debug = new URLSearchParams(window.location.search).has("hero-debug");
  const t00 = performance.now();
  const dbg = (m: string) => {
    if (debug) console.info(`[hero] ${m} @${Math.round(performance.now() - t00)}ms`);
  };

  const q = <T extends Element = HTMLElement>(name: string) =>
    root.querySelector<T>(`[data-hero="${name}"]`);
  const stage = q("stage")!;
  const mount = q("canvas")!;
  const caption = q("caption");
  const titleEl = q("title");
  const subEl = q("sub");
  const prevBtn = q<HTMLButtonElement>("prev");
  const nextBtn = q<HTMLButtonElement>("next");
  const playBtn = q<HTMLButtonElement>("play");
  const fillEl = q("fill");

  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-step]"));
  const threadSvg = q<SVGSVGElement>("thread");
  const threadPath = q<SVGPathElement>("thread-path");
  const threadDot = q<SVGCircleElement>("thread-dot");
  const noteRoot = q("note")!;

  // the artwork decodes off the main thread (see loadArt) while the renderer is made
  const urls = [...ART_URLS.avatars, ART_URLS.suit, ART_URLS.patterns];
  const loading = Promise.all(urls.map(loadArt));
  loading.catch(() => {}); // abandoned if WebGL is unavailable below

  // ── renderer ────────────────────────────────────────────────────────────────────────────
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch {
    throw new Error("WebGL unavailable");
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(new THREE.Color(PALETTE.paper), 1);

  let images: ArtSource[];
  try {
    images = await loading;
  } catch (err) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw err;
  }
  const closeImages = () => images.forEach((im) => "close" in im && im.close());
  dbg("images decoded");
  // a cancelled mount (React StrictMode) stops here without touching the page
  if (isCancelled()) {
    closeImages();
    renderer.dispose();
    renderer.forceContextLoss();
    throw new CancelledError();
  }
  const avImgs = images.slice(0, 4);
  const suitImg = images[4];
  const patImg = images[5];

  const quote = new QuoteController(noteRoot);

  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", STAGES[0].alt);
  mount.appendChild(canvas);

  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);

  const mobileMQ = window.matchMedia(MOBILE_QUERY);
  let L: Layout = computeLayout(
    stage.clientWidth || 1,
    stage.clientHeight || 1,
    1,
    mobileMQ.matches,
  );
  let built: Built | null = null;
  let liveFloat = 0;
  let liveSuit: SuitPose = displayPose(L, 0);

  const makeTexture = (r: Raster) => {
    const t = new THREE.CanvasTexture(r.canvas);
    t.flipY = false;
    t.premultiplyAlpha = true;
    t.colorSpace = THREE.NoColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  };

  function disposeBuilt(b: Built) {
    b.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    b.textures.forEach((t) => t.dispose());
    b.back.dispose();
    b.mid.dispose();
    b.front.dispose();
  }

  function rebuild() {
    const w = Math.round(stage.clientWidth);
    const h = Math.round(stage.clientHeight);
    if (w < 2 || h < 2) return;
    if (built) disposeBuilt(built);

    L = computeLayout(w, h, window.devicePixelRatio || 1, mobileMQ.matches);
    renderer.setPixelRatio(L.dpr);
    renderer.setSize(w, h, true);
    camera.left = 0;
    camera.right = w;
    camera.top = 0;
    camera.bottom = h;
    camera.updateProjectionMatrix();

    const scene = new THREE.Scene();
    const textures: THREE.Texture[] = [];

    dbg("rasterising");
    // rasterise once per layout
    const av = avImgs.map((img) => rasterize(img, L.fig.w, L.fig.h, L.dpr));
    const suitR = rasterize(suitImg, L.fig.w, L.fig.h, L.dpr);
    const patR = rasterize(patImg, L.pat.w, L.pat.h, L.dpr);
    const avTex = av.map(makeTexture);
    const suitTex = makeTexture(suitR);
    const patTex = makeTexture(patR);
    textures.push(...avTex, suitTex, patTex);

    // background: paper, grain, wobbly grid
    const bgGeo = planeGeometry(w, h);
    const bgMat = new THREE.ShaderMaterial({
      vertexShader: BG_VERT,
      fragmentShader: BG_FRAG,
      uniforms: {
        uSize: { value: new THREE.Vector2(w, h) },
        uHot: { value: 0 },
        uHotC: { value: new THREE.Vector2(L.figCx, L.figCy) },
        uHotR: { value: h * 0.85 },
        uSeed: { value: 3.7 },
      },
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = 0;
    scene.add(bg);

    const all: ArtObj[] = [];
    const add = (a: ArtObj) => {
      scene.add(a.mesh);
      all.push(a);
      return a;
    };

    const pattern = add(makeArt(patTex, planeGeometry(L.pat.w, L.pat.h), L.pat.w, L.pat.h, 10));
    pattern.origin.set(L.pat.x, L.pat.y);
    const planes = avTex.map((t) =>
      add(makeArt(t, planeGeometry(L.fig.w, L.fig.h), L.fig.w, L.fig.h, 30)),
    );
    const suitGeo = createSuitGeometry();
    const suit = add(makeArt(suitTex, suitGeo, L.fig.w, L.fig.h, 40));

    // tear meshes: old + new per transition
    const defs: { t: number; role: "old" | "new"; av: number }[] = [
      { t: 0, role: "old", av: 0 },
      { t: 0, role: "new", av: 1 },
      { t: 1, role: "old", av: 1 },
      { t: 1, role: "new", av: 2 },
      { t: 2, role: "old", av: 2 },
      { t: 3, role: "old", av: 3 },
      { t: 3, role: "new", av: 0 },
    ];
    const shards: Record<string, ShardLayer> = {};
    for (const d of defs) {
      const sm = buildShardMesh(
        L.fig.w,
        L.fig.h,
        1000 + d.t * 17 + (d.role === "new" ? 5 : 0),
        av[d.av],
        L.mobile,
        TRANSITIONS[d.t].tech,
      );
      const art = add(makeArt(avTex[d.av], sm.geometry, L.fig.w, L.fig.h, d.role === "old" ? 31 : 32));
      shards[`${d.t}-${d.role}`] = { art, sm, pose: new Float32Array(sm.count * POSE_STRIDE) };
    }

    const back = new RibbonBatch(THREADS.maxVerts, 20);
    const mid = new RibbonBatch(THREADS.maxVerts, 35);
    const front = new RibbonBatch(THREADS.maxVerts, 50);
    scene.add(back.mesh, mid.mesh, front.mesh);

    // woven surfaces: loom rows + how raster points map onto the stage
    const patternSurf: Surface = {
      rows: patR.rows,
      point: (u, v, o) => {
        o[0] = L.pat.x + u * L.pat.w;
        o[1] = L.pat.y + v * L.pat.h;
      },
    };
    const avatar4Surf: Surface = {
      rows: av[3].rows,
      point: (u, v, o) => {
        o[0] = L.fig.x + u * L.fig.w;
        o[1] = L.fig.y + v * L.fig.h + liveFloat;
      },
    };
    const suitSurf: Surface = {
      rows: suitR.rows,
      point: (u, v, o) => suitProject(liveSuit, L.fig.w, L.fig.h, u, v, o),
    };

    const figPt = (n: number, rng: () => number): Vec2 => {
      const [x, y] = randomOpaque(av[n], rng);
      return [L.fig.x + x * L.fig.w, L.fig.y + y * L.fig.h];
    };
    liveSuit = displayPose(L, 0);
    const threads = buildThreadSets({
      L,
      rng: mulberry32(2026),
      patternSurf,
      suitSurf,
      avatar4Surf,
      pickFigure: figPt,
      pickPattern: (rng) => {
        const [x, y] = randomOpaque(patR, rng);
        return [L.pat.x + x * L.pat.w, L.pat.y + y * L.pat.h];
      },
      pickSuitUV: (rng) => randomOpaque(suitR, rng),
      suitOutAt: (u, uu, vv, out) => suitProject(outPose(L, 0, u), L.fig.w, L.fig.h, uu, vv, out),
      suitInAt: (u, uu, vv, out) => suitProject(inPose(L, 0, u), L.fig.w, L.fig.h, uu, vv, out),
    });

    dbg("scene built");
    built = {
      scene,
      bgMat,
      textures,
      planes,
      pattern,
      suit,
      suitGeo,
      shards,
      all,
      rasters: { av, suit: suitR, pat: patR },
      threads,
      back,
      mid,
      front,
      lw: Math.max(1.6, L.fig.w / 300) / 2,
      rowsP: new Float32Array(THREADS.rows),
      rowsS: new Float32Array(THREADS.rows),
      rowsA: new Float32Array(THREADS.rows),
    };

    if (threadSvg) threadSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    lastShow = -1;
    dirty = true;
  }

  // ── per-frame state: a pure function of time ────────────────────────────
  function renderFrame(tm: number) {
    const b = built;
    if (!b) return;
    const { k, u } = clock(tm);
    const nxt = (k + 1) % STAGE_COUNT;
    const fl = figFloat(tm);
    liveFloat = fl;
    liveSuit = displayPose(L, tm);

    const boilT = Math.floor(tm * MOTION.boilFps);
    for (const a of b.all) {
      a.mesh.visible = false;
      uni(a).uTime.value = boilT;
    }
    b.back.begin();
    b.mid.begin();
    b.front.begin();
    const bg = b.bgMat.uniforms;
    bg.uHot.value = u > 0 ? Math.sin(Math.PI * u) : 0;

    const plane = (n: number, order: number, fab: number, rel: number, dx = 0) => {
      const a = b.planes[n];
      a.mesh.visible = true;
      a.mesh.renderOrder = order;
      a.origin.set(L.fig.x + dx, L.fig.y + fl);
      uni(a).uFab.value = fab;
      uni(a).uRel.value = rel;
      uni(a).uRowMode.value = 0;
      return a;
    };
    const placeSuit = (pose: SuitPose) => {
      updateSuitGeometry(b.suitGeo, pose, L.fig.w, L.fig.h);
      uni(b.suit).uAlpha.value = pose.alpha;
      b.suit.mesh.visible = pose.alpha > 0.003;
    };
    const flat = FLAT;

    if (u === 0) {
      // hold: only the gentle float moves
      plane(k, 30, 0, 0);
      if (k === 0) {
        b.pattern.mesh.visible = true;
        setRows(b.pattern, b.rasters.pat.rows, flat, 0);
      } else if (k === 1) {
        placeSuit(displayPose(L, tm));
        setRows(b.suit, b.rasters.suit.rows, flat, 0);
      }
    } else {
      const cfg = TRANSITIONS[k];
      const set = b.threads[k];

      // old figure: cloth wipe → strain → jagged tear
      const sw = win(u, cfg.tear[0] - 0.06, cfg.tear[0] + 0.03);
      const strain =
        Math.sin(Math.PI * sw) *
        MOTION.strainPx *
        Math.sin(2 * Math.PI * MOTION.strainHz * tm);
      if (u <= cfg.tear[0]) {
        plane(k, 31, easeInOutSine(win(u, cfg.fab[0], cfg.fab[1])), 0, strain);
      } else if (u < cfg.tear[1]) {
        const s = b.shards[`${k}-old`];
        poseShards(s.sm, "old", u, cfg.tear[0], cfg.tear[1], s.pose);
        applyPose(s.art, s.pose, s.sm.count);
        s.art.mesh.visible = true;
        s.art.origin.set(L.fig.x + strain, L.fig.y + fl);
        uni(s.art).uFab.value = 1;
        uni(s.art).uRel.value = 0;
        drawShardYarn(b.mid, s.sm, s.pose, "old", L.fig.x + strain, L.fig.y + fl, b.lw);
      }

      // new figure: stitched up from the feet, then relaxed to line art
      if (cfg.assemble && cfg.relax) {
        const [a0, a1] = cfg.assemble;
        const rel = easeInOutSine(win(u, cfg.relax[0], cfg.relax[1]));
        if (u > a0 && u < a1) {
          const s = b.shards[`${k}-new`];
          poseShards(s.sm, "new", u, a0, a1, s.pose);
          applyPose(s.art, s.pose, s.sm.count);
          s.art.mesh.visible = true;
          s.art.origin.set(L.fig.x, L.fig.y + fl);
          uni(s.art).uFab.value = 1;
          uni(s.art).uRel.value = rel;
          drawShardYarn(b.mid, s.sm, s.pose, "new", L.fig.x, L.fig.y + fl, b.lw);
        } else if (u >= a1) {
          plane(nxt, 32, 1, rel);
        }
      }

      // transition-specific layers
      if (k === 0) {
        // pattern sheet unspools; threads weave the suit
        if (u < WINDOWS.patternUnweave[1] + 0.05) {
          rowProgress(set, u, "unweave", b.rowsP);
          b.pattern.mesh.visible = true;
          setRows(b.pattern, b.rasters.pat.rows, b.rowsP, 2);
        }
        if (u >= WINDOWS.suitWeave[0] - 0.03) {
          rowProgress(set, u, "weave", b.rowsS);
          placeSuit(displayPose(L, tm));
          setRows(b.suit, b.rasters.suit.rows, b.rowsS, 1);
        }
      } else if (k === 1) {
        if (u < WINDOWS.suitOut[1] + 0.005) {
          placeSuit(outPose(L, tm, u));
          setRows(b.suit, b.rasters.suit.rows, flat, 0);
        }
      } else if (k === 2) {
        // suit lands on the final body, avatar is woven over it
        if (u >= WINDOWS.suitIn[0] - 0.01 && u < 0.995) {
          rowProgress(set, u, "weave", b.rowsA);
          placeSuit(u < WINDOWS.suitIn[1] ? inPose(L, tm, u) : landedPose(L, tm));
          setRows(b.suit, b.rasters.av[3].rows, b.rowsA, 2);
        }
        if (u > WINDOWS.finalWeave[0] - 0.02) {
          rowProgress(set, u, "weave", b.rowsA);
          const a = plane(3, 41, 0, 0);
          setRows(a, b.rasters.av[3].rows, b.rowsA, 1);
        }
      } else if (k === 3) {
        if (u > WINDOWS.patternWeave[0] - 0.08) {
          rowProgress(set, u, "weave", b.rowsP);
          b.pattern.mesh.visible = true;
          setRows(b.pattern, b.rasters.pat.rows, b.rowsP, 1);
        }
      }

      drawThreads(set, u, b.back, b.front, b.lw);
    }

    b.back.commit();
    b.mid.commit();
    b.front.commit();
    renderer.render(b.scene, camera);
  }

  // ── DOM sync ────────────────────────────────────────────────────────────
  let lastHdr = -1;
  let lastShow = -1;
  let lastAria = "";

  function updateThread(vis: number) {
    if (!threadPath || !threadDot) return;
    if (L.mobile) {
      threadPath.style.opacity = "0";
      threadDot.style.opacity = "0";
      return;
    }
    const frame = noteRoot.querySelector<HTMLElement>("[data-hero=qbox]");
    if (!frame) return;
    const st = stage.getBoundingClientRect();
    const qb = frame.getBoundingClientRect();
    const sx = qb.right - st.left;
    const sy = qb.top - st.top + qb.height * 0.5;
    const ex = L.fig.x + L.fig.w * 0.5 - L.fig.w * 0.2;
    const ey = L.fig.y + L.fig.h * 0.085;
    threadPath.setAttribute(
      "d",
      `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${((sx + ex) / 2).toFixed(1)} ${(
        Math.min(sy, ey) - 46
      ).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    );
    threadDot.setAttribute("cx", ex.toFixed(1));
    threadDot.setAttribute("cy", ey.toFixed(1));
    threadPath.style.opacity = vis.toFixed(2);
    threadDot.style.opacity = vis.toFixed(2);
  }

  function syncDom(tm: number) {
    const { k, u, p } = clock(tm);
    const nxt = (k + 1) % STAGE_COUNT;

    // the caption always names a stage; mid-transition it switches to the incoming one
    const cap = u >= 0.45 ? nxt : k;
    if (cap !== lastHdr) {
      lastHdr = cap;
      if (titleEl) titleEl.textContent = STAGES[cap].title;
      if (subEl) subEl.textContent = STAGES[cap].sub;
      if (caption) {
        caption.classList.remove("flip");
        void caption.offsetWidth;
        caption.classList.add("flip");
      }
    }

    const vis = quote.update(k, u);
    const showNow = u >= 0.45 ? nxt : k;
    if (showNow !== lastShow) {
      lastShow = showNow;
      requestAnimationFrame(() => updateThread(vis));
    } else {
      if (threadPath) threadPath.style.opacity = vis.toFixed(2);
      if (threadDot) threadDot.style.opacity = vis.toFixed(2);
    }

    const active = Math.round(p) % STAGE_COUNT;
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === active);
      d.classList.toggle("done", i < active && p < STAGE_COUNT - 0.5);
      if (i === active) d.setAttribute("aria-current", "step");
      else d.removeAttribute("aria-current");
    });
    if (fillEl) fillEl.style.transform = `scaleX(${(Math.min(p, STAGE_COUNT - 1) / (STAGE_COUNT - 1)).toFixed(4)})`;

    const aria = STAGES[cap].alt;
    if (aria !== lastAria) {
      lastAria = aria;
      canvas.setAttribute("aria-label", aria);
    }
  }

  // ── controls and clock ──────────────────────────────────────────────────
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let t = reduced ? 3 * P : 0;
  let playing = !reduced;
  let tween: { target: number; resume: boolean } | null = null;
  let visible = true;
  let dirty = true;
  let raf = 0;
  let last = performance.now();

  const setPlaying = (v: boolean) => {
    playing = v;
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", String(!v));
      playBtn.setAttribute("aria-label", v ? "Pause animation" : "Play animation");
      playBtn.dataset.state = v ? "playing" : "paused";
    }
  };
  setPlaying(playing);

  const tweenTo = (target: number) => {
    tween = { target, resume: tween ? tween.resume : playing };
    playing = false;
  };
  const next = () => tweenTo((Math.floor(t / P + 1e-6) + 1) * P);
  const prev = () => tweenTo((Math.ceil(t / P - 1e-6) - 1) * P);
  const toStage = (j: number) => {
    const m = Math.round((t - j * P) / LEN);
    tweenTo(j * P + m * LEN);
  };
  const toggle = () => {
    if (tween) {
      tween.resume = !tween.resume;
      setPlaying(false);
      return;
    }
    setPlaying(!playing);
  };

  const onPrev = () => prev();
  const onNext = () => next();
  const onPlay = () => toggle();
  prevBtn?.addEventListener("click", onPrev);
  nextBtn?.addEventListener("click", onNext);
  playBtn?.addEventListener("click", onPlay);
  const dotHandlers = dots.map((d, i) => {
    const fn = () => toStage(i);
    d.addEventListener("click", fn);
    return fn;
  });

  const onKey = (e: KeyboardEvent) => {
    if (!visible || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.code === "Space" && tag !== "BUTTON") {
      e.preventDefault();
      toggle();
    } else if (e.code === "ArrowRight") {
      next();
    } else if (e.code === "ArrowLeft") {
      prev();
    }
  };
  window.addEventListener("keydown", onKey);

  function frame(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (tween) {
      const dist = tween.target - t;
      const speed = MOTION.tweenSpeed * Math.min(1, 0.22 + Math.abs(dist) / 1.4);
      const step = Math.min(Math.abs(dist), speed * dt);
      t += Math.sign(dist) * step;
      if (Math.abs(tween.target - t) < 1e-4) {
        t = tween.target;
        const resume = tween.resume;
        tween = null;
        setPlaying(resume);
      }
      dirty = true;
    } else if (playing) {
      t += dt;
      dirty = true;
    }
    if (!tween) {
      if (t >= LEN) t -= LEN;
      else if (t < 0) t += LEN;
    }

    if (dirty) {
      dirty = false;
      renderFrame(t);
      syncDom(t);
    }
    raf = requestAnimationFrame(frame);
  }
  const kick = () => {
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  // ── observers ───────────────────────────────────────────────────────────
  // animate only while the hero is meaningfully on screen: once most of it has
  // scrolled away, its frames would only compete with scrolling the page below
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35);
      if (visible) kick();
    },
    { threshold: [0, 0.35] },
  );
  io.observe(root);

  let lastW = 0;
  let lastH = 0;
  let debounce = 0;
  const onMQ = () => {
    lastW = 0;
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      lastW = Math.round(stage.clientWidth);
      lastH = Math.round(stage.clientHeight);
      rebuild();
    }, 120);
  };
  mobileMQ.addEventListener("change", onMQ);
  const ro = new ResizeObserver(() => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      const w = Math.round(stage.clientWidth);
      const h = Math.round(stage.clientHeight);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      rebuild();
    }, 120);
  });
  ro.observe(stage);

  const onLost = (e: Event) => e.preventDefault();
  const onRestored = () => {
    rebuild();
    kick();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  lastW = Math.round(stage.clientWidth);
  lastH = Math.round(stage.clientHeight);
  rebuild();
  // compile every shader in parallel, off the main thread (KHR_parallel_shader_compile),
  // before the first frame; otherwise that frame blocks the page for ~0.4 s
  const first = built as Built | null; // assigned inside rebuild(): TS can't see it
  if (first) await renderer.compileAsync(first.scene, camera);
  dbg("shaders compiled");
  renderFrame(t);
  dbg("first frame");
  syncDom(t);
  const readyToken = String(Math.random());
  root.dataset.ready = readyToken;
  kick();

  // debug / verification hook: ?hero-debug
  if (debug) {
    (window as unknown as Record<string, unknown>).__hero = {
      seek(v: number) {
        tween = null;
        setPlaying(false);
        t = v;
        renderFrame(t);
        syncDom(t);
      },
      bench(n = 30) {
        const t0 = performance.now();
        for (let i = 0; i < n; i++) renderFrame(t + i * 0.01);
        renderer.getContext().finish();
        return (performance.now() - t0) / n;
      },
      info: () => ({
        L,
        shards: built ? Object.keys(built.shards) : [],
        threads: built ? built.threads.map((s) => s.length) : [],
        fringe: built ? Object.values(built.shards).map((s) => s.sm.fringe.length) : [],
        bridges: built ? Object.values(built.shards).map((s) => s.sm.bridges.length) : [],
        H,
        MESH: MESH.maxShards,
      }),
    };
  }

  return {
    dispose() {
      window.clearTimeout(debounce);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      io.disconnect();
      ro.disconnect();
      mobileMQ.removeEventListener("change", onMQ);
      window.removeEventListener("keydown", onKey);
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      playBtn?.removeEventListener("click", onPlay);
      dots.forEach((d, i) => d.removeEventListener("click", dotHandlers[i]));
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (built) disposeBuilt(built);
      built = null;
      renderer.dispose();
      closeImages();
      canvas.remove();
      if (root.dataset.ready === readyToken) delete root.dataset.ready;
    },
  };
}

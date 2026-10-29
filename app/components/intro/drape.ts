/* The intro: the site lies under a length of burgundy linen, a photograph
   mapped onto a simulated cloth in WebGL. A soft light passes over its folds;
   then a character (actor.ts) leans in from the left edge, walks up, pinches
   the cloth and drags it off the page, backing out of the frame with it. (If
   he can't be had, the cloth is taken by a corner instead and drawn off along
   the diagonal.)

   The cloth is a grid of points held to their neighbours (verlet, with shear
   and bending), lying on the page with a little friction; the pinch follows
   his hand, and the rest follows the pinch. Its shading comes from the grid's
   own normals over the photo's light, so the folds it makes as it moves are
   lit like the folds in the picture.

   It is served as a script of its own (app/intro.js/route.ts) and loaded
   async, so it starts before React: which is why everything it needs is
   inside this one function (it is sent as source, via toString). Until the
   photo is on the GPU the page shows the same photo as a CSS background in
   exactly the same place; without WebGL, or if the photo is slow, the page
   just lifts away (intro.css). Which is noted on <html> (data-intro-cloth:
   live, then pull once it is being drawn off; or flat), as React leaves that
   element's attributes alone. */

import type { Actor, ActorConfig } from "./actor";

export type DrapeConfig = {
  /** the photograph, and its size in px */
  src: string;
  size: [number, number];
  /** how far the cloth runs past each edge of the screen, as a fraction of it (intro.css insets its stand-in the same) */
  bleed: number;
  /** the character who takes it away (actor.ts) */
  actor?: ActorConfig;
};

/** C: the cloth; cast: actor.ts's actor(), sent along as source too */
export function drape(C: DrapeConfig, cast?: (A: ActorConfig) => Actor) {
  const html = document.documentElement;
  if (html.dataset.intro !== "play") return;

  const DT = 1 / 90;
  const GRAV = 1800; // px/s², into the page
  const AIR = 0.993; // velocity kept per step in the air
  const GRIP = 0.9; // and lying on the page
  const ITER = 10;
  const SWEEP = 1.2; // s: the light passing over the folds
  const PULL_AT = 0.95; // s after the photo is up, when the cloth is taken up
  const PULL_FOR = 2.2; // s at most, however slow the frames
  const SKIP_SPEED = 2.6; // a click takes it away faster
  const SKIP_FOR = 0.8; // s, at most, after a click
  const ACT_AT = 0.3; // s after the photo is up, when he leans in
  const ACT_FOR = 4.5; // s at most for his scene, however slow the frames

  let sheet: HTMLElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let tries = 0;

  // the fallback: the page simply lifts away (a click before the cloth is live has already set it going)
  function lift() {
    html.dataset.introCloth = "flat";
    if (sheet?.getAnimations().some((a) => (a as CSSAnimation).animationName === "intro-out" && a.playState === "finished")) html.dataset.intro = "seen";
  }

  function boot() {
    sheet = document.querySelector<HTMLElement>(".intro-sheet");
    canvas = sheet?.querySelector<HTMLCanvasElement>("canvas.intro-cloth") ?? null;
    if (!sheet || !canvas) {
      if (tries++ < 300 && html.dataset.intro === "play") requestAnimationFrame(boot);
      return;
    }
    // once the page has lifted away, by whatever means, it's over
    sheet.addEventListener("animationend", (e) => {
      if (e.animationName === "intro-out") html.dataset.intro = "seen";
    });
    // a click before the cloth is ready: just let the page go
    if ("introSkip" in html.dataset) return lift();
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return lift();
    const img = new Image();
    let given = false;
    const giveUp = window.setTimeout(() => {
      given = true;
      lift();
    }, 3000);
    // he comes along if his pieces load too; without him, the corner pull
    let who: Actor | null = null;
    try {
      who = cast && C.actor ? cast(C.actor) : null;
    } catch {
      who = null;
    }
    img.onload = () => {
      const go = (a: Actor | null) => {
        if (given || html.dataset.intro !== "play") return;
        window.clearTimeout(giveUp);
        if ("introSkip" in html.dataset) return lift();
        start(gl, img, a);
      };
      if (who) who.ready.then(() => go(who), () => go(null));
      else go(null);
    };
    img.onerror = () => {
      window.clearTimeout(giveUp);
      lift();
    };
    img.src = C.src;
  }

  function start(gl: WebGLRenderingContext, img: HTMLImageElement, who: Actor | null) {
    const cv = canvas!, sh = sheet!;
    const W = sh.clientWidth, H = sh.clientHeight;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    const F = 2 * Math.max(W, H); // the eye's distance from the page

    // ── the cloth: a grid over the screen and its bleed ──
    const B = C.bleed;
    const x0 = -B * W, y0 = -B * H, bw = W * (1 + 2 * B), bh = H * (1 + 2 * B);
    const nx = W > H ? 56 : 36;
    const cell = bw / (nx - 1);
    const ny = Math.max(8, Math.round(bh / cell) + 1);
    const n = nx * ny;
    const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
    const ox = new Float32Array(n), oy = new Float32Array(n), oz = new Float32Array(n);
    const pinned = new Uint8Array(n);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), grid = new Float32Array(n * 2);
    // the photo is fitted the way CSS covers the box (background-size: cover)
    const ia = C.size[0] / C.size[1], ba = bw / bh;
    const su = ba > ia ? 1 : ba / ia, sv = ba > ia ? ia / ba : 1;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i, gx = i / (nx - 1), gy = j / (ny - 1);
        px[k] = ox[k] = x0 + gx * bw;
        py[k] = oy[k] = y0 + gy * bh;
        uv[k * 2] = 0.5 + (gx - 0.5) * su;
        uv[k * 2 + 1] = 0.5 + (gy - 0.5) * sv;
        grid[k * 2] = gx;
        grid[k * 2 + 1] = gy;
      }
    // held to its neighbours: along the weave, across it (shear), and two along (bending)
    const ca: number[] = [], cb: number[] = [], cr: number[] = [], cs: number[] = [];
    const link = (a: number, b: number, s: number) => {
      ca.push(a);
      cb.push(b);
      cr.push(Math.hypot(px[b] - px[a], py[b] - py[a]));
      cs.push(s);
    };
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (i < nx - 1) link(k, k + 1, 1);
        if (j < ny - 1) link(k, k + nx, 1);
        if (i < nx - 1 && j < ny - 1) {
          link(k, k + nx + 1, 0.8);
          link(k + 1, k + nx, 0.8);
        }
        if (i < nx - 2) link(k, k + 2, 0.22);
        if (j < ny - 2) link(k, k + 2 * nx, 0.22);
      }
    const LA = Int32Array.from(ca), LB = Int32Array.from(cb), LR = Float32Array.from(cr), LS = Float32Array.from(cs);
    const tris: number[] = [];
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const k = j * nx + i;
        tris.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx);
      }

    // ── WebGL ──
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(
      prog,
      shader(
        gl.VERTEX_SHADER,
        `attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv; attribute vec2 aGrid;
        uniform vec2 uView; uniform float uF;
        varying vec2 vUv; varying vec2 vGrid; varying vec3 vNor; varying vec2 vScreen;
        void main() {
          vec2 c = uView * 0.5;
          vec2 p = c + (aPos.xy - c) * (uF / max(uF - aPos.z, 1.0));
          vUv = aUv; vGrid = aGrid; vNor = aNor; vScreen = p / uView;
          gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, -aPos.z / uF, 1.0);
        }`,
      ),
    );
    gl.attachShader(
      prog,
      shader(
        gl.FRAGMENT_SHADER,
        `precision mediump float;
        uniform sampler2D uTex; uniform float uSweep; uniform vec2 uBox;
        varying vec2 vUv; varying vec2 vGrid; varying vec3 vNor; varying vec2 vScreen;
        void main() {
          vec3 col = texture2D(uTex, vUv).rgb;
          vec3 n = normalize(vNor);
          if (!gl_FrontFacing) n = -n;
          // lit from the top left: the photo's own light, so lying flat it is the photo exactly;
          // a fold turned to the light catches a soft sheen
          vec3 L = normalize(vec3(-0.45, -0.55, 0.7));
          col *= clamp(0.55 + 0.45 * max(dot(n, L), 0.0) / L.z, 0.0, 1.35);
          col += pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0) * vec3(0.12, 0.05, 0.06);
          float lum = dot(col, vec3(0.3, 0.59, 0.11));
          // the back of the linen is a little duller
          if (!gl_FrontFacing) col = mix(col, vec3(lum), 0.2) * 0.85;
          // a soft light passing over the folds, catching their crests
          float band = exp(-pow((vScreen.x * 0.8 + vScreen.y * 0.45 - uSweep) / 0.18, 2.0));
          col += band * (col * 0.8 + vec3(0.02, 0.005, 0.007)) * smoothstep(0.03, 0.16, lum);
          // the hem: the cut edge rolled under, a shade darker
          vec2 e = min(vGrid, 1.0 - vGrid) * uBox;
          col *= mix(0.75, 1.0, smoothstep(0.0, 6.0, min(e.x, e.y)));
          gl_FragColor = vec4(col, 1.0);
        }`,
      ),
    );
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return lift();
    gl.useProgram(prog);
    const buffer = (data: Float32Array, name: string, size: number, dynamic: boolean) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      const at = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, size, gl.FLOAT, false, 0, 0);
      return b;
    };
    const posBuf = buffer(pos, "aPos", 3, true);
    const norBuf = buffer(nor, "aNor", 3, true);
    buffer(uv, "aUv", 2, false);
    buffer(grid, "aGrid", 2, false);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint16Array.from(tris), gl.STATIC_DRAW);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    gl.uniform2f(u("uView"), W, H);
    gl.uniform1f(u("uF"), F);
    gl.uniform2f(u("uBox"), bw, bh);
    const uSweep = u("uSweep");
    gl.viewport(0, 0, cv.width, cv.height);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.frontFace(gl.CW); // the grid's triangles wind clockwise on screen
    gl.clearColor(0, 0, 0, 0);

    function normals() {
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          const l = j * nx + Math.max(0, i - 1), r = j * nx + Math.min(nx - 1, i + 1);
          const t = Math.max(0, j - 1) * nx + i, b = Math.min(ny - 1, j + 1) * nx + i;
          const ax = px[r] - px[l], ay = py[r] - py[l], az = pz[r] - pz[l];
          const bx = px[b] - px[t], by = py[b] - py[t], bz = pz[b] - pz[t];
          const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
          const m = Math.hypot(cx, cy, cz) || 1;
          nor[k * 3] = cx / m;
          nor[k * 3 + 1] = cy / m;
          nor[k * 3 + 2] = cz / m;
          pos[k * 3] = px[k];
          pos[k * 3 + 1] = py[k];
          pos[k * 3 + 2] = pz[k];
        }
    }
    function draw(sweep: number) {
      normals();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, norBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, nor);
      gl.uniform1f(uSweep, sweep);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, tris.length, gl.UNSIGNED_SHORT, 0);
    }

    // ── the corner it is taken by ──
    let grip: { k: number; gx: number; gy: number; dirX: number; dirY: number } | null = null;
    // how far each point lay from that corner: linen hardly stretches, so it can't get farther than that
    const tether = new Float32Array(n);
    // the corner nearest a point on the screen (or, for his hand, the nearest point of all)
    function take(sx: number, sy: number, corner = true) {
      let k = 0;
      for (const c of corner ? [0, nx - 1, n - nx, n - 1] : Array.from({ length: n }, (_, i) => i))
        if (Math.hypot(px[c] - sx, py[c] - sy) < Math.hypot(px[k] - sx, py[k] - sy)) k = c;
      pinned[k] = 1;
      // no cloth lies quite flat: a whisper of unevenness, for it to fold from
      for (let i = 0; i < n; i++) pz[i] = oz[i] = 0.6 + 0.6 * Math.sin(px[i] * 0.021 + py[i] * 0.017) * Math.sin(py[i] * 0.026 - px[i] * 0.009);
      // drawn off along the diagonal, away from the middle
      const dx = px[k] - W / 2, dy = py[k] - H / 2, m = Math.hypot(dx, dy) || 1;
      grip = { k, gx: px[k], gy: py[k], dirX: dx / m, dirY: dy / m };
      for (let i = 0; i < n; i++) tether[i] = Math.hypot(px[i] - px[k], py[i] - py[k]) * 1.01;
    }
    /* Where the corner is, s into the pull: lifted a little off the page, then
       drawn away past the edge along the diagonal, faster and faster, the
       cloth sliding after it in long folds. */
    const diag = Math.hypot(W, H);
    function hand(s: number): [number, number, number] {
      const g = grip!;
      const u = s * 0.5; // unhurried: about a second and a half
      const up = Math.min(1, u / 0.35), e = up * up * (3 - 2 * up);
      const away = diag * (0.18 * u + 1.3 * u * u);
      const z = Math.min(0.3 * F, 0.1 * F * e + 0.1 * F * u);
      return [g.gx + g.dirX * away, g.gy + g.dirY * away, z];
    }

    // one step of the physics, with the pinch at [hx, hy, hz]
    function step(hx: number, hy: number, hz: number) {
      const g = grip!;
      for (let k = 0; k < n; k++) {
        if (pinned[k]) continue;
        const vx = (px[k] - ox[k]) * AIR, vy = (py[k] - oy[k]) * AIR, vz = (pz[k] - oz[k]) * AIR;
        ox[k] = px[k];
        oy[k] = py[k];
        oz[k] = pz[k];
        px[k] += vx;
        py[k] += vy;
        pz[k] += vz - GRAV * DT * DT;
      }
      px[g.k] = hx;
      py[g.k] = hy;
      pz[g.k] = hz;
      for (let it = 0; it < ITER; it++) {
        for (let c = 0; c < LA.length; c++) {
          const a = LA[c], b = LB[c];
          const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const wa = pinned[a] ? 0 : 1, wb = pinned[b] ? 0 : 1;
          if (!wa && !wb) continue;
          // linen won't stretch, but gives easily to being pushed together (and so folds)
          const f = ((d - LR[c]) / d) * (d < LR[c] ? LS[c] * 0.12 : LS[c]) / (wa + wb);
          px[a] += dx * f * wa;
          py[a] += dy * f * wa;
          pz[a] += dz * f * wa;
          px[b] -= dx * f * wb;
          py[b] -= dy * f * wb;
          pz[b] -= dz * f * wb;
        }
        for (let k = 0; k < n; k++) {
          if (pinned[k]) continue;
          const dx = px[k] - hx, dy = py[k] - hy, dz = pz[k] - hz;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d > tether[k]) {
            const f = tether[k] / d;
            px[k] = hx + dx * f;
            py[k] = hy + dy * f;
            pz[k] = hz + dz * f;
          }
          // it hangs from the fingers: nothing rises above them
          if (pz[k] > hz) pz[k] = hz;
        }
      }
      // nothing flung up at the eye (it carries the pull as speed); lying on the
      // page it can't go through it, and it drags a little
      for (let k = 0; k < n; k++) {
        if (pinned[k]) continue;
        if (pz[k] > hz) pz[k] = oz[k] = hz;
        if (pz[k] > 0) continue;
        pz[k] = oz[k] = 0;
        ox[k] = px[k] - (px[k] - ox[k]) * GRIP;
        oy[k] = py[k] - (py[k] - oy[k]) * GRIP;
      }
    }
    // has the whole cloth left the screen?
    function gone() {
      const cx = W / 2, cy = H / 2;
      for (let k = 0; k < n; k += 3) {
        const s = F / Math.max(1, F - pz[k]);
        const x = cx + (px[k] - cx) * s, y = cy + (py[k] - cy) * s;
        if (x > -20 && x < W + 20 && y > -20 && y < H + 20) return false;
      }
      return true;
    }

    // ── him ──
    const stage = who ? sh.querySelector<HTMLCanvasElement>("canvas.intro-actor") : null;
    const sctx = stage?.getContext("2d") ?? null;
    const sdpr = Math.min(2, window.devicePixelRatio || 1);
    if (stage) {
      stage.width = Math.round(W * sdpr);
      stage.height = Math.round(H * sdpr);
    }
    const cast = who && sctx ? who : null;
    // (with him on stage, a click lifts the page at once, in CSS: intro.css)
    if (cast) html.dataset.introCast = "";
    let held: [number, number] | null = null; // where his hand was, the frame before

    // ── time ──
    draw(-1);
    requestAnimationFrame(() => (html.dataset.introCloth = "live"));
    const t0 = performance.now();
    let pullAt = -1, skippedAt = -1, simT = 0, handT = 0, actT = 0, speed = 1, last = t0;
    const finish = () => {
      html.dataset.intro = "seen";
    };
    const frame = () => {
      if (html.dataset.intro !== "play") return;
      const now = performance.now();
      const t = (now - t0) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      const skip = html.dataset.introSkip;
      if (skip !== undefined && skippedAt < 0) {
        skippedAt = t;
        speed = SKIP_SPEED;
        // with him on stage, a click just lifts the page away (intro.css)
        if (cast) return lift();
        if (pullAt < 0) {
          const [cx, cy] = skip.split(",").map(Number);
          if (Number.isFinite(cx) && Number.isFinite(cy) && skip) take(cx, cy);
          pullAt = t;
        }
      }
      let over = false;
      if (cast) {
        // his scene: the cloth is pinched where his hand closes on it, and goes where it goes
        if (t >= ACT_AT) actT += dt;
        const { hold, gone: left } = cast.at(actT, W, H);
        if (hold && !grip) {
          take(hold[0], hold[1], false);
          pullAt = t;
          held = hold;
          html.dataset.introCloth = "pull";
        }
        if (grip && hold) {
          const from = held ?? hold, steps = Math.max(1, Math.floor(dt / DT));
          const lift = 0.05 * F * Math.min(1, (t - pullAt) / 0.4);
          for (let i = 1; i <= steps; i++) step(from[0] + ((hold[0] - from[0]) * i) / steps, from[1] + ((hold[1] - from[1]) * i) / steps, lift);
          held = hold;
        }
        sctx!.setTransform(1, 0, 0, 1, 0, 0);
        sctx!.clearRect(0, 0, stage!.width, stage!.height);
        sctx!.setTransform(sdpr, 0, 0, sdpr, 0, 0);
        cast.draw(sctx!);
        over = (left && grip !== null && gone()) || t - ACT_AT > ACT_FOR || (skippedAt >= 0 && t - skippedAt > SKIP_FOR);
      } else {
        if (pullAt < 0 && t >= PULL_AT) pullAt = t;
        if (pullAt >= 0) {
          html.dataset.introCloth = "pull";
          // (by the top right corner, along the folds in the photo, unless a click chose another)
          if (!grip) take(W, 0);
          const target = simT + dt;
          while (simT + DT <= target) {
            simT += DT;
            // (a click hurries the hand, not the physics)
            handT += DT * speed;
            step(...hand(handT));
          }
        }
        over = pullAt >= 0 && (gone() || t - pullAt > PULL_FOR || (skippedAt >= 0 && t - skippedAt > SKIP_FOR));
      }
      last = now;
      draw(t < SWEEP ? -0.4 + 1.9 * (t / SWEEP) : -1);
      if (over) return finish();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  boot();
}

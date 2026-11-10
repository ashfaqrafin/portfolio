import type { Mesh } from "./wave";

/* Draws flags (wave.ts, cloth.ts): each is a grid of lit points wearing a
   picture, drawn as smooth-shaded triangles by WebGL into a canvas of its
   own, which is then laid into the story's canvas where the flag belongs
   among the other layers. A batch (begin … draw … end) is one such layer.

   Without WebGL the same grids are drawn by the 2D canvas, cell by cell
   and flat-shaded: coarser, but everything still flies. */

const VS = `
attribute vec2 aPos; attribute vec2 aUv; attribute float aShade; attribute vec2 aAux;
uniform vec2 uView;
varying vec2 vUv; varying float vShade; varying vec2 vAux;
void main() {
  vUv = aUv; vShade = aShade; vAux = aAux;
  vec2 p = aPos / uView * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex; uniform sampler2D uOver; uniform float uAlpha;
varying vec2 vUv; varying float vShade; varying vec2 vAux;
void main() {
  float burn = vAux.y;
  if (burn >= 0.995) discard;
  vec3 c = mix(texture2D(uTex, vUv).rgb, texture2D(uOver, vUv).rgb, clamp(vAux.x, 0.0, 1.0));
  // in shade the colour darkens; where it catches the light it lifts toward white
  vec3 lit = c * min(vShade, 1.0) + (vec3(1.0) - c) * max(vShade - 1.0, 0.0) * 0.55;
  // the hem: a darker line round the cloth's own edge
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  lit *= 0.5 + 0.5 * smoothstep(0.0, 0.03, edge);
  if (burn > 0.0) {
    lit = mix(lit, vec3(0.06, 0.025, 0.02), smoothstep(0.0, 0.6, burn));
    lit += vec3(1.0, 0.42, 0.06) * smoothstep(0.5, 0.97, burn) * 1.3;
  }
  gl_FragColor = vec4(lit, 1.0) * uAlpha;
}`;

type Pic = HTMLCanvasElement;

export class FlagGL {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private loc: { pos: number; uv: number; shade: number; aux: number; view: WebGLUniformLocation | null; alpha: WebGLUniformLocation | null } | null = null;
  private buf: { pos: WebGLBuffer; uv: WebGLBuffer; shade: WebGLBuffer; aux: WebGLBuffer; index: WebGLBuffer } | null = null;
  private pics = new Map<Pic, WebGLTexture>();
  private g: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private box = [0, 0, 0, 0];
  private drawn = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    try {
      const gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
      if (!gl) return;
      const sh = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      this.loc = {
        pos: gl.getAttribLocation(prog, "aPos"),
        uv: gl.getAttribLocation(prog, "aUv"),
        shade: gl.getAttribLocation(prog, "aShade"),
        aux: gl.getAttribLocation(prog, "aAux"),
        view: gl.getUniformLocation(prog, "uView"),
        alpha: gl.getUniformLocation(prog, "uAlpha"),
      };
      gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uOver"), 1);
      this.buf = { pos: gl.createBuffer()!, uv: gl.createBuffer()!, shade: gl.createBuffer()!, aux: gl.createBuffer()!, index: gl.createBuffer()! };
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      this.gl = gl;
      this.canvas.addEventListener("webglcontextlost", () => {
        this.gl = null;
        this.pics.clear();
      });
    } catch {
      this.gl = null;
    }
  }

  /** start a layer of flags, to be laid into `g` */
  begin(g: CanvasRenderingContext2D, W: number, H: number, dpr: number) {
    this.g = g;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.drawn = false;
    this.box = [Infinity, Infinity, -Infinity, -Infinity];
    const gl = this.gl;
    if (!gl) return;
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private picture(pic: Pic) {
    const gl = this.gl!;
    let t = this.pics.get(pic);
    if (!t) {
      t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.pics.set(pic, t);
    }
    return t;
  }

  /** one flag: its grid, its picture, and (with the grid's `aux`) a second picture coming in over it */
  draw(m: Mesh, pic: Pic, over: Pic | null = null, alpha = 1) {
    if (!m.count) return;
    const gl = this.gl;
    if (!gl || !this.loc || !this.buf) return this.draw2d(m, pic, over, alpha);
    const { loc, buf } = this;
    gl.uniform2f(loc.view, this.W, this.H);
    gl.uniform1f(loc.alpha, alpha);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.picture(pic));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.picture(over ?? pic));
    const attr = (b: WebGLBuffer, l: number, data: Float32Array, size: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
    };
    attr(buf.pos, loc.pos, m.pos, 2);
    attr(buf.uv, loc.uv, m.uv, 2);
    attr(buf.shade, loc.shade, m.shade, 1);
    attr(buf.aux, loc.aux, m.aux, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.index.subarray(0, m.count), gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    const b = this.box;
    for (let k = 0; k < m.pos.length; k += 2) {
      const x = m.pos[k], y = m.pos[k + 1];
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
    this.drawn = true;
  }

  /** lay the layer into the story's canvas (only the part the flags are in) */
  end() {
    const g = this.g;
    if (!g || !this.gl || !this.drawn) return;
    const d = this.dpr, b = this.box;
    const x0 = Math.max(0, Math.floor((b[0] - 2) * d)), y0 = Math.max(0, Math.floor((b[1] - 2) * d));
    const x1 = Math.min(this.canvas.width, Math.ceil((b[2] + 2) * d)), y1 = Math.min(this.canvas.height, Math.ceil((b[3] + 2) * d));
    if (x1 <= x0 || y1 <= y0) return;
    g.drawImage(this.canvas, x0, y0, x1 - x0, y1 - y0, x0 / d, y0 / d, (x1 - x0) / d, (y1 - y0) / d);
  }

  // the 2D way: every other point, each cell its picture's patch and one shade
  private draw2d(m: Mesh, pic: Pic, over: Pic | null, alpha: number) {
    const g = this.g;
    if (!g) return;
    const { nx, pos } = m;
    const base = g.getTransform();
    const shown = new Set<number>();
    for (let c = 0; c < m.count; c += 6) shown.add(m.index[c]);
    g.save();
    g.globalAlpha *= alpha;
    for (const a of shown) {
      const b = a + 1, d = a + nx;
      if (m.aux[a * 2 + 1] >= 0.995) continue;
      const ax = pos[a * 2], ay = pos[a * 2 + 1], bx = pos[b * 2], by = pos[b * 2 + 1], dx = pos[d * 2], dy = pos[d * 2 + 1];
      const ex = pos[(d + 1) * 2], ey = pos[(d + 1) * 2 + 1];
      const use = over && m.aux[a * 2] > 0.5 ? over : pic;
      const u0 = m.uv[a * 2] * use.width, v0 = m.uv[a * 2 + 1] * use.height;
      const du = (m.uv[b * 2] - m.uv[a * 2]) * use.width, dv = (m.uv[d * 2 + 1] - m.uv[a * 2 + 1]) * use.height;
      g.save();
      g.beginPath();
      g.moveTo(ax - 0.5, ay - 0.5);
      g.lineTo(bx + 0.5, by - 0.5);
      g.lineTo(ex + 0.5, ey + 0.5);
      g.lineTo(dx - 0.5, dy + 0.5);
      g.closePath();
      g.clip();
      g.transform((bx - ax) / du, (by - ay) / du, (dx - ax) / dv, (dy - ay) / dv, ax - ((bx - ax) / du) * u0 - ((dx - ax) / dv) * v0, ay - ((by - ay) / du) * u0 - ((dy - ay) / dv) * v0);
      g.drawImage(use, 0, 0);
      g.setTransform(base);
      const s = m.shade[a];
      g.fillStyle = s < 1 ? `rgba(8,3,5,${Math.min(0.6, 1 - s).toFixed(3)})` : `rgba(255,255,255,${Math.min(0.3, (s - 1) * 0.5).toFixed(3)})`;
      g.fill();
      g.restore();
    }
    g.restore();
  }

  dispose() {
    this.gl?.getExtension("WEBGL_lose_context")?.loseContext();
    this.gl = null;
  }
}

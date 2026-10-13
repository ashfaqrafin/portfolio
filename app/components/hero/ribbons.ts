import * as THREE from "three";

const VERT = /* glsl */ `
attribute vec4 aCol;
attribute float aSide;
varying vec4 vCol;
varying float vSide;
void main() {
  vCol = aCol;
  vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec4 vCol;
varying float vSide;
void main() {
  float e = 1.0 - smoothstep(0.45, 1.0, abs(vSide));
  float a = vCol.a * e;
  gl_FragColor = vec4(vCol.rgb * a, a);
}
`;

const MAXP = 64;

/**
 * One CPU-built triangle-strip batch for every thread, strand and bridge in a
 * layer. Per-vertex colour + alpha, soft edges, a single draw call.
 */
export class RibbonBatch {
  readonly mesh: THREE.Mesh;
  private readonly geo = new THREE.BufferGeometry();
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly side: Float32Array;
  private readonly idx: Uint32Array;
  private readonly posA: THREE.BufferAttribute;
  private readonly colA: THREE.BufferAttribute;
  private readonly sideA: THREE.BufferAttribute;
  private readonly idxA: THREE.BufferAttribute;
  private nv = 0;
  private ni = 0;
  private n = 0;
  private readonly sx = new Float32Array(MAXP);
  private readonly sy = new Float32Array(MAXP);
  private readonly sw = new Float32Array(MAXP);
  private readonly sa = new Float32Array(MAXP);

  constructor(
    private readonly cap: number,
    renderOrder: number,
  ) {
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.side = new Float32Array(cap);
    this.idx = new Uint32Array(cap * 3);
    this.posA = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colA = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sideA = new THREE.BufferAttribute(this.side, 1).setUsage(THREE.DynamicDrawUsage);
    this.idxA = new THREE.BufferAttribute(this.idx, 1).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", this.posA);
    this.geo.setAttribute("aCol", this.colA);
    this.geo.setAttribute("aSide", this.sideA);
    this.geo.setIndex(this.idxA);
    this.geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      premultipliedAlpha: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
  }

  begin() {
    this.nv = 0;
    this.ni = 0;
    this.n = 0;
  }

  /** Start a new polyline. */
  start() {
    this.n = 0;
  }

  /** Add a point: position, half-width (px) and alpha. */
  pt(x: number, y: number, halfWidth: number, alpha: number) {
    if (this.n >= MAXP) return;
    const i = this.n++;
    this.sx[i] = x;
    this.sy[i] = y;
    this.sw[i] = halfWidth;
    this.sa[i] = alpha;
  }

  /** Close the polyline and emit its ribbon in the given colour. */
  end(r: number, g: number, b: number) {
    const n = this.n;
    this.n = 0;
    if (n < 2 || this.nv + n * 2 > this.cap) return;
    const base = this.nv;
    let nx = 0;
    let ny = 1;
    for (let i = 0; i < n; i++) {
      const i0 = i > 0 ? i - 1 : 0;
      const i1 = i < n - 1 ? i + 1 : n - 1;
      const dx = this.sx[i1] - this.sx[i0];
      const dy = this.sy[i1] - this.sy[i0];
      const l = Math.hypot(dx, dy);
      if (l > 1e-6) {
        nx = -dy / l;
        ny = dx / l;
      }
      const hw = this.sw[i] + 0.5;
      const a = this.sa[i];
      for (let s = 0; s < 2; s++) {
        const sd = s === 0 ? -1 : 1;
        const v = base + i * 2 + s;
        this.pos[v * 3] = this.sx[i] + nx * hw * sd;
        this.pos[v * 3 + 1] = this.sy[i] + ny * hw * sd;
        this.pos[v * 3 + 2] = 0;
        this.col[v * 4] = r;
        this.col[v * 4 + 1] = g;
        this.col[v * 4 + 2] = b;
        this.col[v * 4 + 3] = a;
        this.side[v] = sd;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      let o = this.ni;
      this.idx[o++] = a;
      this.idx[o++] = a + 1;
      this.idx[o++] = a + 2;
      this.idx[o++] = a + 1;
      this.idx[o++] = a + 3;
      this.idx[o++] = a + 2;
      this.ni = o;
    }
    this.nv += n * 2;
  }

  /** Upload only what was written this frame. */
  commit() {
    const nv = this.nv;
    this.posA.clearUpdateRanges();
    this.colA.clearUpdateRanges();
    this.sideA.clearUpdateRanges();
    this.idxA.clearUpdateRanges();
    if (nv > 0) {
      this.posA.addUpdateRange(0, nv * 3);
      this.colA.addUpdateRange(0, nv * 4);
      this.sideA.addUpdateRange(0, nv);
      this.idxA.addUpdateRange(0, this.ni);
    }
    this.posA.needsUpdate = true;
    this.colA.needsUpdate = true;
    this.sideA.needsUpdate = true;
    this.idxA.needsUpdate = true;
    this.geo.setDrawRange(0, this.ni);
    this.mesh.visible = this.ni > 0;
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

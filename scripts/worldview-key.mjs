/* Shared pixel work for the world view page's art (scripts/worldview-art.mjs):
   keying a drawing off its ground (white paper, flat green or flat magenta),
   rubbing out the frame lines and base lines the generator drew between
   frames, and finding the separate figures on a sheet. Everything works on
   raw RGBA buffers ({ data, width, height }) from sharp. */

export const idx = (w, x, y) => (y * w + x) * 4;

/* Thin straight ink lines the sheets were drawn with (cell borders, base lines
   under the feet, the outlines of the boxes he climbs): any run of dark pixels
   at least `minRun` long and at most `maxThick` thick, horizontal or vertical,
   is painted white. The poles are thick and the bamboo is slanted, so they
   stay. */
export function eraseRules(img, { minRun = 120, maxThick = 5, dark = 110 } = {}) {
  const { data, width: w, height: h } = img;
  const isDark = (x, y) => {
    const i = idx(w, x, y);
    return Math.max(data[i], data[i + 1], data[i + 2]) < dark;
  };
  const kill = new Uint8Array(w * h);
  // horizontal runs
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (!isDark(x, y)) { x++; continue; }
      let e = x;
      while (e < w && isDark(e, y)) e++;
      if (e - x >= minRun) {
        // thin: the rows maxThick above and below are mostly light along the run
        let ok = 0;
        for (let k = x; k < e; k += 3) {
          const up = y - maxThick >= 0 ? !isDark(k, y - maxThick) : true;
          const dn = y + maxThick < h ? !isDark(k, y + maxThick) : true;
          if (up || dn) ok++;
        }
        if (ok / Math.ceil((e - x) / 3) > 0.8) for (let k = x; k < e; k++) for (let d = -2; d <= 2; d++) if (y + d >= 0 && y + d < h) kill[(y + d) * w + k] = 1;
      }
      x = e;
    }
  }
  // vertical runs
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      if (!isDark(x, y)) { y++; continue; }
      let e = y;
      while (e < h && isDark(x, e)) e++;
      if (e - y >= minRun) {
        let ok = 0;
        for (let k = y; k < e; k += 3) {
          const l = x - maxThick >= 0 ? !isDark(x - maxThick, k) : true;
          const r = x + maxThick < w ? !isDark(x + maxThick, k) : true;
          if (l && r) ok++;
        }
        if (ok / Math.ceil((e - y) / 3) > 0.8) for (let k = y; k < e; k++) for (let d = -2; d <= 2; d++) if (x + d >= 0 && x + d < w) kill[k * w + x + d] = 1;
      }
      y = e;
    }
  }
  let n = 0;
  for (let p = 0; p < w * h; p++) if (kill[p]) { const i = p * 4; data[i] = data[i + 1] = data[i + 2] = 255; n++; }
  return n;
}

/* Ink drawings on white paper: the ground is flood-filled in from the sheet's
   edges (so a white vest, enclosed by its outline, stays), large pure-white
   pockets enclosed by a figure (between an arm and the body) go too, and the
   pixels along the cut get a soft alpha with the white taken back out of
   their colour, so no pale halo shows on a dark scene. */
export function keyWhite(img, { tol = 226, chroma = 22, hole = 2200, pure = 246 } = {}) {
  const { data, width: w, height: h } = img;
  const bgLike = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    if (mn >= tol && mx - mn <= chroma) bgLike[p] = 1;
  }
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (p) => { if (bgLike[p] && !bg[p]) { bg[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  const flood = () => {
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
  };
  flood();
  // enclosed pockets of pure white paper
  const seen = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (!bgLike[p] || bg[p] || seen[p]) continue;
    const region = [p];
    seen[p] = 1;
    let whites = 0;
    for (let k = 0; k < region.length; k++) {
      const q = region[k];
      const i = q * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= pure) whites++;
      const x = q % w, y = (q - x) / w;
      for (const n of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (n >= 0 && bgLike[n] && !bg[n] && !seen[n]) { seen[n] = 1; region.push(n); }
      }
    }
    if (region.length >= hole && whites / region.length > 0.85) for (const q of region) bg[q] = 1;
  }
  soften(img, bg, (i) => Math.min(data[i], data[i + 1], data[i + 2]), 255);
  return bg;
}

/* Painted layers on a flat green or magenta ground: keyed by colour across
   the whole picture (the ground shows between the railings too), with the
   ground's colour taken back out of the edge pixels. */
export function keyChroma(img, kind) {
  const { data, width: w, height: h } = img;
  const bg = new Uint8Array(w * h);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let spill;
    if (kind === "green") spill = g - Math.max(r, b);
    else spill = Math.min(r, b) - g;
    // fully ground
    if (spill > 90 && (kind === "green" ? g > 120 : Math.min(r, b) > 120)) { bg[p] = 1; data[i + 3] = 0; continue; }
    // the cut: partly ground, take the cast back out
    if (spill > 28) {
      const a = Math.max(0, Math.min(1, 1 - (spill - 28) / 70));
      data[i + 3] = Math.round(255 * a);
      if (kind === "green") data[i + 1] = Math.max(r, b);
      else { const m = Math.max(g, Math.min(r, b) - spill); data[i] = Math.min(r, m + 10); data[i + 2] = Math.min(b, m + 10); }
    }
  }
  return bg;
}

// a 2px band along the cut: alpha from how far the pixel is from the ground
function soften(img, bg, dist, ground) {
  const { data, width: w, height: h } = img;
  for (let p = 0; p < w * h; p++) if (bg[p]) data[p * 4 + 3] = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (bg[p]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && bg[yy * w + xx]) { near = true; break; }
        }
      if (!near) continue;
      const i = p * 4;
      const v = dist(i);
      if (v < 175) continue;
      const a = Math.max(0, Math.min(1, (ground - v) / (ground - 175)));
      data[i + 3] = Math.round(255 * a);
      if (a > 0.02) for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - ground * (1 - a)) / a)));
    }
}

/* The separate figures on a sheet: connected opaque regions (grown by `grow`
   pixels first, so a loose hair strand or the knot on a stick stays with its
   figure), dropping specks; each with its box and pixel count. */
export function components(img, { grow = 5, min = 1500 } = {}) {
  const { data, width: w, height: h } = img;
  const solid = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 40) solid[p] = 1;
  // grow with a separable max filter
  const tmp = new Uint8Array(w * h), grown = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let d = -grow; d <= grow && !v; d++) { const xx = x + d; if (xx >= 0 && xx < w && solid[y * w + xx]) v = 1; }
    tmp[y * w + x] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (let d = -grow; d <= grow && !v; d++) { const yy = y + d; if (yy >= 0 && yy < h && tmp[yy * w + x]) v = 1; }
    grown[y * w + x] = v;
  }
  const label = new Int32Array(w * h).fill(-1);
  const out = [];
  for (let p = 0; p < w * h; p++) {
    if (!grown[p] || label[p] >= 0) continue;
    const id = out.length;
    const st = [p];
    label[p] = id;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
    while (st.length) {
      const q = st.pop();
      const x = q % w, y = (q - x) / w;
      if (solid[q]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (const m of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1])
        if (m >= 0 && grown[m] && label[m] < 0) { label[m] = id; st.push(m); }
    }
    out.push({ id, x0, y0, x1, y1, n });
  }
  return { list: out.filter((c) => c.n >= min), label };
}

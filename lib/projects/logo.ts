/* Reads a project's logo SVG into a short list of plain shapes the sketchbook can
   draw stroke by stroke. Only geometry survives: no scripts, styles, links,
   images, text or foreign attributes, so a logo file can never inject anything.

   Supported: path, circle, ellipse, rect, line, polyline, polygon, nested <g>
   transforms and fills. Anything inside defs, clipPath, mask, pattern, symbol,
   marker or a gradient is skipped. Shapes coloured through CSS classes are read
   as filled (SVG's default). */

export type ShapeTag = "path" | "circle" | "ellipse" | "rect" | "line" | "polyline" | "polygon";

export type LogoShape = {
  tag: ShapeTag;
  /** geometry attributes only, already validated */
  attrs: Record<string, string>;
  /** the shape is filled in the source: drawn as an outline, then hatched in */
  filled: boolean;
  /** its fill colour, validated (only kept for illustrations, which keep their colours) */
  color?: string;
  /** one piece of a traced drawing (see splitTraced): filled solid, not hatched */
  solid?: boolean;
  /** its rough length, for pacing the pen over a traced drawing */
  len?: number;
};

export type Logo = {
  viewBox: [number, number, number, number];
  shapes: LogoShape[];
};

export const MAX_SHAPES = 240;

/** how much a logo may hold. Line art is drawn stroke by stroke in the page, so
   it stays small; an illustration is only ever rendered to an image on the
   server (app/api/projects/[slug]/art), so it may be far bigger. */
export type Limits = { d: number; points: number; shapes: number; colors: boolean };
export const LINE_LIMITS: Limits = { d: 20_000, points: 10_000, shapes: MAX_SHAPES, colors: false };
export const ART_LIMITS: Limits = { d: 3_000_000, points: 500_000, shapes: 4_000, colors: true };

const GEOMETRY: Record<ShapeTag, string[]> = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
};
const SKIP = new Set(["defs", "clippath", "mask", "pattern", "symbol", "marker", "lineargradient", "radialgradient", "filter", "style", "script", "title", "desc", "metadata", "text", "foreignobject"]);

const NUM = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i;
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/;
const FILL_RULE = /^(?:evenodd|nonzero)$/;
const POINTS = /^[0-9eE.,\s+-]+$/;
const TRANSFORM = /^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([0-9eE.,\s+-]*\)\s*,?)+$/;

function valid(name: string, v: string, lim: Limits) {
  if (name === "d") return v.length <= lim.d && PATH_D.test(v);
  if (name === "points") return v.length <= lim.points && POINTS.test(v);
  return NUM.test(v.trim());
}

/** a fill colour we can write back out safely: hex, rgb()/rgba(), a plain name, or none */
const COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*){2,3}\)|[a-z]{3,20})$/i;
function colorOf(a: Map<string, string>): string | undefined {
  const style = a.get("style");
  const fromStyle = style ? /(?:^|;)\s*fill\s*:\s*([^;]+)/i.exec(style)?.[1] : undefined;
  const f = (fromStyle ?? a.get("fill"))?.trim();
  if (!f || f.toLowerCase() === "inherit") return undefined;
  if (f.toLowerCase() === "currentcolor") return "#4a0c18";
  return COLOR.test(f) ? f : undefined;
}

function attrsOf(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of src.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out.set(m[1].toLowerCase(), m[2] ?? m[3] ?? "");
  }
  return out;
}

/** "none" or "transparent" means unfilled; anything else (or nothing at all) fills */
function fillOf(a: Map<string, string>): boolean | undefined {
  const style = a.get("style");
  const fromStyle = style ? /(?:^|;)\s*fill\s*:\s*([^;]+)/i.exec(style)?.[1] : undefined;
  const f = (fromStyle ?? a.get("fill"))?.trim().toLowerCase();
  if (f === undefined || f === "inherit") return undefined;
  return f !== "none" && f !== "transparent";
}

export function parseLogoSvg(svg: string, lim: Limits = LINE_LIMITS): Logo {
  const root = /<svg\b([^>]*)>/i.exec(svg);
  if (!root) throw new Error("not an SVG");
  const ra = attrsOf(root[1]);
  const vb = (ra.get("viewbox") ?? "").trim().split(/[\s,]+/).map(Number);
  let viewBox: Logo["viewBox"];
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) viewBox = vb as Logo["viewBox"];
  else {
    const w = parseFloat(ra.get("width") ?? "");
    const h = parseFloat(ra.get("height") ?? "");
    if (!(w > 0 && h > 0)) throw new Error("the SVG needs a viewBox (or a width and height)");
    viewBox = [0, 0, w, h];
  }

  // one stack frame per open element: its transform, fill, and whether it hides its content
  type Frame = { tag: string; transform: string; fill: boolean; color: string; skip: boolean };
  const stack: Frame[] = [{ tag: "svg", transform: "", fill: fillOf(ra) ?? true, color: colorOf(ra) ?? "#000", skip: false }];
  const shapes: LogoShape[] = [];
  const body = svg.slice(root.index + root[0].length);

  for (const m of body.matchAll(/<(\/?)([a-zA-Z][-a-zA-Z0-9:]*)\b([^>]*?)(\/?)>/g)) {
    const [, closing, rawTag, rest, selfClosing] = m;
    const tag = rawTag.toLowerCase().replace(/^svg:/, "");
    const top = stack[stack.length - 1];
    if (closing) {
      // pop back to the matching element (tolerates sloppy nesting)
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const a = attrsOf(rest);
    const t = a.get("transform")?.trim();
    const transform = [top.transform, t && TRANSFORM.test(t) ? t : ""].filter(Boolean).join(" ");
    const fill = fillOf(a) ?? top.fill;
    const color = colorOf(a) ?? top.color;
    const skip = top.skip || SKIP.has(tag);

    if (!skip && tag in GEOMETRY && shapes.length < lim.shapes) {
      const shapeTag = tag as ShapeTag;
      const attrs: Record<string, string> = {};
      let ok = true;
      for (const name of GEOMETRY[shapeTag]) {
        const v = a.get(name);
        if (v === undefined) continue;
        if (!valid(name, v, lim)) {
          ok = false;
          break;
        }
        attrs[name] = v.trim();
      }
      const needs = shapeTag === "path" ? ["d"] : shapeTag === "polyline" || shapeTag === "polygon" ? ["points"] : [];
      const rule = (a.get("fill-rule") ?? a.get("clip-rule"))?.trim();
      // a traced drawing, line art in disguise: one filled path holding every line
      // as an outline. Too long to draw as one, but each line can be drawn alone.
      const raw = a.get("d");
      const pieces = !ok && shapeTag === "path" && fill && raw && !lim.colors ? splitTraced(raw, lim) : null;
      if (pieces) {
        for (const { d, len } of pieces) {
          if (shapes.length >= lim.shapes) break;
          const attrs: Record<string, string> = { d };
          if (rule && FILL_RULE.test(rule)) attrs["fill-rule"] = rule;
          if (transform) attrs.transform = transform;
          shapes.push({ tag: "path", attrs, filled: true, solid: true, len });
        }
      } else if (ok && needs.every((n) => attrs[n])) {
        if (shapeTag === "path" && rule && FILL_RULE.test(rule)) attrs["fill-rule"] = rule;
        if (transform) attrs.transform = transform;
        shapes.push(lim.colors ? { tag: shapeTag, attrs, filled: fill, color: fill ? color : "none" } : { tag: shapeTag, attrs, filled: fill });
      }
    }
    if (!selfClosing && !(tag in GEOMETRY)) stack.push({ tag, transform, fill, color, skip });
  }
  if (!shapes.length) throw new Error("the SVG has no drawable shapes");
  return { viewBox, shapes };
}

/* ── illustrations ─────────────────────────────────────────────────────────
   A traced drawing (thousands of filled blobs in a few huge paths) can't be
   drawn stroke by stroke; it is shaded in instead, from an image. */

export type LogoKind = { kind: "lines"; logo: Logo } | { kind: "art"; art: Logo };

/** Line art when every shape fits the line limits; otherwise an illustration. Null if nothing draws. */
export function classifyLogo(svg: string): LogoKind | null {
  let lines: Logo | null = null;
  let full: Logo | null = null;
  try {
    lines = parseLogoSvg(svg);
  } catch {}
  try {
    full = parseLogoSvg(svg, ART_LIMITS);
  } catch {}
  if (lines && (!full || lines.shapes.length >= full.shapes.length)) return { kind: "lines", logo: lines };
  return full ? { kind: "art", art: full } : null;
}

/** A clean SVG rebuilt from the safe shapes alone: what the server renders, never the raw file. */
export function serializeSvg(logo: Logo): string {
  const [x, y, w, h] = logo.viewBox;
  const shapes = logo.shapes
    .map((s) => {
      // every value was validated against a strict pattern: no quotes or markup can reach here
      const attrs = Object.entries(s.attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${s.tag} ${attrs} fill="${s.color ?? (s.filled ? "#000" : "none")}"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${shapes}</svg>`;
}

/* ── traced line art ───────────────────────────────────────────────────────
   Image tracers (potrace, Inkscape's Trace Bitmap, online converters) store a
   line drawing as ONE filled path: every pencil line becomes a small filled
   outline, a "subpath" starting with M. Split back into those lines, it can
   be drawn line by line like hand-made line art. A subpath that winds the
   other way is a hole (the inside of a letter O, a lens, the paper inside an
   outline), so it joins the smallest outline around it. Pieces are ordered top to
   bottom, so the drawing starts at the head. Absolute coordinates only. */

type Piece = { d: string; minX: number; minY: number; maxX: number; maxY: number; area: number; len: number };

function measure(d: string): Piece | null {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g) ?? [];
  let cmd = "";
  let x = 0;
  let y = 0;
  const ends: [number, number][] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let len = 0;
  let px0 = NaN;
  let py0 = NaN;
  const see = (px: number, py: number) => {
    if (Number.isFinite(px0)) len += Math.hypot(px - px0, py - py0);
    px0 = px;
    py0 = py;
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  };
  const ARITY: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, S: 4, Q: 4, C: 6, A: 7, Z: 0 };
  for (let i = 0; i < tokens.length; ) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd !== cmd.toUpperCase() && cmd !== "z") return null; // relative commands: leave as is
      if (cmd.toUpperCase() === "Z") continue;
    }
    const n = ARITY[cmd.toUpperCase()];
    if (!n) return null;
    const v = tokens.slice(i, i + n).map(Number);
    if (v.length < n || v.some((k) => !Number.isFinite(k))) return null;
    i += n;
    if (cmd === "H") x = v[0];
    else if (cmd === "V") y = v[0];
    else if (cmd === "A") [x, y] = [v[5], v[6]];
    else {
      for (let k = 0; k < n - 2; k += 2) see(v[k], v[k + 1]);
      [x, y] = [v[n - 2], v[n - 1]];
    }
    see(x, y);
    ends.push([x, y]);
  }
  if (!ends.length) return null;
  let area = 0;
  for (let k = 0; k < ends.length; k++) {
    const [ax, ay] = ends[k];
    const [bx, by] = ends[(k + 1) % ends.length];
    area += ax * by - bx * ay;
  }
  return { d, minX, minY, maxX, maxY, area: area / 2, len };
}

/** One traced path → the separate lines it holds (each with its holes), or null. */
export function splitTraced(d: string, lim: Limits = LINE_LIMITS): { d: string; len: number }[] | null {
  if (!PATH_D.test(d)) return null;
  const subs = d.split(/(?=M)/).map((x) => x.trim()).filter(Boolean);
  if (subs.length < 2) return null;
  const pieces: Piece[] = [];
  for (const sub of subs) {
    if (!sub.startsWith("M") || sub.length > lim.d) return null;
    const m = measure(sub);
    if (!m) return null;
    pieces.push(m);
  }
  // outlines wind one way, holes the other; the biggest piece tells which is which
  const outer = Math.sign(pieces.reduce((a, b) => (Math.abs(b.area) > Math.abs(a.area) ? b : a)).area) || 1;
  const within = (p: Piece, q: Piece) => p.minX >= q.minX && p.maxX <= q.maxX && p.minY >= q.minY && p.maxY <= q.maxY;
  const box = (q: Piece) => (q.maxX - q.minX) * (q.maxY - q.minY);
  // each hole joins the smallest outline around it, wherever it is in the file
  const groups = pieces.filter((p) => Math.sign(p.area) === outer).map((p) => ({ ...p }));
  for (const p of pieces) {
    if (Math.sign(p.area) === outer) continue;
    let home: Piece | null = null;
    for (const g of groups) if (within(p, g) && (!home || box(g) < box(home))) home = g;
    if (home) {
      home.d += p.d;
      home.len += p.len;
    }
    else groups.push({ ...p });
  }
  if (groups.length > lim.shapes) return null;
  return groups.sort((a, b) => a.minY - b.minY || a.minX - b.minX).map((g) => ({ d: g.d, len: Math.round(g.len) }));
}

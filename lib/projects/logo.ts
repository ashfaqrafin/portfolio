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
};

export type Logo = {
  viewBox: [number, number, number, number];
  shapes: LogoShape[];
};

export const MAX_SHAPES = 240;

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
const POINTS = /^[0-9eE.,\s+-]+$/;
const TRANSFORM = /^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\s*\([0-9eE.,\s+-]*\)\s*,?)+$/;

function valid(name: string, v: string) {
  if (name === "d") return v.length <= 20_000 && PATH_D.test(v);
  if (name === "points") return v.length <= 10_000 && POINTS.test(v);
  return NUM.test(v.trim());
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

export function parseLogoSvg(svg: string): Logo {
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
  type Frame = { tag: string; transform: string; fill: boolean; skip: boolean };
  const stack: Frame[] = [{ tag: "svg", transform: "", fill: fillOf(ra) ?? true, skip: false }];
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
    const skip = top.skip || SKIP.has(tag);

    if (!skip && tag in GEOMETRY && shapes.length < MAX_SHAPES) {
      const shapeTag = tag as ShapeTag;
      const attrs: Record<string, string> = {};
      let ok = true;
      for (const name of GEOMETRY[shapeTag]) {
        const v = a.get(name);
        if (v === undefined) continue;
        if (!valid(name, v)) {
          ok = false;
          break;
        }
        attrs[name] = v.trim();
      }
      const needs = shapeTag === "path" ? ["d"] : shapeTag === "polyline" || shapeTag === "polygon" ? ["points"] : [];
      if (ok && needs.every((n) => attrs[n])) {
        if (transform) attrs.transform = transform;
        shapes.push({ tag: shapeTag, attrs, filled: fill });
      }
    }
    if (!selfClosing && !(tag in GEOMETRY)) stack.push({ tag, transform, fill, skip });
  }
  if (!shapes.length) throw new Error("the SVG has no drawable shapes");
  return { viewBox, shapes };
}

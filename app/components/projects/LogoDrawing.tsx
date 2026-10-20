import { useId, type CSSProperties } from "react";
import type { Logo, LogoShape } from "@/lib/projects/logo";

/* A project's logo as pencil strokes. Every shape is drawn twice: the line, then
   a lighter retrace slightly off it, the way a sketch gets gone over. Filled
   shapes are hatched in once their outline is down. sketchbook.css runs it all
   from the page's data-draw state; this only lays the strokes out. */

// a page with no logo yet: a blank sheet with a folded corner
const BLANK: Logo = {
  viewBox: [0, 0, 200, 200],
  shapes: [
    { tag: "path", attrs: { d: "M58 36 L122 36 L148 62 L148 164 L58 164 Z" }, filled: false },
    { tag: "path", attrs: { d: "M122 36 L122 62 L148 62" }, filled: false },
    { tag: "path", attrs: { d: "M74 92 L132 92 M74 110 L132 110 M74 128 L112 128" }, filled: false },
  ],
};

function Shape({ s, className, style, fill }: { s: LogoShape; className: string; style?: CSSProperties; fill?: string }) {
  const Tag = s.tag;
  return <Tag {...s.attrs} pathLength={1} className={className} style={style} fill={fill} />;
}

export default function LogoDrawing({ logo }: { logo: Logo | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { viewBox, shapes } = logo ?? BLANK;
  const [x, y, w, h] = viewBox;
  const size = Math.max(w, h);
  const sw = size * 0.009;
  // the whole outline takes about 1.6 s however many shapes there are
  const stag = Math.min(0.22, 1.6 / shapes.length);
  const hatch = `${uid}-hatch`;
  const vars = { "--sw": sw, "--stag": `${stag}s`, "--n": shapes.length } as CSSProperties;

  return (
    <svg className="pj-logo" viewBox={`${x} ${y} ${w} ${h}`} style={vars} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={hatch} width={size / 36} height={size / 36} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2={size / 36} stroke="currentColor" strokeWidth={sw * 0.55} />
        </pattern>
      </defs>
      <g className="pj-ink">
        {shapes.map((s, i) => (s.filled ? <Shape key={`f${i}`} s={s} className="pj-f" fill={`url(#${hatch})`} /> : null))}
        {shapes.map((s, i) => (
          <Shape key={`s${i}`} s={s} className="pj-s" style={{ "--i": i } as CSSProperties} fill="none" />
        ))}
        <g className="pj-retrace">
          {shapes.map((s, i) => (
            <Shape key={`r${i}`} s={s} className="pj-s" style={{ "--i": i } as CSSProperties} fill="none" />
          ))}
        </g>
      </g>
    </svg>
  );
}

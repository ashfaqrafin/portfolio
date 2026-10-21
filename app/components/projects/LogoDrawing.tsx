import { useId, type CSSProperties } from "react";
import type { ProjectArt } from "@/lib/projects/data";
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
  const { "fill-rule": fillRule, ...attrs } = s.attrs;
  return <Tag {...attrs} fillRule={fillRule as "evenodd" | "nonzero" | undefined} pathLength={1} className={className} style={style} fill={fill} />;
}

/* An illustration can't be drawn stroke by stroke (it's thousands of traced
   blobs), so it is shaded in the way a pencil fills a sketch: a faint
   underdrawing first, then back-and-forth strokes sweep down the page and the
   drawing appears in full ink under them. The sweep is a mask over the image. */
const ROWS = 11;
function scribble(w: number, h: number) {
  const band = h / ROWS;
  const pts: string[] = [];
  for (let i = 0; i <= ROWS * 2; i++) {
    const left = i % 2 === 0;
    // each stroke slants a little, and doesn't quite reach the same edge twice
    const x = left ? -w * (0.04 + ((i * 37) % 7) / 100) : w * (1.04 + ((i * 53) % 7) / 100);
    const y = band * (i / 2) + (left ? 0 : band * 0.18);
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return { d: `M${pts.join("L")}`, band };
}

function ArtDrawing({ art }: { art: ProjectArt }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { w, h, src } = art;
  const { d, band } = scribble(w, h);
  const mask = `${uid}-sweep`;
  return (
    <svg className="pj-logo pj-art" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x={-w * 0.2} y={-h * 0.1} width={w * 1.4} height={h * 1.3}>
          <path className="pj-sweep" d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={band * 2.3} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <image className="pj-art-ghost" href={src} width={w} height={h} />
      <image className="pj-art-ink" href={src} width={w} height={h} mask={`url(#${mask})`} />
      <path className="pj-sweep-line" d={d} pathLength={1} fill="none" strokeWidth={band * 0.06} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LogoDrawing({ logo, art = null }: { logo: Logo | null; art?: ProjectArt | null }) {
  if (art) return <ArtDrawing art={art} />;
  return <LineDrawing logo={logo} />;
}

function LineDrawing({ logo }: { logo: Logo | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { viewBox, shapes } = logo ?? BLANK;
  const [x, y, w, h] = viewBox;
  const size = Math.max(w, h);
  // a traced drawing (lib/projects/logo.ts, splitTraced) is many small filled
  // lines: each is outlined with a fine pencil and then inked in solid, no retrace
  const traced = shapes.some((s) => s.solid);
  const sw = size * (traced ? 0.0024 : 0.009);
  // the whole outline takes about 1.6 s (a traced drawing 2.4 s) however many shapes there are
  const stag = Math.min(0.22, (traced ? 2.4 : 1.6) / shapes.length);
  const hatch = `${uid}-hatch`;
  const vars = { "--sw": sw, "--stag": `${stag}s`, "--n": shapes.length } as CSSProperties;
  // a traced drawing is paced like one pen: each piece takes time in proportion
  // to its length, one after another, and is inked as soon as it's drawn
  const PEN = 2.6;
  const total = traced ? shapes.reduce((n, s) => n + (s.len ?? 0), 0) || 1 : 1;
  const pace: Record<string, string>[] = [];
  for (let i = 0, clock = 0.15; i < shapes.length; i++) {
    if (!traced) {
      pace.push({});
      continue;
    }
    // no single piece holds the pen for long, so the drawing never seems to stall
    const dur = Math.min(0.9, Math.max(0.12, ((shapes[i].len ?? 0) / total) * PEN));
    pace.push({ "--t0": `${clock.toFixed(3)}s`, "--dur": `${dur.toFixed(3)}s` });
    clock += dur * 0.85; // a little overlap: the hand is already moving on
  }

  return (
    <svg className="pj-logo" viewBox={`${x} ${y} ${w} ${h}`} style={vars} data-traced={traced || undefined} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={hatch} width={size / 36} height={size / 36} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
          <line x1="0" y1="0" x2="0" y2={size / 36} stroke="currentColor" strokeWidth={sw * 0.55} />
        </pattern>
      </defs>
      <g className="pj-ink">
        {shapes.map((s, i) =>
          s.solid ? (
            <Shape key={`f${i}`} s={s} className="pj-f pj-solid" style={{ "--i": i, ...pace[i] } as CSSProperties} fill="currentColor" />
          ) : s.filled ? (
            <Shape key={`f${i}`} s={s} className="pj-f" fill={`url(#${hatch})`} />
          ) : null,
        )}
        {shapes.map((s, i) => (
          <Shape key={`s${i}`} s={s} className="pj-s" style={{ "--i": i, ...pace[i] } as CSSProperties} fill="none" />
        ))}
        {!traced && (
          <g className="pj-retrace">
            {shapes.map((s, i) => (
              <Shape key={`r${i}`} s={s} className="pj-s" style={{ "--i": i } as CSSProperties} fill="none" />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

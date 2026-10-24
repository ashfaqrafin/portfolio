"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { QUOTE_H, QUOTE_STROKE, QUOTE_STROKES, QUOTE_TEXT, QUOTE_W } from "./quote";
import "./intro.css";

/* The home page's opening: one thread and one terminal. A cream terminal
   types a command; a burgundy thread runs off a spool beside it, through the
   window's frame, and writes the quote in the site's handwriting, stroke by
   stroke (quote.ts, traced from Caveat by `npm run intro:quote`); the terminal
   answers, and the page lifts away onto the site.

   About 4.6 s, with a pause to read the quote; pure CSS. Any click, key, scroll or touch (or the Skip button)
   lifts it at once. Whether it plays is decided before the first paint by
   INTRO_GATE in the root layout (html[data-intro]); when the page has lifted,
   data-intro becomes "seen", which hides it and lets the hero start. */

const END_ANIMATIONS = new Set(["intro-lift", "intro-lift-fast"]);

// when the thread writes, in s (the rest of the timeline is in intro.css)
const WRITE_AT = 1.0;
const WRITE_FOR = 1.35;
const LIFT = 2.2; // the pen moving between strokes, in the strokes' length units

const total = QUOTE_STROKES.reduce((s, k) => s + k.len + LIFT, 0);
const PACE = QUOTE_STROKES.reduce<{ d: number; t: number }[]>((acc, k, i) => {
  const start = i ? acc[i - 1].d + acc[i - 1].t + (LIFT / total) * WRITE_FOR : WRITE_AT;
  acc.push({ d: start, t: Math.max(0.004, (k.len / total) * WRITE_FOR) });
  return acc;
}, []);

// the spool sits beside the terminal, below and left of the writing; the
// thread runs from it, through the frame, to where the first stroke starts
const [, X0, Y0] = /^M([\d.-]+) ([\d.-]+)/.exec(QUOTE_STROKES[0].d)!.map(Number);
const SPOOL = { x: -190, y: QUOTE_H + 70 };
const LEAD = `M${SPOOL.x + 8} ${SPOOL.y - 40} C${SPOOL.x + 90} ${SPOOL.y - 120} ${X0 - 160} ${Y0 + 160} ${X0} ${Y0}`;
const SW = QUOTE_STROKE;

export default function Intro() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const html = document.documentElement;
    if (!el || html.dataset.intro !== "play") return;
    const finish = () => {
      html.dataset.intro = "seen";
    };
    const skip = () => el.setAttribute("data-skip", "");
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el && END_ANIMATIONS.has(e.animationName)) finish();
    };
    // a background tab may never finish the animation
    const fallback = window.setTimeout(finish, 6500);
    const opts = { passive: true, once: true } as const;
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("keydown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchstart", skip, opts);
    el.addEventListener("animationend", onEnd);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      el.removeEventListener("animationend", onEnd);
    };
  }, []);

  return (
    <div ref={ref} className="intro">
      <div className="intro-desk">
        <div className="intro-term" role="img" aria-label={QUOTE_TEXT}>
          <span className="intro-tape" aria-hidden="true" />

          <div className="intro-bar" aria-hidden="true">
            <span className="intro-btns">
              {[0, 1, 2].map((i) => (
                <svg key={i} className="intro-btn" viewBox="0 0 20 20" focusable="false">
                  <circle cx="10" cy="10" r="8.6" />
                  <circle className="intro-btn-rim" cx="10" cy="10" r="5.6" />
                  <circle className="intro-btn-hole" cx="8" cy="8" r="1.15" />
                  <circle className="intro-btn-hole" cx="12" cy="8" r="1.15" />
                  <circle className="intro-btn-hole" cx="8" cy="12" r="1.15" />
                  <circle className="intro-btn-hole" cx="12" cy="12" r="1.15" />
                </svg>
              ))}
            </span>
            <span className="intro-title">thread — ~/atelier</span>
          </div>

          <div className="intro-body" aria-hidden="true">
            <p className="intro-line intro-cmd">
              <span className="intro-who">ashfaq@atelier</span> <span className="intro-cwd">~</span> <span className="intro-ps">%</span>{" "}
              <span className="intro-typed">thread --mend</span>
              <span className="intro-caret intro-caret-cmd" />
            </p>

            <div className="intro-page">
              <svg className="intro-quote" viewBox={`0 0 ${QUOTE_W} ${QUOTE_H}`} focusable="false">
                <defs>
                  {/* where the thread has got to: each stroke drawn on in turn */}
                  <mask id="intro-written" maskUnits="userSpaceOnUse" x={-40} y={-40} width={QUOTE_W + 80} height={QUOTE_H + 80}>
                    {QUOTE_STROKES.map((k, i) => (
                      <path key={i} d={k.d} pathLength={1} style={{ "--d": `${PACE[i].d}s`, "--t": `${PACE[i].t}s` } as CSSProperties} />
                    ))}
                  </mask>
                </defs>

                <g className="intro-spool">
                  <path className="intro-lead" d={LEAD} pathLength={1} />
                  <g transform={`translate(${SPOOL.x} ${SPOOL.y})`}>
                    <rect className="intro-spool-wood" x={-44} y={-58} width={88} height={14} rx={5} />
                    <rect className="intro-spool-thread" x={-34} y={-44} width={68} height={86} />
                    <path className="intro-spool-wind" d="M-34 -30 L34 -26 M-34 -14 L34 -10 M-34 2 L34 6 M-34 18 L34 22 M-34 34 L34 38" />
                    <rect className="intro-spool-wood" x={-44} y={42} width={88} height={14} rx={5} />
                  </g>
                </g>

                <g mask="url(#intro-written)" className="intro-thread">
                  <g className="intro-thread-shadow" transform="translate(1.6 2.6)">
                    {QUOTE_STROKES.map((k, i) => (
                      <path key={i} d={k.d} />
                    ))}
                  </g>
                  <g className="intro-thread-base">
                    {QUOTE_STROKES.map((k, i) => (
                      <path key={i} d={k.d} />
                    ))}
                  </g>
                  {/* the ply: a lighter twist running along the thread */}
                  <g className="intro-thread-ply" style={{ strokeDasharray: `${SW * 0.7} ${SW * 0.9}` }}>
                    {QUOTE_STROKES.map((k, i) => (
                      <path key={i} d={k.d} />
                    ))}
                  </g>
                </g>
              </svg>
            </div>

            <p className="intro-line intro-out">
              <span className="intro-arrow">→</span> opening the portfolio
              <span className="intro-caret intro-caret-out" />
            </p>
          </div>
        </div>
      </div>

      <button type="button" className="intro-skip" onClick={() => ref.current?.setAttribute("data-skip", "")}>
        Skip intro
      </button>
    </div>
  );
}

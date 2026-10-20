"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "./chapter.css";

/* The seam between two sections of the home page. A thread leaves the previous
   section's card, is drawn (needle first) as you scroll, ties one loop beside the
   chapter label and ends as the pin that holds up the next section's sheet. The
   sheet hangs loose until the thread pulls it straight.

   One scroll progress, `--p` (0 → 1), drives everything; without JavaScript, or
   with reduced motion, it stays at 1: the thread is drawn and the sheet is straight.
   Reuse it for every chapter: <ChapterSeam part="III" title="Projects" side="left">. */

// viewBox 0 0 640 240: out of the card at the top, one overhand loop, down to the pin
const PATH =
  "M320 2C319 46 262 54 236 86C212 116 222 160 262 156C298 152 300 106 266 102C232 98 232 146 284 172C318 189 322 206 320 230";

type Props = {
  /** roman numeral, e.g. "II" */
  part: string;
  title: string;
  /** a hand-written line bridging the two sections */
  line: string;
  /** which side the loop and the label sit on; alternate it between chapters */
  side?: "right" | "left";
  /** id for in-page links (#blog) */
  id?: string;
  children: ReactNode;
};

export default function ChapterSeam({ part, title, line, side = "right", id, children }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const seam = seamRef.current;
    const path = pathRef.current;
    const needle = needleRef.current;
    if (!root || !seam || !path || !needle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const len = path.getTotalLength();
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = seam.getBoundingClientRect();
      // starts as the seam's top enters the bottom of the screen, done once it has
      // risen to the upper half: about one screen of scrolling
      const start = vh * 0.98;
      const end = vh * 0.5 - r.height;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      root.style.setProperty("--p", p.toFixed(4));
      root.toggleAttribute("data-settled", p >= 1);
      // the needle leads the thread, pointing along it
      const at = Math.max(0.001, p) * len;
      const a = path.getPointAtLength(Math.max(0, at - 1));
      const b = path.getPointAtLength(at);
      const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      needle.setAttribute("transform", `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    root.setAttribute("data-live", "");
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.removeAttribute("data-live");
      root.style.removeProperty("--p");
    };
  }, []);

  return (
    <section className="chapter" id={id} ref={rootRef} data-side={side} aria-labelledby={id ? `${id}-chapter` : undefined} style={{ "--p": 1 } as CSSProperties}>
      <div className="chapter-seam" ref={seamRef}>
        <svg className="chapter-thread" viewBox="0 0 640 240" aria-hidden="true" focusable="false">
          <circle className="chapter-knot" cx="320" cy="3" r="3.4" />
          <path className="chapter-t" ref={pathRef} d={PATH} pathLength={1} />
          <path className="chapter-t-hi" d={PATH} pathLength={1} />
          <g ref={needleRef} className="chapter-needle" transform="translate(320 230) rotate(90)">
            <path d="M-26 0C-26-1.6-24.5-2.4-22-2.4L6-1C10-.6 12-.3 13 0 12 .3 10 .6 6 1L-22 2.4C-24.5 2.4-26 1.6-26 0Z" />
            <ellipse className="chapter-eye" cx="-20.5" cy="0" rx="3.6" ry="1" />
          </g>
          <g className="chapter-pin">
            <circle cx="320" cy="230" r="7" />
            <circle className="chapter-pin-hi" cx="317.6" cy="227.4" r="2" />
          </g>
        </svg>

        <p className="chapter-cue" aria-hidden="true">
          keep scrolling &middot; the thread continues
        </p>

        <div className="chapter-label">
          <p className="chapter-kicker">
            Part {part} &middot; <span id={id ? `${id}-chapter` : undefined}>{title}</span>
          </p>
          <p className="chapter-line">{line}</p>
        </div>
      </div>

      <div className="chapter-sheet">{children}</div>
    </section>
  );
}

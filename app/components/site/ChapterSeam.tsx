"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "./chapter.css";

/* The seam between two sections of the home page. A thread leaves the previous
   section's card, is drawn (needle first) as you scroll, ties one loop beside the
   chapter label and ends as the pin that holds up the next section's sheet. The
   sheet hangs loose until the thread pulls it straight.

   One scroll progress, `--p` (0 → 1), drives the seam; without JavaScript, or
   with reduced motion, it stays at 1: the thread is drawn and the sheet is straight.
   Performance: `--p` lives on the small seam only (on the section it would restyle
   the whole board every frame), the sheet gets one composited transform, and
   nothing runs while the seam is off screen.
   Reuse it for every chapter: <ChapterSeam part="III" title="Projects" side="left">. */

// viewBox 0 0 640 480: out of the card at the top, a long drop into one overhand
// loop beside the label, a sway, then down to the pin. Tall on purpose: the label
// stays on screen for a full screen of scrolling, long enough to read.
const PATH =
  "M320 2C318 74 266 104 252 158C238 206 226 258 264 268C302 278 306 216 270 212C234 208 236 266 292 300C334 326 366 354 348 400C336 430 320 442 320 470";

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
  const seamRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const seam = seamRef.current;
    const sheet = sheetRef.current;
    const path = pathRef.current;
    const needle = needleRef.current;
    if (!seam || !sheet || !path || !needle) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let len = 0; // measured on first use, not at hydration
    let raf = 0;
    let last = -1;
    let wasSettled: boolean | null = null;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = seam.getBoundingClientRect();
      // starts as the seam's top enters the bottom of the screen and finishes as the
      // pin reaches the middle: a seam's height plus half a screen of scrolling
      const start = vh * 0.98;
      const end = vh * 0.52 - r.height;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      if (Math.abs(p - last) < 0.0005) return;
      const settled = p >= 1;
      if (settled !== wasSettled) {
        wasSettled = settled;
        seam.toggleAttribute("data-settled", settled);
        // its own GPU layer only while it moves: the board isn't repainted per frame
        sheet.style.willChange = settled ? "" : "transform";
      }
      last = p;
      seam.style.setProperty("--p", p.toFixed(4));
      // the sheet hangs loose and is pulled straight as the thread tightens
      sheet.style.transform = settled ? "" : `translateY(${((1 - p) * 36).toFixed(2)}px) rotate(${((1 - p) * -1.2).toFixed(3)}deg)`;
      // the needle leads the thread, pointing along it
      len ||= path.getTotalLength();
      const at = Math.max(0.001, p) * len;
      const a = path.getPointAtLength(Math.max(0, at - 1));
      const b = path.getPointAtLength(at);
      const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      needle.setAttribute("transform", `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // listen only while the seam is within a screen of the viewport
    let listening = false;
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        onScroll();
      } else {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
    const io = new IntersectionObserver((entries) => listen(entries.some((e) => e.isIntersecting)), { rootMargin: "100% 0px" });
    seam.setAttribute("data-live", "");
    io.observe(seam); // the first update runs once the seam is within a screen of view
    return () => {
      io.disconnect();
      listen(false);
      cancelAnimationFrame(raf);
      seam.removeAttribute("data-live");
      seam.removeAttribute("data-settled");
      seam.style.removeProperty("--p");
      sheet.style.transform = "";
      sheet.style.willChange = "";
    };
  }, []);

  return (
    <section className="chapter" id={id} data-side={side} aria-labelledby={id ? `${id}-chapter` : undefined}>
      <div className="chapter-seam" ref={seamRef} style={{ "--p": 1 } as CSSProperties}>
        <svg className="chapter-thread" viewBox="0 0 640 480" aria-hidden="true" focusable="false">
          <circle className="chapter-knot" cx="320" cy="3" r="3.4" />
          <path className="chapter-t" ref={pathRef} d={PATH} pathLength={1} />
          <path className="chapter-t-hi" d={PATH} pathLength={1} />
          <g ref={needleRef} className="chapter-needle" transform="translate(320 470) rotate(90)">
            <path d="M-26 0C-26-1.6-24.5-2.4-22-2.4L6-1C10-.6 12-.3 13 0 12 .3 10 .6 6 1L-22 2.4C-24.5 2.4-26 1.6-26 0Z" />
            <ellipse className="chapter-eye" cx="-20.5" cy="0" rx="3.6" ry="1" />
          </g>
          <g className="chapter-pin">
            <circle cx="320" cy="470" r="7.5" />
            <circle className="chapter-pin-hi" cx="317.4" cy="467.2" r="2.1" />
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

      <div className="chapter-sheet" ref={sheetRef}>
        {children}
      </div>
    </section>
  );
}

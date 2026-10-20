"use client";

import { useEffect, useRef } from "react";
import "./intro.css";

/* The home page's opening: a sheet of pattern paper. A needle runs a stitch
   across it while the name is written in, the thread is tugged, and the paper
   parts along the seam (pinked edges, like cloth cut with pinking shears) to
   show the hero rising underneath. About 2.4 s; any click, key, scroll or touch
   skips straight to the parting.

   Whether it plays is decided before the first paint by INTRO_GATE in the root
   layout (html[data-intro]); the CSS shows it only for "play". The animation
   is pure CSS. This component only skips it and, once the paper has parted,
   flips data-intro to "seen" so it's gone for the rest of the visit. It also
   covers the hero's start-up: the hero is already moving when it's revealed. */

export default function Intro() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const html = document.documentElement;
    if (!el || html.dataset.intro !== "play") return;

    const skip = () => el.setAttribute("data-skip", "");
    const end = () => {
      html.dataset.intro = "seen";
    };
    // finished once the hero has risen (the last thing to move); the timer covers
    // a background tab, where animations may never run to their end
    const onEnd = (e: AnimationEvent) => {
      if (e.animationName.startsWith("intro-hero")) end();
    };
    const fallback = window.setTimeout(end, 4500);
    const opts = { passive: true, once: true } as const;
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("keydown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchstart", skip, opts);
    window.addEventListener("animationend", onEnd);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
      window.removeEventListener("animationend", onEnd);
    };
  }, []);

  return (
    <div ref={ref} className="intro" aria-hidden="true">
      <div className="intro-half intro-top">
        <p className="intro-name">
          <span className="intro-reveal">
            <span>Ashfaq</span>
          </span>
        </p>
      </div>
      <div className="intro-half intro-bottom">
        <p className="intro-line">
          <span className="intro-reveal">
            <span>threading the needle&hellip;</span>
          </span>
        </p>
      </div>

      {/* the seam: a running stitch revealed behind the needle */}
      <div className="intro-seam">
        <div className="intro-stitch">
          <div className="intro-stitch-in">
            <svg width="100%" height="24" preserveAspectRatio="none" focusable="false">
              <line className="intro-thread" x1="0" y1="12" x2="100%" y2="12" />
              <line className="intro-thread-hi" x1="0" y1="11" x2="100%" y2="11" />
            </svg>
          </div>
        </div>
        <div className="intro-needle">
          <svg className="intro-needle-bob" viewBox="-30 -8 46 16" width="92" height="32" focusable="false">
            <path d="M-26 0C-26-1.6-24.5-2.4-22-2.4L6-1C10-.6 12-.3 13 0 12 .3 10 .6 6 1L-22 2.4C-24.5 2.4-26 1.6-26 0Z" />
            <ellipse cx="-20.5" cy="0" rx="3.6" ry="1" />
          </svg>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./intro.css";

/* The home page's opening: a short story told by one thread. Four lines appear
   in turn, the hero's four stages, and under each the thread ties a loop and
   leaves a label, like notes along a seam. On the last line ("Why pick just
   one?") the thread is pulled taut, the loops flatten, and the paper lifts away
   onto the hero, whose heading answers it: "Pick a lane. or don't."

   About 4.7 s, pure CSS. Any click, key, scroll or touch (or the Skip button)
   lifts the paper at once. Whether it plays is decided before the first paint
   by INTRO_GATE in the root layout (html[data-intro]); when the paper has
   lifted, data-intro becomes "seen", which hides it and lets the hero start. */

const LINES = [
  { say: "It started with a needle.", mark: "tailor" },
  { say: "Then fabric: cut, pinned, draped.", mark: "fabric" },
  { say: "Then a blinking cursor", mark: "terminal", term: true },
  { say: "Why pick just one?", mark: "all of it" },
];
const LOOPS = [200, 400, 600, 800]; // loop centres, in the thread's 1000-wide viewBox
const Y = 60;

/** straight thread up to a loop at cx, around it, and out the other side */
const R = 34; // half the loop's width
const loop = (cx: number) => `L ${cx - R} ${Y} C ${cx - 8} ${Y} ${cx + 20} ${Y - 38} ${cx} ${Y - 44} C ${cx - 20} ${Y - 38} ${cx + 8} ${Y} ${cx + R} ${Y}`;
const SEGMENTS = LOOPS.map((cx, i) => `M ${i ? LOOPS[i - 1] + R : -1600} ${Y} ${loop(cx)}`);
const TAIL = `M ${LOOPS[LOOPS.length - 1] + R} ${Y} L 2600 ${Y}`;
const END_ANIMATIONS = new Set(["intro-lift", "intro-lift-fast"]);

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
    const fallback = window.setTimeout(finish, 8000);
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
      <div className="intro-story" aria-hidden="true">
        {LINES.map((l, k) => (
          <p key={k} className={`intro-say${l.term ? " intro-say-term" : ""}${k === LINES.length - 1 ? " intro-say-last" : ""}`} style={{ "--k": k } as CSSProperties}>
            {l.say}
            {l.term && <span className="intro-caret" />}
          </p>
        ))}
      </div>

      <div className="intro-seam" aria-hidden="true">
        <svg className="intro-thread" viewBox="0 0 1000 120" focusable="false">
          {SEGMENTS.map((d, k) => (
            <path key={k} d={d} pathLength={1} style={{ "--k": k } as CSSProperties} />
          ))}
          <path className="intro-tail" d={TAIL} pathLength={1} />
        </svg>
        {LINES.map((l, k) => (
          <span key={k} className="intro-mark" style={{ "--k": k, left: `${LOOPS[k] / 10}%` } as CSSProperties}>
            {l.mark}
          </span>
        ))}
      </div>

      <button type="button" className="intro-skip" onClick={() => ref.current?.setAttribute("data-skip", "")}>
        Skip intro
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { preload } from "react-dom";
import "./intro.css";

/* The home page opens under a length of burgundy linen; a character leans in,
   walks up, pinches it and drags it off to unveil the site (drape.ts and
   actor.ts, served as /intro.js and loaded async so it starts before React). Until the cloth is live, the same
   photo stands in as a CSS background, so the first paint is already the
   cloth. Any click, key, scroll or touch takes it away at once (INTRO_GATE in
   the root layout notes it as html[data-intro-skip], with where you clicked,
   even before the scripts load). Whether it plays at all is decided there too
   (html[data-intro]); the cloth flips data-intro to "seen" when it has gone. */

export default function Intro() {
  preload("/intro/fabric.webp", { as: "image", fetchPriority: "high" });
  preload("/intro/actor.webp", { as: "image", fetchPriority: "high" });

  useEffect(() => {
    const html = document.documentElement;
    const sheet = document.querySelector<HTMLElement>(".intro-sheet");
    if (html.dataset.intro !== "play" || !sheet) return;
    const done = () => (html.dataset.intro = "seen");
    // the page may have lifted away (a click before the cloth was live) before React got here
    if (sheet.getAnimations().some((a) => (a as CSSAnimation).animationName === "intro-out" && a.playState === "finished")) return void done();
    const onEnd = (e: AnimationEvent) => e.animationName === "intro-out" && done();
    sheet.addEventListener("animationend", onEnd);
    // if the cloth never gets going (a background tab, a failed script), don't stand in the way
    const fallback = window.setTimeout(done, 9000);
    return () => {
      sheet.removeEventListener("animationend", onEnd);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="intro">
      <div className="intro-sheet">
        {/* the cloth, and the character who takes it away (drape.ts and actor.ts,
            which may size them before React gets here) */}
        <canvas className="intro-cloth" aria-hidden="true" suppressHydrationWarning />
        <canvas className="intro-actor" aria-hidden="true" suppressHydrationWarning />
      </div>
      <script src="/intro.js" async />
      <button type="button" className="intro-skip">
        Skip intro
      </button>
    </div>
  );
}

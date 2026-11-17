"use client";

import { useRef, type MouseEvent } from "react";
import { spreadRed } from "./door-bloom";
import "./site.css";

/* The home page's last thing: a door to the world view. On a site drawn in
   one burgundy ink, the rag on this stick is the only bright red, as the
   strip torn off the belt is the first colour in the film's grey factory.
   It stirs in the wind (still, with reduced motion), and the whole card is
   the link.

   Going through, the rag's red runs out across the page until the window is
   red (door-bloom.ts), and the world view loads under it and comes up out of
   the red (film.css; layout.tsx tells it, before its first paint, that this
   is how it was reached). A modified click, or reduced motion, is a plain
   link: the two pages cross-fade (globals.css). */

/** the film's page is asked for as soon as the door is pointed at, so it's there when the red has spread */
let prefetched = false;
function prefetch() {
  if (prefetched) return;
  prefetched = true;
  const l = document.createElement("link");
  l.rel = "prefetch";
  l.href = "/worldview";
  l.as = "document";
  document.head.appendChild(l);
}

export default function WorldDoor() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const clothRef = useRef<SVGGElement>(null);
  const going = useRef(false);

  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !clothRef.current) return;
    e.preventDefault();
    if (going.current) return;
    going.current = true;
    prefetch();
    const link = linkRef.current;
    link?.setAttribute("data-going", "");
    const href = link?.href ?? "/worldview";
    const stop = spreadRed(clothRef.current.getBoundingClientRect(), () => {
      try {
        sessionStorage.setItem("door", "1");
      } catch {}
      // the red is the last frame here and the first there: no cross-fade between the two
      window.addEventListener(
        "pageswap",
        (ev) => {
          const vt = (ev as Event & { viewTransition?: ViewTransition | null }).viewTransition;
          vt?.ready.catch(() => {}); // a skipped transition's "ready" is refused: expected
          vt?.skipTransition();
        },
        { once: true },
      );
      window.location.assign(href);
    });
    // back again (the page restored as it was left): take the red away
    window.addEventListener(
      "pageshow",
      () => {
        stop();
        going.current = false;
        link?.removeAttribute("data-going");
      },
      { once: true },
    );
  };

  return (
    <aside className="door" aria-labelledby="door-title">
      {/* a plain link: a page load (see above) */}
      <a className="door-link" href="/worldview" ref={linkRef} onClick={open} onPointerEnter={prefetch} onFocus={prefetch}>
        <svg className="door-rag" viewBox="0 0 150 170" aria-hidden="true" focusable="false">
          <path d="M30 166 L52 6" fill="none" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M34 140 l8 -2 M38 110 l8 -2 M42 80 l8 -2" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
          <g className="door-cloth" ref={clothRef}>
            <path d="M52 8 C74 -2 92 20 128 8 C124 28 126 44 120 62 C92 74 74 54 46 64 Z" fill="var(--flag)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M70 12 C68 30 66 44 62 58 M98 14 C96 32 96 48 92 64" fill="none" stroke="var(--ink)" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
          </g>
        </svg>
        <span className="door-hand">one more page, and it isn&rsquo;t a lane</span>
        <span id="door-title" className="door-title">
          All of us
        </span>
        <span className="door-tag">My world view, a film in ninety seconds</span>
      </a>
    </aside>
  );
}

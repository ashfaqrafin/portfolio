"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import "./chapter-nav.css";

/* The home page's masthead: my name and the chapters, numbered as the
   chapter seams are. One of it, always there: it sits at the top of the hero
   as its masthead, and stays at the top of the window all the way down.

   Nothing in it moves as the page starts to scroll under it. A strip of
   paper comes up behind it (the hero's tags giving way to the strip), it
   draws up a little closer to the top, and a stitched thread runs under the
   chapter you're in, pulled along to the next one as the chapter changes, its
   leading end first and the tail following, as a thread is drawn through
   cloth. On a phone the chapters are numbers, and the one you're in opens
   out to its name. Without JavaScript it's the masthead, at the top. */

const CHAPTERS = [
  { id: "blog", no: "01", title: "Thread board", wide: true },
  { id: "education", no: "02", title: "Education", wide: false },
  { id: "projects", no: "03", title: "Projects", wide: false },
  { id: "contact", no: "04", title: "Contact", wide: false },
] as const;
type Id = (typeof CHAPTERS)[number]["id"];

/** px scrolled before the paper comes up behind it */
const STUCK_AT = 6;

export default function ChapterNav() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<Id | null>(null);
  // the thread under the active chapter: its two ends, and which way it last moved
  const [ends, setEnds] = useState<{ l: number; r: number; dir: "r" | "l" } | null>(null);

  // the page has started to scroll under it
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setStuck(window.scrollY > STUCK_AT);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // which chapter is in the middle of the window
  useEffect(() => {
    const sections = CHAPTERS.map((c) => document.getElementById(c.id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as Id);
        // above the first chapter (back in the hero): none
        if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.45) setActive(null);
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // where the thread runs: under the active chapter's link (measured again
  // while a phone's label opens out, and when the strip comes up)
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const link = active && track.querySelector<HTMLElement>(`a[href="#${active}"]`);
      if (!link) return setEnds(null);
      const a = track.getBoundingClientRect();
      const b = link.getBoundingClientRect();
      const l = b.left - a.left + 8;
      const r = b.right - a.left - 8;
      setEnds((prev) => (prev && Math.abs(prev.l - l) < 0.5 && Math.abs(prev.r - r) < 0.5 ? prev : { l, r, dir: !prev || l >= prev.l ? "r" : "l" }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    track.querySelectorAll("a").forEach((a) => ro.observe(a));
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [active, stuck]);

  const toTop = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0 });
  };

  const thread = ends ? ({ "--cnav-l": `${ends.l}px`, "--cnav-r": `${ends.r}px` } as CSSProperties) : undefined;

  return (
    <div className="cnav" data-stuck={stuck ? "" : undefined}>
      <div className="cnav-in">
        <a className="cnav-mark" href="#" onClick={toTop} aria-label="Ashfaq, back to the top">
          <span>Ashfaq</span>
          <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M2 6C20 2 34 8 54 4.5C74 1.5 92 7.5 118 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </a>
        <nav className="cnav-nav" aria-label="Chapters">
          <div className="cnav-track" ref={trackRef}>
            <ol className="cnav-list">
              {CHAPTERS.map((c) => (
                <li key={c.id} data-wide={c.wide ? "" : undefined}>
                  <a href={`#${c.id}`} aria-current={active === c.id ? "location" : undefined}>
                    <span className="cnav-no">
                      <span>{c.no}</span>
                    </span>
                    <span className="cnav-t">
                      <span>{c.title}</span>
                    </span>
                  </a>
                </li>
              ))}
              {/* a page of its own, not a chapter: the arrow instead of a number */}
              <li data-wide="" data-door="">
                <a href="/worldview">
                  <span className="cnav-no">
                    <span aria-hidden="true">&#8599;</span>
                  </span>
                  <span className="cnav-t">
                    <span>World view</span>
                  </span>
                </a>
              </li>
            </ol>
            <svg
              className="cnav-thread"
              data-on={ends ? "" : undefined}
              data-dir={ends?.dir}
              style={thread}
              viewBox="0 0 120 10"
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2 6C20 2 34 8 54 4.5C74 1.5 92 7.5 118 3.5" />
            </svg>
          </div>
        </nav>
      </div>
    </div>
  );
}

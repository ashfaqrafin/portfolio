"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import { ART_WEBP_MEDIA, ART_WEBP_URLS, INTRO, STAGES, type QuoteSeg } from "./config";
import "./hero.css";

// start fetching the engine (three.js) as soon as this module runs, while React is
// still hydrating, rather than after the first effect
const loadEngine = typeof window === "undefined" ? null : import("./engine");
/** Resolves once the home page's intro (app/components/intro) has finished, or
   at once if it isn't playing. The engine's set-up is ~0.45 s of main-thread
   work, which would stutter the intro's threads; the poster shows the same
   first frame meanwhile. */
function introDone(): Promise<void> {
  const html = document.documentElement;
  if (html.dataset.intro !== "play") return Promise.resolve();
  return new Promise((resolve) => {
    const mo = new MutationObserver(() => {
      if (html.dataset.intro === "play") return;
      mo.disconnect();
      resolve();
    });
    mo.observe(html, { attributes: true, attributeFilter: ["data-intro"] });
  });
}
const POSTER_ART = ["/hero/avatar-1.webp", "/hero/patterns.webp"];

/** Quote → per-character spans, grouped in word wrappers so lines wrap between words only. */
function Chars({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\s+)/).map((tok, i) =>
        tok === "" ? null : /^\s+$/.test(tok) ? (
          <span className="sp" key={i}>
            {" "}
          </span>
        ) : (
          <span className="w" key={i}>
            {Array.from(tok).map((ch, j) => (
              <span className="c" aria-hidden="true" key={j}>
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </>
  );
}

function QuoteText({ segs }: { segs: QuoteSeg[] }) {
  return (
    <>
      {segs.map((s, i) => (
        <span className={s.kind ? `seg seg-${s.kind}` : "seg"} key={i}>
          <Chars text={s.text} />
        </span>
      ))}
    </>
  );
}

const Arrow = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d={dir === "r" ? "M3 12.4C8 11.6 14 12.5 20.5 12M14.5 6.2C17 8.6 19 10.5 21 12.1C18.8 13.8 16.6 15.8 14.2 18.2" : "M21 11.6C16 12.4 10 11.5 3.5 12M9.5 5.8C7 8.2 5 10.1 3 11.9C5.2 13.6 7.4 15.6 9.8 18"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  // the rest of the artwork downloads alongside the page's scripts. raster.ts
  // fetch()es it, so the preload is `as: "fetch"` (anonymous, to match fetch's CORS
  // mode). The two poster images are left out: their <img>s already load them.
  for (const href of ART_WEBP_URLS)
    if (!POSTER_ART.includes(href)) preload(href, { as: "fetch", crossOrigin: "anonymous", media: ART_WEBP_MEDIA });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    Promise.all([loadEngine ?? import("./engine"), introDone()])
      .then(([{ createEngine }]) => createEngine(root, () => cancelled))
      .then((engine) => {
        if (cancelled) engine.dispose();
        else dispose = () => engine.dispose();
      })
      .catch((err) => {
        if (cancelled) return;
        // keep the static markup (quotes as text, noscript artwork) if WebGL or art fails
        console.warn("[hero] animation unavailable, showing static fallback", err);
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return (
    <section className="hero" ref={rootRef} data-hero="root" aria-label="Introduction">
      <svg className="hero-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="rough-a" x="-4%" y="-4%" width="108%" height="108%">
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.02" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="rough-b" x="-4%" y="-4%" width="108%" height="108%">
            <feTurbulence type="fractalNoise" baseFrequency="0.026 0.03" numOctaves="2" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="G" yChannelSelector="R" />
          </filter>
          <filter id="rough-s" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="hero-masthead">
        <p className="hero-mark">
          <span>Ashfaq</span>
          <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M2 6C20 2 34 8 54 4.5C74 1.5 92 7.5 118 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </p>
        <nav className="hero-nav" aria-label="Sections">
          <a className="hero-nav-wide" href="#blog">
            Thread board
          </a>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>

      <div className="hero-card">
        <header className="hero-head">
          <h1 className="hero-h1">
            <span className="hero-kicker">{INTRO.name} &middot; Portfolio {INTRO.year}</span>
            <span className="hero-h1-main">{INTRO.headline}</span>{" "}
            <span className="hero-h1-hand">
              {INTRO.aside}
              <svg viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M3 8C16 4 26 9 40 6S64 2 78 6 104 9 117 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="7 5" />
              </svg>
            </span>
          </h1>
          {/* the stage readout: the engine rewrites it as the animation moves on */}
          <div className="hero-caption flip" data-hero="caption">
            <p className="hero-stageno" data-hero="stage-no">
              STAGE 01 / 04
            </p>
            <p className="hero-title" data-hero="title">
              {STAGES[0].title}
            </p>
            <p className="hero-sub" data-hero="sub">
              {STAGES[0].sub}
            </p>
          </div>
        </header>

        <div className="hero-stagebox">
          <div className="hero-note" data-hero="note">
            <div className="qbox" data-hero="qbox" data-skin="0">
              <span className="q-deco q-deco-a" aria-hidden="true" />
              <span className="q-deco q-deco-b" aria-hidden="true" />
              <span className="q-tag" data-hero="qtag" aria-hidden="true">
                {STAGES[0].tag}
              </span>
              {STAGES.map((s, i) => (
                <p className="qtext" data-qstage={i} data-active={i === 0 ? "true" : "false"} key={i}>
                  {i === 2 && (
                    <span className="prompt" aria-hidden="true">
                      ashfaq@arch:~$&nbsp;
                    </span>
                  )}
                  <QuoteText segs={s.quote} />
                </p>
              ))}
            </div>
            <p className="sr-only" aria-live="polite" data-hero="live">
              {STAGES[0].quote.map((s) => s.text).join("")}
            </p>
          </div>

          <div className="hero-stage" data-hero="stage">
            <div className="hero-canvas" data-hero="canvas" />
            <svg className="hero-thread" data-hero="thread" aria-hidden="true" focusable="false">
              <path data-hero="thread-path" fill="none" />
              <circle data-hero="thread-dot" r="4.5" />
            </svg>
            <p className="hero-loading" aria-hidden="true">
              threading the needle&hellip;
            </p>
            <div className="hero-poster" aria-hidden="true">
              <svg width="0" height="0" focusable="false">
                {/* multiplies by --paper (#f8f3ea), as BG_FRAG's PAPER does */}
                <filter id="hero-paper" colorInterpolationFilters="sRGB">
                  <feColorMatrix values="0.973 0 0 0 0  0 0.953 0 0 0  0 0 0.918 0 0  0 0 0 1 0" />
                </filter>
              </svg>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-poster-pat" src="/hero/patterns.webp" alt="" />
              <picture>
                <source media="(prefers-reduced-motion: reduce)" srcSet="/hero/avatar-4.webp" />
                <img className="hero-poster-fig" src="/hero/avatar-1.webp" alt="" fetchPriority="high" />
              </picture>
            </div>
          </div>
        </div>

        <div className="hero-controls">
          <button type="button" className="hbtn" data-hero="prev" aria-label="Previous stage">
            <Arrow dir="l" />
          </button>
          <div className="hero-track" role="group" aria-label="Stages">
            <div className="hero-rail">
              <div className="hero-fill" data-hero="fill" />
            </div>
            {STAGES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={`hero-dot${i === 0 ? " active" : ""}`}
                data-step={i}
                style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
                aria-label={`Go to stage ${i + 1}: ${s.title}`}
                aria-current={i === 0 ? "step" : undefined}
              >
                <span className="n">{i + 1}</span>
              </button>
            ))}
          </div>
          <button type="button" className="hbtn" data-hero="next" aria-label="Next stage">
            <Arrow dir="r" />
          </button>
          <button
            type="button"
            className="hbtn hbtn-play"
            data-hero="play"
            data-state="playing"
            aria-pressed="false"
            aria-label="Pause animation"
          >
            <svg className="i-pause" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M8 5.5V18.5M16 5.5V18.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
            <svg className="i-play" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M7.5 5.5L18.5 12L7.5 18.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>

        </div>
      </div>
    </section>
  );
}

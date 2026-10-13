"use client";

import { Fragment, useEffect, useRef } from "react";
import { P, STAGES, type QuoteSeg } from "./config";
import "./hero.css";

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    import("./engine")
      .then(({ createEngine }) => createEngine(root, () => cancelled))
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
        <p className="hero-meta">
          <span className="hero-annot">pick a lane. or don&rsquo;t.</span>
          <span>Portfolio &middot; MMXXVI</span>
        </p>
      </div>

      <div className="hero-card">
        <header className="hero-caption flip" data-hero="caption">
          <div className="hero-cap-l">
            <p className="hero-stageno" data-hero="stage-no">
              STAGE 01 / 04
            </p>
            <h1 className="hero-title" data-hero="title">
              &ldquo;{STAGES[0].title}&rdquo;
            </h1>
          </div>
          <p className="hero-sub" data-hero="sub">
            {STAGES[0].sub}
          </p>
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
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-fallback" src="/hero/avatar-4.svg" alt={STAGES[3].alt} />
            </noscript>
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
              <Fragment key={s.title}>
                <button
                  type="button"
                  className={`hero-dot${i === 0 ? " active" : ""}`}
                  data-step={i}
                  style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
                  aria-label={`Go to stage ${i + 1}: ${s.title}`}
                  aria-current={i === 0 ? "step" : undefined}
                >
                  <span className="n">{i + 1}</span>
                  <span className="tl" aria-hidden="true">
                    {(i * P).toFixed(1)}s
                  </span>
                </button>
              </Fragment>
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
          <p className="hero-readout" data-hero="readout">
            t = 0.0s &middot; stage 1 of 4
          </p>
        </div>
      </div>
    </section>
  );
}

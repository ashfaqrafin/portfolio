"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { startWorldView } from "./engine";
import { BUBBLES, CAPTIONS, CHAPTERS, FLAGS, SCROLL_SCREENS } from "./story";
import "./worldview.css";

/* The world view page (/worldview): a story told in seven chapters on one
   canvas that stays in view while the page scrolls (engine.ts). Everything
   said is also here as text, chapter by chapter, so it reads without the
   pictures (a screen reader, no JavaScript). */
export default function WorldView({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? startWorldView(ref.current) : undefined), []);

  return (
    <div ref={ref} className={`wv ${className}`} data-tone="paper" data-no-cut>
      <header className="wv-top">
        <Link className="wv-mark" href="/" aria-label="Ashfaq, home">
          Ashfaq
        </Link>
        <p className="wv-chapter" aria-hidden="true">
          I · The weight
        </p>
        <button type="button" className="wv-sound" aria-pressed="false">
          Sound off
        </button>
      </header>

      <div className="wv-track" style={{ "--wv-screens": SCROLL_SCREENS } as CSSProperties}>
        <div className="wv-stage" data-tone="paper">
          <canvas className="wv-canvas" aria-hidden="true" />

          <div className="wv-title">
            <p className="wv-kicker">My world view, in seven chapters</p>
            <h1>The flag nobody could break</h1>
            <p className="wv-lede">Every world begins as somebody’s refusal.</p>
            <div className="wv-begin">
              <button type="button" className="wv-begin-sound">
                Begin, with sound
              </button>
              <button type="button" className="wv-begin-quiet">
                or just scroll, in silence
              </button>
            </div>
          </div>

          <div className="wv-captions">
            {CHAPTERS.map((ch, i) => (
              <section key={ch.no} aria-labelledby={`wv-ch-${i}`}>
                <h2 id={`wv-ch-${i}`} className="wv-sr">
                  {ch.no}. {ch.name}
                </h2>
                {CAPTIONS.filter((c) => c.chapter === i).map((c) => (
                  <p key={c.t0} className="wv-cap">
                    {c.text}
                  </p>
                ))}
                {i === 4 && (
                  <>
                    <p className="wv-sr">
                      On the rock he plants a pole, and the red rag flies from it. He says: “{BUBBLES.burn.text.join(" ")}” Every time the flag is torn, it is
                      stitched back in red thread as another people’s flag:
                    </p>
                    <ul className="wv-sr">
                      {FLAGS.slice(1).map((f) => (
                        <li key={f.id}>{f.line}</li>
                      ))}
                    </ul>
                    <p className="wv-sr">Dhraam! He turns to us: “Dekhle?” (See?)</p>
                  </>
                )}
              </section>
            ))}
          </div>

          <div className="wv-end">
            <p className="wv-end-line">Not a ladder with a few at the top. One long table, and there’s room for you.</p>
            <p className="wv-end-sign">— Ashfaq</p>
            <div className="wv-end-links">
              {/* a plain link: a page load, so the two pages cross-fade (globals.css) */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/">Back to the portfolio</a>
              <button type="button" className="wv-replay">
                Start again
              </button>
            </div>
          </div>

          <p className="wv-hint" aria-hidden="true">
            Scroll
          </p>
          <button type="button" className="wv-tear">
            Tear the flag
          </button>
          <div className="wv-progress" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>

      <noscript>
        <style>{`.wv-track{display:none}`}</style>
        <article className="wv-plain">
          <h1>The flag nobody could break</h1>
          <p className="wv-lede">Every world begins as somebody’s refusal.</p>
          {CHAPTERS.map((ch, i) => (
            <section key={ch.no}>
              <h2>
                {ch.no}. {ch.name}
              </h2>
              {CAPTIONS.filter((c) => c.chapter === i).map((c) => (
                <p key={c.t0}>{c.text}</p>
              ))}
            </section>
          ))}
          <p className="wv-end-line">Not a ladder with a few at the top. One long table, and there’s room for you.</p>
          <p>
            <Link href="/">Back to the portfolio</Link>
          </p>
        </article>
      </noscript>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { startFilm } from "./engine";
import { END, SCENES } from "./film";
import "./film.css";

/* The world view page (/worldview): ALL OF US, a film of ninety seconds
   about exploitation and the revolt against it, drawn entirely in code on
   one canvas (film.ts) and played by engine.ts. What happens in it is also
   here as text, scene by scene, for a screen reader, and for a browser
   without JavaScript. */
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function Script() {
  return (
    <>
      <ol>
        {SCENES.map((s) => (
          <li key={s.at}>
            <strong>{s.name}.</strong> {s.line}
          </li>
        ))}
      </ol>
      <p>Not a ladder. A table. — Ashfaq</p>
    </>
  );
}

export default function Film({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? startFilm(ref.current) : undefined), []);

  return (
    <div ref={ref} className={`film ${className}`} data-state="title" data-sound="off" data-no-cut>
      <div className="film-stage">
        <canvas className="film-canvas" aria-hidden="true" />

        <header className="film-top">
          {/* a plain link: a page load, so the two pages cross-fade (globals.css) */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="film-home" href="/" aria-label="Ashfaq, home">
            Ashfaq
          </a>
          <button type="button" className="film-sound" aria-pressed="false">
            Sound off
          </button>
        </header>

        <div className="film-title">
          <p className="film-kicker">My world view</p>
          <h1>All of us</h1>
          <p className="film-lede">a film in 90 seconds</p>
          <div className="film-begin">
            <button type="button" className="film-play-sound">
              Play with sound
            </button>
            <button type="button" className="film-play-quiet">
              <span className="film-when-moving">play in silence</span>
              <span className="film-when-still">see it as eight posters</span>
            </button>
          </div>
        </div>

        <p className="film-caption" role="status" />

        <div className="film-end" inert>
          <button type="button" className="film-again">
            Watch again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/">Back to the portfolio</a>
          <button type="button" className="film-explore-go">
            Explore
          </button>
        </div>

        <div className="film-bar">
          <button type="button" className="film-toggle" aria-label="Pause" data-icon="pause" />
          <button type="button" className="film-prev" aria-label="Previous poster">
            ←
          </button>
          <button type="button" className="film-next" aria-label="Next poster">
            →
          </button>
          <div className="film-line">
            <span className="film-fill" />
            <div className="film-marks" role="group" aria-label="Scenes">
              {SCENES.map((s, i) => (
                <button
                  key={s.at}
                  type="button"
                  data-scene={i}
                  data-name={s.name}
                  style={{ left: `${(s.at / END) * 100}%` }}
                  aria-label={`Scene ${i + 1}: ${s.name}, at ${clock(s.at)}`}
                />
              ))}
            </div>
          </div>
          <span className="film-time" aria-hidden="true">
            0:00 / {clock(END)}
          </span>
          <button type="button" className="film-explore" aria-pressed="false" title="Loop this scene and play with it">
            Explore
          </button>
          <button type="button" className="film-poster" title="Save this frame as a poster">
            Poster
          </button>
        </div>
      </div>

      <section className="film-sr" aria-label="The film, in words">
        <Script />
      </section>

      <noscript>
        <style>{`.film-stage,.film-sr{display:none}.film{height:auto;overflow:visible}`}</style>
        <article className="film-plain">
          <p className="film-kicker">My world view</p>
          <h1>All of us</h1>
          <p className="film-lede">A film in 90 seconds. It needs JavaScript to play; this is what happens in it.</p>
          <Script />
          <p>
            <Link href="/">Back to the portfolio</Link>
          </p>
        </article>
      </noscript>
    </div>
  );
}

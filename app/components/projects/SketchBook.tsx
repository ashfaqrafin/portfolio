"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { ProjectData } from "@/lib/projects/data";
import { STATUS_LABEL } from "@/lib/projects/status";
import LogoDrawing from "./LogoDrawing";
import "./sketchbook.css";

/* The projects as a spiral-bound sketch pad: one project per page. A page draws
   itself when it lands: the logo stroke by stroke, then the notes written in
   around it. Turning a page flips it up over the spiral.

   Every page is in the DOM (stacked in one grid cell, so the pad is as tall as
   its tallest page and never jumps). Without JavaScript they are simply listed;
   with reduced motion they turn instantly and appear already drawn. */

type Flip = { from: number; to: number; dir: "next" | "prev" };
type Role = "top" | "under" | "leaf" | "hidden";
/** done: fully drawn (no JS, reduced motion, a page on its way out) · ready: blank, waiting · go: drawing */
type Draw = "done" | "ready" | "go";

const FLIP_MS = 900;
const pad2 = (n: number) => String(n).padStart(2, "0");
const at = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

export default function SketchBook({ projects }: { projects: ProjectData[] }) {
  const n = projects.length;
  const rootRef = useRef<HTMLElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [cur, setCur] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  // set from the first IntersectionObserver callback, never during hydration
  const [env, setEnv] = useState({ mounted: false, reduced: false });
  const [seen, setSeen] = useState(false);
  const live = env.mounted && !env.reduced;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        setEnv((e) => (e.mounted ? e : { mounted: true, reduced }));
        // draw once the pad is properly on screen, and only the first time
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.3)) setSeen(true);
      },
      { threshold: [0, 0.3] },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const finish = () => {
    if (!flip) return;
    setCur(flip.to);
    setFlip(null);
  };

  // animationend is the normal end of a turn; this covers a hidden tab, where it never fires
  useEffect(() => {
    if (!flip) return;
    const t = window.setTimeout(() => {
      setCur(flip.to);
      setFlip(null);
    }, FLIP_MS + 400);
    return () => window.clearTimeout(t);
  }, [flip]);

  const go = (to: number) => {
    if (flip || to === cur || to < 0 || to >= n) return;
    if (!live) setCur(to);
    else setFlip({ from: cur, to, dir: to > cur ? "next" : "prev" });
    // a page is taller than a phone screen and the controls sit under it: bring the
    // top of the pad back into view so the new drawing isn't missed
    const top = rootRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) rootRef.current?.scrollIntoView({ behavior: env.reduced ? "auto" : "smooth", block: "start" });
  };

  const roleOf = (i: number): Role => {
    if (!flip) return i === cur ? "top" : "hidden";
    if (flip.dir === "next") return i === flip.from ? "leaf" : i === flip.to ? "under" : "hidden";
    return i === flip.to ? "leaf" : i === flip.from ? "under" : "hidden";
  };
  const drawOf = (i: number): Draw => {
    if (!live) return "done";
    if (flip) return i === flip.from ? "done" : "ready";
    return i === cur && seen ? "go" : "ready";
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    if (e.key === "ArrowRight") go(cur + 1);
    else if (e.key === "ArrowLeft") go(cur - 1);
    else return;
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent) => {
    swipe.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1));
  };

  if (!n) return null;
  const shown = projects[flip ? flip.to : cur];

  return (
    <section ref={rootRef} className="pj" aria-labelledby="pj-heading" onKeyDown={onKeyDown}>
      <h2 className="pj-sr" id="pj-heading">
        Projects sketchbook
      </h2>
      <div className="pj-pad" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
        <div className="pj-spiral" aria-hidden="true" />
        <div className="pj-pages">
          {projects.map((p, i) => {
            const role = roleOf(i);
            const away = env.mounted && role !== "top";
            return (
              <article
                key={p.slug}
                id={`project-${p.slug}`}
                className="pj-page"
                data-role={role}
                data-dir={role === "leaf" ? flip?.dir : undefined}
                data-draw={drawOf(i)}
                aria-labelledby={`pj-${p.slug}-title`}
                aria-hidden={away || undefined}
                inert={away}
                onAnimationEnd={(e) => {
                  if (role === "leaf" && e.target === e.currentTarget) finish();
                }}
              >
                <Page p={p} />
                <div className="pj-back" aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </div>

      <nav className="pj-nav" aria-label="Sketchbook pages">
        <button type="button" className="pj-btn" onClick={() => go(cur - 1)} disabled={cur === 0} aria-label="Previous page">
          <Arrow dir="l" />
        </button>
        <ol className="pj-tabs">
          {projects.map((p, i) => (
            <li key={p.slug}>
              <button type="button" className="pj-tab" onClick={() => go(i)} aria-current={i === cur ? "page" : undefined} aria-label={`Page ${i + 1}: ${p.title}`}>
                <span className="pj-tab-no">{pad2(i + 1)}</span>
                <span className="pj-tab-name">{p.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="pj-btn" onClick={() => go(cur + 1)} disabled={cur === n - 1} aria-label="Next page">
          <Arrow dir="r" />
        </button>
      </nav>
      <p className="pj-sr" aria-live="polite">
        {env.mounted ? `Page ${(flip ? flip.to : cur) + 1} of ${n}: ${shown.title}` : ""}
      </p>
    </section>
  );
}

function Page({ p }: { p: ProjectData }) {
  return (
    <div className="pj-front">
      <header className="pj-form">
        <span className="pj-field">
          <span className="pj-lbl">Date</span>
          <span className="pj-val pj-w" style={at(0.25)}>
            {p.year}
          </span>
        </span>
        <span className="pj-field pj-field-grow">
          <span className="pj-lbl">Subject</span>
          <span className="pj-val pj-w" style={at(0.4)}>
            {p.kind}
          </span>
        </span>
      </header>

      <div className="pj-body">
        <figure className="pj-fig">
          <div className="pj-frame">
            <LogoDrawing logo={p.logo} art={p.art} />
            <span className="pj-stamp" data-status={p.status} style={at(2.5)}>
              {STATUS_LABEL[p.status]}
            </span>
          </div>
        </figure>

        <div className="pj-text">
          <h3 className="pj-title" id={`pj-${p.slug}-title`}>
            <span className="pj-w" style={at(0.45)}>
              {p.title}
            </span>
          </h3>
          <svg className="pj-ul" viewBox="0 0 320 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path className="pj-line" pathLength={1} style={at(1)} d="M3 8C40 4 66 9 104 6S170 2 214 6 280 9 317 4" />
          </svg>
          <p className="pj-tagline pj-w" style={at(1.1)}>
            {p.tagline}
          </p>
          <div className="pj-notes pj-wd" style={at(1.4)}>
            {p.notes.map((b, k) =>
              b.kind === "p" ? (
                <p key={k}>{b.text}</p>
              ) : (
                <ul key={k}>
                  {b.items.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
          {p.stack.length > 0 && (
            <div className="pj-mats">
              <p className="pj-lbl pj-w" style={at(1.8)}>
                Materials
              </p>
              <ul>
                {p.stack.map((s, k) => (
                  <li key={s} className="pj-chip" style={at(1.9 + k * 0.08)}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.role && (
            <p className="pj-role pj-w" style={at(2.2)}>
              <span className="pj-lbl">Role</span> {p.role}
            </p>
          )}
          {p.links.length > 0 && (
            <ul className="pj-links">
              {p.links.map((l, k) => (
                <li key={l.href}>
                  <a className="pj-link pj-w" style={at(2.3 + k * 0.12)} href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                    <span aria-hidden="true">&nbsp;&#8599;</span>
                    <span className="pj-sr"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Arrow({ dir }: { dir: "l" | "r" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={dir === "l" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

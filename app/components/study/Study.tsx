"use client";

import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { SUBJECTS } from "./answers";
import type { BallAt, Orbit } from "./orbit";
import "./study.css";

/* Education: me, and my three subjects orbiting me as balls of particles
   (orbit.ts, three.js), drawn like a plate from an astronomy notebook. Each
   ball tows a tailor's tag on a thread with its question; click the tag (or
   the ball) and a small window floats up with the answer (answers.ts), tied to
   its ball. The orbit slows while a question is pointed at or a window is open.

   The tags are real buttons over the scene. They follow their ball on a
   spring, so they lag and swing as it moves. Before the scene is ready,
   without WebGL, or without JavaScript, the avatar is a plain image and the
   tags hang in a column beside him. With reduced motion the balls hold still. */

type Tag = { x: number; y: number; vx: number; vy: number; ok: boolean };

export default function Study() {
  const uid = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const tieRef = useRef<SVGPathElement>(null);
  const stringRefs = useRef<(SVGPathElement | null)[]>([]);
  const qRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const winRef = useRef<HTMLDivElement>(null);
  const orbit = useRef<Orbit | null>(null);
  const balls = useRef<BallAt[]>([]);
  const openRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  // where the window floats, in stage px (moved by dragging its title bar)
  const [win, setWin] = useState({ x: 0, y: 0 });
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tags: Tag[] = SUBJECTS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, ok: false }));

    const place = (at: BallAt[]) => {
      balls.current = at;
      const W = stage.clientWidth;
      const thin = W < 640;

      // where each tag wants to hang: beside its ball on the side away from him,
      // if it fits; else under it (over it when it's behind him). On a phone
      // there's no room beside him: they hang in a row along the bottom
      const H = stage.clientHeight;
      const want = at.map((b, i) => {
        const q = qRefs.current[i];
        const w = q?.offsetWidth ?? 0;
        const h = q?.offsetHeight ?? 0;
        if (thin) {
          const x = Math.max(6, Math.min(W - w - 6, (W * (2 * i + 1)) / 6 - w / 2));
          return { x, y: H - h - 16 - (i % 2) * 6, w, h, z: b.z, right: true, beside: false };
        }
        const right = b.x >= W / 2;
        const sideX = right ? b.x + b.r + 26 : b.x - b.r - 26 - w;
        const beside = !thin && sideX >= 8 && sideX + w <= W - 8;
        const x = beside ? sideX : Math.max(8, Math.min(W - w - 8, b.x - w / 2));
        const y = beside ? b.y - h / 2 + b.r * 0.35 : b.z < -0.05 ? b.y - b.r - 18 - h : b.y + b.r + 18;
        return { x, y, w, h, z: b.z, right, beside };
      });
      // two in each other's way: the one further back steps up out of it
      if (!thin)
        for (const p of want)
          for (const q of want) {
            if (p === q || p.z >= q.z) continue;
            if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) p.y = q.y - p.h - 8;
          }

      at.forEach((b, i) => {
        const q = qRefs.current[i];
        const t = tags[i];
        const w = want[i];
        if (!q) return;
        // on a spring: it lags behind its ball and swings
        if (!t.ok || still) Object.assign(t, { x: w.x, y: w.y, vx: 0, vy: 0, ok: true });
        else {
          t.vx = (t.vx + (w.x - t.x) * 0.09) * 0.8;
          t.vy = (t.vy + (w.y - t.y) * 0.09) * 0.8;
          t.x += t.vx;
          t.y += t.vy;
        }
        const swing = Math.max(-9, Math.min(9, t.vx * 0.9 + (w.right ? 2 : -2)));
        q.style.transform = `translate(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px) rotate(${swing.toFixed(2)}deg)`;
        // the hole the string goes through: at the end nearer the ball
        const holeLeft = !w.beside || w.right;
        q.dataset.hole = holeLeft ? "left" : "right";
        q.style.transformOrigin = holeLeft ? "16px 50%" : `${w.w - 16}px 50%`;
        const behind = b.z < -0.05;
        if (behind) q.dataset.behind = "";
        else delete q.dataset.behind;

        // the string, from the ball's edge to the hole, sagging a little
        const s = stringRefs.current[i];
        if (s) {
          const hx = holeLeft ? t.x + 16 : t.x + w.w - 16;
          const hy = t.y + w.h / 2;
          const a = Math.atan2(hy - b.y, hx - b.x);
          const ex = b.x + Math.cos(a) * b.r * 0.92;
          const ey = b.y + Math.sin(a) * b.r * 0.92;
          const len = Math.hypot(hx - ex, hy - ey);
          s.setAttribute("d", `M${ex.toFixed(1)} ${ey.toFixed(1)}Q${((ex + hx) / 2).toFixed(1)} ${((ey + hy) / 2 + 8 + len * 0.12).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`);
          s.style.opacity = behind ? "0.35" : "1";
        }
      });

      // the open window, tied to its ball by a thread
      const box = winRef.current;
      const tie = tieRef.current;
      const k = openRef.current;
      if (tie) {
        if (box && k !== null && at[k] && !thin) {
          const toRight = at[k].x > box.offsetLeft + box.offsetWidth / 2;
          const x1 = box.offsetLeft + (toRight ? box.offsetWidth - 6 : 6);
          const y1 = box.offsetTop + 30;
          const { x: x2, y: y2 } = at[k];
          tie.setAttribute("d", `M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.max(y1, y2) + 40} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
          tie.style.display = "";
        } else tie.style.display = "none";
      }
    };

    const img = new Image();
    img.decoding = "async";
    img.src = "/education/avatar.webp";
    Promise.all([import("./orbit"), img.decode()])
      .then(([{ createOrbit }]) => {
        if (cancelled) return;
        const o = createOrbit(stage, { marks: SUBJECTS.map((s) => s.id), avatar: img, still, onFrame: place });
        orbit.current = o;
        setReady(true);
        io = new IntersectionObserver(([e]) => o.setVisible(e.isIntersecting), { threshold: 0.05 });
        io.observe(stage);
      })
      .catch((err) => {
        // no WebGL: the image and the tags beside him stay
        if (!cancelled) console.warn("[education] the orbit is unavailable", err);
      });
    return () => {
      cancelled = true;
      io?.disconnect();
      orbit.current?.dispose();
      orbit.current = null;
    };
  }, []);

  // a window open: the orbit slows; Escape closes it
  useEffect(() => {
    openRef.current = open;
    orbit.current?.slow(open !== null);
    if (open === null) return;
    winRef.current?.querySelector<HTMLElement>(".ed-win-h")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      opener.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const show = (i: number, from?: HTMLButtonElement | null) => {
    const stage = stageRef.current;
    if (!stage) return;
    opener.current = from ?? qRefs.current[i];
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const b = balls.current[i];
    const ww = Math.min(380, W - 24);
    // in the open paper on the far side of him from its ball
    const left = b ? b.x > W / 2 : true;
    const x = left ? W * 0.26 - ww / 2 : W * 0.74 - ww / 2;
    setWin({ x: Math.max(12, Math.min(W - ww - 12, x)), y: Math.max(12, H * 0.14) });
    setOpen(i);
  };
  const close = () => {
    setOpen(null);
    opener.current?.focus();
  };

  // the window's title bar drags it
  const drag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const stage = stageRef.current;
    const box = winRef.current;
    // on a phone the window is docked at the bottom
    if (!stage || !box || stage.clientWidth < 640) return;
    const sx = e.clientX - win.x;
    const sy = e.clientY - win.y;
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const move = (ev: PointerEvent) =>
      setWin({
        x: Math.max(0, Math.min(W - box.offsetWidth, ev.clientX - sx)),
        y: Math.max(0, Math.min(H - 40, ev.clientY - sy)),
      });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // the balls themselves: point at one to loosen it, click to ask
  const ballAt = (e: ReactPointerEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>) => {
    const o = orbit.current;
    const stage = stageRef.current;
    if (!o || !stage || e.target !== stage.querySelector(".ed-gl")) return -1;
    const r = stage.getBoundingClientRect();
    return o.hit(e.clientX - r.left, e.clientY - r.top);
  };
  const onStageMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const i = ballAt(e);
    orbit.current?.excite(i < 0 ? null : i);
    if (stageRef.current) stageRef.current.dataset.over = i < 0 ? "" : String(i);
  };
  const onStageClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const i = ballAt(e);
    if (i >= 0) show(i);
  };

  const s = open === null ? null : SUBJECTS[open];

  return (
    <section className="sheet ed" aria-labelledby={`${uid}-h`}>
      <header className="ed-head">
        <h2 className="ed-h2" id={`${uid}-h`}>
          Three subjects, <span className="ed-h2-hand">one orbit.</span>
        </h2>
        <p className="ed-lede">
          I&rsquo;m a double major in computer science and economics, with a minor in political science. People usually ask why all three, so each one gets its own
          question. Pull a tag.
        </p>
      </header>

      <div
        ref={stageRef}
        className="ed-stage"
        data-ready={ready ? "" : undefined}
        onPointerMove={onStageMove}
        onPointerLeave={() => orbit.current?.excite(null)}
        onClick={onStageClick}
      >
        {/* the open window's thread runs behind him */}
        <svg className="ed-under" aria-hidden="true">
          <path ref={tieRef} className="ed-tie" d="" style={{ display: "none" }} />
        </svg>

        {/* until the scene is ready (and without it) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ed-poster" src="/education/avatar.webp" alt="Ashfaq, standing with his hand on his chin, thinking" />

        {/* the tags' strings, over the scene */}
        <svg className="ed-strings" aria-hidden="true">
          {SUBJECTS.map((sub, i) => (
            <path key={sub.id} ref={(el) => void (stringRefs.current[i] = el)} d="" />
          ))}
        </svg>

        {/* notes in the margin */}
        <p className="ed-note-me" aria-hidden="true">
          me, still deciding
          <svg viewBox="0 0 90 46" focusable="false">
            <path d="M4 6C30 4 58 12 78 34" />
            <path d="M66 33L79 35L77 22" />
          </svg>
        </p>

        <ol className="ed-qs">
          {SUBJECTS.map((sub, i) => (
            <li key={sub.id}>
              <button
                ref={(el) => void (qRefs.current[i] = el)}
                type="button"
                className="ed-q"
                aria-haspopup="dialog"
                aria-expanded={open === i}
                onClick={(e) => (open === i ? close() : show(i, e.currentTarget))}
                onPointerEnter={() => orbit.current?.excite(i)}
                onPointerLeave={() => orbit.current?.excite(null)}
                onFocus={() => orbit.current?.excite(i)}
                onBlur={() => orbit.current?.excite(null)}
              >
                <span className="ed-q-hole" aria-hidden="true" />
                <span className="ed-q-copy">
                  <span className="ed-q-meta" aria-hidden="true">
                    No.{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ed-q-long">{sub.question}</span>
                  <span className="ed-q-short">{sub.short}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {s && (
          <div
            ref={winRef}
            className="ed-win"
            role="dialog"
            aria-labelledby={`${uid}-win-h`}
            style={{ left: win.x, top: win.y }}
            onClick={(e) => e.stopPropagation()}
            key={s.id}
          >
            <div className="ed-win-bar" onPointerDown={drag}>
              <span className="ed-win-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="ed-win-title">{s.file}</span>
              <button type="button" className="ed-win-x" onClick={close} aria-label="Close">
                ×
              </button>
            </div>
            <div className="ed-win-body">
              <p className="ed-win-kind">
                {s.kind} · {s.field}
              </p>
              <h3 className="ed-win-h" id={`${uid}-win-h`} tabIndex={-1}>
                {s.question}
              </h3>
              {s.answer.map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";

/* The contact pipeline as one staged scene, 1200 × 420 "stage pixels". Who does
   what, act by act (driven by Contact.tsx through `act` and `hits`):

     1 weave   your words fly onto the tailor's table as a note; he stitches a
               loop round it and it becomes a sealed packet
     2 clear   error blocks slam onto the route; the coder types a command per
               block and each one fires a beam that shatters it: path clear
     3 sprint  the packet hops into the dakpion's satchel and he runs for the
               post box (still running while the server answers)
     4 drop    the packet arcs into the slot, the box shudders
     5 done    transmission received; the reply tag shows how I'll answer

   It is only mounted once a message is on its way (Contact.tsx), and the cast
   is off stage until needed: each character walks on as their act begins and
   steps back into pencil when it ends, so by the end the whole route reads as
   one strip. Desktop sees the whole stage; on a phone the stage is a camera
   that zooms in and follows the act. */

export const STAGE_W = 1200;
export const STAGE_H = 420;
const GROUND = 380;

const BLOCKS = [
  { t: "CORS_ERROR", x: 480, y: 198, r: -4 },
  { t: "KERNEL_PANIC", x: 528, y: 244, r: 3 },
  { t: "404_BLOCKAGE", x: 474, y: 290, r: -2 },
  { t: "TRANSMISSION_ERROR", x: 500, y: 336, r: 2 },
];
const CMDS = ["$ git push origin main", "curl -I → 200 OK", "rm -rf bugs/", "deploy --prod ✓"];
const CMD_X = 420;
const CMD_Y = (i: number) => 52 + i * 42;
// the act each caption (and its character) walks on in; the post box comes on
// with the dakpion, so he has somewhere to run
const CAP_IN = [1, 2, 3, 3];
// where each act happens, for the phone camera
const FOCUS = [600, 150, 500, 900, 1020, 1000];
// pseudo-random but fixed shard directions, so the server and client agree
const SHARDS = Array.from({ length: 7 }, (_, k) => {
  const a = (k / 7) * Math.PI * 2 + 0.4;
  return { dx: Math.round(Math.cos(a) * (40 + ((k * 37) % 30))), dy: Math.round(Math.sin(a) * (30 + ((k * 23) % 26)) - 20), r: (k * 67) % 180 };
});

type Props = {
  act: number;
  hits: number;
  snippet: string;
  replyTo: string;
  failed: boolean;
  /** when the server took it (ISO), for the "received" banner */
  receivedAt: string;
};

export default function Pipeline({ act, hits, snippet, replyTo, failed, receivedAt }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  // fit the stage to the box; on a phone, zoom in and follow the act
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const place = () => {
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      const phone = cw < 640;
      const s = phone ? ch / STAGE_H : cw / STAGE_W;
      const span = Math.max(0, STAGE_W * s - cw);
      const x = phone ? Math.min(span, Math.max(0, FOCUS[act] * s - cw / 2)) : 0;
      box.style.setProperty("--s", String(s));
      box.style.setProperty("--cam-x", `${-x}px`);
      box.style.setProperty("--pan", `${-span}px`);
      box.toggleAttribute("data-phone", phone);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [act]);

  const state = failed ? "failed" : act === 0 ? "idle" : "run";
  return (
    <div className="pl" ref={boxRef} data-act={act} data-hits={hits} data-state={state} aria-hidden="true">
      <div className="pl-stage" style={{ width: STAGE_W, height: STAGE_H }}>
        {/* the route */}
        <svg className="pl-route" width={STAGE_W} height={STAGE_H} focusable="false">
          <line className="pl-ground" x1="40" y1={GROUND + 2} x2={STAGE_W - 40} y2={GROUND + 2} />
          <line className="pl-ground-done" x1="40" y1={GROUND + 2} x2={STAGE_W - 40} y2={GROUND + 2} pathLength={1} />
          {/* the dakpion's trail */}
          <path className="pl-trail" d={`M 780 ${GROUND - 4} C 860 ${GROUND - 24} 940 ${GROUND - 2} 1040 ${GROUND - 10}`} pathLength={1} />
          {BLOCKS.map((b, i) => {
            const y = CMD_Y(i) + 16;
            const x0 = CMD_X + CMDS[i].length * 10.2 + 30;
            return <line key={i} className="pl-beam" data-fired={i < hits || undefined} x1={x0} y1={y} x2={b.x + 60} y2={b.y + 15} pathLength={1} />;
          })}
        </svg>

        {/* act 1: the tailor */}
        <div className="pl-actor pl-tailor" data-in={act >= 1 || undefined} style={{ left: 30, height: 250 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/contact/tailor.webp" width={366} height={510} alt="" decoding="async" loading="lazy" />
        </div>
        <div className="pl-note" style={{ left: 150, top: 196 }}>
          <span>{snippet || "your inquiry"}</span>
        </div>
        <svg className="pl-stitch" style={{ left: 138, top: 186 }} width="200" height="64" viewBox="0 0 200 64" focusable="false">
          <path d="M14 32 C 14 6, 186 6, 186 32 C 186 58, 14 58, 14 32" pathLength={1} />
        </svg>

        {/* act 2: the coder, his commands, and the blocks they break */}
        <div className="pl-actor pl-coder" data-in={act >= 2 || undefined} style={{ left: 232, height: 232 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/contact/coder.webp" width={528} height={510} alt="" decoding="async" loading="lazy" />
        </div>
        {CMDS.map((c, i) => (
          <span key={c} className="pl-cmd" data-on={(act === 2 && i < hits) || undefined} style={{ left: CMD_X, top: CMD_Y(i) }}>
            {c}
          </span>
        ))}
        {BLOCKS.map((b, i) => (
          <span key={b.t} className="pl-block" data-broken={i < hits || undefined} style={{ left: b.x, top: b.y, "--r": `${b.r}deg`, "--k": i } as CSSProperties}>
            <b>{b.t}</b>
            {SHARDS.map((s, k) => (
              <i key={k} style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--sr": `${s.r}deg` } as CSSProperties} />
            ))}
          </span>
        ))}
        <span className="pl-clear" style={{ left: 500, top: 150 }}>
          Path clear &#10003;
        </span>

        {/* act 3: the dakpion, with the packet in his satchel */}
        <div className="pl-actor pl-dakpion" data-in={act >= 3 || undefined} style={{ left: 720, height: 236 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/contact/dakpion.webp" width={506} height={511} alt="" decoding="async" loading="lazy" />
          <span className="pl-carried" />
          <span className="pl-dust" />
          <span className="pl-dust" />
          <span className="pl-dust" />
        </div>

        {/* act 4: the post box */}
        <div className="pl-actor pl-box" data-in={act >= 3 || undefined} style={{ left: 1086, height: 250 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/contact/postbox.webp" width={191} height={507} alt="" decoding="async" loading="lazy" />
        </div>

        {/* the packet itself, wherever it is between hands */}
        <span className="pl-packet">
          <svg viewBox="0 0 40 30" focusable="false">
            <rect x="3" y="7" width="34" height="20" rx="2" />
            <path d="M3 9L20 19L37 9" />
            <path className="pl-packet-string" d="M20 7V27M3 17H37" />
          </svg>
        </span>

        <p className="pl-received" style={{ right: 30, top: 40 }}>
          Transmission received{receivedAt && <> &bull; {receivedAt.slice(0, 4)}</>}
        </p>
        <p className="pl-reply" style={{ right: 30, top: 92 }}>
          &#8617; I&rsquo;ll reply to <strong>{replyTo || "you"}</strong>
        </p>
        <p className="pl-returned" style={{ left: 600, top: 150 }}>
          Returned to sender
        </p>

        {/* who does what */}
        {[
          { x: 120, n: "01", t: "Packet weaving" },
          { x: 350, n: "02", t: "Path clearing" },
          { x: 810, n: "03", t: "Delivery sprint" },
          { x: 1095, n: "04", t: "Dakpion drop" },
        ].map((c, i) => (
          <p key={c.n} className="pl-cap" data-in={act >= CAP_IN[i] || undefined} data-on={act === i + 1 || (i === 3 && act === 5) || undefined} style={{ left: c.x, top: GROUND + 10 }}>
            <span>{c.n}</span> {c.t}
          </p>
        ))}
      </div>
    </div>
  );
}

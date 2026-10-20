"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as RKeyboardEvent,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
} from "react";
import type { BoardData, PinData, RelatedRef } from "@/lib/blog/data";
import { formatDate, formatMonth } from "@/lib/blog/format";
import { REL_LABEL } from "@/lib/blog/graph";
import { danglingGeom, headOf, LANE_GAP, threadGeom, threadJitter, type Pt } from "@/lib/blog/layout";
import { TOPIC_ANNOT, TOPIC_LABEL, TOPICS } from "@/lib/blog/topics";
import type { Edge, Topic } from "@/lib/blog/types";
import "./threadboard.css";

/* The Thread Board. Framework-agnostic: it knows nothing about routing.
   `onOpen` decides what a pin click does; without it, pins are plain links. */

type Filter = "all" | Topic | "loose";
type View = { z: number; px: number; py: number };
type XY = { x: number; y: number };

const Z_MIN = 0.35;
const Z_MAX = 2.6;
const DRAG_SLOP = 4;
const HOME: View = { z: 1, px: 0, py: 0 };

export type ThreadBoardProps = {
  board: BoardData;
  /** open an article; return nothing and the board prevents the link's default navigation */
  onOpen?: (slug: string) => void;
  /** a pin was hovered or focused: a good moment to prefetch it */
  onIntent?: (slug: string) => void;
  /** the article currently open in the reader, highlighted on the board */
  openSlug?: string | null;
  hrefFor?: (slug: string) => string;
  /** heading level for the section title */
  headingLevel?: 1 | 2;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isPlainClick = (e: RMouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

function relLines(rels: RelatedRef[]) {
  const groups = new Map<string, string[]>();
  for (const r of rels) {
    const k = REL_LABEL[r.rel];
    groups.set(k, [...(groups.get(k) ?? []), r.title]);
  }
  return [...groups.entries()];
}

function threadLabel(e: Edge, title: (s: string) => string) {
  const what = e.kind === "series" ? "continues" : e.kind === "builds-on" ? "builds on" : "shares topics with";
  const why = e.note ? `“${e.note}”` : e.kind === "topic" ? e.shared.map((t) => `#${t}`).join(" ") : "";
  return { head: `${title(e.from)} ${what} ${title(e.to)}`, why };
}

export default function ThreadBoard({ board, onOpen, onIntent, openSlug = null, hrefFor = (s) => `/blog/${s}`, headingLevel = 2 }: ThreadBoardProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { pins, edges, layout } = board;
  const W = layout.width;
  const H = layout.height;
  const Heading = headingLevel === 1 ? "h1" : "h2";

  const bySlug = useMemo(() => new Map(pins.map((p) => [p.slug, p])), [pins]);
  const order = useMemo(() => new Map(pins.map((p, i) => [p.slug, i])), [pins]);
  const looseSet = useMemo(() => new Set(board.loose), [board.loose]);
  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!m.has(e.from)) m.set(e.from, new Set());
      if (!m.has(e.to)) m.set(e.to, new Set());
      m.get(e.from)!.add(e.to);
      m.get(e.to)!.add(e.from);
    }
    return m;
  }, [edges]);

  // ── pin positions (board units); reset when the data changes ──────────────
  const initial = useMemo(() => Object.fromEntries(pins.map((p) => [p.slug, { x: p.box.x, y: p.box.y }])) as Record<string, XY>, [pins]);
  const [posState, setPosState] = useState({ base: initial, pos: initial, pinned: new Set<string>() });
  if (posState.base !== initial) setPosState({ base: initial, pos: initial, pinned: new Set() });
  const pos = posState.pos;

  // ── view, filters, focus ──────────────────────────────────────────────────
  const [view, setView] = useState<View>(HOME);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"board" | "list">("board");
  const [hover, setHover] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [tlabel, setTlabel] = useState<{ x: number; y: number; head: string; why: string } | null>(null);
  const [stitch, setStitch] = useState<"wait" | "go" | "done">("wait");
  const [touched, setTouched] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef(new Map<string, HTMLAnchorElement>());
  // the gesture handlers read the latest view and positions without re-binding
  const viewRef = useRef(view);
  const posRef = useRef(posState);
  useLayoutEffect(() => {
    viewRef.current = view;
    posRef.current = posState;
  });

  const active = dragging ?? hover ?? focused ?? openSlug;
  const near = useMemo(() => (active ? new Set([active, ...(neighbours.get(active) ?? [])]) : null), [active, neighbours]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const all = board.list ?? pins;
    const ok = all.filter((p) => {
      if (filter === "loose" ? !looseSet.has(p.slug) : filter !== "all" && p.topic !== filter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.topic.includes(q) ||
        p.tags.some((t) => t.includes(q))
      );
    });
    return new Set(ok.map((p) => p.slug));
  }, [board.list, pins, filter, q, looseSet]);
  const filtering = filter !== "all" || q !== "";

  // ── geometry from current positions ───────────────────────────────────────
  const head = useCallback(
    (slug: string): Pt => {
      const p = bySlug.get(slug)!;
      const at = pos[slug] ?? p.box;
      return headOf({ x: at.x, y: at.y, w: p.box.w });
    },
    [bySlug, pos],
  );
  const threads = useMemo(
    () =>
      edges
        .filter((e) => bySlug.has(e.from) && bySlug.has(e.to))
        .map((e) => ({ e, g: threadGeom(head(e.from), head(e.to), threadJitter(e.from, e.to)), i: order.get(e.from) ?? 0 })),
    [edges, bySlug, head, order],
  );
  const title = useCallback((s: string) => bySlug.get(s)?.title ?? s, [bySlug]);

  // ── stitch-in on first view ───────────────────────────────────────────────
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let timer = 0;
    // reduced motion: the CSS never hides or animates the threads, nothing to do
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") {
      timer = window.setTimeout(() => setStitch("done"));
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((en) => en.isIntersecting)) return;
        io.disconnect();
        setStitch("go");
        timer = window.setTimeout(() => setStitch("done"), 900 + pins.length * 70 + 200);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [pins.length]);

  // ── pan / zoom ────────────────────────────────────────────────────────────
  const unit = () => (worldRef.current ? worldRef.current.offsetWidth / W : 1);

  const zoomAt = useCallback((factor: number, sx?: number, sy?: number) => {
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!stage || !world) return;
    setView((v) => {
      const z = clamp(v.z * factor, Z_MIN, Z_MAX);
      const cx = sx ?? stage.clientWidth / 2;
      const cy = sy ?? stage.clientHeight / 2;
      const lx = (cx - world.offsetLeft - v.px) / v.z;
      const ly = (cy - world.offsetTop - v.py) / v.z;
      return { z, px: cx - world.offsetLeft - lx * z, py: cy - world.offsetTop - ly * z };
    });
  }, []);

  const fit = useCallback(() => {
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!stage || !world) return;
    const z = clamp(Math.min(stage.clientWidth / world.offsetWidth, stage.clientHeight / world.offsetHeight), Z_MIN, 1);
    setView({
      z,
      px: (stage.clientWidth - world.offsetWidth * z) / 2 - world.offsetLeft,
      py: (stage.clientHeight - world.offsetHeight * z) / 2 - world.offsetTop,
    });
  }, []);

  const resetAll = () => {
    setPosState({ base: initial, pos: initial, pinned: new Set() });
    setView(HOME);
  };

  // ctrl / cmd + wheel zooms; the plain wheel keeps scrolling the page
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // pointers: background drag pans, two pointers pinch, a mouse drag on a pin moves it
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | null
    | { type: "pan"; sx: number; sy: number; v: View; moved: boolean }
    | { type: "pinch"; d0: number; v: View; mx: number; my: number }
    | { type: "pin"; slug: string; sx: number; sy: number; at: XY; moved: boolean; el: HTMLElement }
  >(null);
  const suppressClick = useRef(false);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const r = stageRef.current!.getBoundingClientRect();
    gesture.current = {
      type: "pinch",
      d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      v: viewRef.current,
      mx: (a.x + b.x) / 2 - r.left,
      my: (a.y + b.y) / 2 - r.top,
    };
  };

  const onStageDown = (e: RPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(".tb-ctrl, .tb-preview")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerType === "touch") setTouched(true);
    if (pointers.current.size === 2) {
      startPinch();
      return;
    }
    const pinEl = target.closest<HTMLElement>(".tb-pin");
    if (pinEl && e.pointerType !== "touch" && e.button === 0) {
      const slug = pinEl.dataset.slug!;
      gesture.current = { type: "pin", slug, sx: e.clientX, sy: e.clientY, at: posRef.current.pos[slug], moved: false, el: pinEl };
      return;
    }
    if (e.button !== 0 && e.pointerType === "mouse") return;
    gesture.current = { type: "pan", sx: e.clientX, sy: e.clientY, v: viewRef.current, moved: false };
  };

  const followSprings = (slug: string, next: Record<string, XY>, pinned: Set<string>) => {
    // connected pins follow along taut threads; dropped pins stay put
    for (let iter = 0; iter < 4; iter++) {
      for (const e of edges) {
        const a = next[e.from];
        const b = next[e.to];
        if (!a || !b) continue;
        const pa = bySlug.get(e.from)!.box;
        const pb = bySlug.get(e.to)!.box;
        const dx = b.x + pb.w / 2 - (a.x + pa.w / 2);
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const rest = (240 - 60 * e.weight) * 1.35;
        if (d <= rest) continue;
        const pull = (d - rest) * 0.3;
        const freeA = e.from !== slug && !pinned.has(e.from);
        const freeB = e.to !== slug && !pinned.has(e.to);
        if (!freeA && !freeB) continue;
        const share = freeA && freeB ? 0.5 : 1;
        if (freeA) next[e.from] = { x: a.x + (dx / d) * pull * share, y: a.y + (dy / d) * pull * share };
        if (freeB) next[e.to] = { x: b.x - (dx / d) * pull * share, y: b.y - (dy / d) * pull * share };
      }
    }
  };

  const raf = useRef(0);
  const onStageMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch") {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const world = worldRef.current!;
      const z = clamp(g.v.z * (d / g.d0), Z_MIN, Z_MAX);
      const lx = (g.mx - world.offsetLeft - g.v.px) / g.v.z;
      const ly = (g.my - world.offsetTop - g.v.py) / g.v.z;
      setView({ z, px: g.mx - world.offsetLeft - lx * z, py: g.my - world.offsetTop - ly * z });
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
    if (!g.moved) {
      g.moved = true;
      (g.type === "pin" ? g.el : e.currentTarget).setPointerCapture(e.pointerId);
      if (g.type === "pin") {
        setDragging(g.slug);
        setHover(null);
      }
    }
    if (g.type === "pan") {
      setView({ ...g.v, px: g.v.px + dx, py: g.v.py + dy });
      return;
    }
    const k = unit() * viewRef.current.z;
    const slug = g.slug;
    const target = { x: g.at.x + dx / k, y: g.at.y + dy / k };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const cur = posRef.current;
      const next = { ...cur.pos, [slug]: { x: Math.round(target.x), y: Math.round(target.y) } };
      followSprings(slug, next, cur.pinned);
      setPosState({ ...cur, pos: next });
    });
  };

  const onStageUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.type === "pinch") {
      gesture.current = null;
      return;
    }
    if (g?.type === "pin" && g.moved) {
      suppressClick.current = true;
      const slug = g.slug;
      setPosState((s) => ({ ...s, pinned: new Set(s.pinned).add(slug) }));
      setDragging(null);
    }
    if (g && "moved" in g && g.moved && g.type === "pan") suppressClick.current = true;
    gesture.current = null;
  };

  const onPinClick = (e: RMouseEvent<HTMLAnchorElement>, slug: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      return;
    }
    if (!onOpen || !isPlainClick(e)) return;
    e.preventDefault();
    onOpen(slug);
  };

  const onStageKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input")) return;
    if (e.key === "+" || e.key === "=") zoomAt(1.25);
    else if (e.key === "-" || e.key === "_") zoomAt(1 / 1.25);
    else if (e.key === "0") setView(HOME);
  };

  // ── hover preview placement (screen space, outside the zoomed world) ──────
  const previewSlug = dragging ? null : (hover ?? focused);
  const [previewAt, setPreviewAt] = useState<{ left: number; top: number; side: "r" | "l" } | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!previewSlug || mode !== "board") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- measure-then-position: needs layout from this commit
      setPreviewAt(null);
      return;
    }
    const el = pinRefs.current.get(previewSlug);
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!el || !root || !stage) return;
    const r = el.getBoundingClientRect();
    const o = root.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const PW = 280;
    const PH = previewRef.current?.offsetHeight ?? 220;
    const roomRight = s.right - r.right;
    const side = roomRight > PW + 24 || roomRight > r.left - s.left ? "r" : "l";
    const left = side === "r" ? r.right - o.left + 14 : r.left - o.left - PW - 14;
    // keep it inside the stage horizontally; vertically it may hang below onto the bar
    const top = clamp(r.top - o.top - 6, s.top - o.top + 8, Math.max(s.top - o.top + 8, o.height - PH - 8));
    setPreviewAt((prev) => {
      const next = { left: clamp(left, s.left - o.left + 8, Math.max(8, s.right - o.left - PW - 8)), top, side } as const;
      return prev && prev.left === next.left && prev.top === next.top && prev.side === next.side ? prev : next;
    });
  }, [previewSlug, view, pos, mode, previewAt]);

  // ── render helpers ────────────────────────────────────────────────────────
  const pinState = (slug: string) => {
    if (filtering && !matches.has(slug)) return "off";
    if (!near) return undefined;
    if (slug === active) return "active";
    return near.has(slug) ? "near" : "dim";
  };
  const threadState = (e: Edge) => {
    if (filtering && (!matches.has(e.from) || !matches.has(e.to))) return "off";
    if (!active) return undefined;
    return e.from === active || e.to === active ? "hot" : "dim";
  };

  const counts = useMemo(() => {
    const all = board.list ?? pins;
    const c: Record<string, number> = { all: all.length, loose: board.loose.length };
    for (const t of TOPICS) c[t] = all.filter((p) => p.topic === t).length;
    return c;
  }, [board.list, board.loose.length, pins]);

  const listItems = useMemo(() => {
    const all = board.list ?? [...pins].reverse();
    const months: { key: string; label: string; items: PinData[] }[] = [];
    for (const p of all) {
      if (!matches.has(p.slug)) continue;
      const key = p.date.slice(0, 7);
      const last = months[months.length - 1];
      if (last?.key === key) last.items.push(p);
      else months.push({ key, label: formatMonth(p.date), items: [p] });
    }
    return months;
  }, [board.list, pins, matches]);

  const preview = previewSlug ? bySlug.get(previewSlug) : null;
  const worldStyle = {
    "--bw": W,
    "--bh": H,
    transform: view === HOME ? undefined : `translate(${view.px}px, ${view.py}px) scale(${view.z})`,
  } as CSSProperties;
  const truncated = board.list !== null;

  return (
    <section
      ref={rootRef}
      className="tb"
      aria-labelledby={`${uid}-title`}
      data-view={mode}
      data-stitch={stitch}
      data-active={active ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
    >
      <header className="tb-head">
        <div>
          <p className="tb-kicker">
            The archive &middot; {board.total} pins &middot; {edges.length} threads &middot; {board.loose.length} loose
          </p>
          <Heading className="tb-title" id={`${uid}-title`}>
            The Thread Board
          </Heading>
        </div>
        <p className="tb-sub">every idea pulls on another</p>
      </header>

      <div
        className="tb-stage"
        id={`${uid}-board`}
        ref={stageRef}
        style={{ "--bw": W, "--bh": H } as CSSProperties}
        onPointerDown={onStageDown}
        onPointerMove={onStageMove}
        onPointerUp={onStageUp}
        onPointerCancel={onStageUp}
        onKeyDown={onStageKey}
        data-panned={view === HOME ? undefined : ""}
      >
        <div className="tb-world" ref={worldRef} style={worldStyle}>
          {/* paper: lanes, labels, date tape */}
          <div className="tb-paper" aria-hidden="true">
            {layout.lanes.map((l, i) => (
              <div
                key={l.topic}
                className="tb-lane"
                data-topic={l.topic}
                style={{ "--ly": l.top, "--lh": LANE_GAP, "--i": i } as CSSProperties}
              >
                <span className="tb-lane-no">lane 0{i + 1}</span>
                <span className="tb-lane-name">{TOPIC_LABEL[l.topic]}</span>
                <span className="tb-lane-annot">{TOPIC_ANNOT[l.topic]}</span>
              </div>
            ))}
            <div className="tb-tape" style={{ "--ay": layout.axisY } as CSSProperties}>
              {layout.ticks.map((t) => (
                <span key={`${t.x}-${t.label}`} className="tb-tick" data-major={t.major ? "" : undefined} style={{ "--tx": t.x } as CSSProperties}>
                  {t.label}
                </span>
              ))}
              <span className="tb-tape-end tb-tape-old">&larr; older</span>
              <span className="tb-tape-end tb-tape-new">newer &rarr;</span>
            </div>
          </div>

          {/* threads, behind the cards */}
          <svg className="tb-svg tb-back" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
            {/* solid threads draw themselves in with a dash offset (pathLength 1); dashed
                topic threads keep their stitch pattern and fade in. No masks: a mask is a
                full-board offscreen buffer, re-rendered every frame of the animation. */}
            {threads.map((t, i) => {
              const draw = t.e.kind !== "topic" ? 1 : undefined;
              return (
                <g key={i} className="tb-thread" data-kind={t.e.kind} data-state={threadState(t.e)} style={{ "--i": t.i } as CSSProperties}>
                  <path className="tb-t" d={t.g.d} pathLength={draw} />
                  {t.e.kind !== "topic" && <path className="tb-t-hi" d={t.g.d} pathLength={draw} />}
                </g>
              );
            })}
            {threads.map((t, i) => (
              <path
                key={`h${i}`}
                className="tb-hit"
                d={t.g.d}
                onPointerEnter={(ev) => {
                  if (gesture.current) return;
                  const r = stageRef.current!.getBoundingClientRect();
                  setTlabel({ x: ev.clientX - r.left, y: ev.clientY - r.top, ...threadLabel(t.e, title) });
                }}
                onPointerMove={(ev) => {
                  const r = stageRef.current!.getBoundingClientRect();
                  setTlabel((l) => (l ? { ...l, x: ev.clientX - r.left, y: ev.clientY - r.top } : l));
                }}
                onPointerLeave={() => setTlabel(null)}
              />
            ))}
          </svg>

          {/* pins: real links, chronological, so Tab order is chronological */}
          {pins.map((p) => {
            const at = pos[p.slug] ?? p.box;
            return (
              <a
                key={p.slug}
                ref={(el) => {
                  if (el) pinRefs.current.set(p.slug, el);
                  else pinRefs.current.delete(p.slug);
                }}
                className="tb-pin"
                href={hrefFor(p.slug)}
                data-slug={p.slug}
                data-topic={p.topic}
                data-featured={p.featured ? "" : undefined}
                data-loose={looseSet.has(p.slug) ? "" : undefined}
                data-state={pinState(p.slug)}
                data-open={openSlug === p.slug ? "" : undefined}
                data-pinned={posState.pinned.has(p.slug) ? "" : undefined}
                aria-label={p.label}
                aria-current={openSlug === p.slug ? "page" : undefined}
                draggable={false}
                style={{ "--x": at.x, "--y": at.y, "--w": p.box.w, "--h": p.box.h, "--rot": `${p.box.rot}deg` } as CSSProperties}
                onClick={(e) => onPinClick(e, p.slug)}
                onPointerEnter={(e) => {
                  onIntent?.(p.slug);
                  if (e.pointerType === "mouse") setHover(p.slug);
                }}
                onPointerLeave={() => setHover((h) => (h === p.slug ? null : h))}
                onFocus={() => {
                  onIntent?.(p.slug);
                  setFocused(p.slug);
                }}
                onBlur={() => setFocused((f) => (f === p.slug ? null : f))}
              >
                <span className="tb-card">
                  <span className="tb-deco" aria-hidden="true" />
                  <span className="tb-pin-kicker">
                    {TOPIC_LABEL[p.topic]} &middot; {p.readMins} min
                  </span>
                  <span className="tb-pin-title">
                    {p.topic === "linux" && <span className="tb-prompt">$ </span>}
                    {p.title}
                  </span>
                  <span className="tb-pin-date">{formatDate(p.date)}</span>
                  {p.isNewest && <span className="tb-new">new</span>}
                </span>
              </a>
            );
          })}

          {/* thread ends and pin heads, in front of the cards */}
          <svg className="tb-svg tb-front" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
            {threads.map((t, i) => (
              <g key={i} className="tb-cap" data-kind={t.e.kind} data-state={threadState(t.e)} style={{ "--i": t.i } as CSSProperties}>
                <path d={t.g.capA} />
                <path d={t.g.capB} />
              </g>
            ))}
            {pins.map((p) => {
              const h = head(p.slug);
              const loose = looseSet.has(p.slug);
              const dg = loose ? danglingGeom(h, p.slug) : null;
              return (
                <g key={p.slug} className="tb-headg" data-state={pinState(p.slug)} data-loose={loose ? "" : undefined}>
                  {dg && (
                    <g className="tb-dangle">
                      <path d={dg.d} />
                      <path className="tb-fray" d={dg.fray} />
                    </g>
                  )}
                  <circle className="tb-head" cx={h.x} cy={h.y} r={loose ? 4.6 : 5.2} />
                  {!loose && <circle className="tb-head-hi" cx={h.x - 1.6} cy={h.y - 1.8} r={1.4} />}
                </g>
              );
            })}
          </svg>
        </div>

        {pins.length === 0 && <p className="tb-empty">No pins yet. The board is waiting for its first thread.</p>}

        <div className="tb-ctrl" role="group" aria-label="Board view">
          <button type="button" className="tb-btn" onClick={() => zoomAt(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="tb-btn" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out">
            &minus;
          </button>
          <button type="button" className="tb-btn tb-btn-word" onClick={fit}>
            fit
          </button>
          <button type="button" className="tb-btn tb-btn-word" onClick={resetAll} title="Restore the layout and the view">
            reset
          </button>
        </div>

        <p className="tb-hint" data-hidden={touched || view !== HOME ? "" : undefined} aria-hidden="true">
          drag to explore &middot; pinch to zoom
        </p>

        {tlabel && !preview && (
          <div className="tb-tlabel" style={{ left: tlabel.x, top: tlabel.y }} aria-hidden="true">
            <span>{tlabel.head}</span>
            {tlabel.why && <em>{tlabel.why}</em>}
          </div>
        )}
      </div>

      {preview && previewAt && (
        <div ref={previewRef} className="tb-preview" data-topic={preview.topic} data-side={previewAt.side} style={{ left: previewAt.left, top: previewAt.top }} aria-hidden="true">
          <p className="tb-pv-kicker">
            {TOPIC_LABEL[preview.topic]} &middot; {formatDate(preview.date)} &middot; {preview.readMins} min
          </p>
          <p className="tb-pv-title">{preview.title}</p>
          {preview.excerpt && <p className="tb-pv-excerpt">{preview.excerpt}</p>}
          {preview.relations.length ? (
            <dl className="tb-pv-rels">
              {relLines(preview.relations).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v.join(" · ")}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="tb-pv-loose">a loose thread &mdash; not tied to anything yet</p>
          )}
          <p className="tb-pv-cta">click to read &rarr;</p>
        </div>
      )}

      <div className="tb-bar">
        <div className="tb-chips" role="group" aria-label="Filter by topic">
          {(["all", ...TOPICS, "loose"] as Filter[]).map((f) => (
            <button key={f} type="button" className="tb-chip" data-topic={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "loose" ? "Loose" : TOPIC_LABEL[f]}
              <span className="tb-chip-n">{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="tb-search">
          <span className="sr-only">Search the threads</span>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
            <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.9" />
            <path d="M15 15l5.5 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <input type="search" placeholder="search the threads…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="tb-views" role="group" aria-label="Layout">
          <a
            className="tb-chip tb-view"
            href={`#${uid}-board`}
            aria-pressed={mode === "board"}
            role="button"
            onClick={(e) => {
              e.preventDefault();
              setMode("board");
            }}
          >
            Board
          </a>
          <a
            className="tb-chip tb-view"
            href={`#${uid}-list`}
            aria-pressed={mode === "list"}
            role="button"
            onClick={(e) => {
              e.preventDefault();
              setMode("list");
            }}
          >
            List
          </a>
        </div>
        <ul className="tb-legend" aria-label="Legend">
          <li>
            <svg viewBox="0 0 34 10" aria-hidden="true">
              <path d="M1 5h32" className="lg-series" />
            </svg>
            continues
          </li>
          <li>
            <svg viewBox="0 0 34 10" aria-hidden="true">
              <path d="M1 5h32" className="lg-builds" />
            </svg>
            builds on
          </li>
          <li>
            <svg viewBox="0 0 34 10" aria-hidden="true">
              <path d="M1 5h32" className="lg-topic" />
            </svg>
            shares topics
          </li>
          <li>
            <svg viewBox="0 0 34 10" aria-hidden="true">
              <path d="M2 7c5-6 9 4 14-1s8-4 11 0" className="lg-loose" />
            </svg>
            loose
          </li>
        </ul>
        <p className="sr-only" aria-live="polite">
          {filtering ? `${matches.size} of ${counts.all} articles match` : ""}
        </p>
      </div>

      {truncated && (
        <p className="tb-note">
          The board shows the newest {pins.length} of {board.total} pieces. The list has every one.
        </p>
      )}

      <div className="tb-list" id={`${uid}-list`}>
        {listItems.length === 0 && <p className="tb-empty-list">Nothing on the board matches that. Try another thread.</p>}
        {listItems.map((m) => (
          <section key={m.key} className="tb-month" aria-label={m.label}>
            <h3 className="tb-month-h">{m.label}</h3>
            <ol>
              {m.items.map((p) => (
                <li key={p.slug}>
                  <a className="tb-row" data-topic={p.topic} href={hrefFor(p.slug)} onClick={(e) => onPinClick(e, p.slug)}>
                    <span className="tb-row-swatch" aria-hidden="true" />
                    <span className="tb-row-main">
                      <span className="tb-row-kicker">
                        {TOPIC_LABEL[p.topic]} &middot; {formatDate(p.date)} &middot; {p.readMins} min
                        {looseSet.has(p.slug) && <> &middot; loose</>}
                      </span>
                      <span className="tb-row-title">{p.title}</span>
                      {p.excerpt && <span className="tb-row-excerpt">{p.excerpt}</span>}
                      {p.relations.length > 0 && (
                        <span className="tb-row-rels">
                          {relLines(p.relations)
                            .map(([k, v]) => `${k} ${v.join(", ")}`)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import type { RelatedRef } from "@/lib/blog/data";
import { formatDate } from "@/lib/blog/format";
import { REL_LABEL } from "@/lib/blog/graph";
import { TOPIC_LABEL } from "@/lib/blog/topics";
import type { Topic } from "@/lib/blog/types";
import "./reader.css";

/* The quick-read popup. Framework-agnostic: closing and following a thread are
   callbacks. "Read the full article" is a plain link, so it is a real page load. */

export type ReaderArticle = {
  slug: string;
  title: string;
  topic: Topic;
  date: string;
  readMins: number;
  excerpt: string;
};

type Props = {
  article: ReaderArticle;
  /** the quick read, already rendered (on the server) */
  children: ReactNode;
  /** the quick read is the whole piece */
  isWhole?: boolean;
  relations: RelatedRef[];
  fullHref: string;
  hrefFor?: (slug: string) => string;
  onClose: () => void;
  onFollow?: (slug: string) => void;
};

// The pin that opened the reader. It survives thread-follows (each one remounts the
// dialog). Navigation can move focus to <body> before the dialog mounts, so remember the
// last element focused outside any dialog rather than whatever is focused at mount.
let opener: HTMLElement | null = null;
let lastOutside: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && !t.closest(".tbr")) lastOutside = t;
    },
    true,
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ReaderDialog({ article, children, isWhole, relations, fullHref, hrefFor = (s) => `/blog/${s}`, onClose, onFollow }: Props) {
  const id = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Next can keep a closed route mounted but hidden (display: none) to make "forward"
    // instant. A hidden dialog must not take focus or lock the page; when it is shown
    // again the effect runs again.
    if (!scrollRef.current?.getClientRects().length) return;
    if (!opener) {
      // the visible link to this article outside the dialog: the pin or list row it was opened from
      // (this module loads with the first popup, after that link was focused, so lastOutside can be empty)
      const link = [...document.querySelectorAll<HTMLElement>(`a[href="${CSS.escape(fullHref)}"]`)].find(
        (el) => !el.closest(".tbr") && el.offsetParent !== null,
      );
      opener = link ?? (lastOutside?.isConnected ? lastOutside : null);
    }
    closeRef.current?.focus({ preventScroll: true });
    scrollRef.current?.scrollTo({ top: 0 });

    // lock page scroll without a layout jump
    const html = document.documentElement;
    const gap = window.innerWidth - html.clientWidth;
    const prev = { overflow: html.style.overflow, pad: html.style.paddingRight };
    html.style.overflow = "hidden";
    if (gap > 0) html.style.paddingRight = `${gap}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = sheetRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prev.overflow;
      html.style.paddingRight = prev.pad;
      // hand focus back to the pin once no dialog follows (a thread-follow mounts a new one)
      window.setTimeout(() => {
        if ([...document.querySelectorAll(".tbr")].some((el) => el.getClientRects().length)) return;
        const back = opener;
        opener = null;
        if (back?.isConnected) back.focus({ preventScroll: true });
      }, 0);
    };
  }, [article.slug, fullHref]);

  const onBackdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const follow = (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (!onFollow || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onFollow(slug);
  };

  const shown = relations.slice(0, 5);

  return (
    <div className="tbr" ref={scrollRef} onClick={onBackdrop}>
      <article ref={sheetRef} className="tbr-sheet" data-topic={article.topic} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} key={article.slug}>
        <span className="tbr-deco" aria-hidden="true" />
        <button ref={closeRef} type="button" className="tbr-close" onClick={onClose} aria-label="Close the quick read">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M5.5 5.8C10 10.2 13.8 14 18.6 18.4M18.3 5.5C13.9 10 10 13.7 5.7 18.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <p className="tbr-kicker">
          {TOPIC_LABEL[article.topic]} &middot; {formatDate(article.date)} &middot; {article.readMins} min read
        </p>
        <h2 className="tbr-title" id={`${id}-t`}>
          {article.topic === "linux" && <span className="tbr-prompt">$ </span>}
          {article.title}
        </h2>
        {article.excerpt && <p className="tbr-excerpt">{article.excerpt}</p>}

        <div className="tbr-body">{children}</div>

        <p className="tbr-note">
          <span aria-hidden="true">&#9986;</span>{" "}
          {isWhole ? "That’s the whole piece. It’s a short one." : `That was the quick read. The full piece runs ${article.readMins} min.`}
        </p>

        {shown.length > 0 && (
          <nav className="tbr-threads" aria-label="Follow a thread">
            <h3>Follow a thread</h3>
            <ul>
              {shown.map((r) => (
                <li key={r.slug}>
                  <a href={hrefFor(r.slug)} data-topic={r.topic} onClick={(e) => follow(e, r.slug)}>
                    <span className="tbr-rel" data-kind={r.kind}>
                      {REL_LABEL[r.rel]}
                      {r.note ? <em> &middot; {r.note}</em> : null}
                    </span>
                    <span className="tbr-rel-title">{r.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="tbr-actions">
          <a className="tbr-btn tbr-primary" href={fullHref}>
            Read the full article <span aria-hidden="true">&rarr;</span>
          </a>
          <button type="button" className="tbr-btn" onClick={onClose}>
            Keep exploring
          </button>
        </div>
      </article>
    </div>
  );
}

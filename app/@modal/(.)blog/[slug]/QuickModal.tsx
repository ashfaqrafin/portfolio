"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import type { RelatedRef } from "@/lib/blog/data";
import { LIFT_DOWN, liftName } from "@/app/components/threadboard/lift";
import ReaderDialog, { type ReaderArticle } from "@/app/components/threadboard/ReaderDialog";

/* Closing goes back to the board; following a thread swaps the popup in place
   (replace, so history does not grow). A parallel slot keeps its last content when
   the new URL doesn't match it, so after "back" the popup must hide itself: it only
   renders while the URL is its own article. */
export default function QuickModal({
  article,
  relations,
  isWhole,
  children,
}: {
  article: ReaderArticle;
  relations: RelatedRef[];
  isWhole: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onClose = useCallback(() => putBack(article.slug, () => router.back()), [article.slug, router]);
  const onFollow = useCallback((slug: string) => router.replace(`/blog/${slug}`, { scroll: false }), [router]);
  if (pathname !== `/blog/${article.slug}`) return null;
  return (
    <ReaderDialog article={article} relations={relations} isWhole={isWhole} fullHref={`/blog/${article.slug}`} onClose={onClose} onFollow={onFollow}>
      {children}
    </ReaderDialog>
  );
}

/* Closing puts the card back on its pin: the popup shrinks onto it (lift.ts).
   Opening is React's <ViewTransition>, but closing is "back", and React renders
   a navigation begun by the browser's back at once, without a view transition
   (so the scroll can be put back). So here it's done by hand: the popup is named
   as it is, the board is given back, and once React has put the card back up
   it's given the same name; the browser draws the one turning into the other.
   The browser's own back button closes it without. */
function putBack(slug: string, back: () => void) {
  const sheet = document.querySelector<HTMLElement>(".tbr-sheet");
  if (!sheet || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches || moving()) return back();
  const name = (el: HTMLElement | null, on: boolean) => {
    if (!el) return;
    if (on) {
      el.style.setProperty("view-transition-name", liftName(slug));
      el.style.setProperty("view-transition-class", LIFT_DOWN);
    } else {
      el.style.removeProperty("view-transition-name");
      el.style.removeProperty("view-transition-class");
    }
  };
  let card: HTMLElement | null = null;
  name(sheet, true);
  const vt = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        // the page doesn't paint while this waits (nor run animation frames): watch the DOM instead
        let timer = 0;
        const settle = () => {
          if (sheet.isConnected) return false;
          mo.disconnect();
          window.clearTimeout(timer);
          card = document.querySelector<HTMLElement>(`.tb-pin[data-slug="${CSS.escape(slug)}"] .tb-card`);
          name(card, true);
          resolve();
          return true;
        };
        const mo = new MutationObserver(settle);
        mo.observe(document.body, { childList: true, subtree: true });
        // slow to go: let the page carry on and close without
        timer = window.setTimeout(() => {
          mo.disconnect();
          resolve();
        }, 1200);
        back();
      }),
  );
  // another card picked up before this one is down skips it: expected, not an error
  vt.ready.catch(() => {});
  vt.finished
    .catch(() => {})
    .finally(() => {
      name(sheet, false);
      name(card, false);
    });
}

/** a card still in the air (one just picked up, or a thread just followed): let it land rather than cut it short */
function moving() {
  try {
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

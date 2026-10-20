"use client";

import { useEffect, useRef } from "react";

/* A stitched thread across the top of the page that pulls tight as you read. */
export default function ReadingProgress({ target }: { target: string }) {
  const fill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el || !fill.current) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      fill.current?.style.setProperty("--p", String(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);
  return (
    <div className="art-progress" aria-hidden="true">
      <div className="art-progress-fill" ref={fill} />
    </div>
  );
}

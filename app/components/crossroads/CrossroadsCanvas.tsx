"use client";

import { useEffect, useRef } from "react";
import { INTRO_CONFIG, crossroads } from "./crossroads";

/* The intro's canvas. Its code, written into the page right after it
   (Crossroads.tsx), starts it as the page is read; this starts it on a page
   reached by a client-side navigation, where React doesn't run the scripts it
   puts in (there the intro never plays, so it only marks it done). Starting
   one twice does nothing. */
export default function CrossroadsCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    crossroads(INTRO_CONFIG);
    if (ref.current) window.__crossroads?.start(ref.current);
  }, []);
  // (crossroads.ts sizes and marks it, before React gets here)
  return <canvas ref={ref} className="crossroads" aria-hidden="true" suppressHydrationWarning />;
}

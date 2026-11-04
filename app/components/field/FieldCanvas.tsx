"use client";

import { useEffect, useRef } from "react";
import { FIELD, field } from "./field";

/* The intro's canvas. Its code, written into the page right after it
   (Field.tsx), starts it as the page is read; this starts it on a page reached
   by a client-side navigation, where React doesn't run the scripts it puts in
   (there the intro never plays, so it only marks it done). Starting one twice
   does nothing. */
export default function FieldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    field(FIELD);
    if (ref.current) window.__field?.start(ref.current);
  }, []);
  // (field.ts sizes and marks it, before React gets here)
  return <canvas ref={ref} className="field" aria-hidden="true" suppressHydrationWarning />;
}

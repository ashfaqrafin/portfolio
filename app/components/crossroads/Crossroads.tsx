import CrossroadsCanvas from "./CrossroadsCanvas";
import { INTRO_CONFIG, crossroads } from "./crossroads";
import "./crossroads.css";

/* The home page's intro (crossroads.ts): on a first visit, drawn on the page's
   own desk, I come to a fork of four lanes, try one, think better of it, cut
   them loose, stitch them into one road and walk off up it.

   Its code is written into the page itself, right after its canvas, so it
   starts on the first frame: it waits neither for a download nor for the
   site's own scripts (React, three.js: about a megabyte). CrossroadsCanvas
   starts it on a page reached by a client-side navigation, where React doesn't
   run such scripts (and where the intro never plays). The skip button needs no
   handler of its own: any click, key, scroll or touch skips (INTRO_GATE in the
   root layout). */
const SCRIPT = `(${crossroads.toString()})(${JSON.stringify(INTRO_CONFIG)});`;

export default function Crossroads() {
  return (
    <>
      <CrossroadsCanvas />
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} suppressHydrationWarning />
      <div className="intro">
        <button type="button" className="intro-skip">
          Skip intro
        </button>
      </div>
    </>
  );
}

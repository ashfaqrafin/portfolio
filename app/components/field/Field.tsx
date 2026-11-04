import FieldCanvas from "./FieldCanvas";
import { FIELD, field } from "./field";
import "./field.css";

/* The home page's intro (field.ts): on a first visit, particle rings on cream
   paper that sweep in and then lift away to the desk.

   Its code is written into the page itself, right after its canvas, so it
   starts the moment the browser reads it: it waits neither for a download nor
   for the site's own scripts (React, three.js: about a megabyte), which on a
   so-so connection come in seconds later. FieldCanvas starts it on a page
   reached by a client-side navigation, where React doesn't run such scripts.
   The skip button needs no handler of its own: any click, key, scroll or touch
   skips (INTRO_GATE in the root layout). */
const SCRIPT = `(${field.toString()})(${JSON.stringify(FIELD)});`;

export default function Field() {
  return (
    <>
      <FieldCanvas />
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} suppressHydrationWarning />
      <div className="intro">
        <button type="button" className="intro-skip">
          Skip intro
        </button>
      </div>
    </>
  );
}

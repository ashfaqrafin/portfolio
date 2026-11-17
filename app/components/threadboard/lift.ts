/* One article, three sizes: its card pinned on the board, the quick-read
   popup, and the title box at the top of its own page. All three wear the
   same view-transition name, so when one leaves and another arrives in the
   same navigation the browser draws them as one sheet of paper: taken off its
   pin, it grows into the popup (and the popup into the page); put back, it
   shrinks onto its pin again. (React's <ViewTransition>; the styles are in
   app/globals.css.)

   The class says which way it's going, and is taken from whichever of the two
   is arriving: "up" off the board, "down" back onto it. */
export const liftName = (slug: string) => `thread-${slug.replace(/[^a-z0-9-]/gi, "-")}`;
export const LIFT_UP = "tb-lift-up";
export const LIFT_DOWN = "tb-lift-down";
/** the popup arriving with no card to come from (opened from the list, or a pin on another sheet), and leaving with none to go to */
export const PIN_IN = "tb-pin-in";
export const PIN_OUT = "tb-pin-out";
/** the popup's title block and the article page's title box: paired across the page load of "Read the full article" */
export const HEAD_NAME = "tb-head";

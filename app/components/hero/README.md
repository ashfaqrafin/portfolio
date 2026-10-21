# Hero: Tailor → Fashion → Linux → Unified Creative

A four-stage, thread-and-cloth transformation animation. Everything on screen is a **pure function of one number, the time `t`**, so pause, scrub, reverse and click-to-jump need no extra code.

Note: the figure layer is rendered with Three.js (WebGL, shader-driven shards, rows and yarn) rather than a 2D canvas. The DOM overlay (captions, quote note, thread-to-head, controls) is plain HTML and CSS.

## Files

| File | Role |
| --- | --- |
| `Hero.tsx` | Markup: header, stage, quote note (one block per stage), controls, static fallback. Lazily loads the engine on the client. |
| `config.ts` | **Every tunable**: timeline, layout, mesh, threads, motion, copy, transition windows. |
| `clock.ts` | `clock(t)` → `{k, u, p}` (stage, transition progress, eased position). |
| `stage-layout.ts` | Stage size, figure box, pattern box, DPR. Named so Next.js doesn't treat it as a route `layout`. |
| `raster.ts` | SVG → rasters, alpha arrays, row sets. Runs once and again on resize. |
| `shards.ts`, `ribbons.ts`, `yarn.ts`, `threads.ts` | Tear mesh, fringe and bridge threads, link and loose threads. |
| `suit.ts` | Suit display, yaw projection, flight out and in. |
| `art.ts`, `shaders.ts` | Art meshes and GLSL. |
| `quote.ts` | Per-character typing and unravel for the note. |
| `engine.ts` | Render loop, controls, keyboard, observers, `?hero-debug` hook. |
| `hero.css` | Design tokens, skins, responsive layout. |

## Tuning constants (`config.ts`)

| Constant | Reference value | Meaning |
| --- | --- | --- |
| `H` / `T` / `P` / `LEN` | 3.0s / 4.2s / 7.2s / 28.8s | Hold, transition, period, loop |
| `LAYOUT.desktop` | figHeight .98, figTop .01, figCx .585, patternHeight .9, suitScale .70, suitRight .168 | Fractions of the stage |
| `LAYOUT.mobile` | figHeight .92, figTop .06, figCx .5, patternWidth .98, suitScale .52, suitRight .27 | Used at `MOBILE_QUERY` |
| `MESH` | 6×5 desktop mesh, jitter 3.5% / 3%, spacing `W/55`, jag 2.6, fringe 45%, bridges 55%, bridge max 0.17·W | Tear mesh and fringe |
| `THREADS` | 64 rows, 56 loose desktop / 34 mobile, 18 trail samples | Thread system |
| `MOTION` | figure float 3px, suit float 4px, strain 1.8px at 70Hz, tween 3.2 scene-s per real s | Polish |
| `TRANSITIONS[i]` | `fab`, `tear`, `assemble`, `relax`, `tech` windows | Per-transition phases |
| `WINDOWS` | patternUnweave, suitWeave, suitOut, suitIn, finalWeave, patternWeave, storm | Special windows (progress `u`) |
| `SUIT` | yaw .78, 40 slices, outYaw 2.4, outScale .38, outTilt .5, inScale .45 | Suit projection and flight |
| `PALETTE` | ink, burgundy, cream, paper | One ink plus tints |

## Swapping artwork

1. Put new SVGs in `public/hero/`. All avatars and the suit share a viewBox of `894 × 1342`, with the head in the same place and solid interior fills.
2. Update `ART_URLS` in `config.ts`. If you change the viewBox, update `ART_W` and `ART_H`.
3. `patterns.svg` is the stage-1 backdrop and can be roughly square.

## Swapping quotes and labels

Edit `STAGES` in `config.ts`: `title`, `sub`, `tag`, `alt` and `quote`. A quote is a list of segments. Use `kind: "chip"` (code chip) or `kind: "stitch"` (dashed underline) for inline emphasis. The terminal prompt text is in `Hero.tsx`.

## Controls

Space toggles play and pause. Left and right arrows tween to the previous or next stage. The dots jump by the shortest route around the loop. It pauses when off-screen, and with `prefers-reduced-motion` it starts paused on the last stage.

## Verifying

Run the dev server and open `/?hero-debug`. This exposes a hook for rendering a frame at an exact `t`. `.preview/run.sh` and `.preview/shot.mjs` use it to capture screenshots at `u = 0.1 … 0.9` for each transition.

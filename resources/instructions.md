# AI Build Brief: Animated Portfolio Hero (Tailor → Fashion → Linux → Unified Creative)

Oct 11, 2026 · @Ashfaq

## How to use this brief

Give this whole document to an AI coding model and ask it to build a portfolio page whose hero section plays a four-stage, thread-and-cloth transformation animation. The animation is the product; the rest of the portfolio is ordinary and is not covered here.

The brief describes a reference build in enough detail to reproduce its feel, but it is a blueprint, not a clone. Keep the mechanics and the quality bar; change the person, the artwork, the words and the palette to suit the new portfolio.

**Role for the AI.** Act as a senior creative front-end engineer with a motion designer's taste. Prefer fewer, better-timed movements over many decorative ones.

**Deliverable.**

- A hero component (HTML + CSS + JavaScript, no animation libraries) that can be dropped into any page.
- A single `<canvas>` for the figure layer and plain DOM for captions, the quote note and the controls.
- A short README listing the tuning constants and how to swap in new artwork and quotes.

**Copy exactly:** the timeline model, the transition phases and their order, the "no orbiting or circling motion" rule, and the acceptance checklist. **Adapt freely:** avatars, objects, quotes, colours, fonts, and the number of stages (four is the reference).

## Concept and narrative

The hero tells one joke and one truth: a creative who cannot pick a lane keeps rebuilding himself, and in the end the lanes merge. A single illustrated avatar cycles through four identities, and each identity speaks one self-deprecating thought.

1. **The Tailor:** hand-stitching, pattern drafting.
2. **The Fashion Enthusiast:** silhouette, draping, streetwear.
3. **The Linux Tech Guy:** terminal, dotfiles, automation.
4. **The Unified Creative:** both at once, shipping code by day and tailoring architecture by night.

**Core metaphor: identity is cloth.** Every change of identity is physical. A figure turns into woven fabric, tears along jagged seams, frays into thread, and is re-woven into the next figure. Objects carry the meaning between stages: pattern pieces unspool into threads that weave a suit, the suit flies away, then returns to dress the final avatar.

**Design principles.**

- Every movement has a cause and an effect (deconstruction, flow, construction). Nothing moves just to look busy.
- No orbiting, circling or bobbing decorative icons. Early drafts used rings of floating props and they read as childish; do not reintroduce them.
- Motion is directed: threads travel from where they are released to where they are needed.
- The tone is witty and self-aware, but the motion language is calm, precise and tailored, like a professional title sequence.

## Visual language and design tokens

The look is a tailor's blueprint: one burgundy ink on warm paper, a faint drafting grid, serif headlines and monospace annotations. Use these tokens as the starting point and keep the palette to one ink colour plus tints.

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#4f0b16` | Line art, borders, text |
| Paper | `#f8f3ea` | Stage and card background |
| Page background | `#efe7dc` (dark mode `#1b1012`) | Outside the card |
| Grid | `rgba(79,11,22,.09)`, 22px cells | Blueprint grid on the stage |
| Hot grid | `rgba(79,11,22,.30)`, 22px cells | Grid that lights up during transitions |
| Thread dark | `#7a1c30` | Yarn, stitched borders |
| Thread highlight | `#f0b8c0` | 1px offset highlight on every thread |
| Terminal | background `#2b0b11`, text `#f3e3df`, prompt `#e98fa0` | Stage 3 note |
| Headline font | Georgia, serif, bold, uppercase, letter-spacing .03em | Stage titles |
| Quote font | Georgia italic, 11.5–15.5px fluid | Thought notes |
| Label font | Courier New, monospace | Sub-labels, tags, controls |

**Artwork style.** Monochrome line art with solid interiors (so the silhouette is opaque), cross-hatching and a slightly retro 1970s tailoring feel. Every illustration must read as ink on paper: no gradients, no drop shadows, no glow.

**Borders and stitching.** Use 1–2px borders. Dashed borders (`dash 6px, gap 5px`) are "running stitches" and are the signature detail of the notes, the thread that ties the note to the avatar, and the pattern-paper frame.

**Dark mode.** Support `prefers-color-scheme: dark` by switching only the page background and outer text. The card stays paper-coloured so the artwork never has to be re-inked.

## Tech stack and architecture

Build it with vanilla JavaScript, one 2D canvas and a little DOM; the whole animation is a pure function of time. No GSAP, no Three.js, no WebGL. If the host site uses React, Vue or Svelte, wrap the same code in a component and keep all canvas logic outside the framework's render cycle.

**Rendering split.**

- **Canvas (z-index 3), full stage size:** pattern sheet, back threads, the figure and its shards, the suit, front threads. Everything that tears, flows or weaves lives here so it can cross the whole stage.
- **Hot-grid div (z-index 0):** a second, darker grid revealed by a radial CSS mask centred on the figure; its opacity follows `sin(πu)` during a transition.
- **DOM overlay:** header captions, the quote note, the stitched thread from the avatar to the note, and the control bar.

**Module map.** Implement each as a small section of one script, in this order.

1. `clock(t)`: maps time to `{k, u, p}` (stage, transition progress, eased stage position).
2. `layout()`: stage size, figure box, device pixel ratio.
3. `raster()`: rasterises every SVG to offscreen canvases at figure size, builds alpha arrays, cloth versions, shard meshes, row sets and thread tables.
4. `drawFig(k, u)`: composes one frame for transition `k` at progress `u`.
5. `shards`, `bridges`, `threads`, `suit`: the engines described in the following sections.
6. `quote system`: builds the per-character DOM and applies typing and unravelling.
7. `ui`: controls, keyboard, resize observer, render loop.

**Data flow per frame.** `t` → `clock` → `drawFig` (canvas) + captions + quote + hot grid + progress UI. Nothing reads from the previous frame, which is what makes scrubbing and reverse playback free.

## Assets and how to prepare them

The animation only works if every illustration shares one canvas and one registration, so prepare the assets before writing any motion code. The reference build uses eight assets, all with transparent backgrounds and an `894 × 1342` viewBox.

| Asset | What it is | Rules |
| --- | --- | --- |
| Avatar 1–4 (SVG) | The same character in four outfits and poses | Same head position and scale in all four; solid interior fills so the alpha silhouette has no holes |
| `suit.svg` | A headless tailored suit (jacket and wide trousers) | Same viewBox; drawn front-on; neck cavity open |
| `patterns.svg` | A sheet of pattern pieces, scissors, thread spool, tape measure, mannequin, fabric swatch | Transparent background; roughly square |
| Weave tile (JPEG) | A crop of woven fabric, about 240 × 342 px | Cropped from the middle of a real swatch so it contains no edge; mirrored 2 × 2 in code so it tiles seamlessly |
| Fringe atlas (PNG) | About 10 frayed yarn strands cut from the swatch's edge | Each entry stores `[x, y, w, h, rootX, rootY, tipX, tipY]` |

**Registration rule.** Draw each avatar so its head sits at the same place on the canvas. The suit is composed to the same scale so it can be shown beside the avatar and later land exactly on the final avatar's body.

**If the user has no art yet.** Generate placeholder SVG silhouettes with the same viewBox and fill rules so the engine can be built and tested first. Make the swap a single array of data URIs or file paths.

**Extracting the fringe atlas from a fabric swatch with fringes (one-off script).**

1. Threshold the alpha channel at 128 and apply a morphological opening with a large kernel (about 61 px) to keep only the solid weave body.
2. Dilate that body slightly, subtract it from the alpha mask, and label connected components.
3. Keep components with enough area, whose nearest pixel is close to the body, and whose length is 110–520 px; discard thick clumps.
4. For each, record the root (pixel nearest the body) and tip (pixel farthest from the root); crop, downscale by 0.5, and shelf-pack into one PNG.

**Runtime preparation.** Rasterise every SVG once at figure size × device pixel ratio (cap the ratio at 2). Keep the alpha channel of each raster in a `Uint8Array`; shard edges, fringe placement and thread rows are all computed from it, never per frame.

## Layout and responsiveness

On desktop the scene sits right of centre so the left column is free for the thought note; on mobile the note moves above the stage. All positions derive from the stage size, never from fixed pixels.

| Element | Desktop | Mobile (≤ 640px) |
| --- | --- | --- |
| Card | max width 1100px, paper background, 1px ink border, 6px radius | Full width |
| Stage aspect ratio | 16 : 8.4 | 3 : 4 |
| Figure height | 98% of stage, top at 1% | 92% of stage, top at 6% |
| Figure width | height × 894 / 1342 | Same |
| Figure centre x | 58.5% of stage width | 50% |
| Quote note | Absolute: left 3%, top 12%, width 25% | Static block above the stage, minimum height 148px (prevents layout jump between stages) |
| Pattern sheet | Content height 90% of stage, centred on the figure | Content width 98% of stage |
| Suit (stage 2) | Scale 0.70, 16.8% of stage width right of the figure centre | Scale 0.52, 27% right |

**Header.** Above the stage show a small tracking line (`STAGE 02 / 04`), the stage title in quotes, and the sub-label. During a transition the header swaps to the transition's name and a one-line description.

**Bottom bar.** Previous and next arrows, a track with four numbered step dots (time labels beneath), a play/pause button and a live readout such as `t = 9.0s · stage 2 of 4`.

**The thought thread.** On desktop draw a dashed bezier (`6px dash, 5px gap`, thread-dark) from the note's right edge to a small circle beside the avatar's head, curving up by about 46px. It fades with the note.

**Resizing.** Observe the stage with a `ResizeObserver`, debounce by 120ms, then recompute layout, resize the canvas and re-run the rasteriser. Never rasterise per frame.

## Timeline model

Every visual is a pure function of one number, the time `t`; nothing is accumulated between frames. This is the single most important architectural rule, because it makes pause, scrub, reverse and click-to-jump work with no extra code.

**Constants (reference values).** Hold `H = 3.0s`, transition `T = 4.2s`, period `P = H + T = 7.2s`, loop `LEN = 4 × P = 28.8s`. Four stages, four transitions; the fourth loops back to stage 1.

**Clock.** `clock(t)` wraps `t` into `[0, LEN)`, then returns the stage index `k = floor(t / P)`, the remainder `r = t − k·P`, and transition progress `u = 0` while `r < H`, otherwise `u = (r − H) / T`. Also return `p = k + easeInOutCubic(u)` for UI fill and active step.

**Continuity rule.** At `u = 0` and `u = 1` the transition code must render exactly what the static stage renders. Test it by comparing screenshots at `u = 0.0005` and `u = 0` for every stage; any visible pop is a bug.

**Per-transition windows (progress `u`, 0–1).** Times scale by `T`.

| Transition | Figure turns to cloth | Old figure tears | New figure assembles | New figure relaxes to line art | Thread storm | Special |
| --- | --- | --- | --- | --- | --- | --- |
| 1 → 2 | 0–0.10 | 0.10–0.52 | 0.18–0.54 | 0.50–0.60 | 0.05–1.0 | Pattern sheet unweaves 0.08–0.55; suit woven 0.60–1.0 |
| 2 → 3 | 0–0.10 | 0.14–0.76 | 0.34–0.88 | 0.86–1.0 | 0.05–0.95 | Suit flies out 0.04–0.46 |
| 3 → 4 | 0–0.10 | 0.10–0.52 | none | none | 0.10–0.96 | Suit flies in 0.10–0.52; final avatar woven 0.56–0.96 |
| 4 → 1 | 0–0.12 | 0.14–0.76 | 0.34–0.88 | 0.86–1.0 | 0.14–0.98 | Pattern sheet woven back 0.58–0.98 |

**Easing.** Use sine or cubic ease-in-out for travel, `smoothstep` for fades, and a power ease (about `s^1.5`) for tearing so pieces start slow and accelerate. Linear motion is not allowed anywhere except the 1.8px strain jitter.

## The four stages

Each stage pairs one avatar with one set of supporting objects, one sub-label and one thought. Use the quotes and sub-labels below as the reference copy; replace them with the portfolio owner's own words.

| Stage | Avatar and scene | Sub-label | Thought (shown in the note) |
| --- | --- | --- | --- |
| 1. The Tailor | Thoughtful pose, chin on hand. `patterns.svg` sits behind him as a backdrop | Physical Foundation & Pattern Drafting | "Wait, should I just become a bespoke tailor? Hand-stitching lapels looks therapeutic..." |
| 2. The Fashion Enthusiast | Holding a tablet, looking to his right. The finished suit hangs in front of him at eye level, turned about 45° toward him | Materiality, Draping & Aesthetics | "No, wait... maybe high-end streetwear and silhouette design is my true calling." |
| 3. The Linux Tech Guy | Gesturing at floating windows; the artwork already contains code windows, a laptop, circuit lines and icons around him | Kernel Panics & Open-Source Architecture | "Ehh, nah—let's be real, I live in the terminal. Time to rice my dotfiles and automate everything." |
| 4. The Unified Creative | Wearing the suit, working on a laptop | Full-Stack Multihyphenate | "Damn... why choose? I'm just shipping code by day and tailoring the architecture by night." |

**Rules for the scene objects.**

- A stage's supporting objects are either part of the avatar artwork (stage 3) or a separate layer drawn on the canvas (the pattern sheet in stage 1, the suit in stage 2). Never add floating icons that orbit or bob.
- The pattern sheet in stage 1 is a backdrop: it sits behind the avatar, centred on him, and may be partly covered by his body.
- In stage 2 the avatar's gaze must point toward the suit. If the artwork looks left, mirror the layout.
- The suit floats with a gentle sine drift of ±4px; the avatar floats with ±3px. Nothing else moves during a hold.

**Stage 3 note.** Because stage 3's artwork already carries its own technical objects, the tear mesh will cut through them. This is intended; the shards inherit those details.

## Transition engine: fabricate, tear, re-weave

A figure swap has four overlapping phases (the seven steps below break them down): the line-art figure becomes woven cloth, the cloth tears into jagged shards that fray and fall, new shards drop in and stitch together, and the new cloth relaxes into clean line art. Build this engine first and test it with two plain avatars before adding anything else.

**1. Fabricate (diagonal wipe).** Make a cloth version of each avatar once: fill an offscreen canvas with the mirrored weave tile (pattern scaled to `W / 752 × 0.8`), keep only the avatar's silhouette (`destination-in` with the avatar), lighten by painting paper at 20% opacity with `source-atop`, then multiply the original line art over it at 90%. During the first 10–12% of the transition, reveal the cloth version over the line art with a soft diagonal wipe (top-left to bottom-right, edge width 0.3 of the diagonal). Add a horizontal jitter of 1.8px at about 70Hz just before tearing starts, so the cloth looks strained.

**2. Tear into shards.** Build a jittered mesh once per transition.

- Grid: 6 columns at `x = [0, .20, .38, .50, .62, .80, 1]` of the figure width and 5 rows at `y = [0, .17, .36, .56, .76, 1]` of its height (30 shards).
- Jitter interior vertices by ±3.5% of width and ±3% of height.
- Replace every straight edge by a jagged polyline: sample spacing `sp = W / 55`, a random walk with offset `off = off·0.5 + rand·sp·2.6`, tapered to zero within the first and last 20% of the edge. **Neighbouring shards must share the identical edge array** so the pieces fit perfectly before they move.
- Each shard is drawn by clipping to its polygon (`Path2D`) and copying only its bounding box from the cloth raster. Skip shards whose region contains no opaque pixels.

**3. Shard motion (old figure).** With per-shard random numbers `r1, r2, r3`, progress `s = clamp((u − start − delay·span) / duration)` and `e = s^1.5`:

```
delay   = clamp(distanceFromTopCentre·0.78 + rand·0.22)   // the crack runs down from the top
tx      = side · (.06 + .34·r1) · W · e                    // outwards
ty      = (.10 + .50·r2) · H · e² − .03·H·sin(π·min(1, 1.5s))   // lifts, then falls
rotation= side · (.20 + 1.0·r3) · e                       // radians
scale   = 1 + .08·sin(πs)
alpha   = 1 − smoothstep(.72, 1, s)
```

**4. Fringe at torn edges.** For about 45% of the points along each shard's edge that lie on opaque pixels, draw one fringe sprite from the atlas: root at the point, rotated to the outward normal plus a random jitter of ±0.45 rad, cross-axis scaled to 0.5, length `W·(.04 + .07·rand)` growing with `smoothstep(.03, .35, s)`. Fringe must appear only where cloth exists, so test each edge point against the alpha array first. For the "tech" transitions replace a share of these (55% and 30%) with circuit traces: a right-angled polyline ending in a small ring.

**5. Bridge threads.** For shared edges, pick about 55% of the opaque points. While the two neighbouring shards are less than `0.17·W` apart, draw a thin yarn strand between the two transformed copies of that point, as a quadratic curve with a small sag. Alpha is `1 − smoothstep(.15, 1, distance / maxDistance)`. Batch strokes into three alpha buckets and two passes (dark yarn, then a 1px-offset highlight).

**6. Assemble the new figure.** Use the same system with a different random seed, the roles reversed: shards start above and to the side, fall in with `e = (1 − s)^1.5`, delay measured from the feet upward (`(1 − y)·0.62 + rand·0.38`) so the figure is stitched up from the bottom, and their fringe retracts as they arrive. Bridge threads reappear automatically as stitching when pieces come close.

**7. Relax to line art.** Wipe from the opposite corner to reveal the clean raster over the cloth. At `u = 1` draw the static stage image only, which must match the last frame pixel for pixel.

## Thread weaving system

Threads are what make the animation feel constructed rather than faded: a raster is read as stacked horizontal rows, and one thread per row unweaves or weaves it. The same system builds the suit, builds the final avatar, and unspools and rebuilds the pattern sheet.

**Rows.** For every raster that can be woven, scan its alpha array to find the first and last opaque scanline, split that range into `NR = 64` equal rows, and store each row's `y0`, `y1`, `xmin`, `xmax` (the left and right extent of opaque pixels in that row) and a direction that alternates left-to-right and right-to-left, like a loom shuttle.

**Row reveal.** Row progress `p` runs 0 to 1. To reveal a row from its start side, paint a rectangle from the edge of the canvas to `xmin + p·(xmax − xmin)` into a mask canvas, then draw the source raster into a scratch canvas and apply the mask with `destination-in` (to show woven rows) or `destination-out` (to remove unwoven rows). This gives crisp horizontal bands that sweep across the garment.

**One thread per row ("link" threads).** Each thread has a lifetime with three phases:

1. **Unweave source** (only when a source is also a row set, such as the pattern sheet): the head sweeps along the source row while the row is erased.
2. **Flow:** the head travels from the source end to the start of the target row along a cubic bezier with an S-shaped bend, eased with a sine curve. Control points sit at 30% and 70% of the way, offset sideways by ±0.34 of the distance. Add a small ripple, `sin(·)·sin(πe)·0.025·distance`.
3. **Weave target:** the head sweeps along the target row, and that row's reveal progress equals the head's progress.

Stagger the threads from the top row to the bottom row (with 12% random jitter), so the garment appears to be knitted downwards. For the suit, rows start at about 60% of the transition and finish at 100%.

**Thread rendering.** Draw each thread as a polyline of the head and 18 trailing samples, spaced 0.0028–0.0048 of the thread's life apart. Stroke width is `max(1.6, W / 300)` px in the dark thread colour, then again at 40% width in the highlight colour, offset by 1px. Alpha tapers along the tail. Group segments into three alpha buckets and build each bucket as a single `Path2D` so a full storm costs about a dozen strokes per frame.

**Depth.** Give each thread a fixed side (`zs = ±1`). Draw back threads before the figure and front threads after it, so streams visibly pass behind and in front of the avatar. Weaving phases are always in front.

**Loose threads.** Add 40–64 extra threads per transition that unspool from a source (pattern sheet, the flying suit, torn shards), flow along the same kind of curve towards a destination (the suit, the figure, the pattern sheet, or just drift upward) and fade out. They exist to make the air feel full of thread without a single circular path.

**Hard rule.** No thread, prop or suit may travel in a circle or spiral around the figure. Use directed bezier flows only.

## The suit: display, flight, final avatar

The suit is the story's hero object: woven from threads, shown to the avatar, flown away, then flown back to become the final avatar's outfit. Treat it as its own animated layer on the canvas, not as part of any avatar.

**Display in stage 2.** The finished suit hangs in front of avatar 2, at his eye level, to the side he is looking toward, as if he is studying a tailored piece.

- Place its top near the avatar's eye line: with scale `sc = 0.70` (desktop) the vertical offset is `dy = (0.05 − 0.5 + 0.48·sc) · figureHeight`, plus the ±4px float.
- Place it `0.168 · stageWidth` to the right of the figure centre on desktop.
- Draw it after the avatar so it is in front.

**Turned sideways, with only a front image.** To make the suit face the avatar, simulate a yaw of about 45° (`θ = 0.78 rad`) by drawing the suit as 40 vertical slices. For slice centre `xᵢ` measured from the middle, use depth `z = xᵢ·sinθ`, perspective `p = 1 / (1 − z / (2.2·H))`, horizontal position `xᵢ·cosθ·p` and height scaled by `p`. The edge nearest the viewer is slightly taller than the far edge. Overlap slices by 0.8px to avoid seams. If a side-view drawing is available, use it instead.

**Weaving the suit.** The thread rows sweep across the *projected* suit, so map each row point through the same yaw projection that the drawing uses. Otherwise the thread heads and the revealed bands drift apart.

**Flight out (transition 2 → 3).** Move along a cubic bezier from the display position through `(+.04W, −.38H)` and `(+.30W, −.62H)` to `(+.78W, −.46H)` (offsets relative to the figure centre, `W` and `H` being stage size), eased with a sine curve over progress 0.04–0.46. Increase the yaw by 2.4 rad while it travels so it turns edge-on and tumbles, shrink to 0.38 scale, tilt by 0.5 rad, and fade over the last 18%. Loose threads peel off it as it goes.

**Flight in (transition 3 → 4).** Enter from beyond the upper-left corner at `(−.9W, −.5H)` through `(−.5W, −.72H)` and `(−.2W, +.12H)` to the centre, over progress 0.10–0.52. Yaw runs from 2.4 rad down to 0 so the suit turns face-on, scale grows from 0.45 to 1, and it lands exactly on the final avatar's body position.

**Final avatar woven over the suit.** From about 56% progress, the thread rows reveal the final avatar with the row mask applied as `destination-in`, while the suit is drawn with the same mask applied as `destination-out`. Where a row has been woven you see the avatar; where it has not, you still see the suit. The head and laptop appear first because rows run top to bottom.

**If the portfolio has no suit.** Choose any signature object that visually becomes the last identity (a coat, a toolbox, a keyboard) and give it the same three moments: woven, shown, and flown to become the final state.

## The thought note

The quote is a stitched note that re-skins itself for every stage, types in as the new figure is built, and unravels letter by letter as the old figure is torn down. It is plain DOM, so the text stays crisp and selectable; only its state is driven by `(k, u)`.

**Structure.** One container (`.quote`) holds one frame (`.qbox`) with two decoration elements and four text blocks, one per stage. Show only the current stage's block. Build every quote as one `<span class="c">` per character, grouped into `<span class="w">` word wrappers (`display: inline-block; white-space: nowrap`). Spaces are separate inline spans between the wrappers so lines wrap between words, never inside them. Keep a flat array of the character and space spans per quote.

**Four skins** (switch with a `data-skin` attribute on the frame).

| Skin | Stage | Frame | Type | Decoration |
| --- | --- | --- | --- | --- |
| 0 | Tailor | Pattern paper gradient, 2px dashed thread border, faint outer cut line | Georgia italic | Tape-measure ruler ticks along the top edge (a tick every 6px, a longer one every 24px); tag `DRAFT No.01 · 1:1` |
| 1 | Fashion | Cream card, 2px solid ink border, rounded bottom corners | Georgia italic, slightly tracked | A punched hole at the top and a loop of thread above it (a hang-tag); tag `No.02 · DRAPE` |
| 2 | Linux | Dark terminal, 2px border, 8px radius, title bar | Courier New | Three coloured dots; title `zsh — tty1`; prompt `dev@arch:~$` in pink before the text; blinking block caret |
| 3 | Unified | Cream card, dashed thread border plus a thin inner solid outline | Georgia italic with inline code | Large `{` and `}` braces in the corners; "shipping code by day" as a dark code chip, "tailoring the architecture by night" with a dashed stitch underline |

**State as a function of `(k, u)`.**

| Condition | Quote shown | What happens |
| --- | --- | --- |
| `u = 0` (hold) | Stage `k`, complete | Fully visible |
| `0 < u < 0.45` | Stage `k` | Letters unravel from `u = .02` to `.34`. Each letter has a random delay up to half the window, then fades while it drifts (±65px sideways, −20 to +70px vertically) and rotates (±85°). The prompt fades with them. From `u = .30` to `.44` the frame retracts to the left with an animated `clip-path: inset(...)` |
| `u ≥ 0.45` | Stage `k + 1` | The skin and text block swap while the frame is invisible. The frame opens from `.46` to `.58`, then characters appear one by one from `.56` to `.90` (`visible if index < count · progress`) with a caret on the last visible character |

Because the state depends only on `(k, u)`, scrubbing and reverse playback behave correctly. Update character styles only when the state key changes, not every frame.

**Reading time.** A quote must be fully visible for at least 3 seconds. In the reference timeline it is typed by about 90% of the transition and stays through the 3-second hold.

**Accessibility.** Mark the character spans `aria-hidden="true"` and put the full quote in a visually hidden element with `aria-live="polite"` that updates when the stage changes.

## Controls and interaction

The controls should let a visitor watch the loop, or drive it, without ever breaking the animation. Because all rendering is a function of `t`, every control just moves `t`.

- **Autoplay loop.** Start playing on load and advance `t` by the real elapsed time, capping each step at 50ms so a background tab does not jump.
- **Play / pause.** A button and the space bar. Pausing freezes `t`; the figure's gentle float freezes with it.
- **Previous / next stage.** Arrow buttons and the left/right arrow keys. They do not cut: they tween `t` toward the start of the neighbouring stage at 3.2 scene-seconds per real second, forwards or backwards, so the visitor sees the transition play quickly.
- **Step dots.** Clicking a dot tweens to that stage by the shortest route around the loop (compare the target in this loop, the previous loop and the next loop).
- **Progress.** A fill line across the dots shows overall position (`p / 3`), and the readout shows `t` and either `stage n of 4` or `transition a → b`.
- **Reduced motion.** If `prefers-reduced-motion: reduce` is set, start paused on the final stage. Buttons still work, so the visitor decides when to see motion.
- **Tab visibility.** Pause automatically when the hero is off-screen (use `IntersectionObserver`) and resume when it returns.

Do not add hover effects that move the figure, parallax on scroll, or cursor-following. The hero should feel like a film the visitor can scrub, not a toy.

## Performance, accessibility and quality bar

The animation must stay smooth on a mid-range phone and read as professional motion design. These are the budgets and the taste rules the builder must meet.

**Performance budget.**

- Target 60fps; the reference build renders a full transition frame in under 6ms in a software-rendered headless browser. Measure by calling the render function 30 times in a loop and averaging.
- Rasterise, build meshes and build row sets once (and again only on resize). Never call `getImageData` inside the frame loop; wrap it in `try/catch` and fall back to treating all pixels as opaque if the canvas is tainted.
- Cap the device pixel ratio at 2. Reuse offscreen canvases and `Path2D` objects; allocate nothing large per frame.
- Keep total thread count around 130 per transition and shard count at 30. On narrow screens it is acceptable to reduce loose threads to about 60% and the mesh to 5 × 4.
- Total page weight: inline the SVGs only if the file stays under about 8MB; otherwise load them as files and decode with `img.decode()` before the first frame.

**Accessibility.**

- The canvas is decorative: `role="img"` with an `aria-label` describing the current stage.
- All buttons are real `<button>` elements with labels and a visible focus ring (2px ink outline, 3px offset).
- Provide a static fallback (the final avatar image and the four quotes as text) when JavaScript or canvas is unavailable.
- Keep text contrast at WCAG AA on both paper and terminal backgrounds.

**Quality bar for the motion.** Review every transition frame by frame against this list.

- Easing everywhere; no linear travel, no abrupt stops.
- Anticipation before action: the cloth strains before it tears.
- Overlap and stagger: shards, threads and letters never all start on the same frame.
- Continuity: hold and transition frames match at the boundaries.
- Cause and effect: every thread has a visible origin and a visible destination.
- Restraint: during a hold only the gentle float moves.
- Depth: threads pass both behind and in front of the avatar.
- No orbiting, spiralling, pulsing or bouncing decoration, ever.

**Verify by looking.** Render screenshots at several progress values of every transition (for example `u = 0.1, 0.3, 0.5, 0.7, 0.9`) and on both desktop and phone widths, and inspect them before declaring the work done.

## Build order and acceptance checklist

Build in this order and verify each step with screenshots before starting the next; the later steps depend on the earlier ones being solid.

1. **Shell.** Page, card, header captions, stage, control bar, design tokens, responsive layout with placeholder rectangles.
2. **Clock and render loop.** `clock(t)`, play/pause, tweened prev/next, readout. Draw only the static stage image at each stage.
3. **Rasteriser.** SVG to offscreen canvases, alpha arrays, resize handling.
4. **Cloth and shards.** Cloth rasters, mesh, shard motion, fringe, bridges, assemble and relax. Make the plain avatar-to-avatar tear look right in transitions 2 → 3 and 4 → 1 before anything else.
5. **Row system and threads.** Rows, reveal masks, link threads, loose threads, depth ordering.
6. **Pattern sheet.** Stage 1 backdrop, unweave and weave-back.
7. **The suit.** Display with yaw projection, weaving, flight out and in, final avatar weave.
8. **Thought note.** Four skins, per-character state, typing and unravel, thread to the head.
9. **Polish.** Easing review, continuity check, hot-grid reveal, reduced motion, accessibility, performance run, phone check.

**Acceptance checklist.** The work is done only when every item is true.

- [ ] All four stages render correctly at desktop and phone widths with no overlap between note and figure.
- [ ] Each transition plays forward, in reverse, and when scrubbed with the step dots, without errors.
- [ ] Frames at `u = 0` and `u = 1` match the static stage images (no pop).
- [ ] The tear shows jagged shared seams, fraying at the edges, and thin threads that stretch and snap.
- [ ] Threads weave the suit row by row, and the final avatar row by row over the suit.
- [ ] Nothing orbits, circles or spirals; the suit flies along smooth arcs.
- [ ] Each quote types in, stays readable for at least 3 seconds, and unravels letter by letter.
- [ ] The pattern sheet unspools in transition 1 → 2 and weaves back in 4 → 1.
- [ ] Frame time stays under budget on the slowest target device.
- [ ] `prefers-reduced-motion`, keyboard use, focus rings and the static fallback all work.
- [ ] The README documents the tuning constants (`H`, `T`, mesh grid, thread counts, suit placement) and how to swap artwork and quotes.

## Ready-to-paste master prompt

Paste the block below into the AI model first, then attach this whole brief and your assets. Fill in every `[bracket]` before sending.

```text
You are a senior creative front-end engineer with a motion designer's taste.
Build the HERO SECTION of my portfolio as a four-stage animated transformation,
following the attached brief ("AI Build Brief: Animated Portfolio Hero") closely.

About me and the story
- Name: [NAME]. Site purpose: [portfolio for ...].
- Four identities, in order: [1], [2], [3], [4 = the unified final state].
- For each stage I will provide: an illustrated avatar SVG, a sub-label and one
  self-deprecating thought (quote). Quotes and sub-labels: [PASTE].
- Signature object that is woven, shown and flown to become the final identity: [suit / coat / other].
- Backdrop for stage 1: [pattern sheet / other].

Rules you must follow
1. Vanilla JS, one 2D canvas plus DOM overlay, no animation libraries.
2. Every visual is a pure function of time t. Hold 3.0s, transition 4.2s, four stages, loop.
3. Transitions use: cloth wipe -> jagged shard tear with fringe and bridge threads
   -> new shards stitch in from the feet up -> relax to line art.
4. Threads weave rows of the target artwork top to bottom, one thread per row,
   flowing along directed bezier curves, passing behind and in front of the figure.
5. The thought note re-skins per stage, types in, and unravels letter by letter.
6. Absolutely no orbiting, circling, spiralling or bobbing decorative motion.
7. Desktop: scene right of centre, note in the left column. Mobile: note above the stage.
8. Controls: autoplay, play/pause, tweened prev/next and step dots, reduced-motion support.
9. Respect the performance budgets and the acceptance checklist in the brief.

Process
- Follow the build order in the brief; show a screenshot after each step.
- Ask me before changing any constant the brief marks as reference values.
- If an asset is missing, generate a placeholder with the same viewBox and say so.

Deliver: one hero component, a README with tuning constants, and screenshots of every
transition at u = 0.1, 0.3, 0.5, 0.7, 0.9 on desktop and phone widths.
```

**Fill-in checklist before sending.**

- [ ] Four avatar SVGs sharing one viewBox and head position
- [ ] One signature object SVG and one backdrop SVG
- [ ] A fabric swatch image (for the weave tile and fringe atlas)
- [ ] Four quotes and four sub-labels
- [ ] Palette and fonts, if different from the reference tokens

# The projects sketchbook

Part III of the home page is a spiral-bound sketch pad with one project per page. When a page lands, the project's logo draws itself in burgundy pencil, stroke by stroke. Then the details are written in around it: the date and subject on the printed form, the title and its underline, the notes, the "materials" (the tech stack) and the links. Turning a page flips it up over the coil.

You can turn pages with the arrow buttons, the numbered tabs, the ← and → keys, or a swipe on a phone. With reduced motion turned on, pages switch instantly and arrive already drawn. Without JavaScript, every project is listed in order.

## Adding a project

Add two files to `content/projects/`, both named after the project's slug:

**`<slug>.md`**: frontmatter, then the notes as plain text.

```md
---
title: Community Courier
tagline: Parcels across the city, from one doorstep to the next.
year: "2026"                # or 2024 – 2025, or 2025 – now
kind: University project    # shown as the page's "Subject"
status: shipped             # optional stamp: shipped | in-progress | archived
role: Full-stack developer  # optional
stack: [Next.js 16, Prisma 7, PostgreSQL]   # up to 10 "materials"
links:                      # up to 4, http(s) only
  - label: Live site
    href: https://example.com
  - label: Source
    href: https://github.com/ashfaqrafin/community-courier
order: 20                   # lower comes first
draft: false                # true keeps it off the site
---
An urban logistics and parcel delivery platform.

A blank line starts a new paragraph, and a run of lines starting
with "- " becomes a list.
```

**`<slug>.svg`** (optional): the logo the page draws.
- **Use outlines.** Every shape is drawn as a line, in the order it appears in the file, so put shapes in the order you'd sketch them.
- **Fills get hatched.** A filled shape is outlined first and then hatched in. Give a shape `fill="none"` if it should stay a line.
- **What's supported:** `path`, `circle`, `ellipse`, `rect`, `line`, `polyline` and `polygon`, with `<g>` transforms and fills.
- **What's ignored:** text, images, CSS classes and styles. Convert text to outlines in your editor first.
- **No logo?** The page draws a blank sheet with a folded corner.

**Traced line art works as-is.** Image tracers (Inkscape's Trace Bitmap, potrace, online converters) save a line drawing as ONE filled path, with every pencil line stored as a small filled outline. The reader splits that path back into its lines and keeps each hole (inside glasses, inside an outline) with its outline. The lines then draw in order from the top down with a fine pencil, at a pace set by their length, and each is inked in solid as soon as it's drawn. The tracer must use absolute coordinates, and the drawing must hold at most 240 separate lines.

**Detailed illustrations work too.** A traced drawing, like the hero avatars, is made of a few huge filled paths, and drawn stroke by stroke it would just come out as a scribble. So it's shaded in instead: a faint underdrawing appears, then back-and-forth pencil strokes sweep down the frame and reveal it in full ink.
- **Detected automatically:** any path or shape too big for line art (over 20,000 characters of path data, or more than 240 shapes) makes the file an illustration.
- **Rendered on the server:** `/api/projects/<slug>/art` renders a small WebP (about 75 KB for an avatar) from a clean copy of the SVG rebuilt from its safe shapes and colours only. The raw file is never rendered.
- **Cached:** each image URL carries a hash of the file, so a new drawing gets a new URL, and the image is otherwise cached forever.

The files are read at build time, so redeploy after editing. In development, restart `npm run dev` to pick up changes.

`npm run test:unit` checks that every project file is valid and every logo has something to draw. It fails on a bad link, an unknown field or a broken SVG.

## Safety

The logo reader keeps only geometry. Scripts, event handlers, styles, links, images and `<use>` references are dropped before anything reaches the page, so a logo file can't inject anything. Links must be `http(s)` URLs to a real domain and always open in a new tab with `noopener noreferrer`.

## Where things are

| Path | What it is |
| --- | --- |
| `content/projects/` | The pages: `.md` details and `.svg` logos |
| `lib/projects/` | Schema (`schema.ts`), file parsing (`file.ts`), the safe SVG reader and line-art/illustration detection (`logo.ts`), cached loading (`data.ts`) |
| `app/api/projects/[slug]/art` | Renders an illustration logo to WebP |
| `app/components/projects/` | `SketchBook.tsx` (pages, turning, drawing state), `LogoDrawing.tsx`, `sketchbook.css` |

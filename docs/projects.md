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
status: shipped             # shipped | in-progress | archived (the stamp)
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

The files are read at build time, so redeploy after editing. In development, restart `npm run dev` to pick up changes.

`npm run test:unit` checks that every project file is valid and every logo has something to draw. It fails on a bad link, an unknown field or a broken SVG.

## Safety

The logo reader keeps only geometry. Scripts, event handlers, styles, links, images and `<use>` references are dropped before anything reaches the page, so a logo file can't inject anything. Links must be `http(s)` URLs to a real domain and always open in a new tab with `noopener noreferrer`.

## Where things are

| Path | What it is |
| --- | --- |
| `content/projects/` | The pages: `.md` details and `.svg` logos |
| `lib/projects/` | Schema (`schema.ts`), file parsing (`file.ts`), the safe SVG reader (`logo.ts`), cached loading (`data.ts`) |
| `app/components/projects/` | `SketchBook.tsx` (pages, turning, drawing state), `LogoDrawing.tsx`, `sketchbook.css` |

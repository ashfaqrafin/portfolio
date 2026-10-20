---
title: "Draping on the stand, drafting in the browser"
excerpt: "Pinning cloth to a dress form and poking at a layout in devtools turn out to be the same activity wearing different shoes."
date: 2026-01-08
readMins: 3
topic: fashion
tags: [draping, prototyping, browser, silhouette]
featured: false
status: published
---

There are two ways to make a pattern. You can draft it flat, with numbers and a ruler. Or you can drape it: pin cloth directly onto a dress form and let the shape tell you what it wants.

I've noticed I build interfaces the same two ways, and I'm much happier when I drape first.

<!--more-->

## Draping is thinking with your hands

When I drape, I start with a rectangle of muslin, a grain line drawn down the middle, and a stand. I pin at centre front, smooth the cloth across the bust, and pin again. Excess fabric becomes a dart, or a gather, or a seam I hadn't planned on.

Nothing is decided in advance. The silhouette shows up because I tried things on the actual shape and kept what looked right.

A few habits that make it work:

- **Respect the grain.** Keep the straight grain vertical and the cloth hangs true. Turn it to the bias and it suddenly clings and flows.
- **Pin generously.** Pins are cheap. Rethinking a seam is cheap. Re-cutting good cloth is not.
- **Mark everything.** Before unpinning, I mark seams, darts, and balance points, or the drape is just a memory.

## The browser is my dress form

When I'm exploring a layout, I don't open a design tool. I open a blank page, throw in some boxes, and poke at them in devtools.

Change a gap. Squash the viewport. Nudge a max-width until the line length feels comfortable. It's the same move as pinning cloth and stepping back from the stand.

The live page is a real body. Real fonts, real text wrapping, real scroll. A static mockup is a fashion illustration: lovely, and occasionally physically impossible.

## Then you draft it properly

A drape isn't a pattern yet. Once I like the shape, I take the muslin off the stand, true up the lines with a ruler, add seam allowance, and turn it into something repeatable.

The browser version of that is the moment I stop fiddling with inline values and turn what I found into real components and tokens. The experiment becomes the spec.

> Drape to discover. Draft to repeat.

Skipping the drafting step leaves you with a toile held together by pins. Skipping the draping step leaves you with a perfectly drafted thing nobody wanted to wear.

## Why this order matters to me

Drafting first makes me commit before I understand the shape. I end up defending decisions I made with no information.

Draping first lets the material argue back. Cloth will tell you, very clearly, that it won't go around that curve without a dart. A layout will tell you, just as clearly, that a sidebar doesn't fit at that width.

I've learned to listen to both. They're usually right, and they're never polite about it.

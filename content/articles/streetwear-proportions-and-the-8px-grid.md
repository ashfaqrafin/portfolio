---
title: "Streetwear proportions and the 8px grid"
excerpt: "Why a boxy tee and a cropped jacket feel right for the same reason a well-spaced UI does: everything agrees on a rhythm."
date: 2026-02-14
readMins: 3
topic: fashion
tags: [streetwear, proportions, design-systems, silhouette]
featured: false
status: published
---

Streetwear gets dismissed as "just big clothes." It isn't. Good streetwear is ruthlessly proportional. The oversized hoodie works because the shoulder drops by a specific amount, the hem lands at a specific point, and the trousers answer with their own width.

It took me an embarrassingly long time to notice I was doing the same thing with spacing on screens.

<!--more-->

## Proportion is a ratio, not a size

An oversized tee isn't defined by being large. It's defined by relationships: body width to length, sleeve length to shoulder drop, hem to hip. Scale the whole thing up evenly and it still looks right. Change one ratio and it suddenly looks borrowed from a bigger sibling.

The proportions I keep coming back to:

- **Dropped shoulder, cropped body.** Width up top, length cut short, so the torso doesn't become a tent.
- **Long top, tapered bottom.** Volume on one half, restraint on the other.
- **Wide trouser, short jacket.** Let the legs carry the volume and keep the jacket hem high.

The common thread is contrast with a pattern to it. Big against small, but in steps that feel related.

## The grid is the same idea

On screen, I space things in multiples of eight. Padding, gaps, line heights, component sizes. It's not that eight is magic. It's that a shared base unit means every measurement is related to every other one.

```css
:root {
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-6: 48px;
}
```

When the gap between cards is `--space-3` and the padding inside them is `--space-2`, the layout has a rhythm the eye picks up without being told. Break it with a random `13px` and the whole page feels a bit off, the way a sleeve that's two centimetres too long does.

## Volume needs a counterweight

Big silhouettes need something crisp nearby, or the outfit dissolves. A structured cap, a clean sneaker, a tucked front.

Interfaces are the same. A generous hero section needs a tight, dense element near it to give the space meaning. Whitespace only reads as intentional when something else is clearly *not* spacious.

> Volume without a counterweight isn't a silhouette. It's laundry.

## What I actually do

When I'm styling an outfit or a layout, I ask the same three questions:

1. What's the base unit? A shoulder width, a spacing step.
2. Where's the volume going, and where is the restraint?
3. Do the jumps between sizes feel like a scale or like accidents?

If I can answer all three, the result usually holds together. If I can't, I'm probably just making things bigger and hoping.

Turns out "make it bigger and hope" is not a design system. I've tried.

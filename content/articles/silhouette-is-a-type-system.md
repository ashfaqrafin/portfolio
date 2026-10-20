---
title: "Silhouette is a type system"
excerpt: "An A-line skirt and a TypeScript interface have more in common than either would like to admit. Both decide what shapes are allowed."
date: 2026-01-27
readMins: 3
topic: unified
tags: [silhouette, types, typescript, design-systems]
featured: false
status: published
connectsTo:
  - slug: what-lapels-taught-me-about-edge-cases
    kind: builds-on
  - slug: draping-on-the-stand-drafting-in-the-browser
    kind: builds-on
    note: "drape first, then type"
---

A silhouette is the outline of a garment before any detail gets involved. Squint at someone across the street and the silhouette is what's left: boxy, fitted, A-line, oversized.

The longer I sew and code, the more I think silhouette does for clothes what a type system does for programs. It doesn't say what the thing is. It says what shapes it's allowed to take.

<!--more-->

## Constraints, not decoration

When I choose an A-line for a skirt, I've made a promise. The hem will be wider than the waist. The sides will flare outward in a fairly straight line. Whatever fabric, pockets, or trim come later, they have to respect that shape.

That's a type. Not the value, the contract.

```ts
type Silhouette = "fitted" | "a-line" | "boxy" | "oversized";

interface Garment {
  silhouette: Silhouette;
  waist: number;   // cm, finished
  hem: number;     // cm, finished
}
```

Once you name the shapes, you can reject the ones that don't make sense.

## Making illegal shapes unrepresentable

An "A-line" with a hem narrower than its waist is not a daring design choice. It's a bug. A type system worth its salt should help me catch that.

```ts
type ALine = { silhouette: "a-line"; waist: number; hem: number };
type Fitted = { silhouette: "fitted"; waist: number; hem: number };
type Skirt = ALine | Fitted;

function validate(s: Skirt): string | null {
  switch (s.silhouette) {
    case "a-line":
      return s.hem > s.waist ? null : "A-line hem must exceed the waist";
    case "fitted":
      return s.hem - s.waist <= 10 ? null : "Too much flare for fitted";
  }
}
```

The compiler can't check the arithmetic for me, but the discriminated union forces me to handle each silhouette on purpose. Add `"oversized"` to the union and every `switch` that forgot about it lights up. That's the lapel lesson again: enumerate the cases before the cases enumerate you.

## Where the analogy holds

- **A silhouette narrows the design space.** So does a type. Fewer possibilities, better decisions.
- **Details are implementation.** Topstitching is to a silhouette what a function body is to a signature.
- **Changing it is expensive.** Switch a coat from fitted to boxy and you're redrafting half the pattern. Change a core type and you're touching half the codebase.

## Where it breaks

Cloth is not a compiler. Fabric stretches, relaxes, and hangs differently on every body. A silhouette is a promise with some give in it.

I've learned to be grateful for that. The best design systems I've used also leave a little ease: strict where shape matters, relaxed where people need room to move.

> Type the outline. Leave ease in the details.

I still drape first and type second. But once a shape is worth repeating, I want something that refuses to let me draw it wrong.

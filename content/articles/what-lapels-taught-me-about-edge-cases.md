---
title: "What lapels taught me about edge cases"
excerpt: "A lapel is a flat piece of cloth that has to roll, fold, and behave under every condition you forgot to test. Sound familiar?"
date: 2025-12-02
readMins: 3
topic: unified
tags: [lapels, edge-cases, testing, tailoring]
featured: false
status: published
connectsTo:
  - slug: drafting-a-block-pattern-from-scratch
    kind: builds-on
    note: "the block comes first"
---

A lapel looks like the easy part of a jacket. It's a triangle that folds back. What could go wrong?

Everything, it turns out. And every way it goes wrong maps uncomfortably well onto the bugs I write.

<!--more-->

## The happy path is a lie

On a hanger, a lapel is perfect. The roll line is crisp, the gorge sits where you drew it, the point lies flat. That's the happy path: one body, standing still, in good light.

Then a person wears it. They sit down. They reach for a coffee. They put a phone in the inside pocket and suddenly the left lapel has opinions.

The garment didn't change. The inputs did.

## A field guide to lapel edge cases

These are the conditions I now test a lapel against before I trust it:

- **Movement:** arms forward, arms up. Does the lapel lift away from the chest?
- **Asymmetry:** a dropped shoulder, a heavier pocket on one side. Do both sides still mirror?
- **Buttoned and unbuttoned:** the roll line behaves differently in each state, and both are valid.
- **Fabric drift:** wool relaxes with steam and wear. Does the roll survive the first humid day?
- **The undercollar seam:** if it peeks out at the edge, everyone sees the implementation detail.

That last one gets me every time. The undercollar is cut slightly smaller so the top collar rolls over and hides the seam. Skip that and the internals leak into the interface.

## Testing with your hands

In code I'd write a test. In tailoring, the test is a hand. I fold the lapel along the roll line, hold it, release it, and watch what it does.

> A well-made lapel remembers where it's supposed to go. A bad one remembers where it was last folded.

The tools for making it remember are old and unglamorous: pad stitching the canvas to the cloth in tiny diagonal stitches, steaming it into a curve, letting it cool on a ham. Each step narrows the set of shapes the lapel is allowed to take.

That's what a good test suite does, too. It doesn't prove the thing works. It shrinks the space of ways it can fail.

## What I took back to the keyboard

I started treating function signatures like roll lines. Where does this fold? What happens when someone sits down in it?

Practically, that meant:

1. Writing the boring case first, then immediately asking what changes when the input is empty, huge, or lopsided.
2. Testing both valid states of anything with a toggle, not just the default one.
3. Hiding implementation seams so they don't show at the edges.

None of this is new advice. But I understood it better once I'd watched a lapel I was proud of flip up the first time somebody shrugged.

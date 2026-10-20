---
title: "Pattern matching, literally"
excerpt: "In one craft, a pattern is paper you cut cloth from. In the other, it's a regex you cut strings with. I've started confusing them on purpose."
date: 2026-05-08
readMins: 3
topic: unified
tags: [pattern-drafting, regex, rust, tailoring]
featured: false
status: published
connectsTo:
  - slug: drafting-a-block-pattern-from-scratch
    kind: builds-on
    note: "same word, two crafts"
---

When a tailor says "pattern," they mean a paper template. When a programmer says "pattern," they mean a shape you test data against. I say it about forty times a day and mean both.

This started as a joke. Then it became a way of thinking, which is how most of my jokes end up.

<!--more-->

## Matching pattern pieces

On a cutting table, pattern matching is a real task. When you cut a striped or checked cloth, the stripes need to line up across seams. Centre back, side seams, the sleeve against the body.

To do it, I mark notches and balance points on the paper, then lay each piece so the same stripe crosses the same notch. It's an exercise in alignment: two separate pieces agreeing on a shared landmark.

Miss it by a few millimetres and the checks jog at the seam. Everyone notices, even people who couldn't tell you why.

## Matching strings

A regular expression is also a template you hold up against something to see if it fits. Here's one I use to pull measurements out of my messy notes, which look like `chest: 98cm` or `waist 82 cm`:

```regex
^(?<name>[a-z ]+?)\s*:?\s*(?<value>\d+(?:\.\d+)?)\s*cm$
```

Named groups are the notches. They say: this part is the name, this part is the number, and they have to line up in this order.

## And then, in Rust

Rust has a third kind of pattern matching, the structural kind, and it's the one that made the whole metaphor click for me.

```rust
enum Piece {
    Front { darts: u8 },
    Back { centre_seam: bool },
    Sleeve { two_piece: bool },
}

fn cutting_note(p: &Piece) -> &'static str {
    match p {
        Piece::Front { darts: 0 } => "cut on fold, no darts",
        Piece::Front { .. } => "mark darts before cutting",
        Piece::Back { centre_seam: true } => "cut two, add allowance at CB",
        Piece::Back { .. } => "cut on fold",
        Piece::Sleeve { two_piece: true } => "cut upper and under separately",
        Piece::Sleeve { .. } => "cut two, mirror image",
    }
}
```

The compiler insists that every piece is handled. Forget the sleeve and it refuses to build. I'd love a cutting table that did that.

## What the two crafts share

- **A template is a set of constraints.** Paper or regex, it defines what fits and what doesn't.
- **Landmarks matter more than outlines.** Notches and capture groups are where alignment actually happens.
- **Exhaustiveness saves you.** A missing pattern piece and a missing match arm cause the same kind of late-night panic.

> A pattern isn't the thing. It's the agreement about where the thing should line up.

I still can't write a regex without testing it five times. I still can't match plaid without pinning every notch. Same weakness, two crafts. At least I'm consistent.

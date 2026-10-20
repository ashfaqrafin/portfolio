---
title: "Shipping code by day, tailoring the architecture by night"
excerpt: "Software and tailoring are both about fitting structure to a body that keeps moving. I finally stopped keeping them in separate drawers."
date: 2026-07-01
readMins: 4
topic: unified
tags: [career, craft, architecture, tailoring]
featured: true
status: published
connectsTo:
  - slug: pattern-matching-literally
    kind: builds-on
  - slug: silhouette-is-a-type-system
    kind: builds-on
  - slug: kernel-panics-are-just-torn-seams
    kind: builds-on
---

For a long time I kept my two crafts in separate rooms. Code during the day, cloth at night, and never the twain shall meet. It felt tidy. It was also slightly dishonest, because the same brain was doing both.

This piece is where I stop pretending. The habits I've built at the cutting table shape how I build software, and the other way round.

<!--more-->

## Architecture is a pattern, not a garment

When people talk about software architecture, they often mean the finished thing: the services, the boxes, the arrows. But the useful part of architecture is closer to a pattern. It's the set of shapes that everything else gets cut from.

A good block pattern doesn't dictate the final jacket. It makes a hundred jackets possible, all of them fitting. A good architecture does the same: it constrains the right things and leaves the rest open.

The questions I ask of both:

- **Where is the body going to move?** That's where you need ease, flexibility, room to change.
- **Where must it hold its shape?** That's where you need structure, canvas, strict types.
- **What will need altering later?** That's where you leave generous seam allowances.

## Seam allowances are future-proofing

Bespoke tailors leave extra cloth inside seams so a garment can be let out years later. You can't see it. It costs a little cloth now. It saves the whole jacket when the body changes.

In code, a seam allowance is a boundary where change is cheap: an interface instead of a concrete type, a config value instead of a hard-coded one.

```ts
// Tight seam: no room to let out
function price(item: Item) {
  return item.base * 1.2;
}

// Allowance left in the seam
function price(item: Item, rate = defaultRate) {
  return item.base * (1 + rate);
}
```

It's not about predicting the future. It's about making the likely alterations cheap and the unlikely ones still possible.

## Fitting is iterative, so is shipping

No tailor gets a fit right on the first try. There's a toile, a first fitting, a second fitting, adjustments in between. Each fitting reveals something the measurements couldn't.

Shipping is the same loop. Release something real, watch how it moves on actual users, take it in here, let it out there. The work isn't failing when it needs adjusting. That's the work.

> You can't fit a garment on a hanger. You can't fit software in a spec.

## Hand-finishing still matters

There's a temptation, in both crafts, to treat the visible surface as the whole job. Machine-stitch everything, fuse the front, ship it. Often that's the right call. Not every garment needs to be bespoke, and not every feature needs to be hand-built.

But the parts people touch most deserve the slow treatment. The buttonhole that gets used daily. The lapel that frames the face. In software, that's the interaction someone repeats a hundred times a week, or the error message they read when they're already frustrated.

Knowing where to spend the handwork is most of the skill.

---

So yes, I ship code by day. And at night I tailor, which is mostly the same job with sharper tools and fewer meetings.

What changed is that I stopped seeing the night craft as a hobby that distracts from the real one. It's where I learned to respect structure, to leave room for change, to read a failure for what it's telling me. Those are architecture skills. I just learned them with a needle first.

If you have a craft you think is unrelated to your job, I'd gently suggest it isn't. You're probably already using it. You just haven't given it credit.

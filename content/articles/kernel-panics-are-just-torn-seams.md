---
title: "Kernel panics are just torn seams"
excerpt: "When a seam rips, the fabric isn't the problem; the stress is. Turns out that's true of crashing systems too."
date: 2026-04-03
readMins: 3
topic: unified
tags: [debugging, linux, seams, failure]
featured: false
status: published
connectsTo:
  - slug: what-lapels-taught-me-about-edge-cases
    kind: builds-on
---

The first time my machine hit a kernel panic, I stared at a wall of text and felt the exact same thing I felt the first time a seam split while I was trying something on: betrayal, then curiosity.

A seam doesn't tear at random. Neither does a system. Both fail where the stress concentrates.

<!--more-->

## Reading the tear

When a seam gives way, the first thing I do isn't sew it back up. I look at it.

- **Did the thread break, or did the fabric pull away?** Broken thread means the stitch was too weak. Fabric pulling away means the seam allowance was too narrow or the stitches too close to the edge.
- **Where exactly did it go?** The crotch seam, the back armhole, the knee. These are high-stress points for a reason.
- **What was I doing?** Sitting, reaching, squatting. The movement is the reproduction case.

Debugging a crash is the same discipline. Don't patch it until you know *why*.

## The logs are the torn edge

After a crash, the system usually leaves evidence. On a lot of Linux setups, the previous boot's kernel messages are one command away.

```sh
# Kernel messages from the previous boot, errors and worse
journalctl -k -b -1 -p err

# Narrow it to the last moments before it went down
journalctl -k -b -1 | tail -n 50
```

Most of the time the culprit is boring: a driver, a module, memory, heat. The trace points at the call that couldn't continue, the same way a ripped seam points at the stitch that let go first.

## Stress, not weakness

Here's the lesson that changed how I think about both crafts. A seam that tears is often perfectly well sewn. It just wasn't designed for the load it got.

That's why trousers get reinforced with a second line of stitching at the crotch. That's why tailors leave generous allowances in places that might need letting out later. You build extra capacity where you expect stress.

> Fix the stitch and it tears again. Fix the stress and it holds.

On a computer, that might mean the problem isn't the program that crashed. It's the thing hammering memory beside it, or the hardware running hotter than it should.

## Mending well

Once I know the cause, the repair is usually small:

1. Unpick a little past the damage, so I'm sewing into sound cloth.
2. Restitch with a shorter stitch length, or add a reinforcing line.
3. Test it the way it broke. Squat in the trousers. Reproduce the load.

The computer version is identical, just with fewer pins: isolate, change one thing, reproduce the condition, confirm it holds.

Neither failure is fun. But both are honest. A torn seam and a panicked kernel are each telling you exactly where the design met reality and lost.

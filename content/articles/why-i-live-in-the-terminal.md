---
title: "Why I live in the terminal"
excerpt: "Not because it's faster (sometimes it is), but because a blinking cursor is the closest thing a computer has to a sewing bench."
date: 2026-02-25
readMins: 3
topic: linux
tags: [terminal, workflow, linux, cli]
featured: false
status: published
---

People assume I use the terminal to look clever. That was maybe true at the start. Now I use it because everything else feels like working with oven gloves on.

This isn't a "GUIs are bad" post. It's about why a text prompt fits the way my brain wants to work.

<!--more-->

## Everything is text, so everything connects

The core idea of the [Unix philosophy](https://en.wikipedia.org/wiki/Unix_philosophy) is small tools that do one job and pass text to each other. Once that clicks, the terminal stops being a list of commands and becomes a workbench.

Want every TODO in a project, sorted by how often each file has them?

```sh
grep -rn "TODO" src/ \
  | cut -d: -f1 \
  | sort \
  | uniq -c \
  | sort -rn
```

Five tools, none of which know about the others. That's the same pleasure as a good set of hand tools: the awl doesn't know about the thimble, but together they get the job done.

## Repeatable by default

When I do something in a GUI, it's gone. If I need to do it again next week, I have to remember the clicks.

In the terminal, the thing I did is in my history. If I do it a third time, it becomes an alias. A fifth time, a script. The workflow writes its own documentation as a side effect.

```sh
# Find that ffmpeg incantation from last month
history | grep ffmpeg
```

It's like keeping a pattern instead of cutting freehand every time. The first one is slow. Every copy after that is cheap.

## Fewer distractions, more focus

A terminal doesn't have notifications, sidebars, or a badge telling me I have unread opinions. It has a cursor, waiting.

I've found I think more clearly there. When I'm debugging, I'm looking at logs and output, not at a dashboard that's decided what I should care about.

> A blinking cursor asks one question: what next? I find that oddly calming.

## The honest downsides

It's not all serene.

- **The learning curve is real.** I spent a while typing commands I didn't understand, copied from places I didn't trust.
- **Discoverability is poor.** If you don't know a tool exists, the terminal won't tell you.
- **Some things are just visual.** I'm not editing images or laying out a page with `sed`, and I've stopped pretending I should.

So I live in the terminal the way I live in a favourite jacket. It's not the right thing for every occasion. But it's what I reach for first, and it fits better every year I wear it.

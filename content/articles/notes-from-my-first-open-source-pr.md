---
title: "Notes from my first open-source PR"
excerpt: "I rewrote a three-line change eleven times before submitting it. A short field report on nerves, git, and being kindly corrected."
date: 2026-06-15
readMins: 3
topic: linux
tags: [open-source, git, community, first-times]
featured: false
status: published
---

My first open-source pull request was tiny. A small fix to some documentation and one line of code. It took me longer to submit than anything I've ever sewn.

Here's what that felt like, and what I'd tell anyone sitting on their own first one.

<!--more-->

## The fear is bigger than the change

I read the contributing guide three times. I read old pull requests to see how people wrote their descriptions. I convinced myself the maintainers would read my change and quietly close their laptops in despair.

None of that happened. But I think the fear is normal, and it's worth naming. Putting work in front of strangers is uncomfortable, whether it's a seam or a diff.

## The mechanics, demystified

The process turned out to be far less mysterious than I'd built it up to be:

```sh
# Fork on the web, then
git clone <your-fork-url>
cd project
git checkout -b fix-typo-in-install-docs

# make the change, then
git add -p
git commit -m "docs: fix typo in install instructions"
git push -u origin fix-typo-in-install-docs
```

`git add -p` was the revelation for me. It walks through each change and asks if you want it. It's like checking every stitch before pressing a seam: slower, but nothing slips through that you didn't mean.

## What I got wrong

Plenty, all of it fixable:

- **I didn't run the project's tests first.** A check failed on something unrelated to my change, and I panicked before realising it wasn't mine.
- **My commit message didn't follow their style.** It was pointed out kindly, and I amended it.
- **I over-explained.** My description was longer than the diff. Brevity is a kindness to reviewers.

The fixes involved a force push to my own branch, which felt illegal the first time.

```sh
git commit --amend
git push --force-with-lease
```

`--force-with-lease` refuses to overwrite work you haven't seen, which is exactly the kind of guardrail a nervous person needs.

## Being reviewed

The review was short and kind. A suggestion, a question, an approval. It felt a lot like having a more experienced tailor look over a toile: not judgement, just another pair of eyes on the grain line.

> Review isn't a verdict on you. It's a fitting.

I've since learned that maintainers are mostly just glad someone showed up. A small, careful contribution is a gift, not an imposition.

---

Pick something small. Read the guide. Run the tests. Write a short description. Then press the button before you talk yourself out of it. The worst case is a friendly "not quite," and that's how everyone learns to sew.

---
title: "Ricing my dotfiles, part 2: automate everything"
excerpt: "I spent an afternoon automating a task that takes five minutes. Twice now, it's paid for itself. Mostly in smugness."
date: 2026-03-30
readMins: 3
topic: linux
tags: [dotfiles, ricing, automation, linux]
featured: false
status: published
connectsTo:
  - slug: ricing-my-dotfiles-part-1-the-skeleton
    kind: series
    note: "part 2"
---

Part 1 built the skeleton: one directory, one package per tool, symlinks instead of copies. It works, but I was still linking files by hand like some kind of medieval scribe.

This part is about writing one script that turns a fresh machine into my machine.

<!--more-->

## The install script

The goal is idempotence: run it once or run it ten times, the result is the same. No duplicated lines, no errors because a link already exists.

```sh
#!/usr/bin/env sh
set -eu

DOTFILES="$(cd "$(dirname "$0")" && pwd)"

link() {
  src="$DOTFILES/$1"
  dest="$HOME/$2"
  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    mv "$dest" "$dest.backup"
    echo "backed up $dest"
  fi
  ln -sfn "$src" "$dest"
  echo "linked $2"
}

link zsh/.zshrc        .zshrc
link zsh/.zsh          .zsh
link git/.gitconfig    .gitconfig
link config/.config/nvim .config/nvim
```

`set -eu` stops the script on the first error or unset variable, which has saved me from at least one very creative `rm`. The backup step means I never silently destroy a config I forgot I had.

## Packages as a list

The tools themselves are just a list in a plain text file. The script reads it and installs whatever's missing.

```sh
# packages.txt: one per line, comments allowed
grep -v '^\s*#' packages.txt | grep -v '^\s*$' | while read -r pkg; do
  command -v "$pkg" >/dev/null 2>&1 || echo "missing: $pkg"
done
```

I keep the actual install command separate per distribution, because pretending every package manager is the same is a lie I'm not ready to tell.

## Small automations that add up

Beyond the big script, the most useful automation is a handful of tiny functions that remove friction I'd stopped noticing.

```zsh
# Make a directory and step into it
mkcd() { mkdir -p "$1" && cd "$1"; }

# Jump to the dotfiles repo and show what changed
dots() { cd ~/dotfiles && git status -sb; }
```

None of these are impressive. That's sort of the point. Like a well-placed pocket, you only notice it when it isn't there.

## When to stop automating

There's a trap here. I can spend hours automating a task I do once a year. A rough rule I use now:

1. Do it by hand the first time and write down the steps.
2. Do it by hand the second time and notice what was annoying.
3. Automate it the third time, and only the annoying parts.

> Automate the friction, not the task.

My dotfiles still aren't finished. They never will be. But a fresh install now takes a single command and a cup of tea, and that feels like a garment finally fitting.

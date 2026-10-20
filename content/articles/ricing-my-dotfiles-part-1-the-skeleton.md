---
title: "Ricing my dotfiles, part 1: the skeleton"
excerpt: "Before the colour schemes and the fancy prompt, there's a boring directory structure. This is that boring directory structure, lovingly."
date: 2026-03-12
readMins: 3
topic: linux
tags: [dotfiles, ricing, linux, terminal]
featured: false
status: published
connectsTo:
  - slug: why-i-live-in-the-terminal
    kind: builds-on
---

"Ricing" is the art of making your Linux setup look and feel exactly how you want, usually with more effort than is justified. I love it. I also spent too long making things pretty before making them organised.

So this series starts where a jacket starts: the internal structure nobody sees.

<!--more-->

## The problem with scattered config

Out of the box, config lives everywhere. Some in `~/.config`, some as dotfiles in your home directory, some in places only the original author could explain. It works until you get a new machine and realise you have no idea what you changed.

I wanted three things:

- One directory I could put under version control.
- A predictable place for every tool's config.
- A way to get it all onto a fresh system without hand-copying.

## The skeleton

Here's the shape I settled on. It mirrors where files actually end up, which makes it easy to reason about.

```sh
~/dotfiles/
├── zsh/
│   ├── .zshrc
│   └── .zsh/
│       ├── aliases.zsh
│       ├── exports.zsh
│       └── functions.zsh
├── git/
│   └── .gitconfig
├── config/
│   └── .config/
│       ├── nvim/
│       └── terminal/
├── bin/
│   └── .local/bin/
└── install.sh
```

Each top-level folder is a "package." Inside it, the paths match what they'd be relative to `$HOME`. That convention is the whole trick: the structure is the documentation.

## Linking, not copying

Copying files means two versions that drift apart. Symlinks mean the file in `~/dotfiles` *is* the file in use.

```sh
# Link one file by hand
ln -sf ~/dotfiles/zsh/.zshrc ~/.zshrc

# Check it's a link, not a copy
ls -l ~/.zshrc
```

Edit the config anywhere, and the change shows up in the repo, ready to commit. It's a bit like basting: temporary-looking stitches that hold everything exactly where it should be.

## Splitting the shell config

A single giant `.zshrc` is the dotfile equivalent of an unlined coat with every pocket sewn onto the front. I split mine into small files and source them in order.

```zsh
# ~/.zshrc
for f in ~/.zsh/{exports,aliases,functions}.zsh; do
  [[ -r $f ]] && source "$f"
done
```

The `[[ -r $f ]]` check means a missing file doesn't break the shell. Edge cases first, as the lapels taught me.

---

That's the skeleton. No colours, no icons, nothing screenshot-worthy. But it means everything in part 2 has somewhere sensible to live, and I can stop being afraid of a fresh install.

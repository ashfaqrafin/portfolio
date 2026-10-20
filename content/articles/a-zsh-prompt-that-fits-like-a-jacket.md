---
title: "A zsh prompt that fits like a jacket"
excerpt: "A prompt should show what you need and nothing else, like a jacket cut close enough to move in but not so close it argues with you."
date: 2026-04-20
readMins: 3
topic: linux
tags: [zsh, prompt, dotfiles, terminal]
featured: false
status: published
connectsTo:
  - slug: ricing-my-dotfiles-part-2-automate-everything
    kind: builds-on
---

I've had prompts that looked like airport departure boards. Battery, time, weather, the current phase of the moon. Every one of them was impressive for a day and exhausting after a week.

My current prompt is small, fast, and hand-cut. Here's how I got there.

<!--more-->

## What a prompt actually needs to say

I asked myself what I glance at the prompt *for*, and the honest answer was short:

- Where am I? (the directory)
- Am I in a git repo, and on what branch?
- Did the last command fail?

Everything else was ornament. Ornament is fine on a jacket lining. It doesn't belong on the lapel.

## Building it by hand

zsh has everything needed built in. `vcs_info` handles the git part, and prompt escapes handle the rest.

```zsh
autoload -Uz vcs_info
zstyle ':vcs_info:git:*' formats ' %F{magenta}%b%f'
zstyle ':vcs_info:*' enable git

precmd() { vcs_info }

setopt PROMPT_SUBST
PROMPT='%F{blue}%~%f${vcs_info_msg_0_} %(?.%F{green}.%F{red})>%f '
```

Reading that left to right: the current directory in blue, the branch in magenta if there is one, then a `>` that's green when the last command succeeded and red when it didn't. The `%(?.a.b)` part is a tiny conditional, and it's my favourite bit of syntax in the whole shell.

## Trimming the path

Deep directories make the prompt sprawl. Instead of the full path, I show just the last couple of segments.

```zsh
PROMPT='%F{blue}%2~%f${vcs_info_msg_0_} %(?.%F{green}.%F{red})>%f '
```

`%2~` keeps the last two components and still collapses home to `~`. It's the prompt equivalent of taking in a waist: same garment, less excess.

A prompt that takes a moment to appear feels like a jacket that catches at the shoulder. You notice it every single time.

`vcs_info` is quick enough for most repos. If I ever need more, the next step is to only check git status when the directory changes, not before every line.

> If you can feel your prompt, it's too heavy.

## The right side

zsh has `RPROMPT`, which sits on the right edge and gets out of the way when you type a long command. I use it for one thing: how long the last command took, and only if it was slow.

```zsh
preexec() { cmd_start=$SECONDS }
precmd() {
  vcs_info
  local d=$(( SECONDS - ${cmd_start:-$SECONDS} ))
  (( d > 3 )) && RPROMPT="%F{yellow}${d}s%f" || RPROMPT=''
  unset cmd_start
}
```

Most of the time it's empty. When it shows up, it's worth reading.

That's the whole prompt. It's not flashy. It fits, and I've stopped wanting to change it, which is the highest compliment I can pay anything I've made.

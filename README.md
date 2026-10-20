# Ashfaq — portfolio

A tailor's-sketchbook portfolio built with Next.js 16 (App Router, Cache Components).

- **Intro** (`app/components/intro/`): a short story told by one thread: four lines (the hero's four stages), a loop and a label under each, then the thread is pulled taut and the paper lifts onto the hero. First visit per session only; skippable; never for deep links or reduced motion.
- **Hero** (`app/components/hero/`): a four-stage, thread-and-cloth identity animation.
- **Thread Board blog** (`app/components/threadboard/`, `lib/blog/`): articles are pins tied together by threads. Clicking a pin opens a quick read; the full article lives at `/blog/<slug>`.
- **Studio** (`/studio`): owner-only. Write, import `.md` files, draft, publish and delete. Only one GitHub account can sign in.
- **Projects sketchbook** (`app/components/projects/`, `content/projects/`): a spiral-bound pad with one project per page; each logo draws itself in pencil, then the details are written in. See [docs/projects.md](docs/projects.md).
- **Chapter seams** (`app/components/site/ChapterSeam.tsx`): the scroll-drawn thread that carries the reader from one home-page section to the next.

```bash
cp .env.example .env.local   # fill in AUTH_SECRET, GitHub OAuth, OWNER_GITHUB_ID
npm run dev
```

For setup, storage (Markdown files locally, Postgres in production), tests and deployment, see [docs/blog.md](docs/blog.md).

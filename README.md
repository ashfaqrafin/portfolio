# Ashfaq — portfolio

A tailor's-sketchbook portfolio built with Next.js 16 (App Router, Cache Components).

- **Intro** (`app/components/intro/`): one thread and one terminal. A cream terminal types a command, and a burgundy thread runs off a spool, through the window's frame, and writes the quote in the site's handwriting, stroke by stroke; it rests long enough to read, then the page lifts onto the hero. About 4.6 s. The strokes are traced from the Caveat font by `npm run intro:quote` (change the quote in `scripts/intro-quote.mjs`). First visit per session only; skippable; never for deep links or reduced motion.
- **Hero** (`app/components/hero/`): a four-stage, thread-and-cloth identity animation.
- **Thread Board blog** (`app/components/threadboard/`, `lib/blog/`): articles are pins tied together by threads. Clicking a pin opens a quick read; the full article lives at `/blog/<slug>`.
- **Education** (`app/components/study/`): a plate from an astronomy notebook. Me, as a still illustration on the page (my own colours toned to the paper, inked contours, a few hatched strokes in the folds), with a halo of dust hugging my outline, motes circling me and dust rising off me, all drawn towards whichever subject is pointed at, with my three subjects orbiting as balls of particles (three.js, `orbit.ts`) on a pencilled, tilted ring seen in perspective: they swell coming round the front and fade behind, hurry through the near side, spin with their subject's mark inked on, shed dust and cast hatched shadows on the floor. Each tows a tailor's tag with its question ("Why economics?"); pulling it, or clicking the ball, floats up a small window with the answer, tied to its ball. The questions and answers are in `answers.ts`; the avatar is cut out of `design/education/education.png` by `npm run education:art`. With reduced motion the balls hold still.
- **Studio** (`/studio`): owner-only. Write, import `.md` files, draft, publish and delete. Only one GitHub account can sign in.
- **Projects sketchbook** (`app/components/projects/`, `content/projects/`): a spiral-bound pad with one project per page; each logo draws itself in pencil, then the details are written in. See [docs/projects.md](docs/projects.md).
- **Contact** (`app/components/contact/`, `app/api/contact/`): a transmission pipeline scene where the tailor weaves the visitor's words into a packet, the coder breaks the errors blocking the route, and the dakpion runs it to the post box, all while it really sends; messages land in an owner-only studio inbox. See [docs/contact.md](docs/contact.md).
- **Chapter seams** (`app/components/site/ChapterSeam.tsx`): the scroll-drawn thread that carries the reader from one home-page section to the next.

```bash
cp .env.example .env.local   # fill in AUTH_SECRET, GitHub OAuth, OWNER_GITHUB_ID
npm run dev
```

To deploy (Vercel + Supabase) and write on the live site, see [docs/deploy.md](docs/deploy.md). For setup, storage (Markdown files locally, Postgres in production), tests and deployment, see [docs/blog.md](docs/blog.md).

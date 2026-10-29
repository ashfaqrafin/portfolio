# Ashfaq — portfolio

A tailor's-sketchbook portfolio built with Next.js 16 (App Router, Cache Components).

- **Intro** (`app/components/intro/`): the home page opens under a length of burgundy linen. A soft light passes over its folds, then the cloth is taken by a corner (the top right, or the one nearest your click) and drawn off along the diagonal, sliding after it in long folds, to unveil the site. The photo is mapped onto a simulated cloth in WebGL (`drape.ts`: a verlet grid with shear and bending, tethered so it doesn't stretch, lit by its own normals over the photo's light), served as `/intro.js` and loaded async so it starts before React; until it is live the same photo stands in as a CSS background. About 3 s. First visit per session only; skippable (even before the scripts load); never for deep links or reduced motion. The photo is `design/intro/fabric.png`, made web-sized by `npm run intro:art`.
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

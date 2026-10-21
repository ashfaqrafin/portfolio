# The Thread Board blog

Articles are pins on a thread board. Related pieces are tied together by threads, and unrelated ones hang loose. Clicking a pin opens a quick-read popup, and from there a reader can open the full article. Anyone can read. Only one GitHub account can publish.

## Where things are

| Path | What it is |
| --- | --- |
| `/` (below the hero) and `/blog` | The board. It also has a list view, and it works without JavaScript because every pin is a real link |
| `/blog/<slug>` | The full article. A direct visit, a refresh or a shared link always shows the full page |
| `app/@modal/(.)blog/[slug]` | The quick-read popup. It only appears when you click a pin inside the app |
| `/signin`, `/studio`, `/studio/new`, `/studio/import`, `/studio/<slug>`, `/studio/inbox` | Owner-only publishing and the contact inbox. The public site never links here |
| `lib/blog/` | Framework-agnostic rules: thread graph (`graph.ts`), deterministic layout (`layout.ts`), quick read, schema |
| `app/components/threadboard/` | The board, the reader popup and Markdown rendering (plain CSS under `.tb` and `.tbr`) |
| `lib/store/` | Storage behind one `ArticleStore` interface. `index.ts` picks Postgres when `DATABASE_URL` is set and the Markdown files in `content/articles/` otherwise |

## How threads are decided

- **`connectsTo` with `kind: series`:** a thick thread (the piece continues another).
- **`connectsTo` with `kind: builds-on`:** a solid thread.
- **Automatic topic thread:** a dashed thread, added when two articles share at least two tags or have a tag Jaccard similarity of 0.30 or more. Each article gets at most three.
- **Explicit wins:** an explicit thread always replaces an automatic one between the same two articles.
- **Loose:** an article with no threads gets a dangling one.

The studio's **Thread preview** applies these same rules while you type.

## A big archive: sheets

The board stays readable however many articles there are:
- **Up to 20 articles** share one board.
- **Beyond that**, the archive is split into **sheets** of about 16 each (newest first, sizes balanced to within one), and folder tabs above the board flip between them, oldest on the left like the board's own time axis. `SHEET_MAX` and `SHEET_TARGET` are in `lib/blog/sheets.ts`.
- **Threads are still worked out across the whole archive.** A thread whose other end is on another sheet runs off the pin with an arrowhead, and the date tape's ends become links ("← continues on Mar – Oct 2025").
- **Search, the topic filters, the counts and the list view always cover every article.** When a search matches articles on other sheets, a line under the board says how many and where; clicking it flips to that sheet, pans to the first match and focuses it.
- **Pins never shrink past a readable size.** A sheet wider than the screen opens on its newest end and is dragged sideways ("← drag for older pins").
- **Layout:** a crowded lane makes its sheet longer instead of stacking pins, so pins never overlap or leave their lane.
- **What loads when:** the page carries the newest sheet plus a light index of every article (about 250 bytes per article, gzipped). Other sheets come from `GET /api/board/<n>` on demand, prefetched when a tab is hovered or focused, and cached under the same `articles` tag, so publishing refreshes them.

Tested with 107 articles (seven sheets): the end-to-end suite passes on that archive too.

## Writing

- **In the studio** (works in production): sign in at `/studio`, write in Markdown, tick the explicit threads, choose Draft or Published, then save. Saving refreshes the board and the article page straight away.
- **By upload** (works in production): `/studio/import` takes up to 10 `.md` files at once. Frontmatter is optional:
  - The slug comes from the file name and the title from the first `# heading`.
  - The topic and status you pick on the form fill in anything missing; the status defaults to Draft so you can review first.
  - Existing slugs are skipped unless you tick "replace".
  - Each file goes through the same validation as the editor, and the page reports what happened to each one.
- **As files** (local development only): add `content/articles/<slug>.md` with frontmatter like the existing files. The dev server caches reads, so restart it after editing a file by hand.
- **Quick read:** everything before a line containing only `<!--more-->`, or the first two paragraphs if there is no marker.
- **No raw HTML:** it is ignored, and unsafe link schemes are stripped.

The 17 published articles and one draft in `content/articles/` are placeholders. Replace them with real posts.

## Local setup

```bash
cp .env.example .env.local      # then fill it in (see below)
npm run dev
```

1. **GitHub OAuth app** (one for development, one for production): GitHub, then Settings, Developer settings, OAuth Apps, New.
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
   - Put the client id and secret in `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
2. **`AUTH_SECRET`:** generate one with `npx auth secret`.
3. **`OWNER_GITHUB_ID`:** the numeric id from `curl https://api.github.com/users/<you>`. Never use a username. If this value is missing, nobody can sign in.

## Verification

```bash
npm run check:guards     # every server action begins with requireOwner()
npm run test:rule        # the owner rule fails closed
npm run test:unit        # graph, layout, quick read, schema
npm run build
npm start &              # a production build, in another shell:
npm run test:e2e         # 46 checks: reading flow, board sheets, drafts, access, owner flow, uploads, replay attacks, the intro, the projects sketchbook, the contact form and inbox
```

`test:e2e` reads `AUTH_SECRET` and `OWNER_GITHUB_ID` from `.env.local` (or the environment) and mints fresh session cookies through `scripts/mint-session.mjs`. Set `BASE_URL` if the server isn't on port 3000, and `DATABASE_URL` when the server runs on Postgres.

## Production (Vercel + Postgres)

1. Create a Postgres database (Neon, Supabase or Vercel Postgres) and set `DATABASE_URL` (server-only).
2. Create the table and copy the Markdown articles into it:
   - `DATABASE_URL=... npm run db:migrate`
   - `DATABASE_URL=... npm run db:seed` (existing rows are kept; pass `-- --overwrite` to replace them)
3. Set `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `OWNER_GITHUB_ID` and `DATABASE_URL` for **Production** only. Preview deployments get no owner variables.
4. Point the production OAuth app's callback at `https://YOUR-DOMAIN/api/auth/callback/github`.
5. Deploy, then run the smoke test:
   - Read an article through the popup and through the full page.
   - Open `/studio` signed out; it should redirect to `/signin`.
   - Sign in, publish a test article, and check its pin appears.
   - Delete the test article.

**Deployment checklist**

- [ ] Two-factor authentication (or a passkey) is on for the owner's GitHub account.
- [ ] Backups or point-in-time recovery are enabled on the database.
- [ ] No secret uses a `NEXT_PUBLIC_` prefix.
- [ ] The production `AUTH_SECRET` is never used for tests.
- [ ] Response headers include `nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy` (set in `next.config.ts`).

## Security model (three gates)

1. **`proxy.ts`:** sends anyone without an owner session from `/studio/*` to `/signin`.
2. **Each studio page:** calls `isOwner()` again and redirects if it fails.
3. **`await requireOwner()`:** the first statement of every server action. This is the gate that protects the data. Actions can be POSTed to any URL, so the e2e suite replays the owner's save request to `/blog` with no cookie, a stranger's session and a forged session, then runs a control replay with the owner's session.

Sessions are JWTs with an absolute lifetime of 8 hours. The session callback re-checks the numeric GitHub id on every request, so removing `OWNER_GITHUB_ID` locks everyone out immediately. Rotating `AUTH_SECRET` signs everyone out.

## Manual checks the suite can't do

- **Real sign-in:** sign in with the owner's GitHub account and publish an article.
- **Stranger rejected:** sign in with a second GitHub account; it should land back on `/signin` with an "exactly one author" message.
- **Touch:** on a phone, drag the board, pinch to zoom, tap a pin, and scroll the popup.
- **Keyboard only:**
  - Tab through the pins and open a popup with Enter.
  - Tab stays inside the popup, and Esc closes it.
  - Focus returns to the pin that opened it.
- **Reduced motion:** turn it on and check that the threads and the popup don't animate.

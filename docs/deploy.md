# Deploying: Vercel + Supabase

The site runs on Vercel. Articles and contact-form messages live in a Supabase Postgres database. Only you can write, after signing in with GitHub.

Vercel's disk is read-only, so in production every article must be in the database. The Markdown files in `content/articles/` are only used locally, and to seed the database once (step 3).

Project pages (`content/projects/`) stay as files in the repo; edit them and push to update.

## 1. Push the code to GitHub

```bash
git add -A
git commit -m "Ready to deploy"
git push origin feat/thread-board-blog
```

Then open a pull request into `master` and merge it. Vercel deploys `master` to production, and every other branch gets a preview URL.

## 2. Create the Supabase database

1. Go to [supabase.com](https://supabase.com) and create a **New project**.
   - **Region:** choose the one closest to where you'll host on Vercel (for example Singapore, `ap-southeast-1`).
   - **Database password:** save it in your password manager. You'll need it for the connection URLs.
2. Open the project, then click **Connect** (top bar) and copy two URLs, replacing `[YOUR-PASSWORD]` in each:

   | Name in Supabase | Port | Used for |
   | --- | --- | --- |
   | **Transaction pooler** | `6543` | The website on Vercel (`DATABASE_URL`) |
   | **Session pooler** | `5432` | Running the setup scripts from your laptop (step 3) |

   Add `?sslmode=require` to the end of both. The site already sets `prepare: false`, which the transaction pooler needs.

You don't need Supabase's project URL, its API keys (`NEXT_PUBLIC_SUPABASE_URL`, the publishable/anon key) or Supabase Auth. The site talks to the database directly from the server, and the connection URL is a server-only secret.

Supabase also publishes every table through its web Data API, which anyone holding the public key can call. Migration `0004_lock_data_api.sql` (applied by `npm run db:migrate`) turns on row-level security with no policies, so drafts and contact messages can't be read or written that way, while the site's own connection is unaffected. To close the API entirely, turn it off under **Project Settings → Data API**.

## 3. Create the tables and copy in your articles

From the project folder on your laptop, using the **session pooler** URL:

```bash
export DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require'
npm run db:migrate   # creates the articles and messages tables, and locks the Data API
npm run db:seed      # copies content/articles/*.md into the database
unset DATABASE_URL
```

Running `db:seed` again later is safe: it skips articles that are already there.

## 4. Create the GitHub sign-in app (production)

1. Go to GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
   - **Homepage URL:** `https://YOUR-DOMAIN`. Use the Vercel URL for now, for example `https://ashfaq-portfolio.vercel.app`.
   - **Authorization callback URL:** `https://YOUR-DOMAIN/api/auth/callback/github`
2. Copy the **Client ID**, then **Generate a new client secret** and copy it.

Keep a separate OAuth app for local development, with the callback `http://localhost:3000/api/auth/callback/github`.

## 5. Create the Vercel project

1. Go to [vercel.com](https://vercel.com), click **Add New → Project**, and import `ashfaqrafin/portfolio`.
2. The framework is detected as Next.js; leave the build settings as they are.
3. Before deploying, open **Environment Variables** and add the following, scoped to **Production**:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | the Supabase **transaction pooler** URL (port 6543) |
   | `AUTH_SECRET` | a new secret: run `npx auth secret` and copy the value. Never reuse the one in `.env.local` |
   | `AUTH_GITHUB_ID` | the OAuth app's client ID |
   | `AUTH_GITHUB_SECRET` | the OAuth app's client secret |
   | `OWNER_GITHUB_ID` | `82702762` (your numeric GitHub id) |
   | `RESEND_API_KEY` | optional: emails you about each contact message |
   | `CONTACT_NOTIFY_TO` | optional: `ashfaqkhanrafin@gmail.com` |

   Rules for these variables:
   - **No `NEXT_PUBLIC_` prefix**, on any of them.
   - **Not `AUTH_TRUST_HOST`:** Vercel handles that itself.
   - **Owner variables only for Production:** leave `OWNER_GITHUB_ID` and the GitHub variables out of **Preview**, so preview deployments can't be signed into.
4. Click **Deploy**.

## 6. Check it works

On the production URL:

- [ ] The home page, the thread board and an article all load.
- [ ] Opening `/studio` while signed out sends you to `/signin`.
- [ ] Signing in with your GitHub account lands you in the studio.
- [ ] **Writing works:** New article → write → **Published** → Save. The new pin appears on the board straight away.
- [ ] The contact form sends, and the message shows in **Studio → Inbox**.
- [ ] Signing in from a second GitHub account is refused.

## Writing on the live site

- **Sign in:** go to `https://YOUR-DOMAIN/studio` and sign in with GitHub. The site never links to the studio, so bookmark it.
- **Write anywhere:** once you've opened the studio, every public page in that browser shows a small toolbar in the bottom-left corner:
  - **✎ Write** starts a new article.
  - **Edit this** appears on an article's page and opens it in the studio.
  - **Studio** goes back to the studio.
- **Who sees the toolbar:** visitors never see it, and their browsers never check for it.
- **Session length:** sessions last 8 hours, then you sign in again.
- **In the studio:**
  - **New article:** write in Markdown, add tags, and tie threads to other articles.
  - **Draft or Published:** drafts stay private.
  - **Import .md:** upload up to 10 Markdown files at once.
  - **Inbox:** read and delete contact-form messages.
- **Saving updates the live site immediately.** Articles go to Supabase, so there's no redeploy and no git commit.

## Custom domain (optional)

1. In Vercel, go to **Settings → Domains** and add your domain, then follow the DNS instructions it shows.
2. In the GitHub OAuth app, change both URLs to the new domain.

## Notes

- **Local development stays as it is.** Without `DATABASE_URL` in `.env.local`, `npm run dev` uses the Markdown files. To work against Supabase locally, put the transaction pooler URL in `.env.local`.
- **Backups:** Supabase's free plan has no point-in-time recovery. Before writing a lot, either upgrade or export your articles now and then (Supabase → Database → Backups).
- **Free plans pause idle projects:** Supabase pauses a free project after a week without any requests. Keep it active, or restore it from the dashboard if the site starts failing to load articles.
- **Project pages and logos** are read from the repo at runtime. The build includes them (`outputFileTracingIncludes` in `next.config.ts`), so edit the files and push.

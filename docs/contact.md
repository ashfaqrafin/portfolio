# Contact: the transmission pipeline

Part IV of the home page. Until a message is sent, the section is only the form and its live airmail label: the cast takes no room. "Seal and send" folds the form away and unrolls a stage in its place (`app/components/contact/Pipeline.tsx`, `pipeline.css`). Each character walks on as their act begins and steps back into pencil when it ends, so by the end the whole route reads as one strip:

| Act | Who | What you see |
| --- | --- | --- |
| 1 · Packet weaving | the tailor | the start of your message flies onto his table as a note; he stitches a loop round it and it becomes a sealed, glowing packet |
| 2 · Path clearing | the coder | error blocks slam onto the route (`CORS_ERROR`, `KERNEL_PANIC`, `404_BLOCKAGE`, `TRANSMISSION_ERROR`); each command he types fires a green beam that shatters one, then "Path clear ✓" |
| 3 · Delivery sprint | the dakpion | the packet hops into his satchel and he runs for the post box, kicking up dust, for as long as the server takes to answer |
| 4 · Dakpion drop | the post box | the packet arcs into the slot and the box shudders; "Transmission received", with how I'll reply |

The drop only happens once the server has accepted the message; a thank-you and "Write another" then appear under the final frame. If it refuses, a "Returned to sender" stamp lands, then the form comes back with the reason and everything that was typed.

**On phones** the scene isn't shrunk: it's a camera that zooms in and follows whoever is working. **With reduced motion** each act shows its end state at once.

Visitors choose how to be answered: **Mail**, **WhatsApp** (a number with its country code) or a **Social link** (a profile on LinkedIn, GitHub, X, Instagram, Facebook, Behance, Dribbble, Threads or Bluesky, normalised to a clean https URL). The studio inbox turns each into a reply link (`mailto:`, `wa.me/…` or the profile).

## Where messages go

| | |
| --- | --- |
| Endpoint | `POST /api/contact` (`app/api/contact/route.ts`) |
| Storage | `lib/inbox/`: Postgres table `messages` when `DATABASE_URL` is set (`db/migrations/0002_messages.sql`, `0003_message_reply_via.sql`), JSON files in `.data/inbox/` otherwise (git-ignored, local only) |
| Reading them | `/studio/inbox`: owner-only, behind the same three gates as the rest of the studio. Deleting goes through `deleteMessage`, which starts with `await requireOwner()` |
| Email (optional) | One plain-text email per message, through [Resend](https://resend.com), if `RESEND_API_KEY` and `CONTACT_NOTIFY_TO` are set. `CONTACT_NOTIFY_FROM` sets the sender, and the default is Resend's test sender. An email reply goes straight back to the visitor |

The endpoint is a route handler on purpose, not a server action: every server action in the app is owner-only, and `scripts/check-owner-guards.mjs` still enforces that. The endpoint can only add a message to the inbox.

## What it refuses

- **Posts from other origins** (403), bodies over 8 KB (413), and anything that isn't JSON.
- **Invalid fields** (400, with a reason per field):
  - Messages must be 10–600 characters, and names at most 60.
  - Replies go by email, WhatsApp (8–15 digits) or a profile link on the allowed sites; anything else is refused, and queries or fragments in a link are dropped.
  - Unknown fields are rejected.
- **More than 5 messages per 10 minutes from one address** (429). The limit is kept in memory per server instance, keyed by a hash of the address, which is never stored.
- **Bots:** a filled-in hidden honeypot field, or a form sent within 2.5 s of appearing, gets an "ok" and nothing is stored.

## Setup

- **Production (Postgres):** run `DATABASE_URL=... npm run db:migrate` to create the `messages` table (and apply `0003`, which allows WhatsApp and social replies).
- **Email (optional):** set `RESEND_API_KEY` and `CONTACT_NOTIFY_TO` for production. Both are server-only, so never prefix them with `NEXT_PUBLIC_`.
- **Direct links:** the links under the form ("Rather skip the post?") are the `DIRECT` list at the top of `app/components/contact/Contact.tsx`. Only GitHub is filled in; add your email and LinkedIn there.

## The art

The four drawings come from `public/contact/contact1–4.svg`. `npm run contact:art` strips their baked-in backgrounds and renders small transparent WebPs (247 KB for all four, instead of 6.8 MB), which the scene uses. Re-run it after editing the SVGs.

## Testing

- **Unit:** `npm run test:unit` covers the schema, WhatsApp and social-link normalisation, and the rate limit.
- **End-to-end:** `npm run test:e2e` covers the endpoint's refusals, bots, inbox access for a visitor, a stranger and a forged session, a full send in the browser, and the owner reading and deleting.
- **Running end-to-end twice in a row:** each run sends two real messages. Because of the rate limit, restart the server after two runs within 10 minutes.

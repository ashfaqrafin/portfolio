# Contact: the transmission pipeline

Part IV of the home page. Four stations stand on one thread:
1. **The tailor** stitches your words into a packet.
2. **The coder** clears the path.
3. **The dakpion** (the postman) runs it over.
4. **The post box** takes it in.

Sending walks the packet along the route while the request is in flight. The last stop only happens once the server has really accepted the message. If it refuses, the packet comes back "returned to sender" with the reason, and the form keeps what was typed. A live airmail label fills in as the visitor types.

## Where messages go

| | |
| --- | --- |
| Endpoint | `POST /api/contact` (`app/api/contact/route.ts`) |
| Storage | `lib/inbox/`: Postgres table `messages` when `DATABASE_URL` is set (`db/migrations/0002_messages.sql`), JSON files in `.data/inbox/` otherwise (git-ignored, local only) |
| Reading them | `/studio/inbox`: owner-only, behind the same three gates as the rest of the studio. Deleting goes through `deleteMessage`, which starts with `await requireOwner()` |
| Email (optional) | One plain-text email per message, through [Resend](https://resend.com), if `RESEND_API_KEY` and `CONTACT_NOTIFY_TO` are set. `CONTACT_NOTIFY_FROM` sets the sender, and the default is Resend's test sender. An email reply goes straight back to the visitor |

The endpoint is a route handler on purpose, not a server action: every server action in the app is owner-only, and `scripts/check-owner-guards.mjs` still enforces that. The endpoint can only add a message to the inbox.

## What it refuses

- **Posts from other origins** (403), bodies over 8 KB (413), and anything that isn't JSON.
- **Invalid fields** (400, with a reason per field):
  - Messages must be 10–600 characters, and names at most 60.
  - Replies go by email or LinkedIn only. LinkedIn links are normalised to `https://www.linkedin.com/in/…`.
  - Unknown fields are rejected.
- **More than 5 messages per 10 minutes from one address** (429). The limit is kept in memory per server instance, keyed by a hash of the address, which is never stored.
- **Bots:** a filled-in hidden honeypot field, or a form sent within 2.5 s of appearing, gets an "ok" and nothing is stored.

## Setup

- **Production (Postgres):** run `DATABASE_URL=... npm run db:migrate` to create the `messages` table.
- **Email (optional):** set `RESEND_API_KEY` and `CONTACT_NOTIFY_TO` for production. Both are server-only, so never prefix them with `NEXT_PUBLIC_`.
- **Direct links:** the links under the form ("Rather skip the post?") are the `DIRECT` list at the top of `app/components/contact/Contact.tsx`. Only GitHub is filled in; add your email and LinkedIn there.

## The art

The four drawings come from `public/contact/contact1–4.svg`. `npm run contact:art` strips their baked-in backgrounds and renders small transparent WebPs (247 KB for all four, instead of 6.8 MB). Re-run it after editing the SVGs.

## Testing

- **Unit:** `npm run test:unit` covers the schema, LinkedIn normalisation and the rate limit.
- **End-to-end:** `npm run test:e2e` covers the endpoint's refusals, bots, inbox access for a visitor, a stranger and a forged session, a full send in the browser, and the owner reading and deleting.
- **Running end-to-end twice in a row:** each run sends two real messages. Because of the rate limit, restart the server after two runs within 10 minutes.

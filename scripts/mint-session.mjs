#!/usr/bin/env node
/* TEST HELPER ONLY. Mints an Auth.js session cookie signed with AUTH_SECRET so the
   end-to-end suite can exercise the real gates. Never run against production, and
   never with the production AUTH_SECRET.

   Usage: AUTH_SECRET=... OWNER_GITHUB_ID=... node scripts/mint-session.mjs owner|stranger|forged [hours]
   Prints the cookie value for `authjs.session-token`. Mint fresh tokens on every run:
   an expired token makes every denial pass for the wrong reason. */

import { encode } from "next-auth/jwt";

if (process.env.NODE_ENV === "production" && !process.env.ALLOW_TEST_SESSIONS) {
  console.error("mint-session: refusing to run with NODE_ENV=production");
  process.exit(1);
}

const [kind = "owner", hours = "4"] = process.argv.slice(2);
const secret = process.env.AUTH_SECRET;
const owner = process.env.OWNER_GITHUB_ID;
if (!secret || !owner) {
  console.error("mint-session: AUTH_SECRET and OWNER_GITHUB_ID are required");
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const claims = {
  owner: { githubId: owner, isOwner: true, name: "owner" },
  // a real GitHub user who is not the owner: a validly signed session with isOwner false
  stranger: { githubId: "1", isOwner: false, name: "stranger" },
  // a tampered flag: isOwner true but the wrong account (the session callback re-checks the id)
  forged: { githubId: "1", isOwner: true, name: "forged" },
}[kind];
if (!claims) {
  console.error(`mint-session: unknown kind "${kind}"`);
  process.exit(1);
}

const token = await encode({
  token: { sub: `test-${kind}`, ...claims, loginAt: now },
  secret,
  salt: "authjs.session-token",
  maxAge: Number(hours) * 3600,
});
process.stdout.write(token);

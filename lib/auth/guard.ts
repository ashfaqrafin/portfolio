import "server-only";
import { auth } from "@/auth";

/* Gates 2 and 3. Call `isOwner()` at the top of every studio page and
   `await requireOwner()` as the FIRST statement of every server action:
   actions can be invoked by POSTing to any URL, so middleware never sees them.
   scripts/check-owner-guards.mjs fails CI when an action skips it. */

export async function isOwner(): Promise<boolean> {
  try {
    const session = await auth();
    return session?.user?.isOwner === true;
  } catch {
    // a malformed or expired cookie is simply "not signed in", never an error page
    return false;
  }
}

export class NotOwnerError extends Error {
  constructor() {
    super("Not authorized");
    this.name = "NotOwnerError";
  }
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) throw new NotOwnerError();
}

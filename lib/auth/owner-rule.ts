/* The single rule for who may publish. Pure, so it can be unit-tested without Next.

   Identity is the numeric GitHub account id, never a username or email (both can
   change hands). It fails closed: a missing, empty or non-numeric OWNER_GITHUB_ID
   means nobody matches. */

const NUMERIC_ID = /^[1-9][0-9]{0,19}$/;

function normalise(v: unknown): string | null {
  if (typeof v === "number") return Number.isSafeInteger(v) && v > 0 ? String(v) : null;
  if (typeof v === "string") {
    const s = v.trim();
    return NUMERIC_ID.test(s) ? s : null;
  }
  return null;
}

export function isOwnerProfileId(profileId: unknown, ownerId: unknown): boolean {
  const owner = normalise(ownerId);
  if (owner === null) return false;
  const id = normalise(profileId);
  return id !== null && id === owner;
}

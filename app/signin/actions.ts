"use server";

import { signIn } from "@/auth";

/* Public by necessity: starting the GitHub flow is how the owner proves who they are.
   The signIn callback in auth.ts rejects every account but the owner's.
   (Allow-listed in scripts/check-owner-guards.mjs.) */
export async function signInWithGitHub(formData: FormData) {
  const raw = formData.get("callbackUrl");
  // only ever return into the studio: no open redirects
  const to = typeof raw === "string" && /^\/studio(\/[a-z0-9-]{1,80})?$/.test(raw) ? raw : "/studio";
  await signIn("github", { redirectTo: to });
}

import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import Masthead from "../components/site/Masthead";
import "../studio/studio.css";
import { signInWithGitHub } from "./actions";

export const metadata: Metadata = {
  title: "Sign in — Ashfaq",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, string> = {
  AccessDenied: "That GitHub account can’t publish here. This studio has exactly one author.",
  Configuration: "Sign-in isn’t configured on this server yet.",
};

async function SignInForm({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "/studio";
  // Auth.js passes an absolute URL; keep only its path (the action re-validates it)
  let path = "/studio";
  try {
    path = new URL(callbackUrl, "http://x").pathname;
  } catch {}
  return (
    <>
      {error && (
        <p className="st-alert" role="alert">
          {MESSAGES[error] ?? "Sign-in didn’t finish. Try again."}
        </p>
      )}
      <form action={signInWithGitHub}>
        <input type="hidden" name="callbackUrl" value={path} />
        <button type="submit" className="st-btn st-primary st-gh">
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          Sign in with GitHub
        </button>
      </form>
    </>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main className="page">
      <Masthead />
      <div className="sheet st-signin">
        <p className="st-kicker">The studio &middot; owner only</p>
        <h1 className="st-h1">Sign in</h1>
        <p className="st-lede">There&rsquo;s one author here. If that&rsquo;s you, GitHub will vouch for it.</p>
        <Suspense fallback={<div className="st-btn st-primary st-gh" aria-hidden="true">Sign in with GitHub</div>}>
          <SignInForm searchParams={searchParams} />
        </Suspense>
        <p className="st-fine">
          Just here to read? <Link href="/blog">The thread board</Link> is open to everyone.
        </p>
      </div>
    </main>
  );
}

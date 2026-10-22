import Link from "next/link";
import type { Metadata } from "next";
import { StudioMark } from "../components/site/OwnerBar";
import { signOutAction } from "./actions";
import "../components/site/site.css";
import "./studio.css";

export const metadata: Metadata = {
  title: "Studio — Ashfaq",
  robots: { index: false, follow: false },
};

/* Owner-only chrome. Not linked from the public site. Access is checked by
   proxy.ts, again by each page, and again inside every server action. */
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <main className="page st" data-no-cut>
      <StudioMark />
      <header className="st-bar">
        <Link className="st-mark" href="/studio">
          Ashfaq <span>studio</span>
        </Link>
        <nav className="st-nav" aria-label="Studio">
          <Link href="/studio">Articles</Link>
          <Link href="/studio/new">New article</Link>
          <Link href="/studio/import">Import .md</Link>
          <Link href="/studio/inbox">Inbox</Link>
          <Link href="/blog">View the board</Link>
          <form action={signOutAction}>
            <button type="submit" className="st-link">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      {children}
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* Writing shortcuts for the owner on the public site: Write, Edit this (on an
   article) and Studio. Visitors never see them, and never even ask: the check
   only runs in a browser that has opened the studio (StudioMark sets a hint),
   and the session itself is verified before anything shows. Every page stays
   fully static and cached; the links are added in the browser. The studio's
   own three gates protect everything behind them either way. */

const HINT = "owner-hint";
const HINT_MS = 8 * 60 * 60 * 1000; // the session's own lifetime (auth.ts)

/** called on studio pages: this browser belongs to the owner, for the next 8 hours */
export function StudioMark() {
  useEffect(() => {
    try {
      localStorage.setItem(HINT, String(Date.now() + HINT_MS));
    } catch {}
  }, []);
  return null;
}

export default function OwnerBar() {
  const pathname = usePathname();
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    let until = 0;
    try {
      until = Number(localStorage.getItem(HINT)) || 0;
    } catch {}
    if (until < Date.now()) return;
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { user?: { isOwner?: boolean } } | null) => {
        if (!alive) return;
        if (s?.user?.isOwner) setOwner(true);
        else {
          // signed out or expired: forget the hint, so this browser stops asking
          try {
            localStorage.removeItem(HINT);
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!owner || pathname.startsWith("/studio") || pathname.startsWith("/signin")) return null;
  const slug = /^\/blog\/([a-z0-9-]+)$/.exec(pathname)?.[1];
  return (
    <nav className="owner-bar" aria-label="Owner shortcuts">
      <Link href="/studio/new" className="owner-bar-main">
        <span aria-hidden="true">&#9998;</span> Write
      </Link>
      {slug && <Link href={`/studio/${slug}`}>Edit this</Link>}
      <Link href="/studio">Studio</Link>
    </nav>
  );
}

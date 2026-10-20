"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import type { BoardData } from "@/lib/blog/data";
import ThreadBoard from "../threadboard/ThreadBoard";

/* Next.js glue for the board: a pin click soft-navigates to /blog/<slug>, which the
   @modal slot intercepts into the quick-read popup while the board stays mounted. */
export default function BlogBoard({ board, headingLevel }: { board: BoardData; headingLevel?: 1 | 2 }) {
  const router = useRouter();
  const pathname = usePathname();
  const open = pathname.startsWith("/blog/") ? decodeURIComponent(pathname.slice("/blog/".length)) : null;
  const onOpen = useCallback((slug: string) => router.push(`/blog/${slug}`, { scroll: false }), [router]);
  const onIntent = useCallback((slug: string) => router.prefetch(`/blog/${slug}`), [router]);
  return <ThreadBoard board={board} onOpen={onOpen} onIntent={onIntent} openSlug={open} headingLevel={headingLevel} />;
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import type { RelatedRef } from "@/lib/blog/data";
import ReaderDialog, { type ReaderArticle } from "@/app/components/threadboard/ReaderDialog";

/* Closing goes back to the board; following a thread swaps the popup in place
   (replace, so history does not grow). A parallel slot keeps its last content when
   the new URL doesn't match it, so after "back" the popup must hide itself: it only
   renders while the URL is its own article. */
export default function QuickModal({
  article,
  relations,
  isWhole,
  children,
}: {
  article: ReaderArticle;
  relations: RelatedRef[];
  isWhole: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onClose = useCallback(() => router.back(), [router]);
  const onFollow = useCallback((slug: string) => router.replace(`/blog/${slug}`, { scroll: false }), [router]);
  if (pathname !== `/blog/${article.slug}`) return null;
  return (
    <ReaderDialog article={article} relations={relations} isWhole={isWhole} fullHref={`/blog/${article.slug}`} onClose={onClose} onFollow={onFollow}>
      {children}
    </ReaderDialog>
  );
}

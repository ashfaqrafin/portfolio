import { notFound } from "next/navigation";
import { getPublishedArticle, getPublishedSlugs } from "@/lib/blog/data";
import { quickIsWhole, quickRead } from "@/lib/blog/quickread";
import Markdown from "@/app/components/threadboard/Markdown";
import QuickModal from "./QuickModal";

/* The quick read, rendered on the server. Only reached by a soft navigation from
   inside the app; a direct visit to /blog/<slug> renders the full page instead. */

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "no-articles-yet" }];
}

export default async function QuickReadPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const data = await getPublishedArticle(slug);
  if (!data) notFound(); // drafts and unknown slugs

  const { article, relations } = data;
  return (
    <QuickModal
      article={{
        slug: article.slug,
        title: article.title,
        topic: article.topic,
        date: article.date,
        readMins: article.readMins,
        excerpt: article.excerpt,
      }}
      relations={relations.slice(0, 5)}
      isWhole={quickIsWhole(article.body)}
    >
      <Markdown source={quickRead(article.body)} />
    </QuickModal>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleView from "@/app/components/blog/ArticleView";
import Masthead from "@/app/components/site/Masthead";
import { getPublishedArticle, getPublishedSlugs } from "@/lib/blog/data";

/* The full article page: direct visits, refreshes, shared links and
   "Read the full article". Fully static, so an unknown or draft slug is a real 404. */

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: "no-articles-yet" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedArticle(slug);
  if (!data) return { title: "Not found — Ashfaq" };
  const a = data.article;
  return {
    title: `${a.title} — Ashfaq`,
    description: a.excerpt || undefined,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt || undefined,
      publishedTime: a.date,
      tags: a.tags,
      url: `/blog/${a.slug}`,
    },
    twitter: { card: "summary", title: a.title, description: a.excerpt || undefined },
  };
}

export default async function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const data = await getPublishedArticle(slug);
  if (!data) notFound();
  return (
    <main className="page">
      <Masthead current="article" />
      <ArticleView data={data} />
    </main>
  );
}

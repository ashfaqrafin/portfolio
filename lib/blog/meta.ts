import type { Article, ArticleMeta } from "./types";

/** an article without its body */
export function metaOf(a: Article): ArticleMeta {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    readMins: a.readMins,
    topic: a.topic,
    tags: a.tags,
    connectsTo: a.connectsTo,
    featured: a.featured,
    status: a.status,
  };
}

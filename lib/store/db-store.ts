import "server-only";
import { asc, eq } from "drizzle-orm";
import { isValidSlug } from "../blog/schema";
import type { Article, Status, Topic } from "../blog/types";
import { getDb } from "../db";
import { articles, type ArticleRow } from "../db/schema";
import type { ArticleStore } from "./types";

/* Postgres through Drizzle. Every query is parameterised by the query builder. */

function toArticle(r: ArticleRow): Article {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    date: r.date,
    readMins: r.readMins,
    topic: r.topic as Topic,
    tags: r.tags,
    connectsTo: r.connectsTo ?? [],
    featured: r.featured,
    status: r.status as Status,
    body: r.body,
  };
}

/** every column but the key */
function toRow(a: Article) {
  return {
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    readMins: a.readMins,
    topic: a.topic,
    tags: a.tags,
    connectsTo: a.connectsTo,
    featured: a.featured,
    status: a.status,
    body: a.body,
  };
}

export const dbStore: ArticleStore = {
  async list({ includeDrafts }) {
    const rows = await getDb()
      .select()
      .from(articles)
      .where(includeDrafts ? undefined : eq(articles.status, "published"))
      .orderBy(asc(articles.date), asc(articles.slug));
    return rows.map(toArticle);
  },
  async get(slug, { includeDrafts }) {
    if (!isValidSlug(slug)) return null;
    const [row] = await getDb().select().from(articles).where(eq(articles.slug, slug)).limit(1);
    if (!row || (!includeDrafts && row.status !== "published")) return null;
    return toArticle(row);
  },
  async upsert(a) {
    const row = toRow(a);
    await getDb()
      .insert(articles)
      .values({ slug: a.slug, ...row })
      .onConflictDoUpdate({ target: articles.slug, set: { ...row, updatedAt: new Date() } });
  },
  async remove(slug) {
    if (!isValidSlug(slug)) return;
    await getDb().delete(articles).where(eq(articles.slug, slug));
  },
};

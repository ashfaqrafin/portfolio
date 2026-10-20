import { parse, stringify } from "yaml";
import { articleSchema } from "../blog/schema.ts";
import type { Article } from "../blog/types";

/* Markdown-with-frontmatter codec for article files. No path handling here. */

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseArticleFile(slug: string, text: string): Article {
  const m = FRONT.exec(text);
  if (!m) throw new Error(`[store] ${slug}.md has no frontmatter`);
  const fm = (parse(m[1]) ?? {}) as Record<string, unknown>;
  const raw = {
    ...fm,
    slug,
    date: fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date,
    body: m[2].replace(/^\s*\n/, ""),
  };
  const res = articleSchema.safeParse(raw);
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`[store] ${slug}.md is invalid: ${issues}`);
  }
  return res.data as Article;
}

export function serializeArticle(a: Article): string {
  const fm: Record<string, unknown> = {
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    readMins: a.readMins,
    topic: a.topic,
    tags: a.tags,
    featured: a.featured,
    status: a.status,
  };
  if (a.connectsTo.length) {
    fm.connectsTo = a.connectsTo.map((c) => (c.note ? { slug: c.slug, kind: c.kind, note: c.note } : { slug: c.slug, kind: c.kind }));
  }
  const yaml = stringify(fm, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${a.body.trim()}\n`;
}

import "server-only";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isValidSlug } from "../blog/schema";
import type { Article } from "../blog/types";
import { parseArticleFile, serializeArticle } from "./markdown-file";
import type { ArticleStore } from "./types";

/* Markdown files in content/articles. Good for local development and self-hosting;
   a serverless host's disk is read-only, so use the database store there. */

const DIR = path.join(process.cwd(), "content", "articles");

/** the slug was validated by the schema already; check again before it touches the disk */
function fileFor(slug: string) {
  if (!isValidSlug(slug)) throw new Error("[store] invalid slug");
  const file = path.resolve(DIR, `${slug}.md`);
  if (path.dirname(file) !== DIR) throw new Error("[store] path escapes the articles directory");
  return file;
}

async function readAll(): Promise<Article[]> {
  let names: string[];
  try {
    names = await readdir(DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const slugs = names.filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)).filter(isValidSlug);
  return Promise.all(slugs.map(async (s) => parseArticleFile(s, await readFile(fileFor(s), "utf8"))));
}

const byDate = (a: Article, b: Article) => (a.date === b.date ? (a.slug < b.slug ? -1 : 1) : a.date < b.date ? -1 : 1);

export const fileStore: ArticleStore = {
  async list({ includeDrafts }) {
    const all = await readAll();
    return all.filter((a) => includeDrafts || a.status === "published").sort(byDate);
  },
  async get(slug, { includeDrafts }) {
    if (!isValidSlug(slug)) return null;
    let text: string;
    try {
      text = await readFile(fileFor(slug), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
    const a = parseArticleFile(slug, text);
    return includeDrafts || a.status === "published" ? a : null;
  },
  async upsert(article) {
    const file = fileFor(article.slug);
    await mkdir(DIR, { recursive: true });
    // write then rename, so a reader never sees half a file
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, serializeArticle(article), "utf8");
    await rename(tmp, file);
  },
  async remove(slug) {
    try {
      await unlink(fileFor(slug));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  },
};

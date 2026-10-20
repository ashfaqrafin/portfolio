import { parse } from "yaml";
import { suggestReadMins } from "./quickread.ts";
import { articleSchema } from "./schema.ts";
import { slugify } from "./slug.ts";
import type { Article, Status, Topic } from "./types";

/* Turns an uploaded Markdown file into an article. Lenient about what is missing
   (slug from the file name, title from the first "# heading", defaults for topic,
   status, date and read time) and strict about what is there: the result goes
   through the same schema as the editor. */

export { IMPORT_MAX_BYTES, IMPORT_MAX_FILES } from "./import-limits.ts";

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
const KNOWN = new Set(["slug", "title", "excerpt", "date", "readMins", "topic", "tags", "connectsTo", "featured", "status"]);

export type ImportDefaults = { topic: Topic; status: Status; today: string };
export type ParsedImport =
  | { ok: true; article: Article; ignored: string[] }
  | { ok: false; slug?: string; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseImport(filename: string, text: string, d: ImportDefaults): ParsedImport {
  let fm: Record<string, unknown> = {};
  let body = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const m = FRONT.exec(body);
  if (m) {
    let data: unknown;
    try {
      data = parse(m[1]);
    } catch {
      return { ok: false, error: "The frontmatter isn’t valid YAML." };
    }
    if (data != null && !isRecord(data)) return { ok: false, error: "The frontmatter must be key: value pairs." };
    fm = data ?? {};
    body = m[2];
  }
  body = body.replace(/^\s*\n/, "");

  // no title in the frontmatter: take a leading "# heading" and drop it from the body
  let title = fm.title;
  if (title == null || title === "") {
    const h = /^#[ \t]+(.+?)[ \t#]*(?:\n|$)/.exec(body);
    if (h) {
      title = h[1];
      body = body.slice(h[0].length).replace(/^\s*\n/, "");
    }
  }

  const slug = typeof fm.slug === "string" && fm.slug ? fm.slug : slugify(filename.replace(/\.(md|markdown)$/i, ""));
  const tags = Array.isArray(fm.tags) ? fm.tags : typeof fm.tags === "string" ? fm.tags.split(",") : [];
  const connects = Array.isArray(fm.connectsTo) ? fm.connectsTo : [];
  const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date == null || fm.date === "" ? d.today : String(fm.date);

  const res = articleSchema.safeParse({
    slug,
    title: title == null ? "" : String(title),
    excerpt: fm.excerpt == null ? "" : String(fm.excerpt),
    date,
    readMins: fm.readMins == null || fm.readMins === "" ? suggestReadMins(body) : Number(fm.readMins),
    topic: fm.topic ?? d.topic,
    tags: [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))],
    connectsTo: connects.map((c) => (typeof c === "string" ? { slug: c, kind: "builds-on" } : c)),
    featured: fm.featured === true,
    status: fm.status ?? d.status,
    body: body.trimEnd() + "\n",
  });
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join(".") || "file"}: ${i.message}`).join("; ");
    return { ok: false, slug: slug || undefined, error: issues };
  }
  return { ok: true, article: res.data as Article, ignored: Object.keys(fm).filter((k) => !KNOWN.has(k)) };
}

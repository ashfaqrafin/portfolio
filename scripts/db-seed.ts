#!/usr/bin/env node
/* One-off: copies every Markdown article in content/articles into Postgres so no
   article is lost when switching stores. Existing rows are kept unless --overwrite.
   Usage: DATABASE_URL=... npm run db:seed [-- --overwrite] */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { parseArticleFile } from "../lib/store/markdown-file.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("db:seed: DATABASE_URL is not set");
  process.exit(1);
}
const overwrite = process.argv.includes("--overwrite");
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../content/articles");
const sql = postgres(url, { max: 1, prepare: false });
let inserted = 0;
let kept = 0;
try {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const a = parseArticleFile(file.slice(0, -3), readFileSync(path.join(dir, file), "utf8"));
    const row = {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      date: a.date,
      read_mins: a.readMins,
      topic: a.topic,
      tags: a.tags,
      connects_to: sql.json(a.connectsTo),
      featured: a.featured,
      status: a.status,
      body: a.body,
    };
    const res = overwrite
      ? await sql`insert into articles ${sql(row)} on conflict (slug) do update set ${sql(row, "title", "excerpt", "date", "read_mins", "topic", "tags", "connects_to", "featured", "status", "body")}, updated_at = now() returning slug`
      : await sql`insert into articles ${sql(row)} on conflict (slug) do nothing returning slug`;
    if (res.length) inserted++;
    else kept++;
  }
  console.log(`db:seed: ${inserted} written, ${kept} already present`);
} finally {
  await sql.end();
}

#!/usr/bin/env node
/* Applies db/migrations/*.sql in order, once each. Usage: DATABASE_URL=... npm run db:migrate */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("db:migrate: DATABASE_URL is not set");
  process.exit(1);
}
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../db/migrations");
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) {
      console.log(`  skip ${file}`);
      continue;
    }
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(path.join(dir, file), "utf8"));
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`  applied ${file}`);
  }
} finally {
  await sql.end();
}

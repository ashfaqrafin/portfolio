import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* One lazily created client per server process. DATABASE_URL is server-only:
   never prefix it with NEXT_PUBLIC_. `prepare: false` keeps it compatible with
   transaction poolers (Supabase, Neon pooled URLs, PgBouncer). */

type DB = PostgresJsDatabase<typeof schema>;
const g = globalThis as unknown as { __blogDb?: DB };

export function getDb(): DB {
  if (g.__blogDb) return g.__blogDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[db] DATABASE_URL is not set");
  const client = postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    prepare: false,
    idle_timeout: 20,
  });
  g.__blogDb = drizzle(client, { schema });
  return g.__blogDb;
}

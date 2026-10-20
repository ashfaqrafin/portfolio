import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Connection } from "../blog/types";

/* Mirrors db/migrations/0001_articles.sql. The SQL file is the source of truth for the database. */
export const articles = pgTable(
  "articles",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    date: date("date", { mode: "string" }).notNull(),
    readMins: integer("read_mins").notNull(),
    topic: text("topic").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    connectsTo: jsonb("connects_to").$type<Connection[]>().notNull().default(sql`'[]'`),
    featured: boolean("featured").notNull().default(false),
    status: text("status").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("articles_status_date_idx").on(t.status, t.date),
    check("articles_status_check", sql`${t.status} in ('draft','published')`),
  ],
);

export type ArticleRow = typeof articles.$inferSelect;

/* Mirrors db/migrations/0002_messages.sql. */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name").notNull().default(""),
    via: text("via").notNull(),
    reply: text("reply").notNull(),
    message: text("message").notNull(),
  },
  (t) => [index("messages_created_idx").on(t.createdAt), check("messages_via_check", sql`${t.via} in ('email','linkedin')`)],
);

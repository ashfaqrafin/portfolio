import { z } from "zod";
import { TOPICS } from "./topics.ts";

/* One strict schema for every owner input (and every article read from disk). */

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAG_RE = /^[a-z0-9]+(?:[ -][a-z0-9]+)*$/;

export const slugSchema = z.string().min(1).max(80).regex(SLUG_RE, "lowercase letters, digits and single hyphens");

export function isValidSlug(v: unknown): v is string {
  return slugSchema.safeParse(v).success;
}

const isRealDate = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const connectionSchema = z.strictObject({
  slug: slugSchema,
  kind: z.enum(["series", "builds-on"]).default("builds-on"),
  note: z.string().trim().max(60).optional(),
});

export const articleSchema = z.strictObject({
  slug: slugSchema,
  title: z.string().trim().min(1, "required").max(140),
  excerpt: z.string().trim().max(300).default(""),
  date: z.string().regex(DATE_RE, "YYYY-MM-DD").refine(isRealDate, "not a real date"),
  readMins: z.number().int().min(1).max(120),
  topic: z.enum(TOPICS),
  tags: z
    .array(z.string().max(32).regex(TAG_RE, "lowercase words, digits, hyphens"))
    .max(12, "at most 12 tags")
    .refine((t) => new Set(t).size === t.length, "duplicate tag")
    .default([]),
  connectsTo: z
    .array(connectionSchema)
    .max(12, "at most 12 threads")
    .refine((c) => new Set(c.map((x) => x.slug)).size === c.length, "duplicate thread")
    .default([]),
  featured: z.boolean().default(false),
  status: z.enum(["draft", "published"]),
  body: z.string().max(100_000),
});

export type ArticleInput = z.infer<typeof articleSchema>;

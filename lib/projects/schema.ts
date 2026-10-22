import { z } from "zod";
import { slugSchema } from "../blog/schema.ts";
import { STATUSES } from "./status.ts";

/* One strict schema for every project file in content/projects/. */

const YEAR_RE = /^\d{4}(?: ?[–-] ?(?:\d{4}|now))?$/;

export const projectLinkSchema = z.strictObject({
  label: z.string().trim().min(1).max(24),
  // only plain web links: no javascript:, data: or relative URLs on a public page
  href: z.url({ protocol: /^https?$/, hostname: z.regexes.domain }),
});

export const projectSchema = z.strictObject({
  slug: slugSchema,
  title: z.string().trim().min(1, "required").max(60),
  tagline: z.string().trim().min(1, "required").max(140),
  /** "2026", "2024 – 2025" or "2025 – now" */
  year: z.string().trim().regex(YEAR_RE, "a year, or a range like 2024 – 2025"),
  /** what kind of work it is: "University project", "Personal tool" … */
  kind: z.string().trim().min(1).max(40),
  /** the stamp on the drawing; leave it out for no stamp */
  status: z.enum(STATUSES).optional(),
  role: z.string().trim().max(60).optional(),
  stack: z
    .array(z.string().trim().min(1).max(30))
    .max(10, "at most 10 materials")
    .refine((s) => new Set(s).size === s.length, "duplicate material")
    .default([]),
  links: z.array(projectLinkSchema).max(4, "at most 4 links").default([]),
  /** lower comes first */
  order: z.number().int().min(0).max(999).default(100),
  draft: z.boolean().default(false),
  /** plain text: blank lines split paragraphs, lines starting "- " make a list */
  body: z.string().max(4000),
});

export type ProjectInput = z.infer<typeof projectSchema>;

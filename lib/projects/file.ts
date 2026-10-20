import { parse } from "yaml";
import { projectSchema, type ProjectInput } from "./schema.ts";

/* Markdown-with-frontmatter codec for project files. No path handling here. */

export type Block = { kind: "p"; text: string } | { kind: "list"; items: string[] };
export type Project = Omit<ProjectInput, "body"> & { notes: Block[] };

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** plain text only: blank lines split paragraphs, "- " lines make a list */
export function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.trim().split(/\r?\n\s*\r?\n/)) {
    const lines = chunk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => /^[-*]\s+/.test(l))) blocks.push({ kind: "list", items: lines.map((l) => l.replace(/^[-*]\s+/, "")) });
    else blocks.push({ kind: "p", text: lines.join(" ") });
  }
  return blocks;
}

export function parseProjectFile(slug: string, text: string): Project {
  const m = FRONT.exec(text);
  if (!m) throw new Error(`[projects] ${slug}.md has no frontmatter`);
  const fm = (parse(m[1]) ?? {}) as Record<string, unknown>;
  const res = projectSchema.safeParse({
    ...fm,
    slug,
    // YAML reads a bare 2026 as a number
    year: typeof fm.year === "number" ? String(fm.year) : fm.year,
    body: m[2],
  });
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`[projects] ${slug}.md is invalid: ${issues}`);
  }
  const { body, ...rest } = res.data;
  return { ...rest, notes: toBlocks(body) };
}

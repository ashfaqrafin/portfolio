"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signOut } from "@/auth";
import { requireOwner } from "@/lib/auth/guard";
import { ARTICLES_TAG } from "@/lib/blog/data";
import { IMPORT_MAX_BYTES, IMPORT_MAX_FILES, parseImport } from "@/lib/blog/import";
import { articleSchema, slugSchema } from "@/lib/blog/schema";
import { isTopic } from "@/lib/blog/topics";
import type { Article } from "@/lib/blog/types";
import { inbox } from "@/lib/inbox";
import { store } from "@/lib/store";

/* Every exported action begins with `await requireOwner()` (gate 3). That check is
   what protects the data: a replayed request, from any URL, with any cookie or none,
   is refused before anything is read or written. Enforced by scripts/check-owner-guards.mjs.
   Only signOutAction is exempt. */

export type SaveState = {
  formError?: string;
  fieldErrors?: Partial<Record<keyof Article | "connectsTo", string[]>>;
} | null;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

function readForm(fd: FormData, slug: string) {
  const connect = fd.getAll("connect").filter((v): v is string => typeof v === "string");
  const readMins = str(fd, "readMins").trim();
  return {
    slug,
    title: str(fd, "title"),
    excerpt: str(fd, "excerpt"),
    date: str(fd, "date").trim(),
    readMins: readMins === "" ? Number.NaN : Number(readMins),
    topic: str(fd, "topic"),
    tags: [
      ...new Set(
        str(fd, "tags")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    connectsTo: connect.map((s) => {
      const note = str(fd, `note:${s}`).trim();
      return { slug: s, kind: str(fd, `kind:${s}`) || "builds-on", ...(note ? { note } : {}) };
    }),
    featured: fd.get("featured") === "on",
    status: str(fd, "status"),
    body: str(fd, "body").replace(/\r\n?/g, "\n"),
  };
}

function refresh(slug: string) {
  updateTag(ARTICLES_TAG);
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

export async function saveArticle(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireOwner();

  const editing = formData.get("mode") === "edit";
  // the slug is fixed once an article exists: take it from the original, never the form
  const slugRaw = editing ? str(formData, "originalSlug") : str(formData, "slug").trim();
  const parsed = articleSchema.safeParse(readForm(formData, slugRaw));
  if (!parsed.success) {
    return { formError: "Some fields need another look.", fieldErrors: z.flattenError(parsed.error).fieldErrors as NonNullable<SaveState>["fieldErrors"] };
  }
  const article = parsed.data as Article;

  const existing = await store.get(article.slug, { includeDrafts: true });
  if (editing && !existing) return { formError: "That article no longer exists." };
  if (!editing && existing) return { fieldErrors: { slug: ["That slug is already taken."] } };

  // threads may only point at existing articles, never at the article itself
  const known = new Set((await store.list({ includeDrafts: true })).map((a) => a.slug));
  const bad = article.connectsTo.filter((c) => c.slug === article.slug || !known.has(c.slug)).map((c) => c.slug);
  if (bad.length) return { fieldErrors: { connectsTo: [`Unknown or self thread: ${bad.join(", ")}`] } };

  await store.upsert(article);
  refresh(article.slug);
  redirect(`/studio?saved=${article.slug}`);
}

export type ImportResult = {
  file: string;
  slug?: string;
  outcome: "created" | "updated" | "skipped" | "error";
  message?: string;
  status?: Article["status"];
};
export type ImportState = { results: ImportResult[]; error?: string } | null;

/** Upload one or more Markdown files. Each goes through the same schema and thread
    checks as the editor; existing slugs are skipped unless "replace" is ticked. */
export async function importArticles(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireOwner();

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { results: [], error: "Choose at least one Markdown file." };
  if (files.length > IMPORT_MAX_FILES) return { results: [], error: `At most ${IMPORT_MAX_FILES} files at a time.` };
  const topicRaw = formData.get("topic");
  const defaults = {
    topic: isTopic(topicRaw) ? topicRaw : "unified",
    status: formData.get("status") === "published" ? "published" : "draft",
    today: new Date().toISOString().slice(0, 10),
  } as const;
  const overwrite = formData.get("overwrite") === "on";

  const results: ImportResult[] = [];
  const ready: { file: string; article: Article; note?: string }[] = [];
  const inBatch = new Set<string>();
  for (const f of files) {
    if (!/\.(md|markdown)$/i.test(f.name)) {
      results.push({ file: f.name, outcome: "error", message: "Only .md or .markdown files." });
      continue;
    }
    if (f.size > IMPORT_MAX_BYTES) {
      results.push({ file: f.name, outcome: "error", message: "Larger than 200 KB." });
      continue;
    }
    const parsed = parseImport(f.name, await f.text(), defaults);
    if (!parsed.ok) {
      results.push({ file: f.name, slug: parsed.slug, outcome: "error", message: parsed.error });
      continue;
    }
    if (inBatch.has(parsed.article.slug)) {
      results.push({ file: f.name, slug: parsed.article.slug, outcome: "error", message: "Another file in this upload has the same slug." });
      continue;
    }
    inBatch.add(parsed.article.slug);
    ready.push({ file: f.name, article: parsed.article, note: parsed.ignored.length ? `Ignored: ${parsed.ignored.join(", ")}` : undefined });
  }

  // threads may point at existing articles or at other files in this upload, never at themselves
  const existing = new Set((await store.list({ includeDrafts: true })).map((a) => a.slug));
  const known = new Set([...existing, ...inBatch]);
  for (const { file, article, note } of ready) {
    const bad = article.connectsTo.filter((c) => c.slug === article.slug || !known.has(c.slug)).map((c) => c.slug);
    if (bad.length) {
      results.push({ file, slug: article.slug, outcome: "error", message: `Unknown or self thread: ${bad.join(", ")}` });
      continue;
    }
    const exists = existing.has(article.slug);
    if (exists && !overwrite) {
      results.push({ file, slug: article.slug, outcome: "skipped", message: "Already exists. Tick “replace” to overwrite it." });
      continue;
    }
    await store.upsert(article);
    refresh(article.slug);
    results.push({ file, slug: article.slug, outcome: exists ? "updated" : "created", status: article.status, message: note });
  }
  return { results };
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await requireOwner();

  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) throw new Error("Invalid slug");
  await store.remove(slug.data);
  refresh(slug.data);
  redirect("/studio?deleted=1");
}

export async function deleteMessage(formData: FormData): Promise<void> {
  await requireOwner();

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) throw new Error("Invalid message id");
  await inbox.remove(id.data);
  revalidatePath("/studio/inbox");
  redirect("/studio/inbox?deleted=1");
}

export async function signOutAction(): Promise<void> {
  // exempt: signing out must work even when the session has already expired
  await signOut({ redirectTo: "/" });
}

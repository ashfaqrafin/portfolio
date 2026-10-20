"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signOut } from "@/auth";
import { requireOwner } from "@/lib/auth/guard";
import { ARTICLES_TAG } from "@/lib/blog/data";
import { articleSchema, slugSchema } from "@/lib/blog/schema";
import type { Article } from "@/lib/blog/types";
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

export async function deleteArticle(formData: FormData): Promise<void> {
  await requireOwner();

  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) throw new Error("Invalid slug");
  await store.remove(slug.data);
  refresh(slug.data);
  redirect("/studio?deleted=1");
}

export async function signOutAction(): Promise<void> {
  // exempt: signing out must work even when the session has already expired
  await signOut({ redirectTo: "/" });
}

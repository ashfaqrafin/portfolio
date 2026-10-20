import "server-only";
import { dbStore } from "./db-store";
import { fileStore } from "./file-store";
import type { ArticleStore } from "./types";

/* The one line that picks storage: Postgres when DATABASE_URL is set (production),
   Markdown files in content/articles otherwise (local development). */
export const store: ArticleStore = process.env.DATABASE_URL ? dbStore : fileStore;

export type { ArticleStore, ReadOpts } from "./types";

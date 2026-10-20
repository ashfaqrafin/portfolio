import type { Article } from "../blog/types";

export type ReadOpts = { includeDrafts: boolean };

/** Everything the app needs from storage. Public routes always pass `includeDrafts: false`. */
export interface ArticleStore {
  list(opts: ReadOpts): Promise<Article[]>;
  get(slug: string, opts: ReadOpts): Promise<Article | null>;
  upsert(article: Article): Promise<void>;
  remove(slug: string): Promise<void>;
}

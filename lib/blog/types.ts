/* Shapes shared by the store, the graph, the board and the studio.
   Kept free of runtime imports so plain `node` can load the pure modules. */

export type Topic = "tailoring" | "fashion" | "unified" | "linux";
export type ThreadKind = "series" | "builds-on";
export type Status = "draft" | "published";

export type Connection = {
  slug: string;
  kind: ThreadKind;
  note?: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  /** YYYY-MM-DD */
  date: string;
  readMins: number;
  topic: Topic;
  tags: string[];
  connectsTo: Connection[];
  featured: boolean;
  status: Status;
  body: string;
};

/** An article without its body: what the board and the graph need. */
export type ArticleMeta = Omit<Article, "body">;

export type EdgeKind = ThreadKind | "topic";

/** A thread. Always runs from the newer article (`from`) to the older one (`to`). */
export type Edge = {
  from: string;
  to: string;
  kind: EdgeKind;
  weight: number;
  note?: string;
  /** tags both articles carry (topic threads, and as extra context on explicit ones) */
  shared: string[];
};

export type Graph = {
  edges: Edge[];
  /** slugs with no thread at all */
  loose: string[];
};

import type { ArticleMeta, Edge, Graph } from "./types";

/* Thread rules (docs/blog.md, "How threads are decided"):
   - explicit `connectsTo` series   → weight 1.0
   - explicit `connectsTo` builds-on → weight 0.8
   - otherwise ≥ 2 shared tags or tag Jaccard ≥ 0.30 → automatic topic thread,
     weight min(0.7, 0.25 + jaccard), at most 3 per article, strongest first
   Edges always run newer → older. An explicit thread beats an automatic one. */

export const SERIES_WEIGHT = 1;
export const BUILDS_ON_WEIGHT = 0.8;
export const AUTO_MIN_SHARED = 2;
export const AUTO_MIN_JACCARD = 0.3;
export const AUTO_MAX_PER_ARTICLE = 3;

/** newer first; ties broken by slug so the order never depends on input order */
export function newerFirst(a: Pick<ArticleMeta, "date" | "slug">, b: Pick<ArticleMeta, "date" | "slug">) {
  return a.date === b.date ? (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0) : a.date < b.date ? 1 : -1;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function sharedTags(a: readonly string[], b: readonly string[]) {
  const sb = new Set(b);
  return [...new Set(a)].filter((t) => sb.has(t)).sort();
}

function jaccard(a: readonly string[], b: readonly string[], shared: number) {
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

export function buildGraph(articles: readonly ArticleMeta[]): Graph {
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const ordered = [...articles].sort(newerFirst);
  const rank = new Map(ordered.map((a, i) => [a.slug, i]));
  const edges: Edge[] = [];
  const explicit = new Set<string>();

  // explicit threads
  for (const a of ordered) {
    for (const c of a.connectsTo) {
      const b = bySlug.get(c.slug);
      if (!b || b.slug === a.slug) continue;
      const key = pairKey(a.slug, b.slug);
      if (explicit.has(key)) continue; // both sides declared it: keep the first (the newer article's)
      explicit.add(key);
      const [newer, older] = rank.get(a.slug)! < rank.get(b.slug)! ? [a, b] : [b, a];
      edges.push({
        from: newer.slug,
        to: older.slug,
        kind: c.kind,
        weight: c.kind === "series" ? SERIES_WEIGHT : BUILDS_ON_WEIGHT,
        note: c.note || undefined,
        shared: sharedTags(a.tags, b.tags),
      });
    }
  }

  // automatic topic threads
  type Cand = { newer: ArticleMeta; older: ArticleMeta; shared: string[]; sim: number };
  const cands: Cand[] = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const newer = ordered[i];
      const older = ordered[j];
      if (explicit.has(pairKey(newer.slug, older.slug))) continue;
      const shared = sharedTags(newer.tags, older.tags);
      const sim = jaccard(newer.tags, older.tags, shared.length);
      if (shared.length >= AUTO_MIN_SHARED || sim >= AUTO_MIN_JACCARD) cands.push({ newer, older, shared, sim });
    }
  }
  // strongest first: shared-tag count, then similarity, then recency (newer endpoint, then older endpoint)
  cands.sort(
    (x, y) =>
      y.shared.length - x.shared.length ||
      y.sim - x.sim ||
      rank.get(x.newer.slug)! - rank.get(y.newer.slug)! ||
      rank.get(x.older.slug)! - rank.get(y.older.slug)!,
  );
  const autoCount = new Map<string, number>();
  for (const c of cands) {
    const na = autoCount.get(c.newer.slug) ?? 0;
    const nb = autoCount.get(c.older.slug) ?? 0;
    if (na >= AUTO_MAX_PER_ARTICLE || nb >= AUTO_MAX_PER_ARTICLE) continue;
    autoCount.set(c.newer.slug, na + 1);
    autoCount.set(c.older.slug, nb + 1);
    edges.push({
      from: c.newer.slug,
      to: c.older.slug,
      kind: "topic",
      weight: Math.min(0.7, 0.25 + c.sim),
      shared: c.shared,
    });
  }

  const touched = new Set(edges.flatMap((e) => [e.from, e.to]));
  const loose = ordered.filter((a) => !touched.has(a.slug)).map((a) => a.slug);
  return { edges, loose };
}

export type Relation = {
  slug: string;
  /** how `slug` relates to the article being described */
  rel: "continues" | "continued-by" | "builds-on" | "built-on-by" | "shares";
  kind: Edge["kind"];
  note?: string;
  shared: string[];
  weight: number;
};

/** Every thread touching `slug`, phrased from that article's point of view, strongest first. */
export function relationsOf(slug: string, edges: readonly Edge[]): Relation[] {
  const out: Relation[] = [];
  for (const e of edges) {
    if (e.from !== slug && e.to !== slug) continue;
    const outgoing = e.from === slug; // this article is the newer one
    const other = outgoing ? e.to : e.from;
    const rel: Relation["rel"] =
      e.kind === "series"
        ? outgoing
          ? "continues"
          : "continued-by"
        : e.kind === "builds-on"
          ? outgoing
            ? "builds-on"
            : "built-on-by"
          : "shares";
    out.push({ slug: other, rel, kind: e.kind, note: e.note, shared: e.shared, weight: e.weight });
  }
  return out.sort((a, b) => b.weight - a.weight || (a.slug < b.slug ? -1 : 1));
}

export const REL_LABEL: Record<Relation["rel"], string> = {
  continues: "continues",
  "continued-by": "continued by",
  "builds-on": "builds on",
  "built-on-by": "built on by",
  shares: "shares topics with",
};

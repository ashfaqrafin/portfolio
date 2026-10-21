import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { store } from "../store";
import { formatDate, joinList } from "./format";
import { buildGraph, newerFirst, REL_LABEL, relationsOf, type Relation } from "./graph";
import { layoutBoard, type BoardLayout, type PinBox } from "./layout";
import { offboardOf, splitSheets, type Offboard, type SheetInfo } from "./sheets";
import { metaOf } from "./meta";
import { TOPIC_LABEL } from "./topics";
import type { Article, ArticleMeta, Edge, Topic } from "./types";

/* Public reads. Everything here is published-only and cached under one tag;
   the studio's server actions call updateTag(ARTICLES_TAG) after every write.
   A big archive is split into sheets (lib/blog/sheets.ts): the page gets the
   newest sheet and a light index of everything; app/api/board/[sheet] serves
   the others on demand. */

export const ARTICLES_TAG = "articles";

export type RelatedRef = Relation & { title: string; topic: Topic; date: string };

export type PinData = Omit<ArticleMeta, "status" | "connectsTo"> & {
  box: PinBox;
  /** accessible name: title, kicker and every connection */
  label: string;
  relations: RelatedRef[];
  isNewest: boolean;
};

/** one sheet of the board: its pins, the threads between them, and the ones that run off it */
export type SheetData = {
  sheet: number;
  pins: PinData[];
  edges: Edge[];
  layout: Omit<BoardLayout, "pins">;
  offboard: Offboard[];
};

/** every published article, light, for the list view, search and counts across all sheets */
export type IndexItem = Pick<ArticleMeta, "slug" | "title" | "excerpt" | "date" | "readMins" | "topic" | "tags"> & {
  sheet: number;
  /** "builds on" → [titles], for the list view */
  rels: [string, string[]][];
};

export type BoardData = SheetData & {
  total: number;
  /** threads across the whole archive */
  threadCount: number;
  /** articles with no thread at all, on any sheet */
  loose: string[];
  sheets: SheetInfo[];
  /** newest first */
  index: IndexItem[];
};

async function publishedMeta(): Promise<ArticleMeta[]> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("max");
  const all = await store.list({ includeDrafts: false });
  return all.map(metaOf);
}

function describe(a: ArticleMeta, rels: RelatedRef[]) {
  const groups: Partial<Record<Relation["rel"], string[]>> = {};
  for (const r of rels) (groups[r.rel] ??= []).push(r.title);
  const parts = (Object.keys(groups) as Relation["rel"][]).map((k) => `${REL_LABEL[k][0].toUpperCase()}${REL_LABEL[k].slice(1)} ${joinList(groups[k]!)}.`);
  return [
    `${a.title}.`,
    `${TOPIC_LABEL[a.topic]}, ${formatDate(a.date)}, ${a.readMins} min read.`,
    parts.length ? parts.join(" ") : "Not tied to any other article yet.",
  ].join(" ");
}

function withRefs(rels: Relation[], bySlug: Map<string, ArticleMeta>): RelatedRef[] {
  return rels.flatMap((r) => {
    const o = bySlug.get(r.slug);
    return o ? [{ ...r, title: o.title, topic: o.topic, date: o.date }] : [];
  });
}

function relGroups(rels: RelatedRef[]): [string, string[]][] {
  const g = new Map<string, string[]>();
  for (const r of rels) g.set(REL_LABEL[r.rel], [...(g.get(REL_LABEL[r.rel]) ?? []), r.title]);
  return [...g.entries()];
}

/** The whole archive, threaded and split into sheets; everything else is cut
   from this. Not cached itself (it holds Maps): getSheet and getBoard cache
   their plain results, so it only runs when those miss. */
async function archive() {
  const all = await publishedMeta();
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  const graph = buildGraph(all);
  const { info, sheets } = splitSheets(all);
  const sheetOf = new Map<string, number>();
  sheets.forEach((items, i) => items.forEach((a) => sheetOf.set(a.slug, i)));
  const relations = new Map(all.map((a) => [a.slug, withRefs(relationsOf(a.slug, graph.edges), bySlug)]));
  const index: IndexItem[] = [...all].sort(newerFirst).map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    date: a.date,
    readMins: a.readMins,
    topic: a.topic,
    tags: a.tags,
    sheet: sheetOf.get(a.slug) ?? 0,
    rels: relGroups(relations.get(a.slug) ?? []),
  }));
  return { all, bySlug, graph, info, sheets, sheetOf, relations, index, newest: index[0]?.slug };
}

/** One sheet, laid out. Cached per sheet; null for a sheet that doesn't exist. */
export async function getSheet(sheet: number): Promise<SheetData | null> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("max");
  const a = await archive();
  if (!Number.isInteger(sheet) || sheet < 0 || (sheet >= a.sheets.length && !(sheet === 0 && a.sheets.length === 0))) return null;
  const items = a.sheets[sheet] ?? [];
  const here = new Set(items.map((x) => x.slug));
  const edges = a.graph.edges.filter((e) => here.has(e.from) && here.has(e.to));
  const { pins: boxes, ...layout } = layoutBoard(items, edges);
  const boxBySlug = new Map(boxes.map((b) => [b.slug, b]));
  // chronological DOM order = chronological Tab order
  const pins = [...items]
    .sort((x, y) => -newerFirst(x, y))
    .map((m): PinData => {
      const rels = a.relations.get(m.slug) ?? [];
      return {
        slug: m.slug,
        title: m.title,
        excerpt: m.excerpt,
        date: m.date,
        readMins: m.readMins,
        topic: m.topic,
        tags: m.tags,
        featured: m.featured,
        box: boxBySlug.get(m.slug)!,
        label: describe(m, rels),
        relations: rels,
        isNewest: m.slug === a.newest,
      };
    });
  const offboard = offboardOf(sheet, a.graph.edges, a.sheetOf, (s) => a.bySlug.get(s)?.title ?? s);
  return { sheet, pins, edges, layout, offboard };
}

/** The newest sheet, plus what the board needs to know about every other one. */
export async function getBoard(): Promise<BoardData> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("max");
  const a = await archive();
  const first = (await getSheet(0))!;
  return { ...first, total: a.all.length, threadCount: a.graph.edges.length, loose: a.graph.loose, sheets: a.info, index: a.index };
}

export type ArticlePageData = {
  article: Article;
  relations: RelatedRef[];
  prev: Pick<ArticleMeta, "slug" | "title" | "topic"> | null;
  next: Pick<ArticleMeta, "slug" | "title" | "topic"> | null;
};

/** One published article with its threads, or null (drafts and unknown slugs alike). */
export async function getPublishedArticle(slug: string): Promise<ArticlePageData | null> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("max");
  const article = await store.get(slug, { includeDrafts: false });
  if (!article || article.status !== "published") return null;
  const all = await publishedMeta();
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  const relations = withRefs(relationsOf(slug, buildGraph(all).edges), bySlug);
  const chrono = [...all].sort((a, b) => -newerFirst(a, b));
  const i = chrono.findIndex((a) => a.slug === slug);
  const pick = (a?: ArticleMeta) => (a ? { slug: a.slug, title: a.title, topic: a.topic } : null);
  return { article, relations, prev: pick(chrono[i - 1]), next: pick(chrono[i + 1]) };
}

export async function getPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("max");
  return (await publishedMeta()).map((a) => a.slug);
}

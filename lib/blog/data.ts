import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { store } from "../store";
import { formatDate, joinList } from "./format";
import { buildGraph, newerFirst, REL_LABEL, relationsOf, type Relation } from "./graph";
import { layoutBoard, type BoardLayout, type PinBox } from "./layout";
import { metaOf } from "./meta";
import { TOPIC_LABEL } from "./topics";
import type { Article, ArticleMeta, Edge, Topic } from "./types";

/* Public reads. Everything here is published-only and cached under one tag;
   the studio's server actions call updateTag(ARTICLES_TAG) after every write. */

export const ARTICLES_TAG = "articles";
/** beyond this many articles the board shows only the newest BOARD_NEWEST, and links to the list */
export const BOARD_LIMIT = 100;
export const BOARD_NEWEST = 60;

export type RelatedRef = Relation & { title: string; topic: Topic; date: string };

export type PinData = Omit<ArticleMeta, "status" | "connectsTo"> & {
  box: PinBox;
  /** accessible name: title, kicker and every connection */
  label: string;
  relations: RelatedRef[];
  isNewest: boolean;
};

export type BoardData = {
  pins: PinData[];
  edges: Edge[];
  loose: string[];
  layout: Omit<BoardLayout, "pins">;
  total: number;
  /** every published article, newest first, when the board is truncated (otherwise the list uses `pins`) */
  list: PinData[] | null;
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

export async function getBoard(): Promise<BoardData> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("max");
  const all = await publishedMeta();
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  const graph = buildGraph(all);
  const newestFirst = [...all].sort(newerFirst);
  const newest = newestFirst[0]?.slug;

  const toPin = (a: ArticleMeta, box: PinBox): PinData => {
    const relations = withRefs(relationsOf(a.slug, graph.edges), bySlug);
    return {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      date: a.date,
      readMins: a.readMins,
      topic: a.topic,
      tags: a.tags,
      featured: a.featured,
      box,
      label: describe(a, relations),
      relations,
      isNewest: a.slug === newest,
    };
  };

  // very large archives: keep the board legible, the list still has everything
  const onBoard = all.length > BOARD_LIMIT ? newestFirst.slice(0, BOARD_NEWEST) : all;
  const shown = new Set(onBoard.map((a) => a.slug));
  const edges = graph.edges.filter((e) => shown.has(e.from) && shown.has(e.to));
  const { pins: boxes, ...layout } = layoutBoard(onBoard, edges);
  const boxBySlug = new Map(boxes.map((b) => [b.slug, b]));
  const touched = new Set(edges.flatMap((e) => [e.from, e.to]));

  // chronological DOM order = chronological Tab order
  const pins = [...onBoard]
    .sort((a, b) => -newerFirst(a, b))
    .map((a) => toPin(a, boxBySlug.get(a.slug)!));
  const list =
    onBoard.length < all.length
      ? newestFirst.map((a) => toPin(a, boxBySlug.get(a.slug) ?? { slug: a.slug, x: 0, y: 0, w: 0, h: 0, rot: 0 }))
      : null;

  return {
    pins,
    edges,
    loose: onBoard.filter((a) => !touched.has(a.slug)).map((a) => a.slug),
    layout,
    total: all.length,
    list,
  };
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

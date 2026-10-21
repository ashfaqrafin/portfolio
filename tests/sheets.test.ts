import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGraph } from "../lib/blog/graph.ts";
import { layoutBoard } from "../lib/blog/layout.ts";
import { offboardOf, rangeLabel, SHEET_MAX, splitSheets } from "../lib/blog/sheets.ts";
import type { ArticleMeta, Topic } from "../lib/blog/types.ts";

const TOPICS: Topic[] = ["tailoring", "fashion", "unified", "linux"];
const day = (i: number) => new Date(Date.UTC(2024, 0, 1) + i * 5 * 864e5).toISOString().slice(0, 10);
const arts = (n: number, extra: (i: number) => Partial<ArticleMeta> = () => ({})): ArticleMeta[] =>
  Array.from({ length: n }, (_, i) => ({
    slug: `a${i}`,
    title: `A${i}`,
    excerpt: "",
    date: day(i),
    readMins: 3,
    topic: TOPICS[i % 4],
    tags: [],
    connectsTo: [],
    featured: false,
    status: "published",
    ...extra(i),
  }));

test("sheets: a small archive stays on one sheet", () => {
  assert.equal(splitSheets([]).sheets.length, 0);
  assert.equal(splitSheets(arts(1)).sheets.length, 1);
  assert.equal(splitSheets(arts(SHEET_MAX)).sheets.length, 1);
});

test("sheets: a big archive is split newest first, balanced, and nothing is lost", () => {
  for (const n of [21, 45, 107, 400]) {
    const { sheets, info } = splitSheets(arts(n));
    const sizes = sheets.map((s) => s.length);
    assert.equal(sizes.reduce((a, b) => a + b, 0), n, `n=${n}`);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `n=${n} unbalanced: ${sizes}`);
    assert.ok(Math.max(...sizes) <= SHEET_MAX, `n=${n} sheet too big`);
    assert.equal(new Set(sheets.flat().map((a) => a.slug)).size, n);
    // sheet 0 holds the newest; every sheet is older than the one before it
    assert.equal(sheets[0][0].slug, `a${n - 1}`);
    for (let i = 1; i < sheets.length; i++) assert.ok(info[i].to <= info[i - 1].from);
  }
});

test("sheets: labels read as date ranges", () => {
  assert.equal(rangeLabel("2026-04-02", "2026-04-28"), "Apr 2026");
  assert.equal(rangeLabel("2025-03-01", "2025-10-09"), "Mar – Oct 2025");
  assert.equal(rangeLabel("2025-11-01", "2026-04-09"), "Nov 2025 – Apr 2026");
});

test("sheets: threads to other sheets become one stub per pin and direction", () => {
  // 45 articles: three sheets of 15. a44 (newest sheet) builds on a0 and a1
  // (oldest sheet); a20, on the middle sheet, builds on a44
  const all = arts(45, (i) => (i === 44 ? { connectsTo: [{ slug: "a0", kind: "builds-on" }, { slug: "a1", kind: "series" }] } : i === 20 ? { connectsTo: [{ slug: "a44", kind: "builds-on" }] } : {}));
  const { sheets } = splitSheets(all);
  assert.deepEqual(sheets.map((x) => x.length), [15, 15, 15]);
  const sheetOf = new Map<string, number>();
  sheets.forEach((s, i) => s.forEach((a) => sheetOf.set(a.slug, i)));
  const { edges } = buildGraph(all);
  const newest = offboardOf(0, edges, sheetOf, (s) => s.toUpperCase());
  assert.equal(newest.length, 1);
  assert.equal(newest[0].from, "a44");
  assert.equal(newest[0].dir, "older");
  assert.deepEqual(newest[0].targets.map((t) => t.slug).sort(), ["a0", "a1", "a20"]);
  // it jumps to the nearest sheet holding a target
  assert.equal(newest[0].sheet, 1);
  const oldest = offboardOf(sheets.length - 1, edges, sheetOf, (s) => s);
  assert.ok(oldest.every((o) => o.dir === "newer"));
  assert.equal(offboardOf(0, edges.filter((e) => sheetOf.get(e.from) === sheetOf.get(e.to)), sheetOf, (s) => s).length, 0);
});

test("layout: a crowded lane makes the board longer, never overlaps pins", () => {
  for (const set of [arts(20, () => ({ topic: "linux" })), arts(20, () => ({ featured: true })), arts(20, () => ({ date: "2026-01-01" }))]) {
    const L = layoutBoard(set, buildGraph(set).edges);
    for (let i = 0; i < L.pins.length; i++)
      for (let j = i + 1; j < L.pins.length; j++) {
        const a = L.pins[i];
        const b = L.pins[j];
        assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${a.slug} overlaps ${b.slug}`);
      }
    const laneY = new Map(L.lanes.map((l) => [l.topic, l.y]));
    for (const p of L.pins) {
      const topic = set.find((a) => a.slug === p.slug)!.topic;
      assert.ok(Math.abs(p.y + p.h / 2 - laneY.get(topic)!) < 88, `${p.slug} left its lane`);
    }
  }
});

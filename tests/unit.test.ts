import assert from "node:assert/strict";
import { test } from "node:test";
import { buildGraph } from "../lib/blog/graph.ts";
import { layoutBoard, threadGeom } from "../lib/blog/layout.ts";
import { fullBody, quickRead } from "../lib/blog/quickread.ts";
import { articleSchema } from "../lib/blog/schema.ts";
import type { ArticleMeta } from "../lib/blog/types.ts";

const a = (slug: string, date: string, tags: string[], extra: Partial<ArticleMeta> = {}): ArticleMeta => ({
  slug,
  title: slug,
  excerpt: "",
  date,
  readMins: 3,
  topic: "linux",
  tags,
  connectsTo: [],
  featured: false,
  status: "published",
  ...extra,
});

test("explicit threads run newer → older and beat automatic ones", () => {
  const g = buildGraph([
    a("old", "2026-01-01", ["x", "y"]),
    a("new", "2026-02-01", ["x", "y"], { connectsTo: [{ slug: "old", kind: "series", note: "part 2" }] }),
  ]);
  assert.equal(g.edges.length, 1);
  assert.deepEqual([g.edges[0].from, g.edges[0].to, g.edges[0].kind, g.edges[0].weight], ["new", "old", "series", 1]);
});

test("an older article declaring a newer one still yields newer → older", () => {
  const g = buildGraph([a("old", "2026-01-01", [], { connectsTo: [{ slug: "new", kind: "builds-on" }] }), a("new", "2026-02-01", [])]);
  assert.deepEqual([g.edges[0].from, g.edges[0].to, g.edges[0].weight], ["new", "old", 0.8]);
});

test("automatic threads need 2 shared tags or Jaccard ≥ 0.30, at most 3 per article", () => {
  // four spokes each share two tags with the hub and none with each other
  const hub = a("hub", "2026-06-01", ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"]);
  const spokes = [0, 1, 2, 3].map((i) => a(`s${i}`, `2026-0${i + 1}-01`, [`h${2 * i + 1}`, `h${2 * i + 2}`]));
  const lone = a("lone", "2026-05-15", ["h1", "z", "q", "r", "w"]);
  const g = buildGraph([hub, ...spokes, lone]);
  const hubEdges = g.edges.filter((e) => e.from === "hub" || e.to === "hub");
  assert.equal(hubEdges.length, 3);
  assert.ok(g.edges.every((e) => e.kind === "topic" && e.weight <= 0.7));
  assert.ok(g.loose.includes("lone"));
});

test("connections to unknown or self slugs are ignored", () => {
  const g = buildGraph([a("x", "2026-01-01", [], { connectsTo: [{ slug: "x", kind: "series" }, { slug: "ghost", kind: "builds-on" }] })]);
  assert.equal(g.edges.length, 0);
  assert.deepEqual(g.loose, ["x"]);
});

test("layout is deterministic, overlap-free and in whole pixels", () => {
  const items = Array.from({ length: 24 }, (_, i) =>
    a(`p${i}`, `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`, [`t${i % 5}`, `u${i % 3}`], {
      topic: (["tailoring", "fashion", "unified", "linux"] as const)[i % 4],
    }),
  );
  const g = buildGraph(items);
  const l1 = layoutBoard(items, g.edges);
  const l2 = layoutBoard([...items].reverse(), g.edges);
  assert.deepEqual(l1, l2);
  for (const p of l1.pins) assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y));
  for (const p of l1.pins)
    for (const q of l1.pins)
      if (p.slug < q.slug) assert.ok(!(p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h), `${p.slug} overlaps ${q.slug}`);
});

test("threads sag by clamp(d × 0.17, 14, 70) × jitter", () => {
  const g = threadGeom({ x: 0, y: 0 }, { x: 200, y: 0 }, 1);
  assert.ok(Math.abs(g.mid.y - 34) < 0.01);
  const far = threadGeom({ x: 0, y: 0 }, { x: 2000, y: 0 }, 1.15);
  assert.ok(Math.abs(far.mid.y - 70 * 1.15) < 0.01);
});

test("quick read: before <!--more-->, else the first two paragraphs", () => {
  assert.equal(quickRead("one\n\ntwo\n\n<!--more-->\n\nthree"), "one\n\ntwo");
  assert.equal(quickRead("## Head\n\none\n\n- list\n\ntwo\n\nthree"), "## Head\n\none\n\n- list\n\ntwo");
  assert.equal(fullBody("one\n\n<!-- more -->\n\ntwo"), "one\n\ntwo");
});

test("the schema rejects path tricks, bad dates and HTML-ish slugs", () => {
  const base = { slug: "ok-slug", title: "T", excerpt: "", date: "2026-02-28", readMins: 3, topic: "linux", tags: [], connectsTo: [], featured: false, status: "draft", body: "" };
  assert.ok(articleSchema.safeParse(base).success);
  for (const slug of ["../etc/passwd", "a/b", "A", "a--b", "-a", "a-", "a.md", "", "x".repeat(81)])
    assert.equal(articleSchema.safeParse({ ...base, slug }).success, false, slug);
  for (const date of ["2026-02-30", "2026-2-1", "yesterday"]) assert.equal(articleSchema.safeParse({ ...base, date }).success, false, date);
  assert.equal(articleSchema.safeParse({ ...base, status: "public" }).success, false);
  assert.equal(articleSchema.safeParse({ ...base, extra: 1 }).success, false);
  assert.equal(articleSchema.safeParse({ ...base, tags: ["UPPER"] }).success, false);
});

test("import: frontmatter optional, title from the first heading, slug from the file name", async () => {
  const { parseImport } = await import("../lib/blog/import.ts");
  const d = { topic: "linux", status: "draft", today: "2026-10-20" } as const;
  const r = parseImport("My First Post.md", "# Hello there\n\nFirst para.\n\nSecond para.", d);
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.equal(r.article.slug, "my-first-post");
  assert.equal(r.article.title, "Hello there");
  assert.equal(r.article.body.startsWith("First para."), true);
  assert.deepEqual([r.article.topic, r.article.status, r.article.date, r.article.readMins], ["linux", "draft", "2026-10-20", 1]);

  const f = parseImport("x.md", '---\ntitle: "T"\ntopic: fashion\nstatus: published\ntags: "A, b"\nconnectsTo: [other-piece]\nmood: sunny\n---\nBody', d);
  assert.ok(f.ok);
  if (!f.ok) return;
  assert.deepEqual([f.article.topic, f.article.status, f.article.tags, f.article.connectsTo[0]], ["fashion", "published", ["a", "b"], { slug: "other-piece", kind: "builds-on" }]);
  assert.deepEqual(f.ignored, ["mood"]);
});

test("import: invalid files are rejected with a reason", async () => {
  const { parseImport } = await import("../lib/blog/import.ts");
  const d = { topic: "linux", status: "draft", today: "2026-10-20" } as const;
  for (const [name, text] of [
    ["no-title.md", "just text"],
    ["bad.md", "---\ntitle: T\ntopic: cooking\n---\nx"],
    ["bad.md", "---\ntitle: T\ndate: 2026-02-30\n---\nx"],
    ["bad.md", "---\n: : :\n---\nx"],
    ["!!!.md", "# T\n\nx"],
    ["evil.md", "---\ntitle: T\nslug: ../../etc/passwd\n---\nx"],
  ]) {
    const r = parseImport(name, text, d);
    assert.equal(r.ok, false, `${name}: ${text}`);
  }
});

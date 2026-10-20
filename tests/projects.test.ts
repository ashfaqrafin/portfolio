import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseProjectFile, toBlocks } from "../lib/projects/file.ts";
import { parseLogoSvg } from "../lib/projects/logo.ts";

const DIR = path.join(import.meta.dirname, "..", "content", "projects");

test("logo: keeps geometry only, never scripts, handlers, styles or links", () => {
  const logo = parseLogoSvg(`<svg viewBox="0 0 100 100">
    <script>alert(1)</script>
    <style>path { fill: red }</style>
    <path d="M0 0L10 10" onclick="alert(1)" style="stroke:red" class="x" />
    <image href="https://evil.example/x.png" width="10" height="10" />
    <use href="#a" />
    <a href="javascript:alert(1)"><circle cx="5" cy="5" r="2" /></a>
    <text x="1" y="1">hi</text>
  </svg>`);
  assert.deepEqual(
    logo.shapes.map((s) => [s.tag, s.attrs]),
    [
      ["path", { d: "M0 0L10 10" }],
      ["circle", { cx: "5", cy: "5", r: "2" }],
    ],
  );
});

test("logo: skips defs, composes nested transforms, inherits fills", () => {
  const logo = parseLogoSvg(`<svg viewBox="0 0 50 50" fill="none">
    <defs><path id="a" d="M0 0L1 1" /></defs>
    <g transform="translate(5 5)"><g transform="scale(2)" fill="#000">
      <circle cx="1" cy="1" r="1" />
      <rect x="0" y="0" width="2" height="2" fill="none" />
    </g></g>
    <line x1="0" y1="0" x2="4" y2="4" />
  </svg>`);
  assert.deepEqual(
    logo.shapes.map((s) => [s.tag, s.attrs.transform ?? "", s.filled]),
    [
      ["circle", "translate(5 5) scale(2)", true],
      ["rect", "translate(5 5) scale(2)", false],
      ["line", "", false],
    ],
  );
  // with no fill anywhere, SVG's default is to fill
  assert.equal(parseLogoSvg(`<svg viewBox="0 0 1 1"><path d="M0 0L1 1"/></svg>`).shapes[0].filled, true);
});

test("logo: rejects bad values, needs a size and something to draw", () => {
  const logo = parseLogoSvg(`<svg width="40" height="20"><path d="M0 0 url(x)" /><circle cx="1" cy="1" r="calc(1)" /><polygon points="0,0 4,0 2,3" /></svg>`);
  assert.deepEqual(logo.viewBox, [0, 0, 40, 20]);
  assert.deepEqual(logo.shapes.map((s) => s.tag), ["polygon"]);
  assert.throws(() => parseLogoSvg(`<svg><path d="M0 0L1 1"/></svg>`), /viewBox/);
  assert.throws(() => parseLogoSvg(`<svg viewBox="0 0 1 1"><g/></svg>`), /no drawable/);
  assert.throws(() => parseLogoSvg(`<html></html>`), /not an SVG/);
});

const file = (fm: string, body = "Notes.") => `---\n${fm}\n---\n${body}\n`;
const base = `title: T\ntagline: A line.\nyear: 2026\nkind: Personal\nstatus: shipped`;

test("project: defaults, plain-text notes, and only web links", () => {
  const p = parseProjectFile("demo", file(base, "First para\nstill first.\n\n- one\n- two\n\nLast."));
  assert.equal(p.year, "2026");
  assert.deepEqual(p.stack, []);
  assert.equal(p.draft, false);
  assert.deepEqual(p.notes, [
    { kind: "p", text: "First para still first." },
    { kind: "list", items: ["one", "two"] },
    { kind: "p", text: "Last." },
  ]);
  assert.deepEqual(toBlocks("\n\n"), []);
  for (const href of ["javascript:alert(1)", "data:text/html,x", "/relative", "ftp://x.dev"]) {
    assert.throws(() => parseProjectFile("demo", file(`${base}\nlinks:\n  - label: X\n    href: "${href}"`)), /links/, href);
  }
  assert.throws(() => parseProjectFile("demo", file(base.replace("2026", "last year"))), /year/);
  assert.throws(() => parseProjectFile("demo", file(`${base}\nsecret: 1`)), /secret|Unrecognized/);
});

test("project: every file in content/projects parses, and every logo draws", () => {
  const files = readdirSync(DIR);
  const mds = files.filter((f) => f.endsWith(".md"));
  assert.ok(mds.length > 0);
  for (const md of mds) {
    const slug = md.slice(0, -3);
    assert.equal(parseProjectFile(slug, readFileSync(path.join(DIR, md), "utf8")).slug, slug);
    // a logo is optional (the page draws a blank sheet), but one that's there must parse
    if (files.includes(`${slug}.svg`)) assert.ok(parseLogoSvg(readFileSync(path.join(DIR, `${slug}.svg`), "utf8")).shapes.length > 0);
  }
});

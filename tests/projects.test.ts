import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parseProjectFile, toBlocks } from "../lib/projects/file.ts";
import { ART_LIMITS, classifyLogo, parseLogoSvg, serializeSvg, splitTraced } from "../lib/projects/logo.ts";

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
    // a logo is optional (the page draws a blank sheet), but one that's there must draw, as line art or as an illustration
    if (files.includes(`${slug}.svg`)) assert.ok(classifyLogo(readFileSync(path.join(DIR, `${slug}.svg`), "utf8")), `${slug}.svg draws nothing`);
  }
});

test("logo: a traced illustration is shaded in from an image, line art is drawn", () => {
  const blob = `M0 0L1 1${"L2 2".repeat(6000)}Z`; // over the line-art limit
  const art = classifyLogo(`<svg viewBox="0 0 10 10"><path d="${blob}" fill="#4f0b16"/><path d="M0 0L5 5" fill="#fff"/></svg>`);
  assert.equal(art?.kind, "art");
  assert.deepEqual(art?.kind === "art" && art.art.shapes.map((s) => s.color), ["#4f0b16", "#fff"]);
  assert.equal(classifyLogo(`<svg viewBox="0 0 10 10"><path d="M0 0L5 5" fill="none"/></svg>`)?.kind, "lines");
  assert.equal(classifyLogo(`<svg viewBox="0 0 10 10"><text>hi</text></svg>`), null);
});

test("logo: the image is rendered from a rebuilt SVG that holds only shapes and safe colours", () => {
  const logo = parseLogoSvg(
    `<svg viewBox="0 0 10 10" onload="alert(1)">
      <image href="file:///etc/passwd"/><script>alert(1)</script><style>*{}</style>
      <path d="M0 0L5 5" fill="url(#x)" onclick="alert(1)"/>
      <circle cx="5" cy="5" r="2" fill="#4f0b16"/>
      <rect x="0" y="0" width="1" height="1" fill="red&quot; onload=&quot;alert(1)"/>
    </svg>`,
    ART_LIMITS,
  );
  const out = serializeSvg(logo);
  assert.ok(!/script|onload|onclick|image|style|url\(|passwd|&quot;/i.test(out), out);
  assert.ok(out.includes(`fill="#4f0b16"`));
});

test("logo: traced line art (one filled path) is split back into lines, holes kept with their outline", () => {
  // two outlines (clockwise) and a hole (anticlockwise) inside the first, listed after the second
  const outerA = "M0 0L100 0L100 100L0 100Z";
  const outerB = "M200 300L260 300L260 360L200 360Z";
  const hole = "M10 10L10 90L90 90L90 10Z";
  const pieces = splitTraced(outerB + outerA + hole);
  assert.deepEqual(pieces?.map((p) => p.d), [outerA + hole, outerB]); // top first, the hole with its outline
  assert.ok(pieces!.every((p) => p.len > 0));
  // relative commands aren't measured: left as one path
  assert.equal(splitTraced("M0 0l10 0l0 10zM20 20l5 0l0 5z"), null);

  // 150 lines of ~40 points each: far over the 20,000-character limit as one path, under 240 pieces
  const line = (i: number) => `M${i * 6} 500` + Array.from({ length: 40 }, (_, k) => `L${i * 6 + (k % 2) * 3} ${500 + k * 2}`).join("") + "Z";
  const big = outerA + hole + Array.from({ length: 150 }, (_, i) => line(i)).join("");
  assert.ok(big.length > 20_000);
  const traced = classifyLogo(`<svg viewBox="0 0 1000 600"><path fill="#4a0f17" fill-rule="evenodd" d="${big}"/></svg>`);
  assert.equal(traced?.kind, "lines");
  assert.ok(traced?.kind === "lines" && traced.logo.shapes.every((s) => s.solid && s.attrs["fill-rule"] === "evenodd"));
});

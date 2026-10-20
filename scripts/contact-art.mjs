#!/usr/bin/env node
/* Pre-renders the contact section's illustrations (public/contact/contact*.svg)
   to small transparent WebPs. The sources are 0.7–3.9 MB each and carry a
   baked-in background (a flat rectangle, or a grey "transparency" checkerboard),
   which is dropped here so the paper shows through. Re-run after editing them:

     npm run contact:art          (needs Chromium; CHROMIUM_PATH to override) */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "public/contact");
const HEIGHT = 520; // drawn at most ~230px tall, so this covers 2× screens
// source → output, and which <path>s (by order) are background, not drawing
const ART = [
  { src: "contact1.svg", out: "tailor.webp", drop: [0] },
  { src: "contact2.svg", out: "coder.webp", drop: [0] },
  { src: "contact3.svg", out: "dakpion.webp", drop: [0, 1] },
  { src: "contact4.svg", out: "postbox.webp", drop: [] },
];

const tmp = mkdtempSync(path.join(tmpdir(), "contact-art-"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  for (const { src, out, drop } of ART) {
    let i = -1;
    const svg = readFileSync(path.join(DIR, src), "utf8").replace(/<path\b[^>]*?\/?>/gs, (m) => (drop.includes(++i) ? "" : m));
    const vb = /viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg);
    if (!vb) throw new Error(`${src} has no viewBox`);
    const h = HEIGHT;
    const w = Math.round((Number(vb[1]) / Number(vb[2])) * h);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><img id="a" style="display:block;width:${w}px;height:${h}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`,
    );
    await page.evaluate(() => document.getElementById("a").decode());
    const png = path.join(tmp, `${out}.png`);
    await page.screenshot({ path: png, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    const dest = path.join(DIR, out);
    execFileSync("magick", [png, "-trim", "+repage", "-quality", "84", "-define", "webp:method=6", "-define", "webp:alpha-quality=90", dest]);
    const dims = execFileSync("magick", ["identify", "-format", "%wx%h", dest], { encoding: "utf8" });
    console.log(`  ${out}  ${dims}  ${Math.round(statSync(dest).size / 1024)} KB  (svg ${Math.round(statSync(path.join(DIR, src)).size / 1024)} KB)`);
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}

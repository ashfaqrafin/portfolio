#!/usr/bin/env node
/* Pre-renders the hero's SVG artwork to WebP.

   The hero draws each piece into a canvas at stage size × dpr. Drawing a 0.3–1.9 MB
   SVG means rasterising thousands of paths on the main thread, every mount and
   every resize. A WebP rendered once by the same browser engine decodes off the
   main thread and just scales. Re-run after editing any SVG in public/hero/:

     npm run hero:art            (needs Chromium; CHROMIUM_PATH to override)

   Sizes cover desktop stages at 2× and phones; larger stages (portrait tablets
   at 2×) fall back to the SVG, see pickArt() in app/components/hero/config.ts. */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "public/hero");
const HERO_ART_PX = 1300; // keep in step with HERO_ART_PX in app/components/hero/config.ts
const ART = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "suit", "patterns"];

const tmp = mkdtempSync(path.join(tmpdir(), "hero-art-"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  for (const name of ART) {
    const svg = readFileSync(path.join(DIR, `${name}.svg`), "utf8");
    const vb = /viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg);
    if (!vb) throw new Error(`${name}.svg has no viewBox`);
    const [vw, vh] = [Number(vb[1]), Number(vb[2])];
    const h = HERO_ART_PX;
    const w = Math.round((vw / vh) * h);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><img id="a" style="display:block;width:${w}px;height:${h}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`,
    );
    await page.evaluate(() => document.getElementById("a").decode());
    const png = path.join(tmp, `${name}.png`);
    await page.screenshot({ path: png, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    const out = path.join(DIR, `${name}.webp`);
    execFileSync("magick", [png, "-quality", "82", "-define", "webp:method=6", "-define", "webp:alpha-quality=90", out]);
    console.log(`  ${name}.webp  ${w}×${h}  ${Math.round(statSync(out).size / 1024)} KB  (svg ${Math.round(svg.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}

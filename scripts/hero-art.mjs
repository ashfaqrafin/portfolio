#!/usr/bin/env node
/* Pre-renders the hero's SVG artwork to WebP, drawn over in coloured pencil.

   The hero draws each piece into a canvas at stage size × dpr. Drawing a 0.3–1.9 MB
   SVG means rasterising thousands of paths on the main thread, every mount and
   every resize. A WebP rendered once by the same browser engine decodes off the
   main thread and just scales. On the way, pencil.mjs redraws the clean vector
   lines by hand: grain, pressure, a loose second pass and hatching. Re-run after
   editing any SVG in public/hero/:

     npm run hero:art            (needs Chromium; CHROMIUM_PATH to override)

   Two sizes: HERO_ART_PX tall covers desktop stages at 2× and phones; the
   .xl.webp covers larger stages (portrait tablets at 2×), see artExt() in
   app/components/hero/config.ts. */

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { pencil } from "./pencil.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "public/hero");
const HERO_ART_PX = 1300; // keep in step with HERO_ART_PX in app/components/hero/config.ts
const HERO_ART_XL_PX = 1800; // and HERO_ART_XL_PX
const ART = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "suit", "patterns"];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  for (const name of ART) {
    const svg = readFileSync(path.join(DIR, `${name}.svg`), "utf8");
    const vb = /viewBox="\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg);
    if (!vb) throw new Error(`${name}.svg has no viewBox`);
    const [vw, vh] = [Number(vb[1]), Number(vb[2])];
    for (const [h, suffix] of [
      [HERO_ART_PX, ""],
      [HERO_ART_XL_PX, ".xl"],
    ]) {
      const w = Math.round((vw / vh) * h);
      await page.setViewportSize({ width: w, height: h });
      await page.setContent(
        `<html><body style="margin:0;background:transparent"><img id="a" style="display:block;width:${w}px;height:${h}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`,
      );
      await page.evaluate(() => document.getElementById("a").decode());
      const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      // the figure stands on the floor; the suit flies and the props lie on the page
      const drawn = pencil({ data, width: info.width, height: info.height }, { ground: name.startsWith("avatar") });
      const out = path.join(DIR, `${name}${suffix}.webp`);
      await sharp(drawn.data, { raw: { width: w, height: h, channels: 4 } })
        .webp({ quality: 82, alphaQuality: 90, effort: 6 })
        .toFile(out);
      console.log(`  ${name}${suffix}.webp  ${w}×${h}  ${Math.round(statSync(out).size / 1024)} KB  (svg ${Math.round(svg.length / 1024)} KB)`);
    }
  }
} finally {
  await browser.close();
}

#!/usr/bin/env node
/* The intro's linen: the photograph, as a WebP small enough to be on screen
   with the first paint. Re-run after replacing the source:

     npm run intro:art

   Source: design/intro/fabric.png (kept out of public/, not deployed).
   Output: public/intro/fabric.webp */

import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "design/intro/fabric.png");
const OUT = path.join(ROOT, "public/intro/fabric.webp");

mkdirSync(path.dirname(OUT), { recursive: true });
const { width, height } = await sharp(SRC).metadata();
await sharp(SRC).webp({ quality: 80, effort: 6 }).toFile(OUT);
console.log(`wrote ${path.relative(ROOT, OUT)}: ${width} × ${height}, ${Math.round(statSync(OUT).size / 1024)} KB`);

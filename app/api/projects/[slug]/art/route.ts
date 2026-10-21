import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { isValidSlug } from "@/lib/blog/schema";
import { artVersion } from "@/lib/projects/data";
import { classifyLogo, serializeSvg } from "@/lib/projects/logo";

/* A project's illustration as a small WebP, for the sketchbook to shade in.
   The raw file is never rendered: it is parsed down to its safe shapes and
   rebuilt (serializeSvg) first, so nothing in it can reach the renderer or
   load another file. The URL carries a hash of the file (?v=), so the image
   is cached forever and a new drawing simply gets a new URL. */

const DIR = path.join(process.cwd(), "content", "projects");
const HEIGHT = 900;
const rendered = new Map<string, Promise<Buffer>>();

export async function GET(_req: Request, { params }: RouteContext<"/api/projects/[slug]/art">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new Response("Not found", { status: 404 });
  let svg: string;
  try {
    svg = await readFile(path.join(DIR, `${slug}.svg`), "utf8");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const kind = classifyLogo(svg);
  if (kind?.kind !== "art") return new Response("Not found", { status: 404 });

  const key = `${slug}@${artVersion(svg)}`;
  let job = rendered.get(key);
  if (!job) {
    job = sharp(Buffer.from(serializeSvg(kind.art)))
      .resize({ height: HEIGHT })
      .webp({ quality: 82, alphaQuality: 90, effort: 5 })
      .toBuffer();
    job.catch(() => rendered.delete(key));
    rendered.set(key, job);
  }
  const body = await job;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

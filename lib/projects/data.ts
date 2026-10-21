import "server-only";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { parseProjectFile, type Project } from "./file.ts";
import { classifyLogo, type Logo } from "./logo.ts";

/* The sketchbook's pages: content/projects/<slug>.md, each with an optional
   <slug>.svg logo beside it. Read once and cached; edit the files and redeploy
   (the dev server needs a restart to see hand edits, like the articles).

   A logo is either line art, drawn stroke by stroke in the page, or an
   illustration (a traced drawing too big to draw that way), which the page
   shades in from an image rendered by app/api/projects/[slug]/art. */

export const PROJECTS_TAG = "projects";
const DIR = path.join(process.cwd(), "content", "projects");

/** an illustration: its image and its natural size */
export type ProjectArt = { src: string; w: number; h: number };
export type ProjectData = Project & { logo: Logo | null; art: ProjectArt | null };

/** a short hash of the drawing, so its image URL changes whenever the file does */
export function artVersion(svg: string) {
  return createHash("sha256").update(svg).digest("hex").slice(0, 12);
}

export async function getProjects(): Promise<ProjectData[]> {
  "use cache";
  cacheTag(PROJECTS_TAG);
  cacheLife("max");
  let names: string[];
  try {
    names = await readdir(DIR);
  } catch {
    return [];
  }
  const projects = await Promise.all(
    names
      .filter((n) => n.endsWith(".md"))
      .map(async (n): Promise<ProjectData> => {
        const slug = n.slice(0, -3);
        const project = parseProjectFile(slug, await readFile(path.join(DIR, n), "utf8"));
        let logo: Logo | null = null;
        let art: ProjectArt | null = null;
        if (names.includes(`${slug}.svg`)) {
          const svg = await readFile(path.join(DIR, `${slug}.svg`), "utf8");
          const kind = classifyLogo(svg);
          if (kind?.kind === "lines") logo = kind.logo;
          else if (kind?.kind === "art") {
            const [, , w, h] = kind.art.viewBox;
            art = { src: `/api/projects/${slug}/art?v=${artVersion(svg)}`, w, h };
          }
          // a broken logo shouldn't take the page down: the page draws a blank frame
          else console.warn(`[projects] ${slug}.svg: nothing in it can be drawn`);
        }
        return { ...project, logo, art };
      }),
  );
  return projects.filter((p) => !p.draft).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

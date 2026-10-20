import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { parseProjectFile, type Project } from "./file.ts";
import { parseLogoSvg, type Logo } from "./logo.ts";

/* The sketchbook's pages: content/projects/<slug>.md, each with an optional
   <slug>.svg logo beside it. Read once and cached; edit the files and redeploy
   (the dev server needs a restart to see hand edits, like the articles). */

export const PROJECTS_TAG = "projects";
const DIR = path.join(process.cwd(), "content", "projects");

export type ProjectData = Project & { logo: Logo | null };

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
        if (names.includes(`${slug}.svg`)) {
          try {
            logo = parseLogoSvg(await readFile(path.join(DIR, `${slug}.svg`), "utf8"));
          } catch (err) {
            // a broken logo shouldn't take the page down: the page draws a blank frame
            console.warn(`[projects] ${slug}.svg: ${(err as Error).message}`);
          }
        }
        return { ...project, logo };
      }),
  );
  return projects.filter((p) => !p.draft).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

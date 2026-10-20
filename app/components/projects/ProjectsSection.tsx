import { getProjects } from "@/lib/projects/data";
import SketchBook from "./SketchBook";

/* content/projects/*.md (and their .svg logos), read and cached on the server. */
export default async function ProjectsSection() {
  const projects = await getProjects();
  return <SketchBook projects={projects} />;
}

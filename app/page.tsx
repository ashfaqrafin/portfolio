import BlogSection from "./components/blog/BlogSection";
import Hero from "./components/hero/Hero";
import Intro from "./components/intro/Intro";
import ProjectsSection from "./components/projects/ProjectsSection";
import ChapterSeam from "./components/site/ChapterSeam";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Intro />
      <Hero />
      <ChapterSeam id="blog" part="II" title="The archive" line="Every lane leaves a thread. Here’s where they all lead.">
        <BlogSection />
      </ChapterSeam>
      <ChapterSeam id="projects" part="III" title="Projects" side="left" line="Pull a thread long enough and it becomes a thing.">
        <ProjectsSection />
      </ChapterSeam>
    </main>
  );
}

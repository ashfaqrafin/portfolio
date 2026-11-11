import BlogSection from "./components/blog/BlogSection";
import Crossroads from "./components/crossroads/Crossroads";
import Contact from "./components/contact/Contact";
import Hero from "./components/hero/Hero";
import ProjectsSection from "./components/projects/ProjectsSection";
import ChapterSeam from "./components/site/ChapterSeam";
import WorldDoor from "./components/site/WorldDoor";
import Study from "./components/study/Study";

export default function Home() {
  return (
    <>
      <Crossroads />
      <main className="home flex flex-1 flex-col">
        <Hero />
        <ChapterSeam id="blog" no="01" title="The archive" line="Every lane leaves a thread. Here’s where they all lead.">
          <BlogSection />
        </ChapterSeam>
        <ChapterSeam id="education" no="02" title="Education" side="left" line="Twist three fibres together and the thread holds.">
          <Study />
        </ChapterSeam>
        <ChapterSeam id="projects" no="03" title="Projects" line="Pull a thread long enough and it becomes a thing.">
          <ProjectsSection />
        </ChapterSeam>
        <ChapterSeam id="contact" no="04" title="Contact" side="left" line="Every thread ends at someone’s door. This one’s mine.">
          <Contact />
        </ChapterSeam>
        <WorldDoor />
      </main>
    </>
  );
}

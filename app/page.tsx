import BlogSection from "./components/blog/BlogSection";
import Hero from "./components/hero/Hero";
import ChapterSeam from "./components/site/ChapterSeam";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <ChapterSeam id="blog" part="II" title="The archive" line="Every lane leaves a thread. Here’s where they all lead.">
        <BlogSection />
      </ChapterSeam>
    </main>
  );
}

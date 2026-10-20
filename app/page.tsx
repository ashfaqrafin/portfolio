import BlogSection from "./components/blog/BlogSection";
import Hero from "./components/hero/Hero";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <section id="blog" className="home-blog" aria-label="Writing">
        <BlogSection />
      </section>
    </main>
  );
}

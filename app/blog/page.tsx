import type { Metadata } from "next";
import BlogSection from "../components/blog/BlogSection";
import Masthead from "../components/site/Masthead";

export const metadata: Metadata = {
  title: "The Thread Board — Ashfaq",
  description: "Writing on tailoring, fashion and Linux, pinned to a board and tied together by the threads between the pieces.",
};

export default function BlogPage() {
  return (
    <main className="page">
      <Masthead current="board" />
      <BlogSection headingLevel={1} />
    </main>
  );
}

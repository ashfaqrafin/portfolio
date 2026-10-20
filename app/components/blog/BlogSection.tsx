import { getBoard } from "@/lib/blog/data";
import "../site/site.css";
import BlogBoard from "./BlogBoard";

/* Published articles only, bodies stripped, laid out on the server (cached). */
export default async function BlogSection({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const board = await getBoard();
  return (
    <div className="sheet">
      <BlogBoard board={board} headingLevel={headingLevel} />
    </div>
  );
}

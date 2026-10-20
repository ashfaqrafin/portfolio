import Link from "next/link";
import "./site.css";

/* The hero's masthead, for pages without the hero. */
export default function Masthead({ current }: { current?: "board" | "article" }) {
  return (
    <header className="site-masthead">
      <Link className="site-mark" href="/" aria-label="Ashfaq, home">
        <span>Ashfaq</span>
        <svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M2 6C20 2 34 8 54 4.5C74 1.5 92 7.5 118 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </Link>
      <div className="site-meta">
        <span className="site-annot">pick a lane. or don&rsquo;t.</span>
        <nav className="site-nav" aria-label="Site">
          <Link href="/">Portfolio</Link>
          <Link href="/blog" aria-current={current === "board" ? "page" : undefined}>
            Thread board
          </Link>
        </nav>
      </div>
    </header>
  );
}

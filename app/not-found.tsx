import Link from "next/link";
import Masthead from "./components/site/Masthead";

export default function NotFound() {
  return (
    <main className="page">
      <Masthead />
      <div className="sheet nf">
        <p className="nf-kicker">404 &middot; loose end</p>
        <h1 className="nf-title">This thread doesn&rsquo;t lead anywhere.</h1>
        <p className="nf-sub">Maybe it was never pinned, or it&rsquo;s still on the cutting table.</p>
        <p className="nf-links">
          <Link href="/blog">Back to the thread board</Link>
          <Link href="/">Home</Link>
        </p>
      </div>
    </main>
  );
}

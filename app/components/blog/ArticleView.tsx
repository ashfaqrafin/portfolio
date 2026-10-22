import Link from "next/link";
import type { ArticlePageData } from "@/lib/blog/data";
import { formatDate } from "@/lib/blog/format";
import { REL_LABEL } from "@/lib/blog/graph";
import { fullBody } from "@/lib/blog/quickread";
import { TOPIC_ANNOT, TOPIC_LABEL } from "@/lib/blog/topics";
import Markdown from "../threadboard/Markdown";
import "./article.css";
import ReadingProgress from "./ReadingProgress";

/* The full article page. Links to other articles are plain <a> on purpose: a
   <Link> to /blog/<slug> would be intercepted into the quick-read popup. */
export default function ArticleView({ data }: { data: ArticlePageData }) {
  const { article: a, relations, prev, next } = data;
  return (
    <>
      <ReadingProgress target=".art" />
      <article className="sheet art" data-topic={a.topic} data-no-cut>
        <Link className="art-back" href="/blog">
          <span aria-hidden="true">&larr;</span> back to the board
        </Link>

        <header className="art-head">
          <div className="art-skin" aria-hidden="true">
            {a.topic === "linux" && <span className="art-skin-path">~/threads/{a.slug}.md</span>}
          </div>
          <p className="art-kicker">
            <span>{TOPIC_LABEL[a.topic]}</span>
            <span aria-hidden="true">&middot;</span>
            <time dateTime={a.date}>{formatDate(a.date)}</time>
            <span aria-hidden="true">&middot;</span>
            <span>{a.readMins} min read</span>
          </p>
          <h1 className="art-title">
            {a.topic === "linux" && <span className="art-prompt" aria-hidden="true">$ </span>}
            {a.title}
          </h1>
          {a.excerpt && <p className="art-excerpt">{a.excerpt}</p>}
          {a.tags.length > 0 && (
            <ul className="art-tags" aria-label="Tags">
              {a.tags.map((t) => (
                <li key={t}>#{t}</li>
              ))}
            </ul>
          )}
        </header>

        <Markdown source={fullBody(a.body)} className="md art-body" />

        <footer className="art-foot">
          <p className="art-sign">
            &mdash; Ashfaq, from the {TOPIC_LABEL[a.topic].toLowerCase()} lane <span aria-hidden="true">({TOPIC_ANNOT[a.topic]})</span>
          </p>

          <section className="art-threads" aria-labelledby="art-threads-h">
            <h2 id="art-threads-h">Threads from this piece</h2>
            {relations.length ? (
              <ul>
                {relations.map((r) => (
                  <li key={r.slug}>
                    <a className="art-thread" href={`/blog/${r.slug}`} data-topic={r.topic} data-kind={r.kind}>
                      <span className="art-thread-line" aria-hidden="true" />
                      <span className="art-thread-rel">
                        {REL_LABEL[r.rel]}
                        {r.note && <em> &middot; {r.note}</em>}
                        {r.kind === "topic" && r.shared.length > 0 && <em> &middot; {r.shared.map((t) => `#${t}`).join(" ")}</em>}
                      </span>
                      <span className="art-thread-title">{r.title}</span>
                      <span className="art-thread-meta">
                        {TOPIC_LABEL[r.topic]} &middot; {formatDate(r.date)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="art-loose">A loose thread: this piece isn&rsquo;t tied to any other yet.</p>
            )}
          </section>

          <nav className="art-pager" aria-label="More articles">
            {prev ? (
              <a href={`/blog/${prev.slug}`} rel="prev">
                <span className="art-pager-k">&larr; older</span>
                <span className="art-pager-t">{prev.title}</span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a href={`/blog/${next.slug}`} rel="next" className="art-pager-next">
                <span className="art-pager-k">newer &rarr;</span>
                <span className="art-pager-t">{next.title}</span>
              </a>
            ) : (
              <span />
            )}
          </nav>

          <Link className="art-board" href="/blog">
            See every thread on the board
          </Link>
        </footer>
      </article>
    </>
  );
}

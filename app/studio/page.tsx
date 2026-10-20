import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth/guard";
import { formatDate } from "@/lib/blog/format";
import { buildGraph } from "@/lib/blog/graph";
import { TOPIC_LABEL } from "@/lib/blog/topics";
import { store } from "@/lib/store";
import { deleteArticle } from "./actions";
import DeleteButton from "./DeleteButton";

async function Articles({ searchParams }: { searchParams: PageProps<"/studio">["searchParams"] }) {
  if (!(await isOwner())) redirect("/signin?callbackUrl=/studio"); // gate 2

  const [all, sp] = await Promise.all([store.list({ includeDrafts: true }), searchParams]);
  const rows = [...all].reverse();
  const published = all.filter((a) => a.status === "published");
  const graph = buildGraph(published);
  const threads = new Map<string, number>();
  for (const e of graph.edges) for (const s of [e.from, e.to]) threads.set(s, (threads.get(s) ?? 0) + 1);
  const saved = typeof sp.saved === "string" ? all.find((a) => a.slug === sp.saved) : undefined;

  return (
    <>
      {saved && (
        <p className="st-toast" role="status">
          Saved <strong>{saved.title}</strong>
          {saved.status === "published" ? (
            <>
              {" "}
              &middot; <a href={`/blog/${saved.slug}`}>see it live</a>
            </>
          ) : (
            " as a draft"
          )}
        </p>
      )}
      {sp.deleted && (
        <p className="st-toast" role="status">
          Deleted.
        </p>
      )}
      <p className="st-stats">
        {all.length} articles &middot; {published.length} published &middot; {all.length - published.length} drafts &middot; {graph.edges.length} threads on the board
      </p>
      {rows.length === 0 ? (
        <p className="st-empty">
          Nothing here yet. <Link href="/studio/new">Write the first piece.</Link>
        </p>
      ) : (
        <table className="st-table">
          <thead>
            <tr>
              <th scope="col">Article</th>
              <th scope="col">Status</th>
              <th scope="col">Threads</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.slug} data-slug={a.slug}>
                <td>
                  <a className="st-title" href={`/studio/${a.slug}`}>
                    {a.title}
                  </a>
                  <span className="st-meta">
                    {TOPIC_LABEL[a.topic]} &middot; {formatDate(a.date)} &middot; {a.readMins} min{a.featured ? " · featured" : ""}
                  </span>
                </td>
                <td>
                  <span className="st-badge" data-status={a.status}>
                    {a.status}
                  </span>
                </td>
                <td className="st-num">{a.status === "published" ? (threads.get(a.slug) ?? "loose") : "—"}</td>
                <td className="st-actions">
                  <a href={`/studio/${a.slug}`}>Edit</a>
                  {a.status === "published" && <a href={`/blog/${a.slug}`}>View</a>}
                  <form action={deleteArticle}>
                    <input type="hidden" name="slug" value={a.slug} />
                    <DeleteButton title={a.title} />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function StudioPage({ searchParams }: PageProps<"/studio">) {
  return (
    <section className="sheet st-sheet" aria-labelledby="st-h">
      <div className="st-head">
        <div>
          <p className="st-kicker">The studio &middot; drafts included</p>
          <h1 className="st-h1" id="st-h">
            Articles
          </h1>
        </div>
        <div className="st-head-actions">
          <Link className="st-btn" href="/studio/import">
            Import .md
          </Link>
          <Link className="st-btn st-primary" href="/studio/new">
            + New article
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className="st-loading">Opening the drawer&hellip;</p>}>
        <Articles searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth/guard";
import { metaOf } from "@/lib/blog/meta";
import { isValidSlug } from "@/lib/blog/schema";
import { store } from "@/lib/store";
import Editor from "../Editor";

async function EditEditor({ params }: { params: PageProps<"/studio/[slug]">["params"] }) {
  const { slug } = await params;
  if (!(await isOwner())) redirect(`/signin?callbackUrl=/studio/${isValidSlug(slug) ? slug : ""}`); // gate 2
  const article = await store.get(slug, { includeDrafts: true });
  if (!article) notFound();
  const others = (await store.list({ includeDrafts: true })).filter((a) => a.slug !== slug).map(metaOf);
  return <Editor mode="edit" initial={article} others={others} />;
}

export default function EditArticlePage({ params }: PageProps<"/studio/[slug]">) {
  return (
    <Suspense fallback={<p className="st-loading">Unfolding the pattern&hellip;</p>}>
      <EditEditor params={params} />
    </Suspense>
  );
}

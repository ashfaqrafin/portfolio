import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isOwner } from "@/lib/auth/guard";
import { metaOf } from "@/lib/blog/meta";
import { store } from "@/lib/store";
import Editor, { type EditorArticle } from "../Editor";

async function NewEditor() {
  if (!(await isOwner())) redirect("/signin?callbackUrl=/studio/new"); // gate 2
  const all = await store.list({ includeDrafts: true });
  const others = all.map(metaOf);
  const initial: EditorArticle = {
    slug: "",
    title: "",
    excerpt: "",
    date: new Date().toISOString().slice(0, 10),
    readMins: 3,
    topic: "unified",
    tags: [],
    connectsTo: [],
    featured: false,
    status: "draft",
    body: "",
  };
  return <Editor mode="create" initial={initial} others={others} />;
}

export default function NewArticlePage() {
  return (
    <Suspense fallback={<p className="st-loading">Laying out the paper&hellip;</p>}>
      <NewEditor />
    </Suspense>
  );
}

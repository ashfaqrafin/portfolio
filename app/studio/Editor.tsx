"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { formatDate } from "@/lib/blog/format";
import { buildGraph, REL_LABEL, relationsOf } from "@/lib/blog/graph";
import { quickRead, suggestReadMins, wordCount } from "@/lib/blog/quickread";
import { TOPIC_LABEL, TOPIC_SKIN, TOPICS } from "@/lib/blog/topics";
import type { Article, ArticleMeta, ThreadKind, Topic } from "@/lib/blog/types";
import Markdown from "../components/threadboard/Markdown";
import { saveArticle, type SaveState } from "./actions";

export type EditorArticle = Article;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

function Field({ label, name, errors, hint, children }: { label: string; name: string; errors?: string[]; hint?: string; children: React.ReactNode }) {
  return (
    <div className="st-field" data-invalid={errors?.length ? "" : undefined}>
      <label htmlFor={`f-${name}`}>{label}</label>
      {children}
      {hint && !errors?.length && <p className="st-hint">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} className="st-err" id={`e-${name}`}>
          {e}
        </p>
      ))}
    </div>
  );
}

export default function Editor({ mode, initial, others }: { mode: "create" | "edit"; initial: EditorArticle; others: ArticleMeta[] }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(saveArticle, null);
  const fe = state?.fieldErrors ?? {};

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [date, setDate] = useState(initial.date);
  const [readMins, setReadMins] = useState(String(initial.readMins));
  const [topic, setTopic] = useState<Topic>(initial.topic);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [featured, setFeatured] = useState(initial.featured);
  const [status, setStatus] = useState(initial.status);
  const [body, setBody] = useState(initial.body);
  const [links, setLinks] = useState<Record<string, { kind: ThreadKind; note: string }>>(() =>
    Object.fromEntries(initial.connectsTo.map((c) => [c.slug, { kind: c.kind, note: c.note ?? "" }])),
  );
  const [tab, setTab] = useState<"write" | "preview">("write");

  const effSlug = mode === "edit" ? initial.slug : slugTouched ? slug : slugify(title);
  const tagList = useMemo(
    () => [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))],
    [tags],
  );
  const suggested = suggestReadMins(body);
  const words = wordCount(body);
  const newestFirst = useMemo(() => [...others].sort((a, b) => (a.date < b.date ? 1 : -1)), [others]);

  // live thread preview: the same rules the board uses, over the published articles plus this one
  const preview = useMemo(() => {
    const me: ArticleMeta = {
      slug: effSlug || "this-article",
      title: title || "This article",
      excerpt,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "9999-12-31",
      readMins: 1,
      topic,
      tags: tagList,
      connectsTo: Object.entries(links).map(([s, v]) => ({ slug: s, kind: v.kind, note: v.note || undefined })),
      featured,
      status: "published",
    };
    const pub = others.filter((o) => o.status === "published");
    const rels = relationsOf(me.slug, buildGraph([...pub, me]).edges);
    const byS = new Map(others.map((o) => [o.slug, o]));
    const toDrafts = Object.keys(links).filter((s) => byS.get(s)?.status === "draft");
    return { rels: rels.map((r) => ({ ...r, other: byS.get(r.slug)! })), toDrafts, byS };
  }, [effSlug, title, excerpt, date, topic, tagList, links, featured, others]);

  const toggle = (s: string, on: boolean) =>
    setLinks((l) => {
      const n = { ...l };
      if (on) n[s] = n[s] ?? { kind: "builds-on", note: "" };
      else delete n[s];
      return n;
    });

  return (
    <form action={formAction} className="st-editor" noValidate>
      <input type="hidden" name="mode" value={mode} />
      {mode === "edit" && <input type="hidden" name="originalSlug" value={initial.slug} />}

      <div className="sheet st-sheet st-main">
        <div className="st-head">
          <div>
            <p className="st-kicker">{mode === "edit" ? "Editing" : "New article"}</p>
            <h1 className="st-h1">{title || (mode === "edit" ? initial.title : "Untitled piece")}</h1>
          </div>
        </div>

        {state?.formError && (
          <p className="st-alert" role="alert">
            {state.formError}
          </p>
        )}

        <Field label="Title" name="title" errors={fe.title}>
          <input id="f-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required className="st-input st-input-title" />
        </Field>

        <div className="st-row">
          <Field label="Slug" name="slug" errors={fe.slug} hint={mode === "edit" ? "Fixed once the article exists." : "Suggested from the title; fixed after the first save."}>
            <input
              id="f-slug"
              name="slug"
              value={effSlug}
              readOnly={mode === "edit"}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              maxLength={80}
              className="st-input st-mono"
              aria-describedby={fe.slug ? "e-slug" : undefined}
            />
          </Field>
          <Field label="Date" name="date" errors={fe.date}>
            <input id="f-date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="st-input st-mono" />
          </Field>
        </div>

        <Field label="Excerpt" name="excerpt" errors={fe.excerpt} hint={`${excerpt.length}/300 · shown on the pin preview and under the title`}>
          <textarea id="f-excerpt" name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={300} rows={2} className="st-input" />
        </Field>

        <div className="st-row st-row-3">
          <Field label="Topic" name="topic" errors={fe.topic} hint={`pin skin: ${TOPIC_SKIN[topic]}`}>
            <select id="f-topic" name="topic" value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className="st-input">
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {TOPIC_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Read time (min)" name="readMins" errors={fe.readMins} hint={`${words} words · about ${suggested} min`}>
            <div className="st-inline">
              <input id="f-readMins" name="readMins" type="number" min={1} max={120} value={readMins} onChange={(e) => setReadMins(e.target.value)} className="st-input st-mono" />
              {String(suggested) !== readMins && (
                <button type="button" className="st-link" onClick={() => setReadMins(String(suggested))}>
                  use {suggested}
                </button>
              )}
            </div>
          </Field>
          <Field label="Status" name="status" errors={fe.status}>
            <select id="f-status" name="status" value={status} onChange={(e) => setStatus(e.target.value as Article["status"])} className="st-input">
              <option value="draft">Draft (only you can see it)</option>
              <option value="published">Published</option>
            </select>
          </Field>
        </div>

        <div className="st-row">
          <Field label="Tags" name="tags" errors={fe.tags} hint="comma separated, lowercase, up to 12">
            <input id="f-tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="st-input st-mono" placeholder="dotfiles, terminal, linux" />
          </Field>
          <div className="st-field st-check">
            <label>
              <input type="checkbox" name="featured" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured{" "}
              <span className="st-hint">a larger pin</span>
            </label>
          </div>
        </div>

        <div className="st-field" data-invalid={fe.body?.length ? "" : undefined}>
          <div className="st-tabs" role="tablist" aria-label="Body">
            <label htmlFor="f-body" className="st-tabs-label">
              Body
            </label>
            <button type="button" role="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>
              Write
            </button>
            <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
              Preview
            </button>
          </div>
          <textarea
            id="f-body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={22}
            maxLength={100_000}
            className="st-input st-body"
            hidden={tab !== "write"}
            placeholder={"Markdown. The first two paragraphs, or everything before a line with <!--more-->, become the quick read."}
          />
          {tab === "preview" && (
            <div className="st-preview">
              <p className="st-preview-k">Quick read (the popup)</p>
              <Markdown source={quickRead(body) || "_Nothing yet._"} />
              <p className="st-preview-k">Full article</p>
              <Markdown source={body.replace(/^[ \t]*<!--\s*more\s*-->[ \t]*$/im, "") || "_Nothing yet._"} />
            </div>
          )}
          <p className="st-hint">
            {body.length.toLocaleString("en")}/100,000 &middot; raw HTML is ignored &middot; add <code>&lt;!--more--&gt;</code> on its own line to end the quick read
          </p>
          {fe.body?.map((e) => (
            <p key={e} className="st-err">
              {e}
            </p>
          ))}
        </div>

        <div className="st-submit">
          <button type="submit" className="st-btn st-primary" disabled={pending}>
            {pending ? "Saving…" : status === "published" ? "Save & publish" : "Save draft"}
          </button>
          <Link className="st-link" href="/studio">
            Cancel
          </Link>
        </div>
      </div>

      <aside className="st-side">
        <section className="sheet st-sheet st-threads" aria-labelledby="st-threads-h">
          <h2 className="st-h2" id="st-threads-h">
            Thread preview
          </h2>
          {status === "draft" && <p className="st-hint">Drafts aren&rsquo;t on the board. Once published, this piece would get:</p>}
          {preview.rels.length ? (
            <ul className="st-rels" data-testid="thread-preview">
              {preview.rels.map((r) => (
                <li key={r.slug} data-kind={r.kind}>
                  <span className="st-rel-line" aria-hidden="true" />
                  <span className="st-rel-k">
                    {REL_LABEL[r.rel]}
                    {r.kind === "topic" ? " (automatic)" : ""}
                  </span>
                  <span className="st-rel-t">{r.other?.title ?? r.slug}</span>
                  <span className="st-rel-why">{r.note ? `“${r.note}”` : r.shared.length ? r.shared.map((t) => `#${t}`).join(" ") : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="st-loose" data-testid="thread-preview">
              It would hang loose: no explicit threads, and no published piece shares two tags with it.
            </p>
          )}
          {preview.toDrafts.length > 0 && <p className="st-hint">Threads to drafts appear once those drafts are published too.</p>}
        </section>

        <section className="sheet st-sheet" aria-labelledby="st-explicit-h">
          <h2 className="st-h2" id="st-explicit-h">
            Explicit threads
          </h2>
          <p className="st-hint">Tick a piece this one builds on or continues.</p>
          {fe.connectsTo?.map((e) => (
            <p key={e} className="st-err">
              {e}
            </p>
          ))}
          <ul className="st-connect">
            {newestFirst.map((o) => {
              const on = !!links[o.slug];
              return (
                <li key={o.slug} data-on={on ? "" : undefined}>
                  <label>
                    <input type="checkbox" name="connect" value={o.slug} checked={on} onChange={(e) => toggle(o.slug, e.target.checked)} />
                    <span className="st-c-t">{o.title}</span>
                    <span className="st-c-m">
                      {TOPIC_LABEL[o.topic]} &middot; {formatDate(o.date)}
                      {o.status === "draft" ? " · draft" : ""}
                    </span>
                  </label>
                  {on && (
                    <div className="st-c-opts">
                      <select
                        name={`kind:${o.slug}`}
                        value={links[o.slug].kind}
                        aria-label={`How this relates to ${o.title}`}
                        onChange={(e) => setLinks((l) => ({ ...l, [o.slug]: { ...l[o.slug], kind: e.target.value as ThreadKind } }))}
                        className="st-input"
                      >
                        <option value="builds-on">builds on</option>
                        <option value="series">continues (series)</option>
                      </select>
                      <input
                        name={`note:${o.slug}`}
                        value={links[o.slug].note}
                        maxLength={60}
                        placeholder="note, e.g. part 2"
                        aria-label={`Note for the thread to ${o.title}`}
                        onChange={(e) => setLinks((l) => ({ ...l, [o.slug]: { ...l[o.slug], note: e.target.value } }))}
                        className="st-input"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </form>
  );
}

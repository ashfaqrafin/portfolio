"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type DragEvent } from "react";
import { IMPORT_MAX_BYTES, IMPORT_MAX_FILES } from "@/lib/blog/import-limits";
import { TOPIC_LABEL, TOPICS } from "@/lib/blog/topics";
import { importArticles, type ImportState } from "../actions";

// server actions accept at most 1 MB per request (Next's default); stay under it
const MAX_TOTAL = 950_000;

const EXAMPLE = `---
title: "Ricing my dotfiles, part 3"
excerpt: "One line for the pin preview."
date: 2026-11-02
topic: linux            # tailoring | fashion | unified | linux
tags: [dotfiles, terminal]
status: draft           # or published
connectsTo:
  - slug: ricing-my-dotfiles-part-2-automate-everything
    kind: series        # or builds-on
    note: part 3
---

The first two paragraphs (or everything before <!--more-->) become the quick read.`;

export default function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importArticles, null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);

  const total = files.reduce((n, f) => n + f.size, 0);
  const problem =
    files.length > IMPORT_MAX_FILES
      ? `At most ${IMPORT_MAX_FILES} files at a time.`
      : files.some((f) => f.size > IMPORT_MAX_BYTES)
        ? "Each file must be under 200 KB."
        : total > MAX_TOTAL
          ? "Together the files must stay under about 1 MB. Upload them in smaller groups."
          : null;

  const pick = (list: FileList | null) => setFiles(list ? [...list] : []);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const dt = e.dataTransfer.files;
    if (inputRef.current && dt.length) {
      inputRef.current.files = dt;
      pick(dt);
    }
  };

  return (
    <div className="st-import">
      <form action={action} className="st-import-form">
        <label
          className="st-drop"
          data-drag={drag ? "" : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            name="files"
            accept=".md,.markdown,text/markdown"
            multiple
            onChange={(e) => pick(e.target.files)}
            className="st-drop-input"
          />
          <span className="st-drop-title">Drop .md files here, or click to choose</span>
          <span className="st-hint">
            up to {IMPORT_MAX_FILES} files &middot; 200 KB each &middot; frontmatter optional
          </span>
          {files.length > 0 && (
            <ul className="st-drop-list">
              {files.map((f) => (
                <li key={f.name + f.size}>
                  {f.name} <span>{Math.ceil(f.size / 1024)} KB</span>
                </li>
              ))}
            </ul>
          )}
        </label>

        <div className="st-row st-row-3">
          <div className="st-field">
            <label htmlFor="imp-topic">Topic when a file has none</label>
            <select id="imp-topic" name="topic" defaultValue="unified" className="st-input">
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {TOPIC_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="st-field">
            <label htmlFor="imp-status">Status when a file has none</label>
            <select id="imp-status" name="status" defaultValue="draft" className="st-input">
              <option value="draft">Draft (review first)</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="st-field st-check">
            <label>
              <input type="checkbox" name="overwrite" /> Replace <span className="st-hint">articles with the same slug</span>
            </label>
          </div>
        </div>

        {problem && (
          <p className="st-alert" role="alert">
            {problem}
          </p>
        )}
        {state?.error && (
          <p className="st-alert" role="alert">
            {state.error}
          </p>
        )}

        <div className="st-submit">
          <button type="submit" className="st-btn st-primary" disabled={pending || !files.length || !!problem}>
            {pending ? "Uploading…" : files.length > 1 ? `Import ${files.length} files` : "Import"}
          </button>
          <Link className="st-link" href="/studio">
            Back to articles
          </Link>
        </div>
      </form>

      {state && state.results.length > 0 && (
        <table className="st-table st-results" aria-live="polite">
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Result</th>
              <th scope="col">
                <span className="sr-only">Links</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {state.results.map((r, i) => (
              <tr key={i} data-outcome={r.outcome} data-slug={r.slug}>
                <td>
                  <span className="st-title st-file">{r.file}</span>
                  {r.slug && <span className="st-meta">{r.slug}</span>}
                </td>
                <td>
                  <span className="st-badge" data-outcome={r.outcome}>
                    {r.outcome}
                    {r.status ? ` · ${r.status}` : ""}
                  </span>
                  {r.message && <p className="st-hint st-result-msg">{r.message}</p>}
                </td>
                <td className="st-actions">
                  {(r.outcome === "created" || r.outcome === "updated" || r.outcome === "skipped") && r.slug && (
                    <Link href={`/studio/${r.slug}`}>Edit</Link>
                  )}
                  {/* plain <a>: a <Link> to /blog/<slug> would open the quick-read popup */}
                  {r.status === "published" && r.slug && <a href={`/blog/${r.slug}`}>View</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <details className="st-example">
        <summary>What a file can contain</summary>
        <p className="st-hint">
          Everything above the body is optional. Without a title, the first <code># heading</code> is used; without a slug, the file name.
        </p>
        <pre>{EXAMPLE}</pre>
      </details>
    </div>
  );
}

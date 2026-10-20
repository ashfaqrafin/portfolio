/* The quick read is everything before a `<!--more-->` line, or, without one,
   the leading blocks up to and including the second paragraph. */

const MORE_LINE = /^[ \t]*<!--\s*more\s*-->[ \t]*$/im;

export function hasMoreMarker(body: string) {
  return MORE_LINE.test(body);
}

/** the body with the marker removed, for the full page */
export function fullBody(body: string) {
  return body.replace(MORE_LINE, "").replace(/\n{3,}/g, "\n\n").trim();
}

const isParagraph = (block: string) => {
  const s = block.trimStart();
  return !/^(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~|\||---|\*\*\*|___)/.test(s);
};

export function quickRead(body: string) {
  const m = MORE_LINE.exec(body);
  if (m) return body.slice(0, m.index).trim();
  const blocks = body.trim().split(/\n[ \t]*\n/);
  const out: string[] = [];
  let paragraphs = 0;
  let inFence = false;
  for (const b of blocks) {
    out.push(b);
    const fences = (b.match(/^(```|~~~)/gm) ?? []).length;
    if (fences % 2) inFence = !inFence;
    if (!inFence && isParagraph(b) && ++paragraphs === 2) break;
  }
  return out.join("\n\n").trim();
}

/** true when the quick read is the whole article */
export function quickIsWhole(body: string) {
  return quickRead(body).length >= fullBody(body).length;
}

export function wordCount(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-|[\]()!]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/** suggested read time at ~200 words a minute, 1–120 */
export function suggestReadMins(body: string) {
  return Math.min(120, Math.max(1, Math.ceil(wordCount(body) / 200)));
}

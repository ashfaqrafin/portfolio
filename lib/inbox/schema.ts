import { z } from "zod";

/* What the public contact form may send. Strict: unknown fields are refused. */

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 600;
export const REPLY_VIA = ["email", "linkedin"] as const;
export type ReplyVia = (typeof REPLY_VIA)[number];

/** "linkedin.com/in/you" with or without https:// and www., normalised to a full URL */
export function normaliseLinkedIn(v: string): string | null {
  const raw = v.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!/^(?:[a-z]{2,3}\.|www\.)?linkedin\.com$/i.test(url.hostname)) return null;
  if (!/^\/(?:in|company)\/[^/]+\/?$/.test(url.pathname)) return null;
  return `https://www.linkedin.com${url.pathname.replace(/\/$/, "")}`;
}

export const inquirySchema = z
  .strictObject({
    message: z.string().trim().min(MESSAGE_MIN, "A few more words, please.").max(MESSAGE_MAX, `At most ${MESSAGE_MAX} characters.`),
    name: z.string().trim().max(60, "That name is too long.").default(""),
    via: z.enum(REPLY_VIA),
    reply: z.string().trim().min(1, "Where should I reply?").max(254),
    /** honeypot: a field people never see. Checked before this schema runs */
    website: z.string().max(200).optional(),
    /** ms between the form appearing and being sent */
    elapsed: z.number().int().min(0).max(7 * 24 * 3600 * 1000),
  })
  .transform((v, ctx) => {
    let reply = v.reply;
    if (v.via === "email") {
      if (!z.email().safeParse(reply).success) ctx.addIssue({ code: "custom", path: ["reply"], message: "That email doesn't look right." });
    } else {
      const url = normaliseLinkedIn(reply);
      if (!url) ctx.addIssue({ code: "custom", path: ["reply"], message: "Use your profile link, like linkedin.com/in/you." });
      else reply = url;
    }
    return { message: v.message, name: v.name, via: v.via, reply, elapsed: v.elapsed };
  });

export type Inquiry = z.output<typeof inquirySchema>;

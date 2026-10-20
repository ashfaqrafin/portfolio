import { z } from "zod";

/* What the public contact form may send. Strict: unknown fields are refused. */

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 600;
export const REPLY_VIA = ["email", "whatsapp", "social"] as const;
export type ReplyVia = (typeof REPLY_VIA)[number];

/** Profile sites a "social link" may point at (subdomains like bd.linkedin.com included). */
export const SOCIAL_HOSTS = ["linkedin.com", "github.com", "x.com", "twitter.com", "instagram.com", "facebook.com", "behance.net", "dribbble.com", "threads.net", "bsky.app"];

/** "linkedin.com/in/you", with or without https:// and www., normalised to one https URL */
export function normaliseSocial(v: string): string | null {
  const raw = v.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const site = SOCIAL_HOSTS.find((h) => host === h || host.endsWith(`.${h}`));
  if (!site) return null;
  const path = url.pathname.replace(/\/+$/, "");
  if (!/^(\/[\w.@%~-]+){1,3}$/.test(path)) return null;
  return site === "linkedin.com" ? `https://www.linkedin.com${path}` : `https://${site}${path}`;
}

/** a WhatsApp number: 8–15 digits, spaces, dashes, dots and brackets allowed; kept as +digits when given */
export function normaliseWhatsApp(v: string): string | null {
  const s = v.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d{8,15}$/.test(s)) return null;
  return s;
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
    let reply: string | null = v.reply;
    if (v.via === "email") {
      if (!z.email().safeParse(reply).success) reply = null;
    } else if (v.via === "whatsapp") {
      reply = normaliseWhatsApp(reply);
    } else {
      reply = normaliseSocial(reply);
    }
    if (reply === null) {
      const message = {
        email: "That email doesn't look right.",
        whatsapp: "Use the full number, with the country code.",
        social: "Use a full profile link (LinkedIn, GitHub, X, Instagram\u2026).",
      }[v.via];
      ctx.addIssue({ code: "custom", path: ["reply"], message });
      return z.NEVER;
    }
    return { message: v.message, name: v.name, via: v.via, reply, elapsed: v.elapsed };
  });

export type Inquiry = z.output<typeof inquirySchema>;

import { createHash } from "node:crypto";
import { inbox } from "@/lib/inbox";
import { notifyOwner } from "@/lib/inbox/notify";
import { allow } from "@/lib/inbox/rate-limit";
import { inquirySchema } from "@/lib/inbox/schema";

/* The contact form's one public write. It is a route handler, not a server
   action, on purpose: every server action in this app is owner-only
   (scripts/check-owner-guards.mjs), and this endpoint can only ever add a
   message to the inbox, which the owner reads and deletes in the studio.

   Refused: other origins, bodies over 8 KB, invalid fields, and more than 5
   messages per 10 minutes from one address. Bots that fill the hidden honeypot
   field, or send the form faster than a person could, get an "ok" and nothing
   is stored, so they learn nothing. */

const MAX_BYTES = 8_000;
const MIN_ELAPSED_MS = 2_500;

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && (!host || new URL(origin).host !== host)) return json(403, { ok: false, error: "Cross-site posts aren't accepted." });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json(415, { ok: false, error: "Send JSON." });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return json(413, { ok: false, error: "That packet is too heavy." });

  const text = await req.text();
  if (text.length > MAX_BYTES) return json(413, { ok: false, error: "That packet is too heavy." });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: "That packet arrived torn." });
  }

  const fake = { ok: true, receivedAt: new Date().toISOString() };
  const r = raw as Record<string, unknown> | null;
  if (r && typeof r === "object" && typeof r.website === "string" && r.website.trim() !== "") return json(200, fake);

  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "form");
      fields[k] ??= i.message;
    }
    return json(400, { ok: false, error: "Some fields need another look.", fields });
  }
  if (parsed.data.elapsed < MIN_ELAPSED_MS) return json(200, fake);

  // the address is only used as a rate-limit key, hashed, and never stored
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  if (!allow(createHash("sha256").update(ip).digest("hex"))) return json(429, { ok: false, error: "That's a lot of post. Try again in a few minutes." });

  const { message, name, via, reply } = parsed.data;
  let saved;
  try {
    saved = await inbox.add({ message, name, via, reply });
  } catch (err) {
    console.error("[inbox] could not save a message", err);
    return json(503, { ok: false, error: "The post box is jammed. Try again soon." });
  }
  await notifyOwner(saved);
  return json(200, { ok: true, receivedAt: saved.createdAt });
}

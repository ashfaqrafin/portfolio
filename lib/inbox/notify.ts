import "server-only";
import type { Message } from "./types";

/* Optional: an email to the owner for each new message, through Resend's HTTP
   API. Off unless RESEND_API_KEY and CONTACT_NOTIFY_TO are both set (server-only
   variables; never NEXT_PUBLIC_). Plain text only, so nothing a visitor typed
   can become markup. A failure is logged; the message is already saved. */

export async function notifyOwner(m: Message): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_TO;
  if (!key || !to) return;
  const from = process.env.CONTACT_NOTIFY_FROM ?? "Portfolio <onboarding@resend.dev>";
  const body = {
    from,
    to: [to],
    subject: `New message${m.name ? ` from ${m.name}` : ""}`.slice(0, 120),
    text: [
      m.message,
      "",
      `— ${m.name || "(no name)"}`,
      `Reply via ${m.via === "email" ? "email" : "LinkedIn"}: ${m.reply}`,
      `Received ${m.createdAt}`,
    ].join("\n"),
    ...(m.via === "email" ? { reply_to: m.reply } : {}),
  };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.warn(`[inbox] notification failed: HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[inbox] notification failed: ${(err as Error).message}`);
  }
}

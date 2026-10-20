"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import "../site/site.css";
import "./contact.css";

/* Contact, as a transmission pipeline. Four stations stand on one thread: the
   tailor stitches your words into a packet, the coder clears the path, the
   dakpion (the postman) runs it over, and it drops into the post box. Sending
   walks the packet along the route while the request is in flight; the last
   stop only happens once the server has really accepted it, and a refusal
   sends the packet back with the reason ("returned to sender").

   POSTs to app/api/contact (validated, rate-limited, honeypot) and lands in the
   owner's studio inbox. Without JavaScript the form can't send, so the direct
   links below it are always there. */

const MAX = 600;
const MIN = 10;

const STATIONS = [
  { art: "/contact/tailor.webp", w: 366, h: 510, n: "01", title: "Stitched", note: "the tailor wraps your words" },
  { art: "/contact/coder.webp", w: 528, h: 510, n: "02", title: "Path cleared", note: "the coder deploys the route" },
  { art: "/contact/dakpion.webp", w: 506, h: 511, n: "03", title: "Delivery sprint", note: "the dakpion runs it over" },
  { art: "/contact/postbox.webp", w: 191, h: 507, n: "04", title: "Dropped", note: "into my post box" },
] as const;

/** Other ways to reach me, shown under the form. Add an email or LinkedIn here. */
const DIRECT: { label: string; href: string }[] = [
  { label: "GitHub", href: "https://github.com/ashfaqrafin" },
  // { label: "Email", href: "mailto:you@example.com" },
  // { label: "LinkedIn", href: "https://www.linkedin.com/in/you" },
];

type Via = "email" | "linkedin";
type Phase = "idle" | "sending" | "sent" | "returned";
type Fields = Partial<Record<"message" | "reply" | "name", string>>;

const STATUS = [
  "Stitching your words into a packet…",
  "Clearing the path…",
  "The dakpion is on the run…",
  "Dropping it in the box…",
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const year = new Date().getFullYear();

function localCheck(message: string, via: Via, reply: string): Fields {
  const f: Fields = {};
  if (message.trim().length < MIN) f.message = "A few more words, please.";
  if (!reply.trim()) f.reply = "Where should I reply?";
  else if (via === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply.trim())) f.reply = "That email doesn't look right.";
  else if (via === "linkedin" && !/linkedin\.com\/(in|company)\/[^/\s]+/i.test(reply)) f.reply = "Use your profile link, like linkedin.com/in/you.";
  return f;
}

export default function Contact() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [via, setVia] = useState<Via>("email");
  const [reply, setReply] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(-1); // the station the packet is at; 4 = in the box
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const shownAt = useRef(0);
  const routeRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    shownAt.current = Date.now();
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const busy = phase === "sending";
  const left = MAX - message.length;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local = localCheck(message, via, reply);
    setFields(local);
    setError("");
    if (Object.keys(local).length) {
      document.getElementById(`${uid}-${Object.keys(local)[0]}`)?.focus();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const beat = reduced ? 120 : 850;
    // the route is the show: bring it into view if the form is far below it
    const r = routeRef.current?.getBoundingClientRect();
    if (r && (r.top < 0 || r.bottom > window.innerHeight)) routeRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });

    setPhase("sending");
    setStep(0);
    const request = fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, name, via, reply, website, elapsed: Date.now() - shownAt.current }),
    })
      .then(async (res) => ({ status: res.status, body: (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Fields; receivedAt?: string } }))
      .catch(() => ({ status: 0, body: { ok: false, error: "No connection. Your words are still here; try again." } as { ok?: boolean; error?: string; fields?: Fields; receivedAt?: string } }));

    await wait(beat);
    if (!alive.current) return;
    setStep(1);
    await wait(beat);
    if (!alive.current) return;
    setStep(2);
    // the dakpion keeps running until the server has answered
    const [res] = await Promise.all([request, wait(beat)]);
    if (!alive.current) return;
    if (res.body.ok) {
      setStep(3);
      await wait(beat);
      if (!alive.current) return;
      setStep(4);
      setReceivedAt(res.body.receivedAt ?? new Date().toISOString());
      setPhase("sent");
    } else {
      setStep(-1);
      setPhase("returned");
      setError(res.body.error ?? "Something went wrong.");
      setFields(res.body.fields ?? {});
    }
  }

  function again() {
    setMessage("");
    setPhase("idle");
    setStep(-1);
    setReceivedAt("");
    shownAt.current = Date.now();
  }

  const status =
    phase === "sent"
      ? `Path clear ✓ · transmission received · ${year}`
      : phase === "returned"
        ? `Returned to sender · ${error}`
        : phase === "sending" && step >= 0 && step < 4
          ? STATUS[step]
          : "The route is clear. Write below and send it through.";
  const stateOf = (i: number) => (phase === "idle" || phase === "returned" ? "idle" : i < step || step === 4 ? "done" : i === step ? "active" : "todo");
  const placeholder = via === "email" ? "you@example.com" : "linkedin.com/in/you";
  const errId = (k: keyof Fields) => (fields[k] ? `${uid}-${k}-err` : undefined);

  return (
    <section className="sheet ct" aria-labelledby={`${uid}-h`} data-phase={phase}>
      <header className="ct-head">
        <div>
          <p className="ct-kicker">Contact &middot; transmission pipeline</p>
          <h2 className="ct-h2" id={`${uid}-h`}>
            Say hello. <span className="ct-h2-hand">tell me about your project.</span>
          </h2>
        </div>
        <p className="ct-status" role="status" aria-live="polite" data-phase={phase}>
          {status}
        </p>
      </header>

      {/* the route: four stations on one thread, and the packet that travels it */}
      <div className="ct-route" ref={routeRef} style={{ "--step": Math.max(0, Math.min(step, 3)) } as CSSProperties} data-step={step}>
        <ol className="ct-stations">
          {STATIONS.map((s, i) => (
            <li key={s.n} className="ct-st" data-state={stateOf(i)} data-n={s.n}>
              <div className="ct-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.art} width={s.w} height={s.h} alt="" loading="lazy" decoding="async" />
              </div>
              <p className="ct-st-title">
                <span className="ct-st-n">{s.n}</span> {s.title}
                <span className="ct-tick" aria-hidden="true">
                  &#10003;
                </span>
              </p>
              <p className="ct-st-note">{s.note}</p>
            </li>
          ))}
        </ol>
        <div className="ct-thread" aria-hidden="true">
          <span className="ct-thread-done" />
        </div>
        <span className="ct-packet" aria-hidden="true">
          <svg viewBox="0 0 40 30" focusable="false">
            <rect x="3" y="7" width="34" height="20" rx="2" />
            <path d="M3 9L20 19L37 9" />
            <path className="ct-packet-string" d="M20 7V27M3 17H37" />
          </svg>
        </span>
      </div>

      <div className="ct-body">
        {phase === "sent" ? (
          <div className="ct-thanks">
            <p className="ct-thanks-k">Transmission received</p>
            <p className="ct-thanks-h">Thank you{name.trim() ? `, ${name.trim()}` : ""}.</p>
            <p className="ct-thanks-p">
              Your packet is in my post box. I&rsquo;ll reply {via === "email" ? "by email" : "on LinkedIn"}, usually within a few days.
            </p>
            <button type="button" className="ct-btn ct-btn-ghost" onClick={again}>
              Write another
            </button>
          </div>
        ) : (
          <form className="ct-form" onSubmit={send} noValidate aria-busy={busy}>
            <div className="ct-field">
              <label className="ct-label-k" htmlFor={`${uid}-message`}>
                <span>1.</span> Your inquiry
              </label>
              <textarea
                id={`${uid}-message`}
                className="ct-textarea"
                value={message}
                maxLength={MAX}
                rows={6}
                placeholder="What are you making, and where could I help?"
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={!!fields.message || undefined}
                aria-describedby={[`${uid}-count`, errId("message")].filter(Boolean).join(" ")}
                disabled={busy}
                required
              />
              <p className="ct-count" id={`${uid}-count`} data-low={left < 60 || undefined}>
                {message.length} / {MAX}
              </p>
              {fields.message && (
                <p className="ct-err" id={errId("message")}>
                  {fields.message}
                </p>
              )}
            </div>

            <fieldset className="ct-field" disabled={busy}>
              <legend className="ct-label-k">
                <span>2.</span> How should I reply?
              </legend>
              <div className="ct-via" role="radiogroup" aria-label="Reply by">
                {(["email", "linkedin"] as const).map((v) => (
                  <label key={v} className="ct-chip" data-on={via === v || undefined}>
                    <input type="radio" name={`${uid}-via`} value={v} checked={via === v} onChange={() => setVia(v)} />
                    {v === "email" ? "Email" : (
                      <>
                        <span className="ct-in" aria-hidden="true">
                          in
                        </span>
                        LinkedIn
                      </>
                    )}
                  </label>
                ))}
              </div>
              <label className="ct-sr" htmlFor={`${uid}-reply`}>
                {via === "email" ? "Your email address" : "Your LinkedIn profile link"}
              </label>
              <input
                id={`${uid}-reply`}
                className="ct-input"
                type={via === "email" ? "email" : "url"}
                inputMode={via === "email" ? "email" : "url"}
                autoComplete={via === "email" ? "email" : "url"}
                value={reply}
                placeholder={placeholder}
                onChange={(e) => setReply(e.target.value)}
                aria-invalid={!!fields.reply || undefined}
                aria-describedby={errId("reply")}
                maxLength={254}
              />
              {fields.reply && (
                <p className="ct-err" id={errId("reply")}>
                  {fields.reply}
                </p>
              )}
              <label className="ct-label-s" htmlFor={`${uid}-name`}>
                Your name <span>(optional)</span>
              </label>
              <input
                id={`${uid}-name`}
                className="ct-input"
                value={name}
                autoComplete="name"
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!fields.name || undefined}
              />
            </fieldset>

            {/* honeypot: hidden from people and assistive tech; bots fill it in */}
            <div className="ct-hp" aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>

            {phase === "returned" && (
              <p className="ct-err ct-err-form" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="ct-btn" disabled={busy}>
              {busy ? "In transit…" : phase === "returned" ? "Seal and send again" : "Seal and send"}
              <span aria-hidden="true"> &rarr;</span>
            </button>
          </form>
        )}

        {/* the packet as it will be posted, filled in as you type */}
        <aside className="ct-label" aria-label="Your packet, as it will be posted" data-phase={phase}>
          <div className="ct-label-in">
            <p className="ct-label-k">Your packet</p>
            <span className="ct-stamp" aria-hidden="true">
              <svg viewBox="0 0 40 40" focusable="false">
                <path d="M9 31L29 9M27 8C30 5 34 6 33 9C32 12 29 11 30 9" />
                <path d="M30 10C38 18 20 24 24 32C26 36 31 35 32 33" />
              </svg>
              <span>MMXXVI</span>
            </span>
            <dl className="ct-addr">
              <dt>To</dt>
              <dd className="ct-hand">Ashfaq</dd>
              <dt>From</dt>
              <dd className="ct-hand">{name.trim() || "you"}</dd>
              <dt>Reply by</dt>
              <dd className="ct-mono">{reply.trim() || (via === "email" ? "email" : "LinkedIn")}</dd>
            </dl>
            <p className="ct-contents-k">Contents</p>
            <p className="ct-contents">
              <span aria-hidden="true">{"{ "}</span>
              {message.trim() ? message.trim().slice(0, 180) + (message.trim().length > 180 ? "…" : "") : <span className="ct-ph">inquiry</span>}
              <span aria-hidden="true">{" }"}</span>
            </p>
            {phase === "sent" && (
              <span className="ct-postmark" aria-hidden="true">
                received
                <br />
                {new Date(receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
            {phase === "returned" && (
              <span className="ct-postmark ct-postmark-back" aria-hidden="true">
                return to
                <br />
                sender
              </span>
            )}
          </div>
        </aside>
      </div>

      <p className="ct-direct">
        <span>Rather skip the post?</span>
        {DIRECT.map((d) => (
          <a key={d.href} className="ct-pill" href={d.href} target={d.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {d.label}
            <span aria-hidden="true">&nbsp;&#8599;</span>
          </a>
        ))}
      </p>
    </section>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Pipeline from "./Pipeline";
import "../site/site.css";
import "./contact.css";
import "./pipeline.css";

/* Contact, as a transmission pipeline (the scene is Pipeline.tsx). Until a
   message is sent the section is only the form and its airmail label: the
   cast takes no room. "Seal and send" folds the form away and opens the stage
   in its place, and each character walks on as their act begins: the tailor
   stitches the words into a packet, the coder breaks the errors blocking the
   route, the dakpion runs it to the post box. He keeps running until the
   server answers; the drop only happens once it has accepted the message. A
   refusal stamps "returned to sender", then the form comes back with the
   reason and everything that was typed.

   POSTs to app/api/contact (validated, rate-limited, honeypot) and lands in the
   owner's studio inbox. Without JavaScript the form can't send, so the direct
   links below it are always there. */

const MAX = 600;
const MIN = 10;

/** Other ways to reach me, shown under the form. Add an email or LinkedIn here. */
const DIRECT: { label: string; href: string }[] = [
  // the address itself is the label, so it can be read or copied as well as clicked
  { label: "ashfaqkhanrafin@gmail.com", href: "mailto:ashfaqkhanrafin@gmail.com" },
  { label: "GitHub", href: "https://github.com/ashfaqrafin" },
  // { label: "LinkedIn", href: "https://www.linkedin.com/in/you" },
];

type Via = "email" | "whatsapp" | "social";
type Phase = "idle" | "sending" | "sent" | "returned";
type Fields = Partial<Record<"message" | "reply" | "name", string>>;
type Answer = { ok?: boolean; error?: string; fields?: Fields; receivedAt?: string };

const VIA: Record<Via, { label: string; placeholder: string; field: string; type: string; mode: "email" | "tel" | "url"; auto: string }> = {
  email: { label: "Mail", placeholder: "you@example.com", field: "Your email address", type: "email", mode: "email", auto: "email" },
  whatsapp: { label: "WhatsApp", placeholder: "+880 1XXX-XXXXXX", field: "Your WhatsApp number, with the country code", type: "tel", mode: "tel", auto: "tel" },
  social: { label: "Social link", placeholder: "linkedin.com/in/you, github.com/you…", field: "A link to your profile", type: "url", mode: "url", auto: "url" },
};
const ACT_STATUS = [
  "",
  "The tailor is stitching your words into a packet…",
  "Errors on the route. The coder is clearing the path…",
  "The dakpion is running it over…",
  "Dropping it in the box…",
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function localCheck(message: string, via: Via, reply: string): Fields {
  const f: Fields = {};
  const r = reply.trim();
  if (message.trim().length < MIN) f.message = "A few more words, please.";
  if (!r) f.reply = "Where should I reply?";
  else if (via === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)) f.reply = "That email doesn't look right.";
  else if (via === "whatsapp" && !/^\+?\d{8,15}$/.test(r.replace(/[\s().-]/g, ""))) f.reply = "Use the full number, with the country code.";
  else if (via === "social" && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}\/\S+/i.test(r)) f.reply = "Use the full profile link, like linkedin.com/in/you.";
  return f;
}

function Icon({ via }: { via: Via }) {
  const d = {
    email: "M3 6h18v12H3zM3 7l9 7 9-7",
    whatsapp: "M5 19l1.3-3.6A7.5 7.5 0 1 1 9 18.6zM9.2 8.6c.3 2.6 2.6 5 5.2 5.4l1-1.1-1.6-.9-.7.7a4.5 4.5 0 0 1-2.1-2.1l.7-.7-.9-1.6z",
    social: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  }[via];
  return (
    <svg className="ct-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

export default function Contact() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [via, setVia] = useState<Via>("email");
  const [reply, setReply] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [phase, setPhase] = useState<Phase>("idle");
  const [act, setAct] = useState(0);
  const [hits, setHits] = useState(0);
  const [fields, setFields] = useState<Fields>({});
  const [error, setError] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  // a refused packet stays on stage for a moment ("returned to sender") before the form returns
  const [bounced, setBounced] = useState(false);
  const shownAt = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);
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
  const replyShown = reply.trim() ? (via === "whatsapp" ? `WhatsApp ${reply.trim()}` : reply.trim().replace(/^https?:\/\/(www\.)?/, "")) : "";

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
    const T = (ms: number) => (reduced ? Math.min(ms, 150) : ms);
    const step = async (ms: number) => {
      await wait(T(ms));
      return alive.current;
    };
    setPhase("sending");
    // the stage opens where the form was: keep it in view
    requestAnimationFrame(() => {
      const r = sceneRef.current?.getBoundingClientRect();
      if (r && (r.top < 0 || r.bottom > window.innerHeight)) sceneRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
    setHits(0);
    setAct(1);
    const request: Promise<Answer> = fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, name, via, reply, website, elapsed: Date.now() - shownAt.current }),
    })
      .then(async (res) => (await res.json().catch(() => ({}))) as Answer)
      .catch(() => ({ ok: false, error: "No connection. Your words are still here; try again." }));

    // 1 · weave
    if (!(await step(1650))) return;
    // 2 · the blocks drop, then one command each breaks them
    setAct(2);
    if (!(await step(560))) return;
    for (let k = 1; k <= 4; k++) {
      setHits(k);
      if (!(await step(430))) return;
    }
    if (!(await step(520))) return;
    // 3 · the sprint: he keeps running until the server has answered
    setAct(3);
    const [res] = await Promise.all([request, wait(T(2200))]);
    if (!alive.current) return;
    if (res.ok) {
      setAct(4);
      setReceivedAt(res.receivedAt ?? new Date().toISOString());
      if (!(await step(1050))) return;
      setAct(5);
      setPhase("sent");
    } else {
      setPhase("returned");
      setError(res.error ?? "Something went wrong.");
      setFields(res.fields ?? {});
      setBounced(true);
      if (!(await step(1600))) return;
      setBounced(false);
    }
  }

  function again() {
    setMessage("");
    setPhase("idle");
    setAct(0);
    setHits(0);
    setReceivedAt("");
    shownAt.current = Date.now();
  }

  const status =
    phase === "sent"
      ? "Path clear ✓ · transmission received"
      : phase === "returned"
        ? `Returned to sender · ${error}`
        : phase === "sending"
          ? ACT_STATUS[act]
          : "";
  const stage = phase === "sending" || phase === "sent" || bounced;
  const errId = (k: keyof Fields) => (fields[k] ? `${uid}-${k}-err` : undefined);
  const snippet = message.trim().slice(0, 30) + (message.trim().length > 30 ? "…" : "");

  return (
    <section className="sheet ct" aria-labelledby={`${uid}-h`} data-phase={phase}>
      <header className="ct-head">
        <div>
          <h2 className="ct-h2" id={`${uid}-h`}>
            Say hello. <span className="ct-h2-hand">tell me about your project.</span>
          </h2>
        </div>
        <p className="ct-status" role="status" aria-live="polite" data-phase={phase}>
          {status}
        </p>
      </header>

      {stage ? (
        <div className="ct-stage" ref={sceneRef} data-phase={phase}>
          <div className="ct-scene">
            <Pipeline act={act} hits={hits} snippet={snippet} replyTo={replyShown} failed={phase === "returned"} receivedAt={receivedAt} />
          </div>
          {phase === "sent" && (
            <div className="ct-thanks">
              <div>
                <p className="ct-thanks-h">Thank you{name.trim() ? `, ${name.trim()}` : ""}.</p>
                <p className="ct-thanks-p">
                  Your packet is in my post box. I&rsquo;ll reply {via === "email" ? "by email" : via === "whatsapp" ? "on WhatsApp" : "through your profile"}, usually within a
                  few days.
                </p>
              </div>
              <button type="button" className="ct-btn ct-btn-ghost" onClick={again}>
                Write another
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="ct-body">
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
                <span>2.</span> How should I contact you?
              </legend>
              <div className="ct-via">
                {(Object.keys(VIA) as Via[]).map((v) => (
                  <label key={v} className="ct-chip" data-on={via === v || undefined}>
                    <input
                      type="radio"
                      name={`${uid}-via`}
                      value={v}
                      checked={via === v}
                      onChange={() => {
                        setVia(v);
                        setReply("");
                        setFields((f) => ({ ...f, reply: undefined }));
                      }}
                    />
                    <Icon via={v} />
                    {VIA[v].label}
                  </label>
                ))}
              </div>
              <label className="ct-sr" htmlFor={`${uid}-reply`}>
                {VIA[via].field}
              </label>
              <input
                id={`${uid}-reply`}
                className="ct-input"
                type={VIA[via].type}
                inputMode={VIA[via].mode}
                autoComplete={VIA[via].auto}
                value={reply}
                placeholder={VIA[via].placeholder}
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
              <span aria-hidden="true">&nbsp;&rarr;</span>
            </button>
          </form>

          {/* the packet as it will be posted, filled in as you type */}
          <aside className="ct-label" aria-label="Your packet, as it will be posted" data-phase={phase}>
            <div className="ct-label-in">
              <p className="ct-label-k">Your packet</p>
              <span className="ct-stamp" aria-hidden="true">
                <svg viewBox="0 0 40 40" focusable="false">
                  <path d="M9 31L29 9M27 8C30 5 34 6 33 9C32 12 29 11 30 9" />
                  <path d="M30 10C38 18 20 24 24 32C26 36 31 35 32 33" />
                </svg>
              </span>
              <dl className="ct-addr">
                <dt>To</dt>
                <dd className="ct-hand">Ashfaq</dd>
                <dt>From</dt>
                <dd className="ct-hand">{name.trim() || "you"}</dd>
                <dt>Reply by</dt>
                <dd className="ct-mono">{replyShown || VIA[via].label}</dd>
              </dl>
              <p className="ct-contents-k">Contents</p>
              <p className="ct-contents">
                <span aria-hidden="true">{"{ "}</span>
                {message.trim() ? message.trim().slice(0, 180) + (message.trim().length > 180 ? "…" : "") : <span className="ct-ph">inquiry</span>}
                <span aria-hidden="true">{" }"}</span>
              </p>
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
      )}

      <p className="ct-direct">
        <span>Rather skip the post?</span>
        {DIRECT.map((d) => (
          <a key={d.href} className="ct-pill" href={d.href} target={d.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {d.label}
            {d.href.startsWith("http") && <span aria-hidden="true">&nbsp;&#8599;</span>}
          </a>
        ))}
      </p>
    </section>
  );
}
